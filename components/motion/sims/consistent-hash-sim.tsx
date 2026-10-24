"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";

/* Consistent Hashing — keys and nodes placed on a hash ring (0..1 around the
 * circle). Each key is owned by the first node clockwise. Nodes join/leave
 * periodically; only keys between the changed node and its predecessor move. */

type RingNode = { id: number; pos: number; vnode: boolean };
type Key = { pos: number; owner: number; moving: number }; // moving: anim progress

export function ConsistentHashSim({ running, onStatus }: SimProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const palette = useSimPalette();

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
      for (let i = 0; i < 5; i++)
        nodes.push({ id: nextId++, pos: i / 5 + Math.random() * 0.05, vnode: false });
      for (let i = 0; i < 40; i++)
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
      R = Math.min(width, height) * 0.32;
    }

    init();
    resize();

    // stable color per node id
    const nodeColor = (id: number) => {
      const p = palette.current;
      const arr = [p.accent1, p.accent2, p.accent3];
      return arr[id % 3];
    };

    const ptOnRing = (pos: number, radius: number) => {
      const ang = -Math.PI / 2 + pos * Math.PI * 2 + rotate;
      return [cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius] as const;
    };

    function tick(dt: number) {
      rotate += dt * 0.08;
      eventAt -= dt;
      if (eventAt <= 0) {
        eventAt = 3 + Math.random() * 2;
        if (nodes.length > 3 && Math.random() < 0.45) {
          // remove a node
          nodes.splice(Math.floor(Math.random() * nodes.length), 1);
        } else if (nodes.length < 8) {
          nodes.push({ id: nextId++, pos: Math.random(), vnode: false });
        }
        reassign();
      }
      for (const k of keys) if (k.moving > 0) k.moving = Math.max(0, k.moving - dt * 1.5);
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;

      // ring
      ctx.strokeStyle = rgba(p.border, 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      // keys on inner track
      for (const k of keys) {
        const [x, y] = ptOnRing(k.pos, R - 10 - (k.moving > 0 ? k.moving * 6 : 0));
        const col = k.owner >= 0 ? nodeColor(k.owner) : p.muted;
        ctx.fillStyle = rgba(col, k.moving > 0 ? 0.9 : 0.5);
        ctx.beginPath();
        ctx.arc(x, y, k.moving > 0 ? 2.6 : 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // nodes on the ring
      for (const n of nodes) {
        const [x, y] = ptOnRing(n.pos, R);
        const col = nodeColor(n.id);
        // crisp outer ring instead of a glow
        ctx.strokeStyle = rgba(col, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = rgba(col, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 255, 255], 0.9);
        ctx.font = "600 8px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`N${n.id}`, x, y);
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
