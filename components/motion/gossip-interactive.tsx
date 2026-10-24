"use client";

import * as React from "react";
import { Activity, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GossipSim } from "@/components/motion/sims/gossip-sim";
import { useOnScreen } from "@/components/motion/sim-core";
import type { SimStatus } from "@/components/motion/sim-layer";

const MIN = 6;
const MAX = 64;

/**
 * Interactive Gossip-protocol figure: the sim canvas plus controls —
 * a node-count slider, an "Add node" button, a hover card explaining the
 * algorithm, and a live-status readout. Demonstrates ≈log(n) convergence as
 * the cluster grows.
 */
export function GossipInteractive() {
  const ref = React.useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref, 0.15);
  const [count, setCount] = React.useState(24);
  const [status, setStatus] = React.useState<SimStatus>({});

  const addNode = () => setCount((c) => Math.min(MAX, c + 1));

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            interactive
          </span>
          <span className="text-sm font-semibold">Gossip Protocol</span>
        </div>
        <div className="flex items-center gap-3">
          {/* hover card trigger */}
          <div className="group relative">
            <button
              type="button"
              aria-label="About the gossip protocol"
              className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Info className="h-3.5 w-3.5" />
              what is this?
            </button>
            <div className="pointer-events-none absolute right-0 top-6 z-20 w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent-1" />
                <h4 className="text-sm font-semibold">Gossip Protocol</h4>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Epidemic dissemination: each round, every node holding the rumor
                pushes it to a random peer. The infected set roughly doubles per
                round, so the whole cluster converges in ≈log₂(n) rounds — robust,
                decentralized propagation with no coordinator. Add nodes and watch
                the round count grow only logarithmically.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-1/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-1" />
            </span>
            live
          </span>
        </div>
      </div>

      {/* diagram */}
      <div className="relative w-full bg-muted/20" style={{ paddingBottom: "46%" }}>
        <GossipSim running={onScreen} onStatus={setStatus} count={count} />
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-4 border-t border-border bg-muted/30 px-4 py-3">
        <label className="flex flex-1 items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span className="whitespace-nowrap">nodes</span>
          <input
            type="range"
            min={MIN}
            max={MAX}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            aria-label="Number of gossip nodes"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-accent-1 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-1"
          />
          <span className="w-8 text-right text-foreground">{count}</span>
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={addNode}
          disabled={count >= MAX}
        >
          <Plus className="h-3.5 w-3.5" />
          Add node
        </Button>
      </div>

      {/* live status */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border px-4 py-2.5 font-mono text-[11px]">
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
    </div>
  );
}
