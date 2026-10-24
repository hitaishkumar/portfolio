"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";

/* Gossip / epidemic dissemination — one node starts with a new rumor and each
 * round randomly "pushes" it to a peer. Infected nodes multiply until the whole
 * cluster converges, then a fresh rumor starts. Classic log(n) spread. */

type GNode = { x: number; y: number; infected: boolean; since: number };
type Push = { from: number; to: number; t: number };

export function GossipSim({
  running,
  onStatus,
  count = 24,
}: SimProps & { count?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const palette = useSimPalette();
  const countRef = React.useRef(count);
  React.useEffect(() => {
    countRef.current = count;
  }, [count]);

  React.useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctxOrNull = canvas.getContext("2d");
    if (!ctxOrNull) return;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let nodes: GNode[] = [];
    const pushes: Push[] = [];
    let round = 0;
    let roundAt = 0;
    let rumor = 1;
    let laidOutCount = 0; // track how many nodes we laid out, to re-layout on change

    function layout() {
      const total = Math.max(2, Math.round(countRef.current));
      // near-square grid that fits `total` nodes
      const cols = Math.ceil(Math.sqrt(total));
      const rows = Math.ceil(total / cols);
      nodes = [];
      for (let i = 0; i < total; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        nodes.push({
          x:
            width * (0.12 + (c / Math.max(1, cols - 1)) * 0.76) +
            (Math.random() - 0.5) * 14,
          y:
            height * (0.14 + (r / Math.max(1, rows - 1)) * 0.72) +
            (Math.random() - 0.5) * 14,
          infected: false,
          since: 0,
        });
      }
      nodes[Math.floor(Math.random() * nodes.length)].infected = true;
      round = 0;
      laidOutCount = total;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }
    resize();

    function tick(dt: number) {
      // re-layout if the requested node count changed
      if (Math.round(countRef.current) !== laidOutCount) {
        layout();
      }
      roundAt -= dt;
      if (roundAt <= 0) {
        roundAt = 1.1;
        const infected = nodes.map((n, i) => (n.infected ? i : -1)).filter((i) => i >= 0);
        if (infected.length === nodes.length) {
          // converged → start a new rumor
          rumor++;
          for (const n of nodes) n.infected = false;
          nodes[Math.floor(Math.random() * nodes.length)].infected = true;
          round = 0;
        } else {
          round++;
          // each infected node pushes to one random peer
          for (const i of infected) {
            const to = Math.floor(Math.random() * nodes.length);
            if (to !== i) pushes.push({ from: i, to, t: 0 });
          }
        }
      }
      for (let i = pushes.length - 1; i >= 0; i--) {
        pushes[i].t += dt * 1.8;
        if (pushes[i].t >= 1) {
          const n = nodes[pushes[i].to];
          if (!n.infected) {
            n.infected = true;
            n.since = 0;
          }
          pushes.splice(i, 1);
        }
      }
      for (const n of nodes) if (n.infected) n.since += dt;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;

      // pushes (arrows)
      for (const pu of pushes) {
        const a = nodes[pu.from];
        const b = nodes[pu.to];
        const x = a.x + (b.x - a.x) * pu.t;
        const y = a.y + (b.y - a.y) * pu.t;
        ctx.strokeStyle = rgba(p.accent2, 0.25);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        // flat packet dot
        ctx.fillStyle = rgba(p.accent2, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // nodes
      for (const n of nodes) {
        const col = n.infected ? p.accent1 : p.muted;
        if (n.infected) {
          // brief expanding ring on infection (crisp, not a glow)
          const pulse = Math.max(0, 1 - n.since * 1.5);
          if (pulse > 0) {
            ctx.strokeStyle = rgba(p.accent1, 0.5 * pulse);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 6 + (1 - pulse) * 8, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.fillStyle = rgba(col, n.infected ? 0.95 : 0.4);
        ctx.beginPath();
        ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let raf = 0;
    let last = performance.now();
    let statusAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (running) tick(dt);
      draw();
      statusAcc += dt;
      if (statusAcc > 0.4) {
        statusAcc = 0;
        const inf = nodes.filter((n) => n.infected).length;
        onStatus?.({
          nodes: String(nodes.length),
          infected: `${inf}/${nodes.length}`,
          round: String(round),
          rumor: `#${rumor}`,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [running, onStatus, palette]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
