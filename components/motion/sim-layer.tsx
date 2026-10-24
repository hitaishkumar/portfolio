"use client";

import * as React from "react";
import { Activity, X } from "lucide-react";
import { useOnScreen } from "@/components/motion/sim-core";

export type SimStatus = Record<string, string>;

export type SimProps = {
  running: boolean;
  onStatus?: (status: SimStatus) => void;
  /** Horizontal side the sim sits on within the section. */
  side?: "left" | "right" | "full";
};

type SimLayerProps = {
  /** Algorithm display name, e.g. "Vector Clocks". */
  algo: string;
  /** One-line description shown in the info panel. */
  description: string;
  /** Which side the sim canvas occupies as background. */
  side?: "left" | "right" | "full";
  /** Sim canvas component (renders an absolutely-positioned <canvas>). */
  sim: React.ComponentType<SimProps>;
  /** Resting visual opacity of the background sim. */
  opacity?: number;
};

/**
 * Mounts a distributed-algorithm sim as a section background (animates only
 * while on screen). A clickable chip in the top-right corner toggles a panel
 * with the algorithm's description and live status — click to open, click the
 * chip again / outside / Escape to close.
 */
export function SimLayer({
  algo,
  description,
  side = "right",
  sim: Sim,
  opacity = 0.55,
}: SimLayerProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(wrapRef, 0.08);
  const [status, setStatus] = React.useState<SimStatus>({});
  const [open, setOpen] = React.useState(false);

  const positionClass =
    side === "left"
      ? "inset-y-0 left-0 w-[66%]"
      : side === "right"
      ? "inset-y-0 right-0 w-[66%]"
      : "inset-0";

  // While the panel is open, brighten the sim so it reads clearly.
  const liveOpacity = open ? Math.min(1, opacity + 0.4) : opacity;

  // Close on outside click / Escape.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="absolute inset-0" aria-hidden>
      {/* background sim */}
      <div
        className={`${side === "full" ? "sim-bg-full" : "sim-bg"} pointer-events-none absolute hidden lg:block ${positionClass}`}
        style={{ opacity: liveOpacity, transition: "opacity 0.4s ease" }}
      >
        <Sim running={onScreen} onStatus={setStatus} side={side} />
      </div>

      {/* clickable chip + popover panel (top-right) */}
      <div
        ref={panelRef}
        className="pointer-events-auto absolute right-4 top-4 hidden lg:block"
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${algo} — algorithm info`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] backdrop-blur-sm transition-colors ${
            open
              ? "border-accent-1/60 bg-accent-1/15 text-foreground"
              : "border-accent-1/30 bg-card/70 text-muted-foreground hover:border-accent-1/50 hover:text-foreground"
          }`}
        >
          <Activity className="h-3 w-3 text-accent-1" />
          {algo}
          <span className="text-muted-foreground/60">
            {open ? "· close" : "· info"}
          </span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent-1" />
                <h4 className="text-sm font-semibold">{algo}</h4>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                live status
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
                {Object.entries(status).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right text-foreground">{v}</dd>
                  </React.Fragment>
                ))}
                {Object.keys(status).length === 0 && (
                  <dd className="col-span-2 text-muted-foreground">
                    warming up…
                  </dd>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
