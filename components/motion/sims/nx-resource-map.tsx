"use client";

import * as React from "react";
import { rgba, useSimPalette, type RGB } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";
import {
  resNodes,
  resEdges,
  type NodeRole,
  type ResLayer,
} from "@/lib/nx-resource-map";

/* ------------------------------------------------------------------ *
 * NX Resource Orchestration Map — a layered infrastructure diagram
 * (Entry/LB → ECS Compute → Message Broker → Data), color-coded by role
 * per the LLD legend, with live data-flow packets travelling the real
 * edges (control / data / success / failure paths).
 * ------------------------------------------------------------------ */

const LAYERS: { id: ResLayer; label: string }[] = [
  { id: "entry", label: "ENTRY · LOAD BALANCING" },
  { id: "compute", label: "ECS COMPUTE · ARM64 / GRAVITON" },
  { id: "broker", label: "MESSAGE BROKER" },
  { id: "data", label: "DATA LAYER" },
];

type Packet = { edge: number; t: number; speed: number };

export function ResourceMap({ running, onStatus }: SimProps) {
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
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // node positions resolved on resize
    const pos: Record<string, { x: number; y: number; w: number; h: number }> = {};
    const packets: Packet[] = [];
    let spawnAt = 0;
    let inFlight = 0;

    const PAD_X = 0.03;
    const layerIndex = (l: ResLayer) => LAYERS.findIndex((x) => x.id === l);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const top = height * 0.04;
      const laneH = (height * 0.92) / LAYERS.length;
      const nodeW = Math.min(width * 0.15, 120);
      const nodeH = Math.min(laneH * 0.42, 34);
      for (const n of resNodes) {
        const li = layerIndex(n.layer);
        const laneTop = top + li * laneH;
        const usableW = width * (1 - PAD_X * 2) - nodeW;
        const x = width * PAD_X + n.col * usableW;
        const y = laneTop + laneH / 2 - nodeH / 2 + laneH * 0.08;
        pos[n.id] = { x, y, w: nodeW, h: nodeH };
      }
    }
    resize();

    const roleColor = (role: NodeRole): RGB => {
      const p = palette.current;
      switch (role) {
        case "core":
          return p.accent3; // violet-ish for core/pink
        case "support":
          return p.accent2; // cyan/blue
        case "broker":
          return [34, 197, 94]; // green
        case "storage":
          return [180, 120, 70]; // brown
        case "observ":
          return p.muted;
        default:
          return p.fg; // entry
      }
    };

    const center = (id: string) => {
      const b = pos[id];
      return [b.x + b.w / 2, b.y + b.h / 2] as const;
    };

    function tick(dt: number) {
      spawnAt -= dt;
      if (spawnAt <= 0) {
        spawnAt = 0.22 + Math.random() * 0.2;
        // bias spawns toward the main data path edges
        const edge = Math.floor(Math.random() * resEdges.length);
        packets.push({ edge, t: 0, speed: 0.5 + Math.random() * 0.5 });
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        packets[i].t += packets[i].speed * dt;
        if (packets[i].t >= 1) packets.splice(i, 1);
      }
      inFlight = packets.length;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;
      const top = height * 0.04;
      const laneH = (height * 0.92) / LAYERS.length;

      // lane bands + labels
      LAYERS.forEach((ln, i) => {
        const y = top + i * laneH;
        ctx.fillStyle = rgba(p.muted, i % 2 === 0 ? 0.04 : 0.02);
        ctx.fillRect(0, y, width, laneH);
        ctx.fillStyle = rgba(p.muted, 0.7);
        ctx.font = "600 7px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.fillText(ln.label, 6, y + 11);
      });

      // edges
      const edgeColor = (k: string): RGB =>
        k === "success"
          ? [34, 197, 94]
          : k === "failure"
          ? p.accent3
          : k === "data"
          ? p.accent2
          : p.muted;
      resEdges.forEach((e) => {
        const [ax, ay] = center(e.from);
        const [bx, by] = center(e.to);
        ctx.strokeStyle = rgba(edgeColor(e.kind), 0.22);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      });

      // packets travelling edges
      for (const pk of packets) {
        const e = resEdges[pk.edge];
        if (!e) continue;
        const [ax, ay] = center(e.from);
        const [bx, by] = center(e.to);
        const x = ax + (bx - ax) * pk.t;
        const y = ay + (by - ay) * pk.t;
        ctx.fillStyle = rgba(edgeColor(e.kind), 0.9);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // nodes
      for (const n of resNodes) {
        const b = pos[n.id];
        const col = roleColor(n.role);
        // body
        ctx.fillStyle = rgba(col, 0.16);
        ctx.strokeStyle = rgba(col, 0.85);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 4);
        ctx.fill();
        ctx.stroke();
        // label
        ctx.fillStyle = rgba(p.fg, 0.92);
        ctx.font = "600 8px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(n.label, b.x + b.w / 2, b.y + (n.sub ? b.h / 2 - 1 : b.h / 2 + 3));
        if (n.sub) {
          ctx.fillStyle = rgba(p.muted, 0.85);
          ctx.font = "6.5px ui-monospace, monospace";
          ctx.fillText(n.sub, b.x + b.w / 2, b.y + b.h / 2 + 9);
        }
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
        onStatus?.({
          resources: String(resNodes.length),
          layers: String(LAYERS.length),
          edges: String(resEdges.length),
          "packets in flight": String(inFlight),
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
