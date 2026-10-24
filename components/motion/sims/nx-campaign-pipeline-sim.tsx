"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";

/* ------------------------------------------------------------------ *
 * NX Campaign Pipeline — the real end-to-end message flow:
 *   Publisher → campaign vhost → Distributor (token-bucket rate limit)
 *   → vendor queues → Consumer fleet → wait-time gate
 *   → wait=0 straight to done, wait>0 stage → Webhook(+1) or Flusher(-1).
 * Messages are packets that advance stage-by-stage along a fixed topology.
 * ------------------------------------------------------------------ */

type StageId =
  | "publisher"
  | "vhost"
  | "distributor"
  | "vendorq"
  | "consumer"
  | "gate"
  | "webhook"
  | "flusher"
  | "done";

type Stage = { id: StageId; label: string; x: number; y: number };

type Msg = {
  stage: StageId;
  // position is interpolated between the current and next stage
  t: number;
  speed: number;
  // resolution for the wait-gate split: "webhook" (+1) or "flusher" (-1)
  resolve: "webhook" | "flusher";
  waited: boolean; // wait_time > 0 ?
  held: number; // time held at the gate (staging)
};

export function CampaignPipelineSim({ running, onStatus }: SimProps) {
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

    const stages: Record<StageId, Stage> = {} as Record<StageId, Stage>;
    const msgs: Msg[] = [];

    // token bucket for the distributor rate limiter
    let tokens = 6;
    const maxTokens = 6;
    const refillPerSec = 4;

    let published = 0;
    let delivered = 0; // webhook +1
    let flushed = 0; // flusher -1
    let spawnAt = 0;

    function layout() {
      // Normalized positions (x,y in 0..1) laid out left→right with a
      // vertical split at the wait-gate.
      const P: Record<StageId, [number, number]> = {
        publisher: [0.07, 0.5],
        vhost: [0.2, 0.5],
        distributor: [0.33, 0.5],
        vendorq: [0.46, 0.5],
        consumer: [0.59, 0.5],
        gate: [0.72, 0.5],
        webhook: [0.86, 0.26],
        flusher: [0.86, 0.74],
        done: [0.95, 0.5],
      };
      const labels: Record<StageId, string> = {
        publisher: "Publisher",
        vhost: "vhost",
        distributor: "Distributor",
        vendorq: "vendor q",
        consumer: "Consumer",
        gate: "wait-gate",
        webhook: "Webhook +1",
        flusher: "Flusher −1",
        done: "done",
      };
      (Object.keys(P) as StageId[]).forEach((id) => {
        stages[id] = {
          id,
          label: labels[id],
          x: P[id][0] * width,
          y: P[id][1] * height,
        };
      });
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

    // next stage in the linear path (gate handled specially)
    function nextStage(m: Msg): StageId | null {
      switch (m.stage) {
        case "publisher":
          return "vhost";
        case "vhost":
          return "distributor";
        case "distributor":
          return "vendorq";
        case "vendorq":
          return "consumer";
        case "consumer":
          return "gate";
        case "gate":
          return m.resolve === "webhook" ? "webhook" : "flusher";
        case "webhook":
        case "flusher":
          return "done";
        default:
          return null;
      }
    }

    function tick(dt: number) {
      tokens = Math.min(maxTokens, tokens + refillPerSec * dt);

      // publisher emits new messages
      spawnAt -= dt;
      if (spawnAt <= 0) {
        spawnAt = 0.28 + Math.random() * 0.25;
        const waited = Math.random() < 0.6;
        msgs.push({
          stage: "publisher",
          t: 0,
          speed: 0.9 + Math.random() * 0.5,
          resolve: Math.random() < 0.7 ? "webhook" : "flusher",
          waited,
          held: 0,
        });
        published++;
      }

      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];

        // The distributor stage is rate-limited: a message can only LEAVE the
        // distributor if a token is available (token-bucket limiter).
        if (m.stage === "distributor" && m.t >= 1) {
          if (tokens >= 1) {
            tokens -= 1;
          } else {
            continue; // wait for a token (backpressure)
          }
        }

        // The wait-gate holds wait_time>0 messages (staging) briefly before
        // they resolve via webhook/flusher.
        if (m.stage === "gate" && m.t >= 1) {
          if (m.waited && m.held < 1.1) {
            m.held += dt;
            continue;
          }
        }

        m.t += m.speed * dt;
        if (m.t >= 1) {
          const nxt = nextStage(m);
          if (nxt === null || m.stage === "done") {
            msgs.splice(i, 1);
            continue;
          }
          if (nxt === "done") {
            if (m.stage === "webhook") delivered++;
            else if (m.stage === "flusher") flushed++;
            msgs.splice(i, 1);
            continue;
          }
          m.stage = nxt;
          m.t = 0;
        }
      }

      // keep the message list bounded
      if (msgs.length > 120) msgs.splice(0, msgs.length - 120);
    }

    function posOf(m: Msg): [number, number] {
      const from = stages[m.stage];
      const nxt = nextStage(m);
      const to = nxt ? stages[nxt] : from;
      // ease
      const e = m.t < 0.5 ? 2 * m.t * m.t : 1 - Math.pow(-2 * m.t + 2, 2) / 2;
      return [from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e];
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const p = palette.current;

      // edges between stages
      const edges: [StageId, StageId][] = [
        ["publisher", "vhost"],
        ["vhost", "distributor"],
        ["distributor", "vendorq"],
        ["vendorq", "consumer"],
        ["consumer", "gate"],
        ["gate", "webhook"],
        ["gate", "flusher"],
        ["webhook", "done"],
        ["flusher", "done"],
      ];
      for (const [a, b] of edges) {
        ctx.strokeStyle = rgba(p.border, 0.55);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(stages[a].x, stages[a].y);
        ctx.lineTo(stages[b].x, stages[b].y);
        ctx.stroke();
      }

      // messages
      for (const m of msgs) {
        const [x, y] = posOf(m);
        const col =
          m.stage === "webhook"
            ? p.accent1
            : m.stage === "flusher"
            ? p.accent3
            : m.stage === "gate" && m.waited && m.held > 0
            ? p.accent3 // staged (waiting)
            : p.accent2;
        ctx.fillStyle = rgba(col, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // stage nodes + labels
      (Object.keys(stages) as StageId[]).forEach((id) => {
        const s = stages[id];
        const isGate = id === "gate";
        const isSink = id === "webhook" || id === "flusher" || id === "done";
        const col =
          id === "webhook"
            ? p.accent1
            : id === "flusher"
            ? p.accent3
            : id === "distributor"
            ? p.accent2
            : p.fg;
        // node
        ctx.fillStyle = rgba(col, 0.9);
        ctx.beginPath();
        ctx.arc(s.x, s.y, isGate ? 6 : isSink ? 5 : 5.5, 0, Math.PI * 2);
        ctx.fill();
        // label
        ctx.fillStyle = rgba(p.muted, 0.9);
        ctx.font = "600 8.5px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(s.label, s.x, s.y - 12);
      });

      // distributor token-bucket meter (small bar under the distributor)
      const d = stages.distributor;
      const barW = 34;
      const fill = (tokens / maxTokens) * barW;
      ctx.fillStyle = rgba(p.border, 0.5);
      ctx.fillRect(d.x - barW / 2, d.y + 12, barW, 3);
      ctx.fillStyle = rgba(p.accent2, 0.9);
      ctx.fillRect(d.x - barW / 2, d.y + 12, fill, 3);
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
          published: String(published),
          "in flight": String(msgs.length),
          "delivered +1": String(delivered),
          "flushed −1": String(flushed),
          "rate tokens": `${Math.floor(tokens)}/${maxTokens}`,
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
