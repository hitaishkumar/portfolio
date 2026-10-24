"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";

/* LSM-tree compaction (horizontal) — writes fill a memtable on the LEFT; when
 * full it flushes to an L0 SSTable; when a level has too many segments they
 * compact (merge) into one larger segment at the NEXT column to the right.
 * Levels flow left→right (L0 → L1 → L2); segments stack vertically per level.
 * Models write-amplification visually. */

type Seg = {
  level: number;
  slot: number;
  size: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  age: number;
};

export function LsmSim({ running, onStatus }: SimProps) {
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

    const LEVELS = 3;
    const FANOUT = [4, 3, 2]; // max segments per level before compaction
    let memFill = 0;
    let segs: Seg[] = [];
    let writeAt = 0;
    let flushes = 0;
    let compactions = 0;

    // Horizontal layout: memtable col, then L0 / L1 / L2 columns left → right.
    const memX = () => width * 0.12;
    // level column x positions spread across the remaining width
    const levelX = (lvl: number) =>
      width * 0.32 + (lvl * (width * 0.6)) / (LEVELS - 1);
    // segments stack vertically within a level column, centered on midline
    const laneH = () => Math.min(height * 0.72, 220);
    function slotPos(level: number, slot: number) {
      const h = laneH();
      const top = height / 2 - h / 2;
      const segH = h / (FANOUT[level] + 1);
      return { x: levelX(level), y: top + slot * segH + segH / 2 };
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const s of segs) {
        const p = slotPos(s.level, s.slot);
        s.tx = p.x;
        s.ty = p.y;
      }
    }
    resize();

    function relayout(level: number) {
      const inLevel = segs.filter((s) => s.level === level);
      inLevel.forEach((s, i) => {
        s.slot = i;
        const p = slotPos(level, i);
        s.tx = p.x;
        s.ty = p.y;
      });
    }

    function flush() {
      const lvl0 = segs.filter((s) => s.level === 0).length;
      const start = slotPos(0, lvl0);
      segs.push({
        level: 0,
        slot: lvl0,
        size: 1,
        x: memX(), // spawn from the memtable, animate rightward to L0
        y: height / 2,
        tx: start.x,
        ty: start.y,
        age: 0,
      });
      flushes++;
      memFill = 0;
      relayout(0);
      maybeCompact(0);
    }

    function maybeCompact(level: number) {
      const inLevel = segs.filter((s) => s.level === level);
      if (inLevel.length > FANOUT[level] && level < LEVELS - 1) {
        const mergedSize = inLevel.reduce((a, s) => a + s.size, 0);
        segs = segs.filter((s) => s.level !== level);
        const nextSlot = segs.filter((s) => s.level === level + 1).length;
        const p = slotPos(level + 1, nextSlot);
        segs.push({
          level: level + 1,
          slot: nextSlot,
          size: mergedSize,
          x: levelX(level), // start at the merged-away column, slide right
          y: height / 2,
          tx: p.x,
          ty: p.y,
          age: 0,
        });
        compactions++;
        relayout(level + 1);
        maybeCompact(level + 1);
      }
    }

    function tick(dt: number) {
      writeAt -= dt;
      if (writeAt <= 0) {
        writeAt = 0.5 + Math.random() * 0.3;
        memFill += 0.34;
        if (memFill >= 1) flush();
      }
      for (const s of segs) {
        s.x += (s.tx - s.x) * Math.min(1, dt * 6);
        s.y += (s.ty - s.y) * Math.min(1, dt * 6);
        s.age += dt;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;
      const h = laneH();
      const top = height / 2 - h / 2;

      // memtable (vertical bar, left) — fills bottom-up as writes arrive
      const mx = memX();
      const memW = 20;
      ctx.strokeStyle = rgba(p.border, 0.7);
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - memW / 2, top, memW, h);
      const fillH = h * memFill;
      ctx.fillStyle = rgba(p.accent2, 0.5);
      ctx.fillRect(mx - memW / 2, top + h - fillH, memW, fillH);
      ctx.fillStyle = rgba(p.muted, 0.85);
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("memtable", mx, top - 8);

      // level column headers + guide lines
      const segColor = (lvl: number) => [p.accent2, p.accent1, p.accent3][lvl % 3];
      for (let l = 0; l < LEVELS; l++) {
        const lx = levelX(l);
        ctx.strokeStyle = rgba(p.border, 0.3);
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, top - 2);
        ctx.lineTo(lx, top + h + 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = rgba(p.muted, 0.75);
        ctx.font = "600 9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`L${l}`, lx, top - 8);
      }

      // segments — width scales with merged size, height fixed per lane slot
      for (const s of segs) {
        const laneSegH = (h / (FANOUT[s.level] + 1)) * 0.78;
        const segW = (18 + s.level * 10) * Math.min(1.8, s.size);
        const col = segColor(s.level);
        const appear = Math.min(1, s.age * 3);
        ctx.fillStyle = rgba(col, 0.75 * appear + 0.1);
        ctx.strokeStyle = rgba(col, 0.9);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(s.x - segW / 2, s.y - laneSegH / 2, segW, laneSegH, 2);
        ctx.fill();
        ctx.stroke();
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
          memtable: `${Math.round(memFill * 100)}%`,
          "L0 / L1 / L2": [0, 1, 2]
            .map((l) => segs.filter((s) => s.level === l).length)
            .join(" / "),
          flushes: String(flushes),
          compactions: String(compactions),
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
