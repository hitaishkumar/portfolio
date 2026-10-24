"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";

/* ------------------------------------------------------------------ *
 * NX Consumer Engine (detailed).
 * The vendor queue feeds a semaphore-bounded worker pool. Each accepted
 * message is a goroutine that walks 5 pipeline stages, drawn as columns:
 *   1 validate · 2 fetch deps · 3 template · 4 vendor send · 5 stage/ack
 * A worker is a dot moving left→right across the stage lanes. Failures peel
 * off to the DLQ; completions emit an audit packet that buffers and then
 * batch-flushes to ClickHouse on a ticker. QoS prefetch = semaphore size.
 * ------------------------------------------------------------------ */

const STEPS = ["validate", "fetch deps", "template", "vendor send", "stage/ack"];
const SLOTS = 14; // semaphore capacity (QoS prefetch), visual stand-in for 1000

type Phase = "pipeline" | "to-dlq" | "to-ch";
type Worker = {
  active: boolean;
  step: number; // 0..4 current stage
  stepT: number; // 0..1 progress within stage
  failAt: number; // step index this msg fails at, or -1
  phase: Phase;
  // packet animation when leaving (to DLQ or CH)
  px: number;
  py: number;
  ptx: number;
  pty: number;
  pt: number;
  lane: number; // vertical lane assignment while in pipeline
};

