"use client";

import * as React from "react";
import {
  siGo,
  siPython,
  siTypescript,
  siNodedotjs,
  siDotnet,
  siPostgresql,
  siClickhouse,
  siRedis,
  siMysql,
  siMongodb,
  siApachekafka,
  siRabbitmq,
  siDocker,
  siKubernetes,
  siPrometheus,
  siGrafana,
  siOpentelemetry,
  siGin,
  siOpenapiinitiative,
  siOpensearch,
  type SimpleIcon,
} from "simple-icons";
import {
  Boxes,
  Cloud,
  Database,
  Server,
  Workflow,
  Network,
  Gauge,
  ShieldCheck,
  Repeat,
  Layers,
  FileCode,
  Terminal,
  Cpu,
  Activity,
  Scale,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Badge icon system — EVERY label gets a colored logo, no exceptions.
 *   • Real brands  -> simple-icons SVG at the official brand color.
 *   • AWS/Azure    -> lucide cloud glyph + provider color (no SI logo exists).
 *   • Concepts     -> a meaningful lucide glyph + a category accent color.
 * ------------------------------------------------------------------ */

/** Keyed by brand slug — used by the featured-logos marquee. */
const ICONS: Record<string, SimpleIcon> = {
  Go: siGo,
  Python: siPython,
  Typescript: siTypescript,
  Nodedotjs: siNodedotjs,
  Postgresql: siPostgresql,
  Clickhouse: siClickhouse,
  Redis: siRedis,
  Mongodb: siMongodb,
  Apachekafka: siApachekafka,
  Rabbitmq: siRabbitmq,
  Docker: siDocker,
  Kubernetes: siKubernetes,
  Prometheus: siPrometheus,
  Grafana: siGrafana,
  Opentelemetry: siOpentelemetry,
};

/** Brand (simple-icons) mapping for badge labels. */
const BRAND: Record<string, SimpleIcon> = {
  Go: siGo,
  "Go (Gin / Echo)": siGin,
  Python: siPython,
  TypeScript: siTypescript,
  "Node.js": siNodedotjs,
  "C#": siDotnet,
  PostgreSQL: siPostgresql,
  ClickHouse: siClickhouse,
  Redis: siRedis,
  MySQL: siMysql,
  MongoDB: siMongodb,
  RabbitMQ: siRabbitmq,
  Kafka: siApachekafka,
  Docker: siDocker,
  Kubernetes: siKubernetes,
  OpenTelemetry: siOpentelemetry,
  Prometheus: siPrometheus,
  Grafana: siGrafana,
  OpenAPI: siOpenapiinitiative,
  OpenSearch: siOpensearch,
  SQL: siMysql, // generic SQL -> database mark
};

/**
 * Lucide icon + color for every non-simple-icons label. Colors are chosen by
 * category so related badges share a hue (cloud=orange, security=emerald,
 * data=sky, distributed=violet, backend=indigo, observability=amber).
 */
const CONCEPT: Record<string, { icon: LucideIcon; color: string }> = {
  // AWS / cloud (AWS orange, Azure blue)
  "AWS ECS": { icon: Cloud, color: "#FF9900" },
  Fargate: { icon: Boxes, color: "#FF9900" },
  "EC2 Auto-Scaling": { icon: Server, color: "#FF9900" },
  S3: { icon: Database, color: "#FF9900" },
  SQS: { icon: Workflow, color: "#FF9900" },
  ALB: { icon: Network, color: "#FF9900" },
  CloudWatch: { icon: Activity, color: "#FF9900" },
  CDK: { icon: FileCode, color: "#FF9900" },
  Azure: { icon: Cloud, color: "#0078D4" },

  // Distributed systems (violet)
  "Event-Driven Architecture": { icon: Workflow, color: "#8B5CF6" },
  Microservices: { icon: Boxes, color: "#8B5CF6" },
  "Message Queues": { icon: Workflow, color: "#8B5CF6" },
  "Concurrent Workers": { icon: Cpu, color: "#8B5CF6" },
  "Async Processing": { icon: Repeat, color: "#8B5CF6" },
  "Rate Limiting": { icon: Gauge, color: "#8B5CF6" },
  Backpressure: { icon: Gauge, color: "#8B5CF6" },
  Idempotency: { icon: Repeat, color: "#8B5CF6" },
  "Retry & Failure Handling": { icon: Repeat, color: "#8B5CF6" },
  DLQ: { icon: Workflow, color: "#8B5CF6" },

  // Backend (indigo)
  "REST APIs": { icon: Network, color: "#6366F1" },
  "Background Workers": { icon: Cpu, color: "#6366F1" },
  "Durable Job Queues": { icon: Workflow, color: "#6366F1" },
  "API Design": { icon: Network, color: "#6366F1" },
  Concurrency: { icon: Cpu, color: "#6366F1" },
  CLI: { icon: Terminal, color: "#6366F1" },
  Codegen: { icon: FileCode, color: "#6366F1" },
  "LLM APIs": { icon: Network, color: "#6366F1" },

  // Data (sky)
  Indexing: { icon: Database, color: "#0EA5E9" },
  Partitioning: { icon: Layers, color: "#0EA5E9" },
  "Query Optimization": { icon: Gauge, color: "#0EA5E9" },

  // Observability (amber)
  "Structured Logging": { icon: FileCode, color: "#F59E0B" },
  "Load Testing": { icon: Gauge, color: "#F59E0B" },
  "pprof Profiling": { icon: Activity, color: "#F59E0B" },

  // Security (emerald)
  "AES-256-GCM Encryption": { icon: KeyRound, color: "#10B981" },
  "Cedar Authorization": { icon: ShieldCheck, color: "#10B981" },
  "Multi-Tenant Isolation": { icon: ShieldCheck, color: "#10B981" },
  "Data Compliance": { icon: Scale, color: "#10B981" },
};

function isNearBlack(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40;
}

/** Inline brand SVG rendered at the icon's official color (used in marquee). */
export function BrandLogo({
  icon,
  name,
  className = "h-6 w-6",
}: {
  icon: string | null;
  name: string;
  className?: string;
}) {
  if (icon && ICONS[icon]) {
    const si = ICONS[icon];
    const dark = isNearBlack(si.hex);
    return (
      <svg
        role="img"
        aria-label={name}
        viewBox="0 0 24 24"
        className={dark ? `${className} text-foreground` : className}
        fill={dark ? "currentColor" : `#${si.hex}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={si.path} />
      </svg>
    );
  }
  // AWS (and anything without an SI logo) -> cloud glyph in AWS orange.
  return (
    <Cloud
      aria-label={name}
      className={className}
      style={{ color: "#FF9900" }}
    />
  );
}

/**
 * A skill/tag badge. EVERY label renders with a colored logo + tint:
 * brands use their simple-icons mark; concepts/cloud use a lucide glyph with a
 * category color. There is no grey / dot-only fallback.
 */
export function SkillBadge({ label }: { label: string }) {
  const brand = BRAND[label];

  if (brand) {
    const dark = isNearBlack(brand.hex);
    const color = `#${brand.hex}`;
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium"
        style={{ backgroundColor: `${color}14`, borderColor: `${color}40` }}
      >
        <svg
          role="img"
          aria-hidden
          viewBox="0 0 24 24"
          className={dark ? "h-3.5 w-3.5 text-foreground" : "h-3.5 w-3.5"}
          fill={dark ? "currentColor" : color}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={brand.path} />
        </svg>
        <span className="text-foreground/90">{label}</span>
      </span>
    );
  }

  // Concept / cloud — always a colored lucide glyph, never grey.
  const concept = CONCEPT[label] ?? { icon: Boxes, color: "#6366F1" };
  const Icon = concept.icon;
  const color = concept.color;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}14`, borderColor: `${color}40` }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="text-foreground/90">{label}</span>
    </span>
  );
}
