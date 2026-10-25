"use client";

import * as React from "react";
import { rgba, useSimPalette, type RGB } from "@/components/motion/sim-core";
import type { SimProps, SimControl } from "@/components/motion/sim-layer";

/* Vector Clocks — a space-time diagram. P processes run as vertical lifelines;
 * local events bump the process's own component; messages carry a vector
 * timestamp and the receiver takes the component-wise max, then +1. */

type Ev = { proc: number; y: number; vec: number[]; kind: "local" | "send" | "recv" };
type Msg = { fromProc: number; toProc: number; y0: number; y1: number; vec: number[] };

export const vectorClockControls: SimControl[] = [
  { key: "procs", label: "processes", min: 2, max: 5, default: 3 },
  { key: "rate", label: "events/s", min: 1, max: 6, default: 2 },
];

export function VectorClockSim({ running, onStatus, params }: SimProps) {
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
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const lanes: number[] = [];

    let P = Math.round(paramsRef.current?.procs ?? 3);
    let clocks = Array.from({ length: P }, () => Array(P).fill(0));
    const events: Ev[] = [];
    const msgs: Msg[] = [];
    let scroll = 0;
    let nextAt = 0;
    let msgCount = 0;

    function layoutLanes() {
      lanes.length = 0;
      for (let i = 0; i < P; i++)
        lanes.push(width * (0.3 + (i * 0.4) / Math.max(1, P - 1)));
    }

    function rebuild(newP: number) {
      P = newP;
      clocks = Array.from({ length: P }, () => Array(P).fill(0));
      events.length = 0;
      msgs.length = 0;
      layoutLanes();
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutLanes();
    }
    resize();

    const palColor = (i: number): RGB => {
      const pal = palette.current;
      return [pal.accent1, pal.accent2, pal.accent3][i % 3];
    };

    function tick(dt: number) {
      // live params: rebuild if process count changed
      const wantP = Math.round(paramsRef.current?.procs ?? 3);
      if (wantP !== P) rebuild(wantP);
      const rate = Math.max(0.5, paramsRef.current?.rate ?? 2);

      scroll += dt * 26; // px/sec downward flow
      nextAt -= dt;
      if (nextAt <= 0) {
        nextAt = 1 / rate;
        const proc = Math.floor(Math.random() * P);
        const y = scroll + height + 20;
        // decide: local event or a send to another process
        if (Math.random() < 0.55) {
          clocks[proc][proc] += 1;
          events.push({ proc, y, vec: [...clocks[proc]], kind: "send" });
          let to = proc;
          while (to === proc) to = Math.floor(Math.random() * P);
          // receiver merges a bit later down its lane
          const vecSnapshot = [...clocks[proc]];
          const y1 = y + 70 + Math.random() * 40;
          msgs.push({ fromProc: proc, toProc: to, y0: y, y1, vec: vecSnapshot });
          msgCount++;
          // apply merge to receiver clock now (its event drawn on arrival)
          for (let k = 0; k < P; k++)
            clocks[to][k] = Math.max(clocks[to][k], vecSnapshot[k]);
          clocks[to][to] += 1;
          events.push({ proc: to, y: y1, vec: [...clocks[to]], kind: "recv" });
        } else {
          clocks[proc][proc] += 1;
          events.push({ proc, y, vec: [...clocks[proc]], kind: "local" });
        }
      }
      // cull offscreen (above viewport after scroll)
      const cutoff = scroll - 40;
      while (events.length && events[0].y < cutoff) events.shift();
      while (msgs.length && msgs[0].y1 < cutoff) msgs.shift();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;
      // lifelines
      for (let i = 0; i < P; i++) {
        ctx.strokeStyle = rgba(p.border, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lanes[i], 0);
        ctx.lineTo(lanes[i], height);
        ctx.stroke();
        ctx.fillStyle = rgba(palColor(i), 0.8);
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`P${i}`, lanes[i], 14);
      }
      // messages (diagonal arrows)
      for (const m of msgs) {
        const x0 = lanes[m.fromProc];
        const x1 = lanes[m.toProc];
        const y0 = m.y0 - scroll;
        const y1 = m.y1 - scroll;
        ctx.strokeStyle = rgba(p.accent2, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        // arrowhead
        const ang = Math.atan2(y1 - y0, x1 - x0);
        ctx.fillStyle = rgba(p.accent2, 0.7);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - 6 * Math.cos(ang - 0.4), y1 - 6 * Math.sin(ang - 0.4));
        ctx.lineTo(x1 - 6 * Math.cos(ang + 0.4), y1 - 6 * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fill();
      }
      // events + vector labels
      for (const e of events) {
        const x = lanes[e.proc];
        const y = e.y - scroll;
        if (y < -20 || y > height + 20) continue;
        const col = palColor(e.proc);
        ctx.fillStyle = rgba(col, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, e.kind === "local" ? 3 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(p.fg, 0.7);
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = e.proc === P - 1 ? "right" : "left";
        const off = e.proc === P - 1 ? -8 : 8;
        ctx.fillText(`[${e.vec.join(",")}]`, x + off, y + 3);
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
          processes: String(P),
          messages: String(msgCount),
          "P0 clock": `[${clocks[0].join(",")}]`,
          "P1 clock": `[${clocks[1].join(",")}]`,
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
