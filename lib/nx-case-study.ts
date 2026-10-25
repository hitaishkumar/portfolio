/**
 * NX — Multi-Tenant Notification Orchestration Platform.
 * Case-study content distilled from the internal design docs & root-cause
 * analyses (HLD, consumer concurrency model, quota-exhaustion analysis,
 * ClickHouse merge benchmarks, per-row resolution logic).
 */

export const nxOverview = {
  title: "NX — Notification Orchestration Platform",
  tagline:
    "The in-house communication-orchestration layer — route, govern & prove every message",
  summary:
    "NX is a communication-orchestration platform built in-house at KFINTECH — the same product category as Fyno.io, purpose-built for a regulated BFSI environment. It sits above every messaging vendor as one control plane: a single API to run omni-channel Email/SMS/WhatsApp campaigns through configurable flow DAGs with conditional routing, automatic failover, wait-time gating, and real-time delivery analytics — while enforcing exactly-once delivery, per-tenant isolation at the database, broker and compute layers, encryption, and auditable authorization. The result is higher deliverability and lower messaging cost without trading away compliance. I owned it end-to-end: design docs, six Go services, the AWS footprint, and live-site operations.",
  role: "Senior Software Engineer (R&D) · KFINTECH",
  stack: [
    "Go",
    "RabbitMQ",
    "PostgreSQL",
    "ClickHouse",
    "Redis",
    "AWS (ECS/Fargate, ASG, SQS, S3, ALB)",
    "OpenTelemetry",
    "River",
    "Cedar",
  ],
  metrics: [
    { value: "600M+", label: "communications orchestrated" },
    { value: "10M+", label: "users reached" },
    { value: "1000", label: "in-flight workers / consumer" },
    { value: "99.9%", label: "uptime for R&D launches" },
  ],
};

/** The six services and their one-line responsibility + key mechanism. */
export const nxServices: {
  name: string;
  compute: string;
  role: string;
  mechanism: string;
}[] = [
  {
    name: "Publisher API",
    compute: "EC2 (always-on)",
    role: "Core CRUD + campaign trigger. Owns the campaign state machine.",
    mechanism:
      "River (Postgres-backed durable queue) atomically sets status=queued and enqueues a job in one transaction; a worker honors a max-running-tasks limit (snooze 30s at capacity) before starting a Fargate publisher task.",
  },
  {
    name: "Publisher Task",
    compute: "Fargate (on-demand)",
    role: "Reads the datasource (S3 CSV / Postgres / Mongo) and publishes rows.",
    mechanism:
      "Publishes one queue.Message per resolved row into a campaign-dedicated RabbitMQ vhost (auto-created), carrying trace_id + flow/template/account ids + placeholder data.",
  },
  {
    name: "Distributor",
    compute: "Fargate (on-demand)",
    role: "Rate-limited bridge from campaign vhost → vendor queues.",
    mechanism:
      "Dual RabbitMQ connections, token-bucket limiter at maxThroughput msg/s, routes by account_id, Redis-backed per-node dedup (fail-open), self-terminates after 15s idle to kill zombie cost.",
  },
  {
    name: "Consumer",
    compute: "EC2 ASG (tiered)",
    role: "High-throughput sender. 5-step pipeline per message.",
    mechanism:
      "Goroutine-per-message bounded by a semaphore (1000) matched to QoS prefetch; self-healing reconnect; per-goroutine panic recovery; buffered channels batch-write audits to ClickHouse.",
  },
  {
    name: "Webhook v2",
    compute: "EC2 (ALB path-routed)",
    role: "Ingests vendor delivery callbacks, advances success paths.",
    mechanism:
      "Decodes a binary-packed tracking id from the callback → evaluates success criteria → on match publishes to next success nodes and writes record_flag=+1; raw events buffered → SQS → batch writeback.",
  },
  {
    name: "Campaign Manager + Flusher",
    compute: "EC2 poller + Fargate",
    role: "Tracks per-node completion; flushes expired wait-time rows.",
    mechanism:
      "30s poller drives a per-node state machine (unstaged→staging→in_progress→finished); triggers a per-campaign Flusher that routes wait-time-expired rows to their failure path (record_flag=-1).",
  },
];

