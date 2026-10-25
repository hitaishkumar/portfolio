"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps, SimControl } from "@/components/motion/sim-layer";

/* Consistent Hashing — keys and nodes placed on a hash ring (0..1 around the
 * circle). Each key is owned by the first node clockwise. Nodes join/leave
 * periodically; only keys between the changed node and its predecessor move. */

type RingNode = { id: number; pos: number; vnode: boolean };
type Key = { pos: number; owner: number; moving: number }; // moving: anim progress

export const consistentHashControls: SimControl[] = [
  { key: "nodes", label: "nodes", min: 3, max: 10, default: 5 },
  { key: "keys", label: "keys", min: 10, max: 120, default: 40 },
  { key: "churn", label: "churn", min: 0, max: 10, default: 4 },
];

export function ConsistentHashSim({ running, onStatus, params }: SimProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const palette = useSimPalette();
  const paramsRef = React.useRef(params);
  React.useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  React.useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctxOrNull = canvas.getContext("2d");
    if (!ctxOrNull) return;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let nodes: RingNode[] = [];
    let keys: Key[] = [];
    let nextId = 0;
    let eventAt = 2.5;
    let rotate = 0;

    function ownerOf(pos: number): number {
      // first node clockwise (increasing pos, wrapping)
      let best = -1;
      let bestDelta = Infinity;
      for (const n of nodes) {
        let d = n.pos - pos;
        if (d < 0) d += 1;
        if (d < bestDelta) {
          bestDelta = d;
          best = n.id;
        }
      }
      return best;
    }

    function reassign() {
      for (const k of keys) {
        const o = ownerOf(k.pos);
        if (o !== k.owner) {
          k.owner = o;
          k.moving = 1;
        }
      }
    }

    function init() {
      nodes = [];
      keys = [];
      nextId = 0;
      const n0 = Math.round(paramsRef.current?.nodes ?? 5);
      const k0 = Math.round(paramsRef.current?.keys ?? 40);
      for (let i = 0; i < n0; i++)
        nodes.push({ id: nextId++, pos: i / n0 + Math.random() * 0.05, vnode: false });
      for (let i = 0; i < k0; i++)
        keys.push({ pos: Math.random(), owner: -1, moving: 0 });
      reassign();
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = width / 2;
      cy = height / 2;
      R = Math.min(width, height) * 0.4;
    }

    init();
    resize();

    // stable color per node id
    const nodeColor = (id: number) => {
      const p = palette.current;
      const arr = [p.accent1, p.accent2, p.accent3];
      return arr[id % 3];
    };

    function tick(dt: number) {
      const wantNodes = Math.round(paramsRef.current?.nodes ?? 5);
      const wantKeys = Math.round(paramsRef.current?.keys ?? 40);
      const churn = Math.max(0, paramsRef.current?.churn ?? 4);

      // sync key count live
      if (keys.length !== wantKeys) {
        if (keys.length < wantKeys) {
          for (let i = keys.length; i < wantKeys; i++)
            keys.push({ pos: Math.random(), owner: -1, moving: 1 });
        } else {
          keys.length = wantKeys;
        }
        reassign();
      }

      rotate += dt * 0.08;
      eventAt -= dt;
      if (eventAt <= 0) {
        // churn 0 → slow drift; churn 10 → fast join/leave
        eventAt = churn <= 0 ? 6 : 4.5 - (churn / 10) * 4;
        const n = nodes.length;
        // bias toward the target node count, with churn-driven activity
        if (n > wantNodes || (n > 3 && n >= wantNodes && Math.random() < 0.4)) {
          nodes.splice(Math.floor(Math.random() * nodes.length), 1);
        } else if (n < wantNodes || (n < 10 && Math.random() < 0.4)) {
          nodes.push({ id: nextId++, pos: Math.random(), vnode: false });
        }
        reassign();
      }
      for (const k of keys) if (k.moving > 0) k.moving = Math.max(0, k.moving - dt * 1.5);
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;
      const TAU = Math.PI * 2;
      const angOf = (pos: number) => -Math.PI / 2 + pos * TAU + rotate;

      // sorted node angles (for owned-arc segments)
      const sorted = [...nodes].sort((a, b) => a.pos - b.pos);

      // 1) owned-arc ring — each node colors the arc it owns clockwise.
      //    This is the "aha" of consistent hashing, drawn as a thick soft band.
      if (sorted.length > 0) {
        ctx.lineCap = "butt";
        for (let i = 0; i < sorted.length; i++) {
          const n = sorted[i];
          const next = sorted[(i + 1) % sorted.length];
          const a0 = angOf(n.pos);
          let a1 = angOf(next.pos);
          if (a1 <= a0) a1 += TAU;
          ctx.strokeStyle = rgba(nodeColor(n.id), 0.22);
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(cx, cy, R, a0, a1);
          ctx.stroke();
        }
      }

      // 2) crisp primary ring (hairline over the band)
      ctx.lineCap = "butt";
      ctx.strokeStyle = rgba(p.fg, 0.28);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();

      // 3) faint dashed inner guide ring (quiet structural detail)
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = rgba(p.muted, 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.82, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4) keys gliding just inside the ring, tinted by owner
      for (const k of keys) {
        const rr = R * 0.82 + (k.moving > 0 ? k.moving * 10 : 0);
        const a = angOf(k.pos);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        const col = k.owner >= 0 ? nodeColor(k.owner) : p.muted;
        ctx.fillStyle = rgba(col, k.moving > 0 ? 0.95 : 0.55);
        ctx.beginPath();
        ctx.arc(x, y, k.moving > 0 ? 2.6 : 1.6, 0, TAU);
        ctx.fill();
      }

      // 5) refined node "pins" sitting on the ring
      for (const n of nodes) {
        const a = angOf(n.pos);
        const x = cx + Math.cos(a) * R;
        const y = cy + Math.sin(a) * R;
        const col = nodeColor(n.id);
        // soft halo (single arc, cheap)
        ctx.fillStyle = rgba(col, 0.12);
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, TAU);
        ctx.fill();
        // thin outer ring
        ctx.strokeStyle = rgba(col, 0.55);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, TAU);
        ctx.stroke();
        // filled dot
        ctx.fillStyle = rgba(col, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, TAU);
        ctx.fill();
        // label
        ctx.fillStyle = rgba(p.bg, 0.95);
        ctx.font = "700 8px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${n.id}`, x, y);
      }

      // 6) quiet center label
      ctx.fillStyle = rgba(p.muted, 0.5);
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("hash ring", cx, cy - 6);
      ctx.fillStyle = rgba(p.fg, 0.7);
      ctx.font = "700 13px ui-monospace, monospace";
      ctx.fillText(`${nodes.length} nodes`, cx, cy + 9);
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
        const moving = keys.filter((k) => k.moving > 0).length;
        onStatus?.({
          nodes: String(nodes.length),
          keys: String(keys.length),
          rebalancing: moving > 0 ? `${moving} keys` : "stable",
          "load/node": `~${Math.round(keys.length / Math.max(nodes.length, 1))}`,
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
