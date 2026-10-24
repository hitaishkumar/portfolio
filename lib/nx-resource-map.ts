/**
 * NX resource-orchestration map — distilled from the LLD/HLD/DFD draw.io
 * diagrams. Nodes are grouped into the same infrastructure layers the LLD uses
 * (Entry/LB → ECS Compute → Message Broker → Data) and color-coded by role per
 * the LLD legend.
 */

export type NodeRole =
  | "entry" // white — entry / frontend / LB
  | "core" // red/pink — core services (Publisher, Distributor, Flusher, Lambda, Postgres)
  | "support" // blue — support & data services (Consumers, Webhook, Campaign Manager, ClickHouse)
  | "broker" // green — message brokers & queues (RabbitMQ, SQS)
  | "storage" // brown — object storage (S3)
  | "observ"; // gray — observability (OTel, CloudWatch)

export type ResLayer = "entry" | "compute" | "broker" | "data";

export type ResNode = {
  id: string;
  label: string;
  sub?: string;
  role: NodeRole;
  layer: ResLayer;
  /** column 0..1 within its layer (for x placement) */
  col: number;
};

export type ResEdge = {
  from: string;
  to: string;
  kind: "control" | "data" | "success" | "failure";
};

export const resNodes: ResNode[] = [
  // ---- entry / load balancing ----
  { id: "client", label: "Users / Clients", role: "entry", layer: "entry", col: 0.04 },
  { id: "cdn", label: "CloudFront + S3", sub: "React SPA", role: "storage", layer: "entry", col: 0.28 },
  { id: "apigw", label: "API Gateway", sub: "100 req/s", role: "entry", layer: "entry", col: 0.52 },
  { id: "alb", label: "ALB-NX", sub: "internet-facing", role: "entry", layer: "entry", col: 0.74 },
  { id: "albwh", label: "Webhook ALB", sub: "internal", role: "entry", layer: "entry", col: 0.96 },

  // ---- ECS compute (ARM64 / Graviton) ----
  { id: "publisher", label: "Publisher API", sub: "EC2 · River", role: "core", layer: "compute", col: 0.06 },
  { id: "cmgr", label: "Campaign Mgr", sub: "30s poll", role: "support", layer: "compute", col: 0.2 },
  { id: "pubtask", label: "Publisher Task", sub: "Fargate", role: "core", layer: "compute", col: 0.34 },
  { id: "distributor", label: "Distributor", sub: "Fargate", role: "core", layer: "compute", col: 0.48 },
  { id: "consumer", label: "Consumer fleet", sub: "tiered ASG ×5", role: "support", layer: "compute", col: 0.64 },
  { id: "flusher", label: "Flusher", sub: "Fargate 0-50", role: "support", layer: "compute", col: 0.8 },
  { id: "webhook", label: "Webhook Svc", sub: "0-30", role: "support", layer: "compute", col: 0.93 },

  // ---- message broker ----
  { id: "rmqc", label: "RabbitMQ · campaign vhost", sub: "email/sms/wa/api q", role: "broker", layer: "broker", col: 0.22 },
  { id: "rmqv", label: "RabbitMQ · vendor queues", sub: "per account_id + DLQ", role: "broker", layer: "broker", col: 0.52 },
  { id: "sqs", label: "AWS SQS", sub: "webhook analytics", role: "broker", layer: "broker", col: 0.85 },

  // ---- data layer ----
  { id: "pg", label: "PostgreSQL", sub: "schema/workspace + River", role: "core", layer: "data", col: 0.12 },
  { id: "ch", label: "ClickHouse", sub: "per-workspace · RMT", role: "support", layer: "data", col: 0.38 },
  { id: "redis", label: "Redis", sub: "template/flow cache · quota", role: "support", layer: "data", col: 0.6 },
  { id: "s3", label: "S3 staging", sub: "NDJSON parking layer", role: "storage", layer: "data", col: 0.82 },
  { id: "otel", label: "OTel + CloudWatch", sub: "traces · metrics · logs", role: "observ", layer: "data", col: 0.97 },
];

export const resEdges: ResEdge[] = [
  { from: "client", to: "cdn", kind: "control" },
  { from: "client", to: "apigw", kind: "control" },
  { from: "apigw", to: "alb", kind: "control" },
  { from: "alb", to: "publisher", kind: "control" },
  { from: "publisher", to: "pg", kind: "control" }, // River job + status
  { from: "publisher", to: "pubtask", kind: "control" }, // River → Fargate
  { from: "pubtask", to: "rmqc", kind: "data" }, // publish to campaign vhost
  { from: "rmqc", to: "distributor", kind: "data" },
  { from: "distributor", to: "rmqv", kind: "data" }, // rate-limited → vendor queues
  { from: "rmqv", to: "consumer", kind: "data" },
  { from: "consumer", to: "ch", kind: "data" }, // audits / staging
  { from: "consumer", to: "s3", kind: "data" }, // staging parking layer
  { from: "consumer", to: "redis", kind: "control" }, // cache + quota
  { from: "consumer", to: "rmqv", kind: "success" }, // wait=0 → next success node
  { from: "cmgr", to: "pg", kind: "control" },
  { from: "cmgr", to: "flusher", kind: "control" }, // invokes flusher
  { from: "flusher", to: "ch", kind: "control" }, // read expired staging
  { from: "flusher", to: "rmqv", kind: "failure" }, // expired → failure node
  { from: "albwh", to: "webhook", kind: "control" },
  { from: "webhook", to: "rmqv", kind: "success" }, // success → next node
  { from: "webhook", to: "sqs", kind: "data" }, // events → SQS
  { from: "sqs", to: "ch", kind: "data" }, // writeback
  { from: "s3", to: "ch", kind: "data" }, // S3Queue → CH
  { from: "consumer", to: "otel", kind: "control" },
];

export const resLegend: { role: NodeRole; label: string }[] = [
  { role: "core", label: "core services" },
  { role: "support", label: "support & data services" },
  { role: "broker", label: "brokers & queues" },
  { role: "storage", label: "object storage" },
  { role: "observ", label: "observability" },
  { role: "entry", label: "entry / load balancing" },
];