/** End-to-end campaign lifecycle (animated as a sequence). */
export const nxLifecycle: { step: string; detail: string }[] = [
  {
    step: "Trigger",
    detail:
      "UI/API transitions the campaign scheduled → queued inside a single Postgres transaction (status + River job together — exactly-once, no split-brain).",
  },
  {
    step: "Admission",
    detail:
      "A River worker checks running ECS tasks against a cap; if full it snoozes 30s, otherwise starts a Fargate publisher task. Compute is bounded by design.",
  },
  {
    step: "Publish",
    detail:
      "The Fargate task streams datasource rows, resolves every placeholder/header per row, and publishes to the campaign's private vhost — rejected rows are published flagged, never silently dropped.",
  },
  {
    step: "Distribute",
    detail:
      "The Distributor rate-limits and routes messages by account_id into vendor queues, deduplicating per (campaign, node, fingerprint) in Redis with fail-open semantics.",
  },
  {
    step: "Consume & send",
    detail:
      "The Consumer fleet runs the 5-step pipeline (validate → fetch deps → template → vendor send → evaluate) per message, emitting a full audit trail to ClickHouse.",
  },
  {
    step: "Gate on wait-time",
    detail:
      "wait_time==0 → publish straight to the next success nodes and ACK. wait_time>0 → stage a row in ClickHouse (record_flag=0) and wait for a webhook or expiry.",
  },
  {
    step: "Resolve & complete",
    detail:
      "Webhook confirms success (record_flag=+1) or the Flusher routes expired rows to failure (record_flag=-1). The Campaign Manager marks nodes finished, then the campaign.",
  },
];

export type CaseStudy = {
  id: string;
  title: string;
  angle: string;
  problem: string;
  rootCauses: string[];
  edgeCases: { case: string; behavior: string }[];
  solution: string[];
  metrics?: { value: string; label: string }[];
};

export const nxCaseStudies: CaseStudy[] = [
  {
    id: "quota-cascade",
    title: "The Quota-Exhaustion Cascade",
    angle: "Graceful degradation · in-flight consistency · shutdown ordering",
    problem:
      "When a workspace's send quota hit zero, the consumer called ctx.Cancel() to stop. But dozens of workers were mid-pipeline — Step 4 (vendor HTTP) and Step 5 (ClickHouse insert / ACK). Cancelling the context aborted them all at once, cascading into lost work and an inconsistent system.",
    rootCauses: [
      "Quota was checked in Step 2, after workers were already in flight — too late to refuse cleanly.",
      "ctx.Cancel() aborted live HTTP calls and ClickHouse inserts, so transactions rolled back and vendor responses were lost.",
      "ACKs never fired, so RabbitMQ requeued already-processed messages → duplicate-send risk on retry.",
      "Log channels were closed in the wrong order relative to the context cancel, so audit rows for in-flight work vanished.",
      "Requeue-on-nack with no quota DLQ created a tight retry loop that bled messages on shutdown.",
    ],
    edgeCases: [
      {
        case: "Worker in Step 4 (vendor HTTP) when quota hits",
        behavior:
          "Context cancel closes the connection mid-request — the send may or may not have reached the vendor. Ambiguous state.",
      },
      {
        case: "Worker in Step 5 (staging insert)",
        behavior:
          "ClickHouse insert's context is cancelled → transaction rolls back → the staged row is lost even though the vendor send succeeded.",
      },
      {
        case: "Worker ready to ACK",
        behavior:
          "ACK never sent → RabbitMQ treats the message as unprocessed and redelivers it → duplicate communication.",
      },
      {
        case: "QoS prefetch backpressure",
        behavior:
          "Prefetched-but-unprocessable messages pile up (300+), so the broker throttles delivery while the fleet drains.",
      },
    ],
    solution: [
      "Reordered shutdown: close audit log channels FIRST so flushers detect closure and drain, THEN cancel the consumer context.",
      "Added an explicit drain phase after cancel — wait for in-flight ACKs and DB writes to settle before closing the RabbitMQ channel.",
      "Fixed connection-close ordering: workerWg.Wait() before ch.Close(), never the reverse, to stop premature in-flight loss.",
      "Instrumented every step with timestamps + quota-before/after so the cascade is traceable in OpenTelemetry and CloudWatch.",
    ],
    metrics: [
      { value: "0", label: "messages lost on clean shutdown" },
      { value: "5", label: "root causes mapped to 4 fixes" },
    ],
  },
  {
    id: "clickhouse-merge",
    title: "The Single Merge-Thread Bottleneck",
    angle: "Storage-engine internals · write amplification · capacity planning",
    problem:
      "Benchmarking 628 × 65MB NDJSON files (~48GB, ~1.09M rows) into a per-workspace ClickHouse on a t4g.small, part counts climbed toward the 'too many parts' threshold and memory sat in the OOM danger zone. Ingestion finished in ~6.5 min but the aftermath took another 2–3 min.",
    rootCauses: [
      "BackgroundMergesAndMutationsPoolSize = 1 — ClickHouse could only run ONE merge at a time, ever.",
      "A single level-3 merge of 8 parts totaling 19.34 GiB monopolized that one thread for ~110 seconds.",
      "During that window, S3Queue kept committing small parts (~3 parts / 8s) that the lone merge thread couldn't keep up with — level-0 parts grew 5 → 30.",
      "max_memory_usage was set to 10GB on a 2GB box, so the OOM killer would strike before ClickHouse's own limit ever engaged.",
      "Over-partitioning (PARTITION BY workspace×campaign) created thousands of partitions → more 'too many parts' pressure.",
    ],
    edgeCases: [
      {
        case: "Big-merge in progress, new batch arrives",
        behavior:
          "Parts spike to 43 (near the 300 default cap); query latency degrades scanning 43 parts instead of 12.",
      },
      {
        case: "Peak memory during the 19 GiB merge",
        behavior:
          "MemoryResident hits 1.06 GiB with only 393 MiB host memory free — one more allocation from OOM.",
      },
      {
        case: "after_processing = 'delete' in production",
        behavior:
          "Each processed file triggers an S3 DELETE, adding network latency that further starves the single processing thread.",
      },
    ],
    solution: [
      "Capped merge size: max_bytes_to_merge_at_max_space_in_pool = 5 GiB so merges finish in 10–25s and release the thread instead of blocking for ~110s.",
      "Raised background_pool_size to 2 so a small (L0→L1) and a larger (L1→L2) merge can overlap — projected to keep parts under ~25 instead of 43.",
      "Dropped S3Queue processing_threads_num to 1 to match ingestion rate to merge capacity (parts stay < 20 for a ~35% slower but stable ingest).",
      "Right-sized memory ratios and fixed time-based partitioning (toYYYYMM) + ORDER BY (workspace_id, campaign_id, created_at) so WHERE filters stop doing full scans.",
    ],
    metrics: [
      { value: "110s → ~20s", label: "worst-case merge blockage" },
      { value: "43 → ~25", label: "peak part count (projected)" },
      { value: "40%", label: "dashboard latency cut (ORDER BY tuning)" },
    ],
  },
  {
    id: "per-row-resolution",
    title: "Per-Row Resolution Edge Cases",
    angle: "Correctness under partial data · channel-scoped validation",
    problem:
      "Campaigns run over messy datasources where any cell can be missing, null, or empty — across Email/SMS/WhatsApp nodes with different required fields. The publisher must decide, per row, whether to send or reject, without silently dropping data or rejecting rows for a channel the flow doesn't even use.",
    rootCauses: [
      "Recipient keys (email_to/sms_to) must never fall back to a default — a wrong default means sending to the wrong person.",
      "NULL vs empty-string are semantically different for external keys: NULL triggers the required/default fallback, empty-string is a valid value.",
      "A key's `required` flag should only apply to channels actually present in the flow — otherwise a required email_to rejects rows in an SMS-only run.",
    ],
    edgeCases: [
      {
        case: "Recipient key, dynamic binding, empty cell (default present)",
        behavior:
          "REJECT — recipient keys never fall back to a default, even when one exists.",
      },
      {
        case: "External key, dynamic NULL, default present",
        behavior: "PUBLISH — falls back to the default.",
      },
      {
        case: "External key, dynamic empty-string",
        behavior: "PUBLISH — an empty string is a valid value, returned as-is (not missing).",
      },
      {
        case: "Optional attachment, empty cell",
        behavior: "PUBLISH — email sent without the attachment.",
      },
      {
        case: "Required email_to in an SMS-only flow",
        behavior:
          "NOT required this run — channel-scoped so the key is resolved best-effort and never rejects.",
      },
    ],
    solution: [
      "A three-class key model (internal recipient / attachment / external), each with its own fallback rule, so resolution is explicit per class.",
      "Every row is published — rejected rows are flagged with a reason so the consumer writes a 'Rejected' audit row instead of silently dropping, preserving a complete audit trail.",
      "EffectiveRequired(required, keyChannels, flowChannels) scopes validation to the flow's actual channels; applied identically at create-time and run-time so they never disagree.",
    ],
  },
];

