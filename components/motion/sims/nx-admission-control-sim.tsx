"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";

/* ------------------------------------------------------------------ *
 * NX River Admission Control (detailed).
 * Layout (left → right):
 *   1) River jobs table (Postgres) — rows with state: available / running /
 *      snoozed (with a live retry countdown) / completed.
 *   2) The admission gate — a worker pulls an `available` job only if an ECS
 *      slot is free; otherwise the job is SNOOZED for 30s and retried.
 *   3) ECS Fargate slot pool — PUBLISHER_MAX_RUNNING_TASKS slots, each either
 *      idle or running a campaign task (with a progress ring).
 *   4) Campaign state machine strip — scheduled→queued→processing→started→finished.
 * ------------------------------------------------------------------ */

type JobState = "available" | "running" | "snoozed" | "completed";
type Job = {
  id: number;
  state: JobState;
  snooze: number; // seconds left on the 30s-scaled retry
  slot: number; // ECS slot index while running
  rowY: number; // animated row position
  targetY: number;
};

const SLOT_CAP = 4; // PUBLISHER_MAX_RUNNING_TASKS
const SNOOZE_SECS = 3; // scaled stand-in for 30s
const MAX_JOBS = 7; // visible job rows

const STATES = ["scheduled", "queued", "processing", "started", "finished"];

