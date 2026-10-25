"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps, SimControl } from "@/components/motion/sim-layer";

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

export const lsmControls: SimControl[] = [
  { key: "writeRate", label: "writes/s", min: 1, max: 14, default: 8 },
  { key: "fanout", label: "fanout", min: 2, max: 6, default: 3 },
];

/* Colors derive from the active theme palette each frame (role-mapped per
 * level) so the whole sim re-skins with the site while staying readable. */

export function LsmSim({ running, onStatus, params }: SimProps) {
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

    const LEVELS = 3;
    // fanout per level (max segments before compaction) — tunable live
    const FANOUT = [4, 3, 2];
    let memFill = 0;
    let segs: Seg[] = [];
    let writeAt = 0;
    let flushes = 0;
    let compactions = 0;

    // Horizontal layout: memtable col, then L0 / L1 / L2 columns left → right.
    const memX = () => width * 0.08;
    // level column x positions spread across (nearly) the full width
    const levelX = (lvl: number) =>
      width * 0.26 + (lvl * (width * 0.66)) / (LEVELS - 1);
    // segments stack vertically within a level column — use most of the height
    const laneH = () => height * 0.84;
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
      // live params
      const writeRate = Math.max(0.5, paramsRef.current?.writeRate ?? 2);
      const fanout = Math.round(paramsRef.current?.fanout ?? 4);
      FANOUT[0] = Math.max(2, fanout);
      FANOUT[1] = Math.max(2, fanout - 1);
      FANOUT[2] = Math.max(2, fanout - 2);

      writeAt -= dt;
      if (writeAt <= 0) {
        writeAt = 1 / writeRate;
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
      const pal = palette.current;
      // role map: memtable = accent2, levels L0/L1/L2 = accent2/accent1/accent3,
      // frames = border, labels = muted. Low-alpha fills keep text readable.
      const LSM = {
        mem: pal.accent2,
        level: [pal.accent2, pal.accent1, pal.accent3] as [
          number,
          number,
          number
        ][],
        frame: pal.border,
        label: pal.muted,
      };
      const h = laneH();
      const top = height / 2 - h / 2;

      // memtable (vertical bar, left) — fills bottom-up as writes arrive
      const mx = memX();
      const memW = Math.max(20, width * 0.022);
      ctx.strokeStyle = rgba(LSM.frame, 0.55);
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - memW / 2, top, memW, h);
      const fillH = h * memFill;
      ctx.fillStyle = rgba(LSM.mem, 0.28);
      ctx.fillRect(mx - memW / 2, top + h - fillH, memW, fillH);
      ctx.fillStyle = rgba(LSM.label, 0.85);
      ctx.font = "600 10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("memtable", mx, top - 8);

      // level column headers + guide lines
      const segColor = (lvl: number) => LSM.level[lvl % LSM.level.length];
      for (let l = 0; l < LEVELS; l++) {
        const lx = levelX(l);
        ctx.strokeStyle = rgba(LSM.frame, 0.3);
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, top - 2);
        ctx.lineTo(lx, top + h + 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = rgba(segColor(l), 0.85);
        ctx.font = "700 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`L${l}`, lx, top - 8);
      }

      // segments — width scales with merged size + canvas, height per lane slot
      const baseW = Math.max(22, width * 0.03);
      for (const s of segs) {
        const laneSegH = (h / (FANOUT[s.level] + 1)) * 0.8;
        const segW = (baseW + s.level * baseW * 0.5) * Math.min(1.8, s.size);
        const col = segColor(s.level);
        const appear = Math.min(1, s.age * 3);
        // light fill (keeps text readable) + a crisp colored border for contrast
        ctx.fillStyle = rgba(col, 0.16 * appear + 0.04);
        ctx.strokeStyle = rgba(col, 0.85 * appear + 0.1);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(s.x - segW / 2, s.y - laneSegH / 2, segW, laneSegH, 3);
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
