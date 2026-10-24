"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";

/* Two-Phase Commit — a coordinator drives participants through PREPARE then
 * COMMIT/ABORT. Participants reply with vote-yes/no; a single NO aborts the
 * whole transaction. Phases cycle with occasional aborts. */

type Phase = "idle" | "prepare" | "voting" | "decision" | "ack";
type Part = { x: number; y: number; vote: "?" | "yes" | "no"; acked: boolean };
type Pkt = { from: [number, number]; to: [number, number]; t: number; color: 0 | 1 | 2 };

export function TwoPhaseCommitSim({ running, onStatus }: SimProps) {
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

    const NP = 3;
    let coord: [number, number] = [0, 0];
    let parts: Part[] = [];
    const pkts: Pkt[] = [];
    let phase: Phase = "idle";
    let phaseAt = 1;
    let decision: "commit" | "abort" = "commit";
    let txn = 0;
    let committed = 0;
    let aborted = 0;

    function layout() {
      coord = [width / 2, height * 0.22];
      parts = [];
      for (let i = 0; i < NP; i++) {
        parts.push({
          x: width * (0.25 + (i / (NP - 1)) * 0.5),
          y: height * 0.68,
          vote: "?",
          acked: false,
        });
      }
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
      phaseAt -= dt;
      for (let i = pkts.length - 1; i >= 0; i--) {
        pkts[i].t += dt * 1.4;
        if (pkts[i].t >= 1) pkts.splice(i, 1);
      }
      if (phaseAt > 0) return;

      if (phase === "idle") {
        phase = "prepare";
        phaseAt = 1.1;
        txn++;
        for (const pt of parts) {
          pt.vote = "?";
          pt.acked = false;
        }
        for (const pt of parts) pkts.push({ from: coord, to: [pt.x, pt.y], t: 0, color: 0 });
      } else if (phase === "prepare") {
        phase = "voting";
        phaseAt = 1.1;
        // participants vote; ~20% chance one votes no
        const abortIdx = Math.random() < 0.25 ? Math.floor(Math.random() * NP) : -1;
        parts.forEach((pt, i) => {
          pt.vote = i === abortIdx ? "no" : "yes";
          pkts.push({ from: [pt.x, pt.y], to: coord, t: 0, color: pt.vote === "yes" ? 1 : 2 });
        });
        decision = abortIdx >= 0 ? "abort" : "commit";
      } else if (phase === "voting") {
        phase = "decision";
        phaseAt = 1.1;
        for (const pt of parts)
          pkts.push({ from: coord, to: [pt.x, pt.y], t: 0, color: decision === "commit" ? 1 : 2 });
      } else if (phase === "decision") {
        phase = "ack";
        phaseAt = 1.0;
        for (const pt of parts) {
          pt.acked = true;
          pkts.push({ from: [pt.x, pt.y], to: coord, t: 0, color: 1 });
        }
        if (decision === "commit") committed++;
        else aborted++;
      } else {
        phase = "idle";
        phaseAt = 1.2;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;
      const pktColor = (c: 0 | 1 | 2) => (c === 0 ? p.accent2 : c === 1 ? p.accent1 : p.accent3);

      // links
      for (const pt of parts) {
        ctx.strokeStyle = rgba(p.border, 0.5);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(coord[0], coord[1]);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }

      // packets
      for (const pk of pkts) {
        const x = pk.from[0] + (pk.to[0] - pk.from[0]) * pk.t;
        const y = pk.from[1] + (pk.to[1] - pk.from[1]) * pk.t;
        const col = pktColor(pk.color);
        ctx.fillStyle = rgba(col, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba(col, 0.4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // coordinator
      const cCol = decision === "abort" && (phase === "decision" || phase === "ack") ? p.accent3 : p.accent1;
      ctx.fillStyle = rgba(cCol, 0.95);
      ctx.beginPath();
      ctx.arc(coord[0], coord[1], 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.95);
      ctx.font = "600 8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TC", coord[0], coord[1]);

      // participants
      for (const pt of parts) {
        const col =
          pt.vote === "no" ? p.accent3 : pt.vote === "yes" ? p.accent1 : p.muted;
        ctx.fillStyle = rgba(col, 0.9);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 255, 255], 0.95);
        ctx.font = "600 8px ui-monospace, monospace";
        ctx.fillText(pt.vote === "?" ? "P" : pt.vote === "yes" ? "✓" : "✗", pt.x, pt.y);
      }

      // phase label
      ctx.fillStyle = rgba(p.muted, 0.9);
      ctx.font = "600 10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        phase === "idle" ? "—" : phase.toUpperCase(),
        width / 2,
        height * 0.45
      );
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
          phase: phase === "idle" ? "—" : phase,
          txn: `#${txn}`,
          committed: String(committed),
          aborted: String(aborted),
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
