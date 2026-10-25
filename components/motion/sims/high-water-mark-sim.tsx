"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps, SimControl } from "@/components/motion/sim-layer";

/* ------------------------------------------------------------------ *
 * High-Water-Mark replication.
 *
 * A single leader appends entries to an ordered log. Follower replicas
 * pull/receive those entries and advance their own log end offset (LEO).
 * The HIGH-WATER MARK is the highest offset replicated on every in-sync
 * replica (ISR) — entries at or below it are COMMITTED and safe to read;
 * entries above it are not yet durable and stay "dirty".
 *
 * Replicas dynamically JOIN (catch up from offset 0, outside the ISR until
 * they're within the lag threshold) and LEAVE / CRASH (dropped from the ISR).
 * The HWM = min(LEO) across the current ISR, so it advances at the pace of
 * the slowest in-sync follower and can STALL when a lagging node is tracked.
 * ------------------------------------------------------------------ */

type Replica = {
  id: number;
  leo: number; // log end offset (entries this replica has)
  target: number; // smooth-render offset
  state: "leader" | "insync" | "catchup" | "leaving";
  life: number; // fade-in / fade-out alpha 0..1
  joinAt: number; // seconds since join (for catch-up pacing)
  crash: number; // crash marker animation 0..1 when leaving
};

type Packet = {
  to: number; // replica index
  offset: number; // which entry is being shipped
  t: number; // 0..1 flight progress
};

/* Colors are derived from the active theme palette each frame (role-mapped so
 * the sim stays legible and distinct within any theme). */

export const hwmControls: SimControl[] = [
  { key: "servers", label: "servers", min: 6, max: 40, default: 16 },
  { key: "appendRate", label: "append/s", min: 1, max: 12, default: 4 },
  { key: "churn", label: "churn", min: 0, max: 10, default: 4 },
];

