"use client";

import * as React from "react";
import { Activity, X } from "lucide-react";
import { RaftCluster, raftControls } from "@/components/motion/raft-cluster";

const DESCRIPTION =
  "Raft leader election & log replication. Followers wait a randomized election timeout (draining ring); on timeout one becomes a candidate, bumps its term, and requests votes. A majority elects a leader, which sends heartbeats and replicates log entries — an entry commits once a majority stores it (hatched → solid). Leaders occasionally crash, triggering a fresh election.";

/**
 * The hero's Raft cluster plus a top-right info/controls popover — matching
 * the SimLayer chip so every sim exposes live, user-tunable parameters.
 */
export function RaftFigure() {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [params, setParams] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(raftControls.map((c) => [c.key, c.default]))
  );

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
    <>
      {/* the sim itself */}
      <RaftCluster params={params} />

      {/* clickable chip + popover (top-right of the hero sim area) */}
      <div
        ref={panelRef}
        className="pointer-events-auto absolute right-4 top-20 z-20 hidden lg:block"
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Raft consensus — algorithm info"
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] backdrop-blur-sm transition-colors ${
            open
              ? "border-accent-1/60 bg-accent-1/15 text-foreground"
              : "border-accent-1/30 bg-card/70 text-muted-foreground hover:border-accent-1/50 hover:text-foreground"
          }`}
        >
          <Activity className="h-3 w-3 text-accent-1" />
          Raft Consensus
          <span className="text-muted-foreground/60">
            {open ? "· close" : "· info"}
          </span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent-1" />
                <h4 className="text-sm font-semibold">Raft Consensus</h4>
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
              {DESCRIPTION}
            </p>

            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                controls
              </p>
              <div className="space-y-2.5">
                {raftControls.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground"
                  >
                    <span className="w-20 shrink-0 truncate" title={c.label}>
                      {c.label}
                    </span>
                    <input
                      type="range"
                      min={c.min}
                      max={c.max}
                      step={c.step ?? 1}
                      value={params[c.key] ?? c.default}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          [c.key]: Number(e.target.value),
                        }))
                      }
                      aria-label={c.label}
                      className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-accent-1 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-1"
                    />
                    <span className="w-10 shrink-0 text-right text-foreground">
                      {params[c.key] ?? c.default}
                      {c.unit ?? ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
