"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";

/**
 * GlobalLoader — a distributed-systems-themed boot sequence shown full-screen
 * on slow loads (or on demand via the navbar toggle). It animates a small
 * cluster coming online: nodes join a ring, exchange heartbeats, elect a
 * leader by quorum, then replicate to consensus — with a progress bar and
 * rotating status lines that read like a real cluster bootstrap.
 */

const BOOT_LINES = [
  "discovering peers…",
  "opening gossip channels…",
  "exchanging heartbeats…",
  "running leader election…",
  "quorum reached — leader elected",
  "replicating log to followers…",
  "committing high-water mark…",
  "cluster healthy — all replicas in sync",
];

export function GlobalLoader({ onDone }: { onDone?: () => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const palette = useSimPalette();
  const [line, setLine] = React.useState(0);
  const [pct, setPct] = React.useState(0);

  // progress + status line stepping
  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const DUR = 2600; // ms to reach 100%
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 2);
      setPct(Math.round(eased * 100));
      setLine(Math.min(BOOT_LINES.length - 1, Math.floor(eased * BOOT_LINES.length)));
      if (t < 1) raf = requestAnimationFrame(step);
      else if (onDone) setTimeout(onDone, 350);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  // the cluster animation
  React.useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctxOrNull = canvas.getContext("2d");
    if (!ctxOrNull) return;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    const SIZE = 180;
    const N = 6;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(SIZE * dpr);
    canvas.height = Math.floor(SIZE * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const R = SIZE * 0.34;

    type Pkt = { from: number; to: number; t: number };
    const pkts: Pkt[] = [];
    let leader = -1;
    let elapsed = 0;
    let beatAt = 0;

    const nodePos = (i: number) => {
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R] as const;
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      const p = palette.current;

      // elect a leader ~1s in
      if (leader < 0 && elapsed > 1) leader = Math.floor(Math.random() * N);

      // emit heartbeat packets periodically
      beatAt -= dt;
      if (beatAt <= 0) {
        beatAt = 0.5;
        if (leader < 0) {
          // pre-election: random gossip
          const a = Math.floor(Math.random() * N);
          let b = Math.floor(Math.random() * N);
          if (b === a) b = (b + 1) % N;
          pkts.push({ from: a, to: b, t: 0 });
        } else {
          // leader → followers
          for (let i = 0; i < N; i++) if (i !== leader) pkts.push({ from: leader, to: i, t: 0 });
        }
      }

      ctx.clearRect(0, 0, SIZE, SIZE);

      // ring guide
      ctx.strokeStyle = rgba(p.border, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      // packets
      for (let i = pkts.length - 1; i >= 0; i--) {
        const pk = pkts[i];
        pk.t += dt * 2.2;
        if (pk.t >= 1) {
          pkts.splice(i, 1);
          continue;
        }
        const [ax, ay] = nodePos(pk.from);
        const [bx, by] = nodePos(pk.to);
        const x = ax + (bx - ax) * pk.t;
        const y = ay + (by - ay) * pk.t;
        ctx.fillStyle = rgba(p.accent2, 0.9);
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // nodes
      for (let i = 0; i < N; i++) {
        const [x, y] = nodePos(i);
        const isLeader = i === leader;
        const col = isLeader ? p.accent1 : p.fg;
        if (isLeader) {
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * 5);
          ctx.strokeStyle = rgba(p.accent1, 0.4 + pulse * 0.3);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(x, y, 11 + pulse * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = rgba(col, 0.92);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        if (isLeader) {
          ctx.fillStyle = rgba(p.bg, 0.95);
          ctx.font = "700 8px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("L", x, y);
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [palette]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <canvas
        ref={canvasRef}
        style={{ width: 180, height: 180 }}
        aria-hidden
      />

      <div className="flex w-64 flex-col items-center gap-3">
        {/* progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent-1 transition-[width] duration-100 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* status line */}
        <div className="flex w-full items-center justify-between font-mono text-[11px]">
          <span className="text-muted-foreground">{BOOT_LINES[line]}</span>
          <span className="text-foreground">{pct}%</span>
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        bootstrapping cluster
      </p>
    </div>
  );
}
