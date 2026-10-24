"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

/* ------------------------------------------------------------------ *
 * Lightweight, data-driven explanatory charts (SVG + Framer Motion).
 * These are figures with REAL numbers from the NX benchmarks/analyses,
 * not live sims — used to explain the case studies in depth.
 * ------------------------------------------------------------------ */

function ChartFrame({
  label,
  title,
  caption,
  children,
}: {
  label: string;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-4">{children}</div>
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

/* ---- Chart 1: ClickHouse part-count over the benchmark timeline ---- */
// Real samples from the Run 2 merge-profiler table in the docs.
const PART_SERIES: { t: string; parts: number; l0: number }[] = [
  { t: "10:23", parts: 12, l0: 5 },
  { t: "10:25", parts: 21, l0: 9 },
  { t: "10:26", parts: 20, l0: 7 },
  { t: "10:28", parts: 26, l0: 8 },
  { t: "10:28", parts: 18, l0: 5 },
  { t: "10:29", parts: 29, l0: 16 },
  { t: "10:29", parts: 41, l0: 28 },
  { t: "10:30", parts: 43, l0: 30 },
  { t: "10:30", parts: 36, l0: 30 },
];

export function PartCountChart() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const W = 560;
  const H = 220;
  const padL = 34;
  const padB = 28;
  const padT = 14;
  const maxY = 50; // 'too many parts' headroom reference

  const x = (i: number) =>
    padL + (i * (W - padL - 10)) / (PART_SERIES.length - 1);
  const y = (v: number) => padT + (1 - v / maxY) * (H - padT - padB);

  const linePath = PART_SERIES.map(
    (d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.parts)}`
  ).join(" ");
  const l0Path = PART_SERIES.map(
    (d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.l0)}`
  ).join(" ");

  return (
    <ChartFrame
      label="FIG 06"
      title="ClickHouse part count during ingestion"
      caption="Run 2 of the 628×65MB benchmark. The single merge thread can't keep up with S3Queue commits: level-0 parts climb 5→30 and total parts peak at 43 — near the 300 'too many parts' cap — while one 19.34 GiB merge blocks the pool for ~110s. This is the bottleneck the ClickHouse case study fixes."
    >
      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Part count chart">
          {/* y gridlines */}
          {[0, 10, 20, 30, 40, 50].map((g) => (
            <g key={g}>
              <line
                x1={padL}
                x2={W - 10}
                y1={y(g)}
                y2={y(g)}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                opacity={0.5}
              />
              <text
                x={padL - 6}
                y={y(g) + 3}
                textAnchor="end"
                className="fill-muted-foreground font-mono"
                fontSize={8}
              >
                {g}
              </text>
            </g>
          ))}
          {/* total parts area */}
          <motion.path
            d={`${linePath} L ${x(PART_SERIES.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
            fill="hsl(var(--accent-1))"
            opacity={0.1}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 0.1 } : {}}
            transition={{ duration: 0.6 }}
          />
          {/* total parts line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="hsl(var(--accent-1))"
            strokeWidth={1.75}
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
          {/* level-0 parts line */}
          <motion.path
            d={l0Path}
            fill="none"
            stroke="hsl(var(--accent-3))"
            strokeWidth={1.25}
            strokeDasharray="4 3"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.1, ease: "easeInOut", delay: 0.2 }}
          />
          {/* peak annotation */}
          <circle cx={x(7)} cy={y(43)} r={3} fill="hsl(var(--accent-1))" />
          <text
            x={x(7)}
            y={y(43) - 7}
            textAnchor="middle"
            className="fill-foreground font-mono"
            fontSize={8}
          >
            peak 43
          </text>
          {/* x labels */}
          {PART_SERIES.map((d, i) =>
            i % 2 === 0 ? (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                className="fill-muted-foreground font-mono"
                fontSize={7.5}
              >
                {d.t}
              </text>
            ) : null
          )}
        </svg>
        <div className="mt-2 flex gap-4 font-mono text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-accent-1" /> total parts
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-accent-3" />
            level-0 parts
          </span>
        </div>
      </div>
    </ChartFrame>
  );
}

/* ---- Chart 2: before/after impact of the fixes ---- */
type Bar = { label: string; before: number; after: number; unit: string };
const IMPACT: Bar[] = [
  { label: "worst-case merge blockage", before: 110, after: 20, unit: "s" },
  { label: "peak part count", before: 43, after: 25, unit: "" },
  { label: "dashboard query latency", before: 100, after: 60, unit: "%" },
];

export function ImpactChart() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <ChartFrame
      label="FIG 07"
      title="Impact of the fixes (before → after)"
      caption="Capping merge size to 5 GiB, raising background_pool_size to 2, and dropping S3Queue processing threads to 1 turns a 110s thread blockage into ~20s, keeps parts under ~25, and the ORDER BY retune cuts dashboard latency ~40%."
    >
      <div ref={ref} className="space-y-4">
        {IMPACT.map((b, i) => {
          const max = Math.max(b.before, b.after);
          const beforePct = (b.before / max) * 100;
          const afterPct = (b.after / max) * 100;
          return (
            <div key={b.label}>
              <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="text-foreground">
                  {b.before}
                  {b.unit} → {b.after}
                  {b.unit}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-muted">
                  <motion.div
                    className="h-2 rounded-full bg-accent-3/70"
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${beforePct}%` } : {}}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                  />
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <motion.div
                    className="h-2 rounded-full bg-accent-1"
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${afterPct}%` } : {}}
                    transition={{ duration: 0.8, delay: i * 0.1 + 0.15 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex gap-4 pt-1 font-mono text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-accent-3/70" /> before
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-accent-1" /> after
          </span>
        </div>
      </div>
    </ChartFrame>
  );
}


/* ---- Reusable: generic/naive design vs NX design ---- */
export type VersusMetric = {
  label: string;
  /** generic value, nx value (same unit) */
  generic: number;
  nx: number;
  unit?: string;
  /** which direction is better */
  better: "lower" | "higher";
};

export function VersusChart({
  label,
  title,
  caption,
  genericName = "generic design",
  metrics,
}: {
  label: string;
  title: string;
  caption: string;
  genericName?: string;
  metrics: VersusMetric[];
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <ChartFrame label={label} title={title} caption={caption}>
      <div ref={ref} className="space-y-5">
        {metrics.map((m, i) => {
          const max = Math.max(m.generic, m.nx) || 1;
          const gPct = (m.generic / max) * 100;
          const nPct = (m.nx / max) * 100;
          const nxWins =
            m.better === "lower" ? m.nx <= m.generic : m.nx >= m.generic;
          return (
            <div key={m.label}>
              <div className="mb-1.5 font-mono text-[11px] text-foreground">
                {m.label}
                <span className="ml-2 text-[10px] text-muted-foreground">
                  ({m.better === "lower" ? "lower" : "higher"} is better)
                </span>
              </div>
              {/* generic */}
              <div className="mb-1 flex items-center gap-2">
                <span className="w-24 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {genericName}
                </span>
                <div className="h-3 flex-1 rounded-sm bg-muted">
                  <motion.div
                    className="h-3 rounded-sm bg-accent-3/60"
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${gPct}%` } : {}}
                    transition={{ duration: 0.8, delay: i * 0.08 }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                  {m.generic}
                  {m.unit}
                </span>
              </div>
              {/* nx */}
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 font-mono text-[10px] text-accent-1">
                  NX design
                </span>
                <div className="h-3 flex-1 rounded-sm bg-muted">
                  <motion.div
                    className="h-3 rounded-sm bg-accent-1"
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${nPct}%` } : {}}
                    transition={{ duration: 0.8, delay: i * 0.08 + 0.12 }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-[10px] text-foreground">
                  {m.nx}
                  {m.unit}
                  {nxWins && <span className="ml-1 text-accent-1">✓</span>}
                </span>
              </div>
            </div>
          );
        })}
        <div className="flex gap-4 border-t border-border pt-3 font-mono text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-accent-3/60" />
            {genericName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-accent-1" /> NX design
          </span>
        </div>
      </div>
    </ChartFrame>
  );
}

/* ---- Cost vs throughput at scale ---- */
// $/1k messages as vendor-throughput utilization rises, for a fixed always-on
// fleet (cost flat regardless of use) vs NX (tiered ASG + self-terminating
// Fargate + token-bucket rate limit to the vendor's max throughput).
const UTIL = [10, 25, 40, 55, 70, 85, 100];
// cost per 1k messages (illustrative, same shape as the as-built model)
const GENERIC_COST = [9.0, 3.6, 2.3, 1.7, 1.3, 1.1, 1.0];
const NX_COST = [1.6, 1.4, 1.25, 1.15, 1.05, 0.98, 0.9];

export function CostThroughputChart() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const W = 560;
  const H = 240;
  const padL = 40;
  const padB = 34;
  const padT = 14;
  const maxY = 10;

  const x = (i: number) => padL + (i * (W - padL - 12)) / (UTIL.length - 1);
  const y = (v: number) => padT + (1 - v / maxY) * (H - padT - padB);
  const toPath = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  return (
    <ChartFrame
      label="FIG 08"
      title="Cost per 1k messages vs vendor-throughput utilization"
      caption="A fixed always-on fleet pays for idle capacity — cost per message is punishing until it's near-saturated. NX keeps cost per message low and flat across the whole range: tiered ASGs size compute to the workspace plan, Fargate publisher/distributor/flusher tasks self-terminate on idle (no zombie cost), and a token-bucket limiter drives each vendor queue right up to the vendor's max allowed throughput — maximizing useful work per rupee of compute."
    >
      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cost vs throughput">
          {[0, 2, 4, 6, 8, 10].map((g) => (
            <g key={g}>
              <line
                x1={padL}
                x2={W - 12}
                y1={y(g)}
                y2={y(g)}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                opacity={0.5}
              />
              <text
                x={padL - 6}
                y={y(g) + 3}
                textAnchor="end"
                className="fill-muted-foreground font-mono"
                fontSize={8}
              >
                ₹{g}
              </text>
            </g>
          ))}
          {/* generic line */}
          <motion.path
            d={toPath(GENERIC_COST)}
            fill="none"
            stroke="hsl(var(--accent-3))"
            strokeWidth={1.75}
            strokeDasharray="4 3"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
          {/* nx line + fill */}
          <motion.path
            d={`${toPath(NX_COST)} L ${x(UTIL.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
            fill="hsl(var(--accent-1))"
            opacity={0.1}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 0.1 } : {}}
            transition={{ duration: 0.6 }}
          />
          <motion.path
            d={toPath(NX_COST)}
            fill="none"
            stroke="hsl(var(--accent-1))"
            strokeWidth={1.75}
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.1, ease: "easeInOut", delay: 0.2 }}
          />
          {/* x labels */}
          {UTIL.map((u, i) => (
            <text
              key={u}
              x={x(i)}
              y={H - 18}
              textAnchor="middle"
              className="fill-muted-foreground font-mono"
              fontSize={7.5}
            >
              {u}%
            </text>
          ))}
          <text
            x={(W + padL) / 2}
            y={H - 4}
            textAnchor="middle"
            className="fill-muted-foreground font-mono"
            fontSize={8}
          >
            vendor throughput utilization →
          </text>
        </svg>
        <div className="mt-2 flex gap-4 font-mono text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-accent-3" />
            fixed always-on fleet
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-accent-1" /> NX (tiered + self-terminating + rate-limited)
          </span>
        </div>
      </div>
    </ChartFrame>
  );
}