export function ConsumerEngineSim({ running, onStatus }: SimProps) {
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

    // layout regions (computed on resize)
    let laneTop = 0;
    let laneBot = 0;
    let stageX: number[] = []; // x center of each of the 5 stage columns
    let queueX = 0;
    let dlqPt: [number, number] = [0, 0];
    let chPt: [number, number] = [0, 0];

    const workers: Worker[] = Array.from({ length: SLOTS }, () => ({
      active: false,
      step: 0,
      stepT: 0,
      failAt: -1,
      phase: "pipeline" as Phase,
      px: 0,
      py: 0,
      ptx: 0,
      pty: 0,
      pt: 0,
      lane: 0,
    }));

    let backlog = 30;
    let processed = 0;
    let dlq = 0;
    let auditBuffer = 0;
    let flushed = 0;
    let flushAt = 2.2;
    let flushPulse = 0;
    let refillAt = 0;
    let lastThroughput = 0;
    let processedWindow = 0;
    let windowAcc = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      laneTop = height * 0.26;
      laneBot = height * 0.82;
      queueX = width * 0.09;
      // 5 stage columns spread across the middle band
      const x0 = width * 0.26;
      const x1 = width * 0.76;
      stageX = STEPS.map((_, i) => x0 + ((x1 - x0) * i) / (STEPS.length - 1));
      dlqPt = [width * 0.9, laneBot + (height - laneBot) * 0.4];
      chPt = [width * 0.9, height * 0.12];
    }
    resize();

    const laneY = (lane: number) =>
      laneTop + ((laneBot - laneTop) * (lane + 0.5)) / SLOTS;

    function tick(dt: number) {
      windowAcc += dt;
      if (windowAcc >= 1) {
        lastThroughput = processedWindow;
        processedWindow = 0;
        windowAcc = 0;
      }
      if (flushPulse > 0) flushPulse -= dt;

      refillAt -= dt;
      if (refillAt <= 0) {
        refillAt = 0.45;
        backlog += 3 + Math.floor(Math.random() * 5);
      }

      workers.forEach((w, idx) => {
        if (!w.active) {
          if (backlog > 0) {
            backlog -= 1;
            w.active = true;
            w.step = 0;
            w.stepT = 0;
            w.phase = "pipeline";
            w.lane = idx;
            // ~12% fail at a random step 1..3 (vendor send / deps / template)
            w.failAt = Math.random() < 0.12 ? 1 + Math.floor(Math.random() * 3) : -1;
          }
          return;
        }

        if (w.phase === "pipeline") {
          w.stepT += dt * (1.1 + Math.random() * 0.5);
          if (w.stepT >= 1) {
            w.stepT = 0;
            if (w.failAt === w.step) {
              // peel off to DLQ
              w.phase = "to-dlq";
              w.px = stageX[w.step];
              w.py = laneY(w.lane);
              w.ptx = dlqPt[0];
              w.pty = dlqPt[1];
              w.pt = 0;
              return;
            }
            w.step += 1;
            if (w.step >= STEPS.length) {
              // completed → emit audit packet to ClickHouse
              processed += 1;
              processedWindow += 1;
              auditBuffer += 1;
              w.phase = "to-ch";
              w.px = stageX[STEPS.length - 1];
              w.py = laneY(w.lane);
              w.ptx = chPt[0];
              w.pty = chPt[1];
              w.pt = 0;
            }
          }
        } else {
          // packet travelling to DLQ or CH
          w.pt += dt * 1.6;
          if (w.pt >= 1) {
            if (w.phase === "to-dlq") dlq += 1;
            w.active = false;
            w.phase = "pipeline";
          }
        }
      });

      flushAt -= dt;
      if (flushAt <= 0) {
        flushAt = 2.2;
        flushed += auditBuffer;
        auditBuffer = 0;
        flushPulse = 0.5;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;

      // ---- stage column guides + headers ----
      STEPS.forEach((s, i) => {
        const x = stageX[i];
        ctx.strokeStyle = rgba(p.border, 0.4);
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, laneTop - 6);
        ctx.lineTo(x, laneBot + 6);
        ctx.stroke();
        ctx.setLineDash([]);
        // header
        ctx.fillStyle = rgba(p.muted, 0.9);
        ctx.font = "600 8px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${i + 1}`, x, laneTop - 16);
        ctx.font = "7.5px ui-monospace, monospace";
        ctx.fillText(s, x, laneTop - 7);
      });

      // ---- vendor queue (backlog) + semaphore gate ----
      ctx.fillStyle = rgba(p.muted, 0.9);
      ctx.font = "600 8.5px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("vendor queue", queueX, laneTop - 16);
      const qh = laneBot - laneTop;
      ctx.strokeStyle = rgba(p.border, 0.7);
      ctx.lineWidth = 1;
      ctx.strokeRect(queueX - 9, laneTop, 18, qh);
      const fillH = Math.min(1, backlog / 70) * qh;
      ctx.fillStyle = rgba(p.accent2, 0.55);
      ctx.fillRect(queueX - 9, laneTop + qh - fillH, 18, fillH);
      // semaphore gate marker between queue and stage 1
      const gateX = (queueX + stageX[0]) / 2;
      const busy = workers.filter((w) => w.active).length;
      ctx.fillStyle = rgba(p.accent1, 0.9);
      ctx.font = "600 7.5px ui-monospace, monospace";
      ctx.fillText("semaphore", gateX, laneTop - 7);
      ctx.fillText(`${busy}/${SLOTS}`, gateX, laneTop + 4);
      ctx.strokeStyle = rgba(p.accent1, 0.4);
      ctx.beginPath();
      ctx.moveTo(gateX, laneTop + 10);
      ctx.lineTo(gateX, laneBot);
      ctx.stroke();

      // ---- sinks ----
      ctx.textAlign = "center";
      ctx.fillStyle = rgba(p.accent1, flushPulse > 0 ? 1 : 0.9);
      ctx.font = "600 8.5px ui-monospace, monospace";
      ctx.fillText("ClickHouse", chPt[0], chPt[1] - 6);
      ctx.fillStyle = rgba(p.muted, 0.85);
      ctx.font = "7.5px ui-monospace, monospace";
      ctx.fillText(`audit buf ${auditBuffer}`, chPt[0], chPt[1] + 6);
      ctx.fillStyle = rgba(p.accent3, 0.9);
      ctx.font = "600 8.5px ui-monospace, monospace";
      ctx.fillText("DLQ", dlqPt[0], dlqPt[1] - 6);

      // ---- workers ----
      const stepCols = [p.fg, p.fg, p.accent2, p.accent2, p.accent1];
      for (const w of workers) {
        if (!w.active) continue;
        if (w.phase === "pipeline") {
          const y = laneY(w.lane);
          // position interpolates between current stage and next
          const sx = stageX[w.step];
          const nx =
            w.step + 1 < STEPS.length ? stageX[w.step + 1] : stageX[w.step];
          const x = sx + (nx - sx) * w.stepT;
          // trail from stage marker
          ctx.strokeStyle = rgba(
            w.failAt >= 0 ? p.accent3 : stepCols[w.step],
            0.3
          );
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx, y);
          ctx.lineTo(x, y);
          ctx.stroke();
          // worker dot
          ctx.fillStyle = rgba(
            w.failAt >= 0 && w.step >= w.failAt ? p.accent3 : stepCols[w.step],
            0.95
          );
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // packet to sink
          const e = w.pt < 0.5 ? 2 * w.pt * w.pt : 1 - Math.pow(-2 * w.pt + 2, 2) / 2;
          const x = w.px + (w.ptx - w.px) * e;
          const y = w.py + (w.pty - w.py) * e;
          const col = w.phase === "to-dlq" ? p.accent3 : p.accent1;
          ctx.strokeStyle = rgba(col, 0.25);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(w.px, w.py);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.fillStyle = rgba(col, 0.95);
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
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
        const busy = workers.filter((w) => w.active).length;
        onStatus?.({
          "semaphore": `${busy}/${SLOTS}`,
          "QoS prefetch": String(SLOTS),
          backlog: String(backlog),
          "throughput": `${lastThroughput}/s`,
          processed: String(processed),
          DLQ: String(dlq),
          "audit buffered": String(auditBuffer),
          "CH flushed": String(flushed),
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
