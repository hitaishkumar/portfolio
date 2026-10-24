"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";

/* ------------------------------------------------------------------ *
 * NX Wait-Time Staging (detailed, ClickHouse ReplacingMergeTree).
 * Each wait_time>0 message appends a staging row:  [encoded_id | flag | wait]
 *   • flag=0 pending, with a draining wait-time countdown bar
 *   • a vendor webhook can confirm success BEFORE the deadline → flag=+1
 *   • if the deadline drains first → the Flusher routes to failure → flag=-1
 * Every append bumps the part count; a background ReplacingMergeTree merge
 * periodically compacts resolved rows to their latest version (parts drop,
 * a merge flash plays). The right panel plots the live part-count sparkline.
 * ------------------------------------------------------------------ */

type Flag = 0 | 1 | -1;
type Row = {
  id: string;
  flag: Flag;
  age: number;
  deadline: number;
  resolved: boolean;
  appear: number; // entry anim 0..1
  settle: number; // post-resolve dwell before merge eligibility
  flashT: number; // resolution flash
};

const MAX_ROWS = 12;

export function StagingFlagSim({ running, onStatus }: SimProps) {
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

    let rows: Row[] = [];
    let nextId = 0x4a1b;
    let appendAt = 0;
    let mergeAt = 3.4;
    let mergeFlash = 0;
    let parts = 1;
    const partsHistory: number[] = [];
    let histAcc = 0;

    let webhookCount = 0;
    let flushCount = 0;
    let merges = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    function hex(n: number) {
      return n.toString(16).padStart(4, "0");
    }

    function tick(dt: number) {
      if (mergeFlash > 0) mergeFlash -= dt;

      appendAt -= dt;
      if (appendAt <= 0 && rows.length < MAX_ROWS) {
        appendAt = 0.55 + Math.random() * 0.5;
        rows.push({
          id: hex(nextId++),
          flag: 0,
          age: 0,
          deadline: 2.2 + Math.random() * 3,
          resolved: false,
          appear: 0,
          settle: 0,
          flashT: 0,
        });
        parts += 1;
      }

      for (const r of rows) {
        if (r.appear < 1) r.appear = Math.min(1, r.appear + dt * 4);
        if (r.flashT > 0) r.flashT -= dt;
        if (r.resolved) {
          r.settle += dt;
          continue;
        }
        r.age += dt;
        // webhook may confirm before the deadline
        if (r.age < r.deadline && Math.random() < dt * 0.45) {
          r.flag = 1;
          r.resolved = true;
          r.flashT = 0.6;
          parts += 1; // appended +1 version
          webhookCount++;
        } else if (r.age >= r.deadline) {
          r.flag = -1;
          r.resolved = true;
          r.flashT = 0.6;
          parts += 1; // appended -1 version
          flushCount++;
        }
      }

      // ReplacingMergeTree background merge: compact settled resolved rows
      mergeAt -= dt;
      if (mergeAt <= 0) {
        mergeAt = 2.8 + Math.random();
        const before = rows.length;
        rows = rows.filter((r) => !(r.resolved && r.settle > 0.7));
        if (rows.length < before) {
          merges++;
          mergeFlash = 0.6;
          parts = Math.max(1, Math.round(parts * 0.4)); // compaction
        }
      }

      // part-count sparkline sampling
      histAcc += dt;
      if (histAcc >= 0.25) {
        histAcc = 0;
        partsHistory.push(parts);
        if (partsHistory.length > 60) partsHistory.shift();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;
      const colFor = (f: Flag) =>
        f === 0 ? p.accent2 : f === 1 ? p.accent1 : p.accent3;

      // ===== left: staging table =====
      const tableX = width * 0.06;
      const tableTop = height * 0.2;
      const tableW = width * 0.56;
      const rowH = 14;
      const gap = 4;

      ctx.textAlign = "left";
      ctx.fillStyle = rgba(p.fg, 0.9);
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillText("staging table", tableX, tableTop - 20);
      ctx.fillStyle = rgba(p.muted, 0.8);
      ctx.font = "7.5px ui-monospace, monospace";
      ctx.fillText("ReplacingMergeTree · ORDER BY (key, updated_at)", tableX, tableTop - 9);

      // column headers
      const cId = tableX + 4;
      const cFlag = tableX + tableW * 0.34;
      const cWait = tableX + tableW * 0.46;
      ctx.fillStyle = rgba(p.muted, 0.75);
      ctx.font = "7px ui-monospace, monospace";
      ctx.fillText("encoded_id", cId, tableTop - 1);
      ctx.fillText("flag", cFlag, tableTop - 1);
      ctx.fillText("wait_time", cWait, tableTop - 1);

      rows.forEach((r, i) => {
        const y = tableTop + 4 + i * (rowH + gap);
        if (y > height - 14) return;
        const col = colFor(r.flag);
        const alpha = 0.5 + 0.5 * r.appear;

        // row background (flash on resolution)
        if (r.flashT > 0) {
          ctx.fillStyle = rgba(col, 0.25 * (r.flashT / 0.6));
          ctx.fillRect(tableX, y - 2, tableW, rowH + 2);
        }
        // row baseline
        ctx.strokeStyle = rgba(p.border, 0.5);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(tableX, y + rowH);
        ctx.lineTo(tableX + tableW, y + rowH);
        ctx.stroke();

        // encoded_id
        ctx.fillStyle = rgba(p.fg, 0.75 * alpha);
        ctx.font = "8px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.fillText(`0x${r.id}`, cId, y + rowH - 3);

        // flag badge
        const label = r.flag === 0 ? "0" : r.flag === 1 ? "+1" : "−1";
        ctx.fillStyle = rgba(col, 0.2);
        ctx.fillRect(cFlag - 2, y, 22, rowH - 1);
        ctx.fillStyle = rgba(col, 0.95 * alpha);
        ctx.font = "700 8px ui-monospace, monospace";
        ctx.fillText(label, cFlag, y + rowH - 3);

        // wait-time countdown bar (only meaningful while pending)
        const barX = cWait;
        const barW = tableX + tableW - barX - 4;
        ctx.fillStyle = rgba(p.border, 0.5);
        ctx.fillRect(barX, y + 2, barW, rowH - 5);
        if (r.flag === 0) {
          const remaining = Math.max(0, 1 - r.age / r.deadline);
          ctx.fillStyle = rgba(p.accent2, 0.7);
          ctx.fillRect(barX, y + 2, barW * remaining, rowH - 5);
        } else if (r.flag === 1) {
          // webhook glyph
          ctx.fillStyle = rgba(p.accent1, 0.85 * alpha);
          ctx.fillText("✓ webhook", barX + 2, y + rowH - 3);
        } else {
          ctx.fillStyle = rgba(p.accent3, 0.85 * alpha);
          ctx.fillText("⏱ flushed", barX + 2, y + rowH - 3);
        }
      });

      // ===== right: parts + merge panel =====
      const panelX = width * 0.68;
      const panelW = width * 0.28;
      const panelTop = height * 0.2;

      ctx.textAlign = "left";
      ctx.fillStyle = rgba(p.fg, 0.9);
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillText("data parts", panelX, panelTop - 9);

      // big part count (flash on merge)
      ctx.fillStyle = rgba(mergeFlash > 0 ? p.accent1 : p.fg, 0.95);
      ctx.font = "700 22px ui-monospace, monospace";
      ctx.fillText(String(parts), panelX, panelTop + 20);
      ctx.fillStyle = rgba(p.muted, 0.8);
      ctx.font = "7.5px ui-monospace, monospace";
      ctx.fillText(mergeFlash > 0 ? "merging…" : "parts", panelX + 2, panelTop + 32);

      // sparkline of part count over time
      const sx = panelX;
      const sy = panelTop + 44;
      const sw = panelW;
      const sh = height * 0.3;
      ctx.strokeStyle = rgba(p.border, 0.5);
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, sw, sh);
      if (partsHistory.length > 1) {
        const maxP = Math.max(6, ...partsHistory);
        ctx.strokeStyle = rgba(p.accent1, 0.85);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        partsHistory.forEach((v, i) => {
          const x = sx + (sw * i) / (partsHistory.length - 1);
          const y = sy + sh - (sh * v) / maxP;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // legend
      const ly = sy + sh + 14;
      const legend: [string, [number, number, number]][] = [
        ["0 pending", p.accent2],
        ["+1 webhook", p.accent1],
        ["−1 flushed", p.accent3],
      ];
      legend.forEach((l, i) => {
        const yy = ly + i * 13;
        ctx.fillStyle = rgba(l[1], 0.9);
        ctx.fillRect(panelX, yy - 7, 9, 9);
        ctx.fillStyle = rgba(p.muted, 0.9);
        ctx.font = "7.5px ui-monospace, monospace";
        ctx.fillText(l[0], panelX + 13, yy);
      });
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
        const pending = rows.filter((r) => r.flag === 0).length;
        onStatus?.({
          "staged rows": String(rows.length),
          pending: String(pending),
          "webhook +1": String(webhookCount),
          "flushed −1": String(flushCount),
          parts: String(parts),
          merges: String(merges),
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