export function HighWaterMarkSim({ running, onStatus, params }: SimProps) {
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
    // target number of replicas (incl. leader) so columns tile the full width
    let targetReplicas = 8;
    const COL_W = 42; // desired column width — drives how many replicas we show

    // --- model state ---
    let nextId = 0;
    let replicas: Replica[] = [];
    let packets: Packet[] = [];
    let leaderLeo = 0; // leader's log end offset (grows over time)
    let hwm = 0; // committed high-water mark
    let appendAcc = 0; // append cadence
    let membershipAcc = 0; // join/leave cadence
    let spawnAcc = 0; // decorative packet spawn cadence
    let joins = 0;
    let leaves = 0;

    // visible window of offsets (the log scrolls as it grows)
    const WINDOW = 26; // how many entries are visible
    const LAG_INSYNC = 4; // within this lag of leader → counts toward ISR

    function makeLeader(): Replica {
      return {
        id: nextId++,
        leo: 0,
        target: 0,
        state: "leader",
        life: 1,
        joinAt: 0,
        crash: 0,
      };
    }
    function makeFollower(leo: number): Replica {
      return {
        id: nextId++,
        leo,
        target: leo,
        state: "catchup",
        life: 0,
        joinAt: 0,
        crash: 0,
      };
    }

    function init() {
      nextId = 0;
      leaderLeo = 8; // start with some history
      hwm = 6;
      replicas = [makeLeader()];
      replicas[0].leo = leaderLeo;
      replicas[0].target = leaderLeo;
      // start mostly full so columns span the width immediately
      const seed = Math.max(5, targetReplicas - 2);
      for (let i = 0; i < seed; i++) {
        const f = makeFollower(leaderLeo - 1 - Math.floor(Math.random() * 3));
        f.life = 1;
        f.state = "insync";
        replicas.push(f);
      }
      packets = [];
      joins = 0;
      leaves = 0;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // how many columns fill ~96% of the width at the desired column width
      const fit = Math.max(6, Math.round((width * 0.96) / COL_W));
      const wanted = Math.round(paramsRef.current?.servers ?? 16);
      targetReplicas = Math.min(fit, Math.max(6, wanted));
    }
    resize();
    init();

    function recomputeIsrAndHwm() {
      // ISR membership with hysteresis to avoid flicker
      for (const r of replicas) {
        if (r.state === "catchup" && leaderLeo - r.leo <= LAG_INSYNC) {
          r.state = "insync";
        } else if (r.state === "insync" && leaderLeo - r.leo > LAG_INSYNC + 4) {
          r.state = "catchup";
        }
      }
      // HWM = highest offset replicated on a QUORUM of in-sync replicas
      // (leader + insync). This advances smoothly with the leader and never
      // regresses, instead of stalling on the single slowest node.
      const isr = replicas.filter(
        (r) => (r.state === "leader" || r.state === "insync") && r.life > 0.5
      );
      if (isr.length > 0) {
        const quorum = Math.floor(isr.length / 2) + 1;
        const leos = isr.map((r) => r.leo).sort((a, b) => b - a);
        // the offset acked by at least `quorum` replicas = the quorum-th largest
        const committedTo = leos[quorum - 1];
        hwm = Math.max(hwm, Math.min(committedTo, leaderLeo));
      }
    }

    function tick(dt: number) {
      // live params (recomputed each frame so slider changes take effect)
      const fit = Math.max(6, Math.round((width * 0.96) / COL_W));
      const wantedServers = Math.round(paramsRef.current?.servers ?? 16);
      targetReplicas = Math.min(fit, Math.max(6, wantedServers));
      const appendRate = Math.max(0.5, paramsRef.current?.appendRate ?? 4);
      const churn = Math.max(0, paramsRef.current?.churn ?? 4);

      // 1) leader appends new entries at a steady cadence
      appendAcc += dt;
      const appendEvery = 1 / appendRate;
      while (appendAcc >= appendEvery) {
        appendAcc -= appendEvery;
        leaderLeo += 1;
        const leader = replicas.find((r) => r.state === "leader");
        if (leader) {
          leader.leo = leaderLeo;
          leader.target = leaderLeo;
        }
      }

      // 2) followers replicate toward the leader. In-sync followers track
      //    closely; catch-up followers fast-forward until they rejoin. This is
      //    done deterministically (no per-entry packet spam) so it scales.
      for (const r of replicas) {
        if (r.state === "leader" || r.state === "leaving") continue;
        const gap = leaderLeo - r.leo;
        if (gap <= 0) continue;
        // replication speed: fast while catching up, ~1-2 entries/tick in-sync
        const speed = r.state === "catchup" ? Math.max(6, gap * 4) : 3;
        const advance = Math.max(1, Math.round(speed * dt * 10));
        r.leo = Math.min(leaderLeo, r.leo + advance);
      }

      // 3) a small, capped set of visual packets from leader → followers
      //    (purely decorative; replication above is authoritative)
      spawnAcc += dt;
      if (spawnAcc > 0.12) {
        spawnAcc = 0;
        const live = replicas.filter(
          (r) => r.state !== "leader" && r.state !== "leaving"
        );
        // emit at most a handful of packets regardless of cluster size
        const budget = Math.min(4, live.length);
        for (let k = 0; k < budget && packets.length < 24; k++) {
          const r = live[Math.floor(Math.random() * live.length)];
          const idx = replicas.indexOf(r);
          if (idx >= 0) packets.push({ to: idx, offset: r.leo, t: 0 });
        }
      }

      // 4) advance decorative packets
      for (let i = packets.length - 1; i >= 0; i--) {
        packets[i].t += dt * 1.6;
        if (packets[i].t >= 1) packets.splice(i, 1);
      }

      // 5) smooth render offset
      for (const r of replicas) {
        r.target += (r.leo - r.target) * Math.min(1, dt * 8);
        if (r.state === "leaving") {
          r.crash = Math.min(1, r.crash + dt * 2);
          r.life = Math.max(0, r.life - dt * 1.2);
        } else {
          r.life = Math.min(1, r.life + dt * 1.6);
        }
      }
      // drop fully-faded leavers
      replicas = replicas.filter((r) => !(r.state === "leaving" && r.life <= 0));

      // 6) membership churn: keep the cluster near the width-derived target,
      //    with constant join/leave activity around it.
      membershipAcc += dt;
      // churn 0 → slow (4s) and no voluntary leaves; churn 10 → fast (~0.8s)
      const churnInterval = 4 - (churn / 10) * 3.2;
      if (membershipAcc > churnInterval) {
        membershipAcc = 0;
        const alive = replicas.filter(
          (r) => r.state !== "leader" && r.state !== "leaving"
        );
        const total = alive.length + 1; // + leader
        // below target → bias toward joining; at/above → bias toward leaving
        const deficit = targetReplicas - total;
        const leaveProb = (churn / 10) * 0.8; // 0 churn → never leave
        const wantJoin =
          deficit > 0 && (deficit >= 2 || Math.random() < 0.75);
        if (wantJoin) {
          const f = makeFollower(Math.max(0, leaderLeo - WINDOW + 2));
          replicas.push(f);
          joins++;
        } else if (alive.length > 2 && Math.random() < leaveProb) {
          // crash a random non-leader follower
          const victim = alive[Math.floor(Math.random() * alive.length)];
          victim.state = "leaving";
          leaves++;
        }
      }

      recomputeIsrAndHwm();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const pal = palette.current;
      // role-mapped to theme tokens: committed/HWM = accent1, leader = accent2,
      // catch-up = accent3, followers/labels = muted, frames = border.
      const C = {
        committed: pal.accent1,
        dirty: pal.muted,
        leader: pal.accent2,
        leaderDirty: pal.accent2,
        hwm: pal.accent1,
        leo: pal.accent2,
        packet: pal.accent2,
        label: pal.muted,
        catchup: pal.accent3,
        frame: pal.border,
      };

      // Vertical layout: offsets run TOP → BOTTOM (y axis); each replica is a
      // COLUMN laid out left → right (x axis). Columns tile the full width.
      const n = Math.max(1, replicas.length);
      const sideMargin = width * 0.03;
      const blockW = width - sideMargin * 2;
      const colW = blockW / n; // columns fill the available width
      const originX = sideMargin;
      const labelH = 22; // space above columns for replica labels

      // vertical offset track
      const cellH = Math.min(16, (height * 0.7) / WINDOW);
      const logH = cellH * WINDOW;
      const topY = (height - logH) / 2 + labelH * 0.5; // vertically centered
      const originOffset = Math.max(0, leaderLeo - WINDOW + 1); // topmost visible offset

      const yForOffset = (off: number) => topY + (off - originOffset) * cellH;
      const xForCol = (idx: number) => originX + idx * colW;

      // --- HWM horizontal marker (committed boundary) ---
      const hwmY = yForOffset(hwm) + cellH;
      if (hwm >= originOffset) {
        ctx.strokeStyle = rgba(C.hwm, 0.6);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(originX - 12, hwmY);
        ctx.lineTo(originX + blockW + 12, hwmY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = rgba(C.hwm, 0.95);
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.textAlign = "right";
        ctx.fillText("HWM", originX + blockW - 4, hwmY - 4);
      }

      // --- leader LEO horizontal marker ---
      const leoY = yForOffset(leaderLeo) + cellH;
      ctx.strokeStyle = rgba(C.leo, 0.45);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(originX - 12, leoY);
      ctx.lineTo(originX + blockW + 12, leoY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(C.leo, 0.8);
      ctx.font = "600 10px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText("LEO", originX + blockW - 4, leoY - 4);

      // --- replica columns ---
      replicas.forEach((r, idx) => {
        const x = xForCol(idx);
        const a = r.life;
        if (a <= 0.01) return;

        const isLeader = r.state === "leader";
        const labelCol =
          r.state === "leaving"
            ? C.dirty
            : isLeader
            ? C.leader
            : r.state === "catchup"
            ? C.catchup
            : C.label;
        // column header label — compact so it fits a narrow column
        ctx.fillStyle = rgba(labelCol, 0.85 * a);
        ctx.font = `${isLeader ? "700" : "500"} 9px ui-monospace, monospace`;
        ctx.textAlign = "center";
        const shortLabel = isLeader
          ? "L"
          : r.state === "catchup"
          ? `${r.id}↻`
          : r.state === "leaving"
          ? `${r.id}✕`
          : `${r.id}`;
        ctx.fillText(shortLabel, x + colW * 0.5, topY - 8);

        // vertical stack of log cells
        const upto = Math.round(r.target);
        const cw = Math.max(3, colW - 3); // cell width within the column
        for (let off = originOffset; off <= leaderLeo; off++) {
          const y = yForOffset(off);
          const present = off <= upto;
          const committed = off <= hwm;
          // cell frame (light so it doesn't darken text above it)
          ctx.strokeStyle = rgba(C.frame, 0.3 * a);
          ctx.lineWidth = 0.6;
          ctx.strokeRect(x + 1.5, y, cw, cellH - 1.5);
          if (!present) continue;
          let fill: [number, number, number] = committed ? C.committed : C.dirty;
          let alpha = committed ? 0.2 : 0.1;
          if (isLeader) {
            fill = committed ? C.leader : C.leaderDirty;
            alpha = committed ? 0.24 : 0.14;
          }
          ctx.fillStyle = rgba(fill, alpha * a);
          ctx.fillRect(x + 2.6, y + 0.6, cw - 1.2, cellH - 2.6);
          // crisp edge on the leader's freshly-appended head entry
          if (off === upto && off === leaderLeo && isLeader) {
            ctx.strokeStyle = rgba(C.leader, 0.85 * a);
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x + 2.6, y + 0.6, cw - 1.2, cellH - 2.6);
          }
        }

        // vertical catch-up progress bar beside the column
        if (r.state === "catchup") {
          const prog = leaderLeo > 0 ? r.leo / leaderLeo : 0;
          ctx.fillStyle = rgba(C.catchup, 0.55 * a);
          ctx.fillRect(x + colW - 2, topY, 1.5, logH * prog);
        }

        // crash X overlay (centered on the column)
        if (r.state === "leaving") {
          const cx = x + colW * 0.5;
          const cy = topY + logH * 0.5;
          const s = 7;
          ctx.strokeStyle = rgba(C.dirty, 0.75 * a);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(cx - s, cy - s);
          ctx.lineTo(cx + s, cy + s);
          ctx.moveTo(cx + s, cy - s);
          ctx.lineTo(cx - s, cy + s);
          ctx.stroke();
        }
      });

      // --- replication packets (leader column → follower columns) ---
      const leaderIdx = replicas.findIndex((r) => r.state === "leader");
      const leaderX = xForCol(leaderIdx < 0 ? 0 : leaderIdx) + colW * 0.5;
      for (const pk of packets) {
        const r = replicas[pk.to];
        if (!r || r.life <= 0.05) continue;
        const destX = xForCol(pk.to) + colW * 0.5;
        const y = yForOffset(pk.offset) + cellH * 0.5;
        const px = leaderX + (destX - leaderX) * pk.t;
        const py = y; // entries land at their own offset row
        ctx.fillStyle = rgba(C.packet, 0.95 * r.life);
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
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
        const isr = replicas.filter(
          (r) =>
            (r.state === "leader" || r.state === "insync") && r.life > 0.5
        ).length;
        const total = replicas.filter((r) => r.state !== "leaving").length;
        onStatus?.({
          "leader LEO": String(leaderLeo),
          HWM: String(hwm),
          lag: String(leaderLeo - hwm),
          ISR: `${isr}/${total}`,
          joins: String(joins),
          leaves: String(leaves),
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
