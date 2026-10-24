import { SkillBadge } from "@/components/motion/brand-logo";
import { Counter } from "@/components/motion/counter";
import {
  CostThroughputChart,
  ImpactChart,
  PartCountChart,
  VersusChart,
} from "@/components/motion/nx-charts";
import { Reveal } from "@/components/motion/reveal";
import { SimCard } from "@/components/motion/sim-card";
import { AdmissionControlSim } from "@/components/motion/sims/nx-admission-control-sim";
import { CampaignPipelineSim } from "@/components/motion/sims/nx-campaign-pipeline-sim";
import { ConsumerEngineSim } from "@/components/motion/sims/nx-consumer-engine-sim";
import { ResourceMap } from "@/components/motion/sims/nx-resource-map";
import { StagingFlagSim } from "@/components/motion/sims/nx-staging-flag-sim";
import { SectionHeading } from "@/components/sections/section-heading";
import {
  nxCaseStudies,
  nxDesignDecisions,
  nxLifecycle,
  nxOverview,
  nxServices,
} from "@/lib/nx-case-study";
import { resLegend } from "@/lib/nx-resource-map";
import {
  AlertTriangle,
  ArrowLeft,
  GitCommitHorizontal,
  Lightbulb,
  Server,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: `${nxOverview.title} — Case Study`,
  description: nxOverview.summary,
};