export function AdmissionControlSim({ running, onStatus }: SimProps) {
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

    const jobs: Job[] = [];
    const slots: (Job | null)[] = Array.from({ length: SLOT_CAP }, () => null);
    const slotProgress: number[] = Array.from({ length: SLOT_CAP }, () => 0);
    let nextId = 1;
    let enqueueAt = 0;
    let snoozeFlash = 0;

    let started = 0;
    let finished = 0;
    let snoozes = 0;
    const stateCounts: Record<string, number> = {
      queued: 0,
      processing: 0,
      started: 0,
      finished: 0,
    };

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

    const freeSlot = () => slots.findIndex((s) => s === null);
    const runningCount = () => slots.filter((s) => s !== null).length;

    function tick(dt: number) {
      if (snoozeFlash > 0) snoozeFlash -= dt;

      // enqueue new River jobs (campaign triggers)
      enqueueAt -= dt;
      if (enqueueAt <= 0 && jobs.length < MAX_JOBS) {
        enqueueAt = 0.9 + Math.random() * 0.9;
        jobs.push({
          id: nextId++,
          state: "available",
          snooze: 0,
          slot: -1,
          rowY: 0,
          targetY: 0,
        });
      }

      // admission: try to run available / snooze-expired jobs
      for (const j of jobs) {
        if (j.state === "snoozed") {
          j.snooze -= dt;
          if (j.snooze <= 0) j.state = "available";
        }
        if (j.state === "available") {
          const slot = freeSlot();
          if (slot >= 0) {
            j.state = "running";
            j.slot = slot;
            slots[slot] = j;
            slotProgress[slot] = 0;
          } else {
            // no free ECS slot → River snoozes the job for ~30s
            j.state = "snoozed";
            j.snooze = SNOOZE_SECS;
            snoozes++;
            snoozeFlash = 0.5;
          }
        }
      }

      // advance running slots (the Fargate task lifecycle)
      for (let s = 0; s < SLOT_CAP; s++) {
        const j = slots[s];
        if (!j) continue;
        slotProgress[s] += dt * (0.28 + Math.random() * 0.08);
        if (slotProgress[s] >= 1) {
          j.state = "completed";
          slots[s] = null;
          slotProgress[s] = 0;
          started++;
          finished++;
        }
      }

      // remove completed jobs after they settle
      for (let i = jobs.length - 1; i >= 0; i--) {
        if (jobs[i].state === "completed") jobs.splice(i, 1);
      }

      // recompute campaign state-machine counts for the strip
      stateCounts.queued = jobs.filter(
        (j) => j.state === "available" || j.state === "snoozed"
      ).length;
      stateCounts.processing = runningCount();
      stateCounts.started = runningCount();
      stateCounts.finished = finished;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;

      // ===== region 1: River jobs table (Postgres) =====
      const tX = width * 0.04;
      const tTop = height * 0.14;
      const tW = width * 0.34;
      const rowH = 15;
      const gap = 4;

      ctx.textAlign = "left";
      ctx.fillStyle = rgba(p.fg, 0.9);
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillText("river_job  (Postgres)", tX, tTop - 10);
      ctx.fillStyle = rgba(p.muted, 0.7);
      ctx.font = "7px ui-monospace, monospace";
      ctx.fillText("id", tX + 2, tTop);
      ctx.fillText("state", tX + tW * 0.28, tTop);

      const stateColor = (s: JobState) =>
        s === "running"
          ? p.accent1
          : s === "snoozed"
          ? p.accent3
          : s === "completed"
          ? p.accent1
          : p.accent2;

      jobs.forEach((j, i) => {
        const y = tTop + 6 + i * (rowH + gap);
        const col = stateColor(j.state);
        // row frame
        ctx.strokeStyle = rgba(p.border, 0.5);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tX, y, tW, rowH);
        // id
        ctx.fillStyle = rgba(p.fg, 0.75);
        ctx.font = "8px ui-monospace, monospace";
        ctx.fillText(`job_${j.id}`, tX + 4, y + rowH - 4);
        // state badge
        ctx.fillStyle = rgba(col, 0.2);
        ctx.fillRect(tX + tW * 0.28 - 2, y + 1, tW * 0.5, rowH - 2);
        ctx.fillStyle = rgba(col, 0.95);
        ctx.font = "700 7.5px ui-monospace, monospace";
        let label: string = j.state;
        if (j.state === "snoozed") label = `snoozed ${Math.ceil(j.snooze)}s`;
        ctx.fillText(label, tX + tW * 0.28, y + rowH - 4);
      });

      // ===== region 2: admission gate =====
      const gateX = width * 0.46;
      ctx.textAlign = "center";
      ctx.fillStyle = rgba(snoozeFlash > 0 ? p.accent3 : p.muted, 0.9);
      ctx.font = "600 8px ui-monospace, monospace";
      ctx.fillText("admission", gateX, height * 0.4);
      ctx.fillText(
        `slots ${runningCount()}/${SLOT_CAP}`,
        gateX,
        height * 0.4 + 12
      );
      if (snoozeFlash > 0) {
        ctx.fillStyle = rgba(p.accent3, 0.9);
        ctx.fillText("↻ snooze 30s", gateX, height * 0.4 + 24);
      }
      // gate rail
      ctx.strokeStyle = rgba(p.border, 0.5);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(gateX, tTop);
      ctx.lineTo(gateX, height * 0.72);
      ctx.stroke();
      ctx.setLineDash([]);

      // ===== region 3: ECS Fargate slot pool =====
      const poolX = width * 0.58;
      const poolW = width * 0.38;
      ctx.textAlign = "left";
      ctx.fillStyle = rgba(p.fg, 0.9);
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillText(
        `Fargate ECS slots · cap ${SLOT_CAP}`,
        poolX,
        tTop - 10
      );
      const slotW = (poolW - (SLOT_CAP - 1) * 10) / SLOT_CAP;
      const slotY = tTop + 6;
      const slotH = height * 0.22;
      for (let s = 0; s < SLOT_CAP; s++) {
        const x = poolX + s * (slotW + 10);
        const j = slots[s];
        ctx.strokeStyle = rgba(j ? p.accent1 : p.border, 0.7);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, slotY, slotW, slotH);
        if (j) {
          // running task fill + progress ring
          ctx.fillStyle = rgba(p.accent1, 0.14);
          ctx.fillRect(x, slotY, slotW, slotH);
          ctx.fillStyle = rgba(p.accent1, 0.9);
          ctx.font = "700 8px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(`job_${j.id}`, x + slotW / 2, slotY + slotH / 2 - 2);
          // progress bar
          ctx.fillStyle = rgba(p.border, 0.5);
          ctx.fillRect(x + 4, slotY + slotH - 8, slotW - 8, 3);
          ctx.fillStyle = rgba(p.accent1, 0.9);
          ctx.fillRect(x + 4, slotY + slotH - 8, (slotW - 8) * slotProgress[s], 3);
        } else {
          ctx.fillStyle = rgba(p.muted, 0.5);
          ctx.font = "7.5px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText("idle", x + slotW / 2, slotY + slotH / 2 + 2);
        }
      }

      // ===== region 4: campaign state-machine strip =====
      const smY = height * 0.82;
      const smX0 = poolX;
      const smX1 = width * 0.96;
      ctx.textAlign = "left";
      ctx.fillStyle = rgba(p.muted, 0.8);
      ctx.font = "7px ui-monospace, monospace";
      ctx.fillText("campaign state machine", smX0, smY - 10);
      STATES.forEach((st, i) => {
        const x = smX0 + ((smX1 - smX0) * i) / (STATES.length - 1);
        const active =
          (st === "queued" && stateCounts.queued > 0) ||
          (st === "processing" && stateCounts.processing > 0) ||
          (st === "started" && stateCounts.started > 0) ||
          (st === "finished" && stateCounts.finished > 0);
        ctx.fillStyle = rgba(active ? p.accent1 : p.muted, active ? 0.95 : 0.5);
        ctx.beginPath();
        ctx.arc(x, smY, 4, 0, Math.PI * 2);
        ctx.fill();
        if (i < STATES.length - 1) {
          const nx = smX0 + ((smX1 - smX0) * (i + 1)) / (STATES.length - 1);
          ctx.strokeStyle = rgba(p.border, 0.6);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 5, smY);
          ctx.lineTo(nx - 5, smY);
          ctx.stroke();
        }
        ctx.fillStyle = rgba(p.muted, 0.85);
        ctx.font = "7px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(st, x, smY + 14);
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
        const snoozed = jobs.filter((j) => j.state === "snoozed").length;
        onStatus?.({
          "ECS slots": `${runningCount()}/${SLOT_CAP}`,
          "jobs queued": String(stateCounts.queued),
          snoozed: String(snoozed),
          "snoozes total": String(snoozes),
          started: String(started),
          finished: String(finished),
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