export const nxDesignDecisions: { decision: string; rationale: string }[] = [
  {
    decision: "River (Postgres-backed) over SQS/Redis for the job queue",
    rationale:
      "Atomic campaign-status + job-insert in one transaction, with no extra infrastructure — the trigger can't half-happen.",
  },
  {
    decision: "RabbitMQ vhost per campaign",
    rationale:
      "Isolates each campaign's traffic and prevents noisy-neighbor queue buildup; the vhost is torn down afterward.",
  },
  {
    decision: "ClickHouse instance per workspace",
    rationale:
      "Cost-effective analytics isolation with no cross-tenant query interference; the Campaign Manager passes each workspace's CH address to its Flusher.",
  },
  {
    decision: "Fargate for Publisher / Distributor / Flusher",
    rationale:
      "Pay-per-use with zero idle cost and natural task isolation; tasks self-terminate on idle so compute spend tracks demand.",
  },
  {
    decision: "Append-only staging (ReplacingMergeTree, flag-based state)",
    rationale:
      "No DELETEs — just record_flag transitions (0 pending → +1 success → -1 flushed) — which suits ClickHouse's high-write, latest-version-wins model.",
  },
  {
    decision: "Binary-packed tracking id in vendor callbacks",
    rationale:
      "A compact ~76-byte encoding of campaign/flow/trace metadata rides inside the vendor webhook so delivery status correlates back with no extra lookup.",
  },
  {
    decision: "Tiered consumer ASGs by workspace plan",
    rationale:
      "Large instances for paying tiers, small for economy/free — cost optimization without starving high-volume tenants.",
  },
];
