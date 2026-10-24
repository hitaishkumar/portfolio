"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { useOnScreen } from "@/components/motion/sim-core";
import type { SimProps, SimStatus } from "@/components/motion/sim-layer";

type SimCardProps = {
  /** Figure number / eyebrow, e.g. "FIG 01". */
  label?: string;
  /** Algorithm / mechanism name. */
  title: string;
  /** Caption shown under the diagram. */
  caption: string;
  sim: React.ComponentType<SimProps>;
  /** Canvas aspect ratio (height / width). Default 9/16. */
  ratio?: number;
};

/**
 * A foreground, framed "figure" that presents an NX mechanism as an interactive
 * diagram — the way product docs (Stripe / Temporal / Vercel) show architecture:
 * a titled panel with a live indicator, the sim at full fidelity, a caption,
 * and a live-status strip fed by the sim's onStatus callback.
 */
export function SimCard({
  label = "FIG",
  title,
  caption,
  sim: Sim,
  ratio = 0.52,
}: SimCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref, 0.15);
  const [status, setStatus] = React.useState<SimStatus>({});

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-1/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-1" />
          </span>
          live
        </span>
      </div>

      {/* diagram canvas */}
      <div
        className="relative w-full bg-muted/20"
        style={{ paddingBottom: `${ratio * 100}%` }}
      >
        <Sim running={onScreen} onStatus={setStatus} side="full" />
      </div>

      {/* live status strip */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border bg-muted/30 px-4 py-2.5 font-mono text-[11px]">
        {Object.entries(status).length === 0 ? (
          <span className="text-muted-foreground">warming up…</span>
        ) : (
          Object.entries(status).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="text-muted-foreground">{k}</span>
              <span className="text-foreground">{v}</span>
            </span>
          ))
        )}
      </div>

      {/* caption */}
      <div className="flex items-start gap-2 border-t border-border px-4 py-3">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-1" />
        <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}