export default function NxCaseStudy() {
  return (
    <main className="relative">
      {/* top bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <Link
            href="/#experience"
            className="inline-flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            back to portfolio
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            case study · distributed systems
          </span>
        </div>
      </div>

      {/* hero — text + the signature pipeline figure side by side */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 bg-grid"
          aria-hidden
        />
        <div className="container relative z-10 grid items-center gap-12 py-20 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <Reveal>
              <p className="text-gradient font-mono text-sm font-semibold">
                {nxOverview.role}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                {nxOverview.title}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {nxOverview.tagline}
              </p>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
                {nxOverview.summary}
              </p>
            </Reveal>

            <Reveal className="mt-8 flex flex-wrap gap-2">
              {nxOverview.stack.map((s) => (
                <SkillBadge key={s} label={s} />
              ))}
            </Reveal>

            <Reveal
              stagger
              className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4"
            >
              {nxOverview.metrics.map((m) => (
                <div key={m.label}>
                  <dt className="text-gradient text-2xl font-bold tracking-tight sm:text-3xl">
                    <Counter value={m.value} />
                  </dt>
                  <dd className="mt-1 text-xs text-muted-foreground">
                    {m.label}
                  </dd>
                </div>
              ))}
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <SimCard
              label="FIG 01"
              title="Campaign Pipeline"
              ratio={0.56}
              sim={CampaignPipelineSim}
              caption="NX's signature path: the Publisher writes to a per-campaign RabbitMQ vhost, the Distributor rate-limits (token bucket) into vendor queues, the Consumer fleet sends, then a wait-time gate splits each message to a Webhook success (+1) or a Flusher expiry (−1)."
            />
          </Reveal>
        </div>
      </section>

      {/* architecture / services */}
      <section className="py-20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="01 — Architecture"
              title="Six services, one message lifecycle"
            />
          </Reveal>
          <Reveal className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Each service hands off through RabbitMQ and shares one correlation
            key — <span className="font-mono text-foreground">trace_id</span> —
            across every hop and every ClickHouse audit table. Isolation runs
            deep: schema-per-workspace in Postgres, instance-per-workspace in
            ClickHouse, vhost-per-campaign in RabbitMQ, and tiered ASGs for
            consumer compute.
          </Reveal>

          <Reveal className="mb-6">
            <SimCard
              label="FIG 02"
              title="Resource Orchestration Map"
              ratio={0.66}
              sim={ResourceMap}
              caption="Every running resource across the four infrastructure layers — Entry/LB, ECS compute (ARM64/Graviton), the RabbitMQ/SQS broker layer, and the self-managed data layer — with live packets tracing the control, data, success, and failure paths. Compute is split so cost tracks demand: an always-on Publisher + Campaign Manager, on-demand Fargate for Publisher/Distributor/Flusher, and tiered consumer ASGs."
            />
          </Reveal>
          <Reveal className="mb-10 flex flex-wrap gap-x-5 gap-y-2">
            {resLegend.map((l) => (
              <span
                key={l.role}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
              >
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-sm ${
                    l.role === "core"
                      ? "bg-accent-3"
                      : l.role === "support"
                      ? "bg-accent-2"
                      : l.role === "broker"
                      ? "bg-[#22c55e]"
                      : l.role === "storage"
                      ? "bg-[#b47846]"
                      : l.role === "observ"
                      ? "bg-muted-foreground"
                      : "bg-foreground"
                  }`}
                />
                {l.label}
              </span>
            ))}
          </Reveal>

          <Reveal className="mb-10">
            <SimCard
              label="FIG 03"
              title="River Admission Control"
              ratio={0.52}
              sim={AdmissionControlSim}
              caption="How work enters NX: a campaign trigger enqueues a River job in the same Postgres transaction as the status change. The queued→processing step is gated by a bounded pool of Fargate ECS slots — when full, the job snoozes 30s. Compute is bounded by design."
            />
          </Reveal>

          <Reveal stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nxServices.map((svc) => (
              <div
                key={svc.name}
                className="glass card-lift h-full rounded-lg border p-5"
              >
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-accent-1" />
                  <h3 className="font-semibold">{svc.name}</h3>
                </div>
                <p className="mt-1 font-mono text-[11px] text-accent-2">
                  {svc.compute}
                </p>
                <p className="mt-3 text-sm text-foreground/80">{svc.role}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {svc.mechanism}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* lifecycle — figure above the steps */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="02 — Lifecycle"
              title="A campaign, end to end"
            />
          </Reveal>

          <Reveal className="mb-10">
            <SimCard
              label="FIG 04"
              title="Wait-Time Staging"
              ratio={0.52}
              sim={StagingFlagSim}
              caption="The lifecycle's hard part: wait_time>0 messages append a ClickHouse staging row with record_flag=0 (pending). A vendor webhook flips it to +1, or the Flusher expires it to −1. The append-only table is compacted by a ReplacingMergeTree merge to each key's latest version."
            />
          </Reveal>

          <Reveal stagger className="space-y-0">
            {nxLifecycle.map((item, i) => (
              <div
                key={item.step}
                className="relative border-l border-border pl-8 pb-8 last:pb-0"
              >
                <span className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full border border-accent-1/40 bg-background font-mono text-[10px] font-semibold text-accent-1">
                  {i + 1}
                </span>
                <h3 className="font-semibold">{item.step}</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* case studies */}
      <section className="py-20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="03 — Deep Dives"
              title="Three problems worth the war stories"
            />
          </Reveal>

          <Reveal className="mb-10">
            <SimCard
              label="FIG 05"
              title="Consumer Engine"
              ratio={0.52}
              sim={ConsumerEngineSim}
              caption="The engine behind the case studies below: a semaphore bounds in-flight workers (1000 in prod) pulling off the vendor queue. Each runs the 5-step pipeline (validate → fetch deps → template → vendor send → stage/ack); failures branch to the DLQ, and audits batch-flush to ClickHouse."
            />
          </Reveal>

          <div className="space-y-16">
            {nxCaseStudies.map((cs) => (
              <Reveal key={cs.id}>
                <article
                  id={cs.id}
                  className="scroll-mt-20 rounded-xl border border-border bg-card/40 p-6 sm:p-8"
                >
                  <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {cs.title}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-accent-1">
                    {cs.angle}
                  </p>

                  {/* problem */}
                  <div className="mt-6 flex gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-3" />
                    <div>
                      <h4 className="text-sm font-semibold">The problem</h4>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {cs.problem}
                      </p>
                    </div>
                  </div>

                  {/* root causes */}
                  <div className="mt-6">
                    <h4 className="mb-2 text-sm font-semibold">Root causes</h4>
                    <ul className="space-y-2">
                      {cs.rootCauses.map((rc, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-3/70" />
                          {rc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* edge cases table */}
                  <div className="mt-6">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <GitCommitHorizontal className="h-4 w-4 text-accent-2" />
                      Edge cases
                    </h4>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <tbody>
                          {cs.edgeCases.map((ec, i) => (
                            <tr
                              key={i}
                              className="border-b border-border last:border-0"
                            >
                              <td className="w-1/2 bg-muted/40 p-3 align-top font-mono text-[11px] text-foreground/90">
                                {ec.case}
                              </td>
                              <td className="p-3 align-top leading-relaxed text-muted-foreground">
                                {ec.behavior}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* solution */}
                  <div className="mt-6">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Wrench className="h-4 w-4 text-accent-1" />
                      What I did
                    </h4>
                    <ul className="space-y-2">
                      {cs.solution.map((s, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-1/70" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* metrics */}
                  {cs.metrics && (
                    <div className="mt-6 flex flex-wrap gap-6 border-t border-border pt-5">
                      {cs.metrics.map((m) => (
                        <div key={m.label}>
                          <div className="text-gradient text-lg font-bold">
                            {m.value}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* explanatory charts for the ClickHouse merge case */}
                  {cs.id === "clickhouse-merge" && (
                    <div className="mt-8 grid gap-6 lg:grid-cols-2">
                      <PartCountChart />
                      <ImpactChart />
                    </div>
                  )}

                  {/* comparison: NX vs a naive consumer on quota exhaustion */}
                  {cs.id === "quota-cascade" && (
                    <div className="mt-8">
                      <VersusChart
                        label="FIG"
                        title="Shutdown on quota: naive ctx.cancel vs NX ordered drain"
                        genericName="naive cancel"
                        caption="A generic consumer cancels the context the moment quota hits, aborting in-flight HTTP sends and ClickHouse writes and skipping ACKs — so messages are lost, already-sent ones get redelivered (duplicate comms), and audit rows vanish. NX closes log channels first, drains in-flight work, then cancels — preserving exactly-once semantics and a complete audit trail."
                        metrics={[
                          {
                            label: "messages lost on shutdown",
                            generic: 50,
                            nx: 0,
                            better: "lower",
                          },
                          {
                            label: "duplicate sends (missed ACKs)",
                            generic: 100,
                            nx: 0,
                            better: "lower",
                          },
                          {
                            label: "audit rows preserved",
                            generic: 60,
                            nx: 100,
                            unit: "%",
                            better: "higher",
                          },
                          {
                            label: "consistent final state",
                            generic: 0,
                            nx: 100,
                            unit: "%",
                            better: "higher",
                          },
                        ]}
                      />
                    </div>
                  )}

                  {/* comparison: NX vs generic drop-on-missing resolution */}
                  {cs.id === "per-row-resolution" && (
                    <div className="mt-8">
                      <VersusChart
                        label="FIG"
                        title="Messy datasource: generic drop-on-missing vs NX resolution"
                        genericName="generic drop"
                        caption="A generic publisher silently drops any row with a missing field — including rows a channel doesn't even use — leaving no trace. NX classifies every key, scopes `required` to the flow's actual channels, and publishes every row (rejected ones flagged with a reason) so nothing is silently lost and the audit trail is complete. On a 1,000-row campaign with sparse data this is the difference between delivering ~82% and ~97%."
                        metrics={[
                          {
                            label: "rows delivered",
                            generic: 82,
                            nx: 97,
                            unit: "%",
                            better: "higher",
                          },
                          {
                            label: "silent drops (no trace)",
                            generic: 180,
                            nx: 0,
                            better: "lower",
                          },
                          {
                            label: "wrong-channel rejects",
                            generic: 120,
                            nx: 0,
                            better: "lower",
                          },
                          {
                            label: "rows with audit record",
                            generic: 82,
                            nx: 100,
                            unit: "%",
                            better: "higher",
                          },
                        ]}
                      />
                    </div>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* cost at scale */}
      <section className="border-t border-border py-20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="04 — Cost at scale"
              title="Maximum vendor throughput, minimum idle spend"
            />
          </Reveal>
          <Reveal className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The cost model is{" "}
            <span className="font-mono text-foreground">
              counts × price-at-time
            </span>
            , charged on compute (one usage event per message that passes
            quota). The design goal: drive each vendor queue to the
            vendor&apos;s maximum allowed throughput while paying for almost no
            idle compute — so cost per message stays low and flat even at low
            utilization.
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <CostThroughputChart />
            </Reveal>
            <Reveal delay={0.1}>
              <VersusChart
                label="FIG 09"
                title="Compute footprint: always-on fleet vs NX elastic mix"
                genericName="always-on fleet"
                caption="A one-size fleet runs 24/7 at peak sizing for every workspace. NX splits compute: tiered consumer ASGs sized to the workspace plan (enterprise/standard/economy), plus Fargate publisher/distributor/flusher tasks that spin up per campaign and self-terminate after 15s idle. Same throughput ceiling, a fraction of the idle burn."
                metrics={[
                  {
                    label: "idle compute hours / day",
                    generic: 100,
                    nx: 22,
                    better: "lower",
                  },
                  {
                    label: "cost per 1k msgs (₹, low util)",
                    generic: 9,
                    nx: 1.6,
                    better: "lower",
                  },
                  {
                    label: "vendor throughput utilized",
                    generic: 100,
                    nx: 100,
                    unit: "%",
                    better: "higher",
                  },
                  {
                    label: "zombie tasks after campaign",
                    generic: 12,
                    nx: 0,
                    better: "lower",
                  },
                ]}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* design decisions */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="05 — Decisions"
              title="Why it's built this way"
            />
          </Reveal>
          <Reveal stagger className="grid gap-4 md:grid-cols-2">
            {nxDesignDecisions.map((d) => (
              <div
                key={d.decision}
                className="glass card-lift h-full rounded-lg border p-5"
              >
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-1" />
                  <div>
                    <h3 className="text-sm font-semibold">{d.decision}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {d.rationale}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* footer back link */}
      <div className="border-t border-border py-10">
        <div className="container flex items-center justify-between">
          <Link
            href="/#experience"
            className="inline-flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            back to portfolio
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            NX · {nxOverview.role}
          </span>
        </div>
      </div>
    </main>
  );
}
