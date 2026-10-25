"use client";

import * as React from "react";
import { rgba, useSimPalette } from "@/components/motion/sim-core";
import type { SimProps } from "@/components/motion/sim-layer";

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

export function HighWaterMarkSim({ running, onStatus }: SimProps) {
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

    // --- model state ---
    let nextId = 0;
    let replicas: Replica[] = [];
    let packets: Packet[] = [];
    let leaderLeo = 0; // leader's log end offset (grows over time)
    let hwm = 0; // committed high-water mark
    let appendAcc = 0; // append cadence
    let membershipAcc = 0; // join/leave cadence
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
      // start with 3 in-sync followers
      for (let i = 0; i < 3; i++) {
        const f = makeFollower(leaderLeo - 1 - Math.floor(Math.random() * 2));
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
    }
    resize();
    init();

    // in-sync set = leader + followers within LAG_INSYNC that aren't leaving
    function isrOffsets(): number[] {
      const out: number[] = [];
      for (const r of replicas) {
        if (r.state === "leaving" || r.life < 0.5) continue;
        if (r.state === "leader" || r.state === "insync") out.push(r.leo);
      }
      return out;
    }

    function recomputeIsrAndHwm() {
      for (const r of replicas) {
        if (r.state === "catchup" && leaderLeo - r.leo <= LAG_INSYNC) {
          r.state = "insync";
        } else if (r.state === "insync" && leaderLeo - r.leo > LAG_INSYNC + 3) {
          // fell too far behind → drop back to catch-up (out of ISR)
          r.state = "catchup";
        }
      }
      const offsets = isrOffsets();
      // HWM is the min committed offset across the ISR, never decreasing past
      // what's already acknowledged visually but may stall while a node lags.
      const minIsr = offsets.length ? Math.min(...offsets) : hwm;
      hwm = Math.max(hwm, Math.min(minIsr, leaderLeo));
      // if a lagging node (re)joins ISR below hwm, HWM holds (monotonic).
    }

    function tick(dt: number) {
      // 1) leader appends new entries at a steady cadence
      appendAcc += dt;
      const appendEvery = 0.55;
      while (appendAcc >= appendEvery) {
        appendAcc -= appendEvery;
        leaderLeo += 1;
        const leader = replicas.find((r) => r.state === "leader");
        if (leader) {
          leader.leo = leaderLeo;
          leader.target = leaderLeo;
        }
        // ship the new entry to every live follower
        replicas.forEach((r, i) => {
          if (r.state === "leader" || r.state === "leaving") return;
          packets.push({ to: i, offset: leaderLeo, t: 0 });
        });
      }

      // 2) catch-up replicas also pull older missing entries faster
      for (let i = 0; i < replicas.length; i++) {
        const r = replicas[i];
        if (r.state === "catchup" && r.leo < leaderLeo) {
          r.joinAt += dt;
          // emit catch-up fetch packets in bursts
          if (Math.random() < dt * 6 && packets.length < 60) {
            packets.push({ to: i, offset: r.leo + 1, t: 0 });
          }
        }
      }

      // 3) advance packets; on arrival, bump the follower's LEO
      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i];
        pk.t += dt * 1.6;
        if (pk.t >= 1) {
          const r = replicas[pk.to];
          if (r && r.state !== "leaving") {
            // apply in order: only accept the next contiguous entry
            if (pk.offset === r.leo + 1) r.leo = pk.offset;
            else if (pk.offset > r.leo) r.leo = Math.max(r.leo, r.leo + 1);
          }
          packets.splice(i, 1);
        }
      }

      // 4) smooth render offset
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

      // 5) membership churn: periodic join / leave
      membershipAcc += dt;
      if (membershipAcc > 2.6) {
        membershipAcc = 0;
        const followers = replicas.filter((r) => r.state !== "leader");
        const alive = followers.filter((r) => r.state !== "leaving");
        // bias: if few replicas, join; if many, allow a leave
        const wantJoin = alive.length < 3 || (alive.length < 6 && Math.random() < 0.6);
        if (wantJoin) {
          const f = makeFollower(Math.max(0, leaderLeo - WINDOW + 2));
          replicas.push(f);
          joins++;
        } else if (alive.length > 2 && Math.random() < 0.7) {
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
      const p = palette.current;

      const padL = width * 0.08;
      const padR = width * 0.06;
      const logW = width - padL - padR;
      const cell = logW / WINDOW;
      const originOffset = Math.max(0, leaderLeo - WINDOW + 1); // leftmost visible offset

      const rowH = Math.min(46, (height * 0.82) / Math.max(4, replicas.length));
      const topY = height * 0.12;
      const cellH = Math.min(20, rowH * 0.5);

      const xForOffset = (off: number) =>
        padL + (off - originOffset) * cell;

      // --- HWM vertical marker (committed boundary) ---
      const hwmX = xForOffset(hwm) + cell;
      if (hwm >= originOffset) {
        ctx.strokeStyle = rgba(p.accent1, 0.55);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(hwmX, topY - 10);
        ctx.lineTo(hwmX, topY + replicas.length * rowH + 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // label
        ctx.fillStyle = rgba(p.accent1, 0.9);
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.fillText("HWM", hwmX + 4, topY - 14);
      }

      // leader LEO marker
      const leoX = xForOffset(leaderLeo) + cell;
      ctx.strokeStyle = rgba(p.accent2, 0.4);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(leoX, topY - 10);
      ctx.lineTo(leoX, topY + replicas.length * rowH + 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(p.accent2, 0.75);
      ctx.font = "600 10px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText("LEO", leoX - 4, topY - 14);

      // --- replica rows ---
      replicas.forEach((r, idx) => {
        const y = topY + idx * rowH;
        const a = r.life;
        if (a <= 0.01) return;

        // row label
        const isLeader = r.state === "leader";
        const label = isLeader
          ? `leader`
          : r.state === "catchup"
          ? `R${r.id} ↻`
          : r.state === "leaving"
          ? `R${r.id} ✕`
          : `R${r.id}`;
        const labelCol =
          r.state === "leaving"
            ? p.muted
            : isLeader
            ? p.accent2
            : r.state === "catchup"
            ? p.accent3
            : p.fg;
        ctx.fillStyle = rgba(labelCol, 0.85 * a);
        ctx.font = `${isLeader ? "700" : "500"} 11px ui-monospace, monospace`;
        ctx.textAlign = "right";
        ctx.fillText(label, padL - 8, y + cellH * 0.8);

        // log cells
        const upto = Math.round(r.target);
        for (let off = originOffset; off <= leaderLeo; off++) {
          const x = xForOffset(off);
          const present = off <= upto;
          const committed = off <= hwm;
          // cell frame
          ctx.strokeStyle = rgba(p.border, 0.5 * a);
          ctx.lineWidth = 0.6;
          ctx.strokeRect(x, y, cell - 1.5, cellH);
          if (!present) continue;
          // filled cell — committed vs dirty
          let fill: [number, number, number] = committed ? p.accent1 : p.muted;
          let alpha = committed ? 0.3 : 0.16;
          if (isLeader) {
            fill = committed ? p.accent1 : p.accent2;
            alpha = committed ? 0.32 : 0.2;
          }
          ctx.fillStyle = rgba(fill, alpha * a);
          ctx.fillRect(x + 0.6, y + 0.6, cell - 2.6, cellH - 1.2);
          // the freshly-appended head entry gets a crisp edge
          if (off === upto && off === leaderLeo && isLeader) {
            ctx.strokeStyle = rgba(p.accent2, 0.8 * a);
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x + 0.6, y + 0.6, cell - 2.6, cellH - 1.2);
          }
        }

        // catch-up progress bar under the row
        if (r.state === "catchup") {
          const prog = leaderLeo > 0 ? r.leo / leaderLeo : 0;
          ctx.fillStyle = rgba(p.accent3, 0.5 * a);
          ctx.fillRect(padL, y + cellH + 3, logW * prog, 1.5);
        }

        // crash X overlay
        if (r.state === "leaving") {
          const cx = padL + logW * 0.5;
          const cy = y + cellH * 0.5;
          const s = 7;
          ctx.strokeStyle = rgba(p.muted, 0.7 * a);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(cx - s, cy - s);
          ctx.lineTo(cx + s, cy + s);
          ctx.moveTo(cx + s, cy - s);
          ctx.lineTo(cx - s, cy + s);
          ctx.stroke();
        }
      });

      // --- replication packets (leader row → follower rows) ---
      const leaderIdx = replicas.findIndex((r) => r.state === "leader");
      const leaderY = topY + (leaderIdx < 0 ? 0 : leaderIdx) * rowH + cellH * 0.5;
      for (const pk of packets) {
        const r = replicas[pk.to];
        if (!r || r.life <= 0.05) continue;
        const destY = topY + pk.to * rowH + cellH * 0.5;
        const x = xForOffset(pk.offset) + cell * 0.5;
        const startX = leoX - cell * 0.5;
        const px = startX + (x - startX) * pk.t;
        const py = leaderY + (destY - leaderY) * pk.t;
        ctx.fillStyle = rgba(p.accent2, 0.9 * r.life);
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
