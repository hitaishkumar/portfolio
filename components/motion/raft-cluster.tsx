"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import * as React from "react";

/* ------------------------------------------------------------------ *
 * RaftCluster — a canonical Raft consensus visualization on canvas.
 *
 * Five servers sit in a ring. Each has a role (follower / candidate /
 * leader), a current term, and a replicated log of entries colored by the
 * term in which they were created. A simplified-but-faithful Raft loop runs:
 *   • followers hold a randomized election timeout, drawn as a draining ring
 *   • on timeout a follower becomes a candidate, bumps its term, votes for
 *     itself and sends RequestVote to the others
 *   • a candidate with a majority of votes becomes leader
 *   • the leader sends AppendEntries heartbeats that reset follower timers
 *     and replicate new log entries
 *   • an entry commits once a majority stores it (hatched → solid)
 *   • occasionally the leader "fails", triggering a fresh election
 *
 * Messages fly between nodes as glowing dots. Everything is theme-aware and
 * respects prefers-reduced-motion (renders a single static frame).
 * ------------------------------------------------------------------ */

type RGB = [number, number, number];
type Role = "follower" | "candidate" | "leader";

type LogEntry = { term: number; committed: boolean };

type Server = {
  id: number;
  x: number;
  y: number;
  role: Role;
  term: number;
  votedTerm: number; // last term this server voted in
  votesReceived: number;
  log: LogEntry[];
  // election timeout bookkeeping (seconds)
  timeout: number;
  elapsed: number;
  alive: boolean;
  deadUntil: number; // sim-time when a crashed node revives
};

type Message = {
  from: number;
  to: number;
  t: number; // 0..1 progress
  speed: number;
  kind: "vote-req" | "vote-grant" | "append" | "ack";
  term: number;
};

function hslTripletToRgb(varName: string): RGB {
  if (typeof window === "undefined") return [128, 128, 136];
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  const m = raw.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!m) return [128, 128, 136];
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

// Distinct hues per term so each term's log blocks are visually separable.
const TERM_HUES = [210, 160, 275, 30, 340, 100, 190];
function termColor(term: number, alpha = 1) {
  const h = TERM_HUES[term % TERM_HUES.length];
  return `hsla(${h}, 70%, 60%, ${alpha})`;
}

export type RaftControl = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  default: number;
  unit?: string;
};

export const raftControls: RaftControl[] = [
  { key: "servers", label: "servers", min: 3, max: 7, default: 7 },
  { key: "heartbeat", label: "heartbeat/s", min: 1, max: 6, default: 1 },
  { key: "failures", label: "failures", min: 0, max: 10, default: 3 },
];

export function RaftCluster({ params }: { params?: Record<string, number> }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const paramsRef = React.useRef(params);
  React.useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  React.useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctxOrNull = canvasEl.getContext("2d");
    if (!ctxOrNull) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    let accent1 = hslTripletToRgb("--accent-1");
    let accent2 = hslTripletToRgb("--accent-2");
    let fg = hslTripletToRgb("--foreground");
    let muted = hslTripletToRgb("--muted-foreground");
    let border = hslTripletToRgb("--border");

    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;
    let ringR = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    // cluster size + majority are dynamic (tunable via params)
    let N = Math.round(paramsRef.current?.servers ?? 7);
    let MAJORITY = Math.floor(N / 2) + 1;

    const servers: Server[] = [];
    const messages: Message[] = [];
    let simTime = 0; // seconds

    function initServers() {
      servers.length = 0;
      for (let i = 0; i < N; i++) {
        servers.push({
          id: i,
          x: 0,
          y: 0,
          role: "follower",
          term: 0,
          votedTerm: -1,
          votesReceived: 0,
          log: [],
          timeout: rand(2.2, 4.0),
          elapsed: 0,
          alive: true,
          deadUntil: 0,
        });
      }
    }

    function placeServers() {
      // Ring, starting at top, going clockwise.
      for (let i = 0; i < servers.length; i++) {
        const ang = -Math.PI / 2 + (i / N) * Math.PI * 2;
        servers[i].x = cx + Math.cos(ang) * ringR;
        servers[i].y = cy + Math.sin(ang) * ringR;
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
      cx = width / 2;
      cy = height / 2;
      ringR = Math.min(width, height) * 0.3;
      placeServers();
    }

    initServers();
    resize();

    function send(
      from: number,
      to: number,
      kind: Message["kind"],
      term: number,
    ) {
      messages.push({ from, to, t: 0, speed: rand(0.9, 1.3), kind, term });
    }

    function becomeCandidate(s: Server) {
      s.role = "candidate";
      s.term += 1;
      s.votedTerm = s.term;
      s.votesReceived = 1; // votes for itself
      s.elapsed = 0;
      s.timeout = rand(2.4, 4.2);
      for (const o of servers) {
        if (o.id !== s.id) send(s.id, o.id, "vote-req", s.term);
      }
    }

    function onMessageArrive(m: Message) {
      const to = servers[m.to];
      if (!to.alive) return;

      if (m.kind === "vote-req") {
        // Grant vote if we haven't voted this term and candidate term >= ours.
        if (m.term >= to.term && to.votedTerm < m.term) {
          to.term = m.term;
          to.votedTerm = m.term;
          to.role = "follower";
          to.elapsed = 0;
          send(to.id, m.from, "vote-grant", m.term);
        }
      } else if (m.kind === "append") {
        // Heartbeat / replication from leader: accept, reset timer, copy log.
        to.term = Math.max(to.term, m.term);
        to.role = "follower";
        to.elapsed = 0;
        const leader = servers.find((s) => s.role === "leader" && s.alive);
        if (leader) {
          // Replicate up to the leader's log length (simplified full copy).
          while (to.log.length < leader.log.length) {
            const idx = to.log.length;
            to.log.push({ term: leader.log[idx].term, committed: false });
          }
          send(to.id, m.from, "ack", m.term);
        }
      }
      // vote-grant and ack are terminal at their destination and need no
      // further forwarding here (vote tallying happens in handleVoteGrant;
      // commit accounting happens in step()).
    }

    // vote tally needs to happen where the grant reaches the candidate; simplest
    // is to tally on arrival by treating vote-grant target as the candidate.
    function handleVoteGrant(m: Message) {
      const candidate = servers[m.to];
      if (candidate.role === "candidate" && m.term === candidate.term) {
        candidate.votesReceived += 1;
        if (candidate.votesReceived >= MAJORITY) {
          // Win the election.
          candidate.role = "leader";
          // Append a no-op entry for the new term.
          candidate.log.push({ term: candidate.term, committed: false });
          for (const o of servers) {
            if (o.id !== candidate.id)
              send(candidate.id, o.id, "append", candidate.term);
          }
        }
      }
    }

    let lastHeartbeat = 0;
    let lastClientWrite = 0;
    let lastLeaderFail = 0;

    function step(dt: number) {
      simTime += dt;

      // live params
      const wantN = Math.round(paramsRef.current?.servers ?? 7);
      if (wantN !== N) {
        N = wantN;
        MAJORITY = Math.floor(N / 2) + 1;
        messages.length = 0;
        initServers();
        placeServers();
        becomeCandidate(servers[Math.floor(Math.random() * N)]);
      }
      const hbInterval = 1 / Math.max(0.5, paramsRef.current?.heartbeat ?? 1);
      const failRate = Math.max(0, paramsRef.current?.failures ?? 3);

      // advance messages
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        m.t += m.speed * dt;
        if (m.t >= 1) {
          if (m.kind === "vote-grant") handleVoteGrant(m);
          else onMessageArrive(m);
          messages.splice(i, 1);
        }
      }

      // revive crashed nodes
      for (const s of servers) {
        if (!s.alive && simTime >= s.deadUntil) {
          s.alive = true;
          s.role = "follower";
          s.elapsed = 0;
          s.timeout = rand(2.2, 4.0);
        }
      }

      const leader = servers.find((s) => s.role === "leader" && s.alive);

      // election timers for non-leaders
      for (const s of servers) {
        if (!s.alive || s.role === "leader") continue;
        s.elapsed += dt;
        if (s.elapsed >= s.timeout) {
          becomeCandidate(s);
        }
      }

      if (leader) {
        // periodic heartbeats
        if (simTime - lastHeartbeat > hbInterval) {
          lastHeartbeat = simTime;
          for (const o of servers) {
            if (o.id !== leader.id && o.alive)
              send(leader.id, o.id, "append", leader.term);
          }
        }
        // client writes → new log entry on leader
        if (simTime - lastClientWrite > 2.6) {
          lastClientWrite = simTime;
          leader.log.push({ term: leader.term, committed: false });
        }
        // commit entries stored by a majority
        for (let idx = 0; idx < leader.log.length; idx++) {
          if (leader.log[idx].committed) continue;
          let count = 1; // leader has it
          for (const o of servers) {
            if (
              o.id !== leader.id &&
              o.log.length > idx &&
              o.log[idx].term === leader.log[idx].term
            ) {
              count++;
            }
          }
          if (count >= MAJORITY && leader.log[idx].term === leader.term) {
            leader.log[idx].committed = true;
            // propagate committed flag to followers that have it
            for (const o of servers) {
              if (o.id !== leader.id && o.log.length > idx)
                o.log[idx].committed = true;
            }
          }
        }
        // occasionally the leader fails → triggers a new election
        // failRate 0 → never; higher → sooner & more likely
        const failGap = 18 - failRate * 1.4; // seconds of immunity after a fail
        if (
          failRate > 0 &&
          simTime - lastLeaderFail > failGap &&
          Math.random() < dt * 0.1 * failRate
        ) {
          lastLeaderFail = simTime;
          leader.alive = false;
          leader.role = "follower";
          leader.deadUntil = simTime + rand(3, 5);
        }
      }
    }

    // ---------- rendering ----------
    function drawLog(s: Server) {
      const blockW = 7;
      const blockH = 7;
      const gap = 2;
      const maxBlocks = 8;
      const shown = s.log.slice(-maxBlocks);
      const totalW = shown.length * (blockW + gap) - gap;
      const startX = s.x - totalW / 2;
      const y = s.y + 24;
      for (let i = 0; i < shown.length; i++) {
        const e = shown[i];
        const bx = startX + i * (blockW + gap);
        if (e.committed) {
          ctx.fillStyle = termColor(e.term, 0.95);
          ctx.fillRect(bx, y, blockW, blockH);
        } else {
          // hatched (uncommitted)
          ctx.strokeStyle = termColor(e.term, 0.9);
          ctx.lineWidth = 1;
          ctx.strokeRect(bx + 0.5, y + 0.5, blockW - 1, blockH - 1);
          ctx.beginPath();
          ctx.moveTo(bx + 1, y + blockH - 1);
          ctx.lineTo(bx + blockW - 1, y + 1);
          ctx.stroke();
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // links between all nodes (faint)
      for (let i = 0; i < servers.length; i++) {
        for (let j = i + 1; j < servers.length; j++) {
          ctx.beginPath();
          ctx.moveTo(servers[i].x, servers[i].y);
          ctx.lineTo(servers[j].x, servers[j].y);
          ctx.strokeStyle = rgba(border, 0.35);
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // messages
      for (const m of messages) {
        const from = servers[m.from];
        const to = servers[m.to];
        const e = m.t < 0.5 ? 2 * m.t * m.t : 1 - Math.pow(-2 * m.t + 2, 2) / 2;
        const x = from.x + (to.x - from.x) * e;
        const y = from.y + (to.y - from.y) * e;
        let color: RGB;
        if (m.kind === "vote-req") color = accent2;
        else if (m.kind === "vote-grant") color = accent2;
        else if (m.kind === "append") color = accent1;
        else color = muted;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 9);
        grad.addColorStop(0, rgba(color, 0.9));
        grad.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(color, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // servers
      for (const s of servers) {
        const isLeader = s.role === "leader";
        const isCand = s.role === "candidate";
        const baseColor = !s.alive
          ? muted
          : isLeader
            ? accent1
            : isCand
              ? accent2
              : fg;
        const r = isLeader ? 15 : 12;

        // election-timeout draining ring (followers/candidates only)
        if (s.alive && !isLeader) {
          const frac = Math.min(s.elapsed / s.timeout, 1);
          ctx.beginPath();
          ctx.arc(
            s.x,
            s.y,
            r + 5,
            -Math.PI / 2,
            -Math.PI / 2 + (1 - frac) * Math.PI * 2,
          );
          ctx.strokeStyle = rgba(isCand ? accent2 : muted, 0.55);
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // leader pulse ring
        if (isLeader) {
          const pulse = 0.5 + 0.5 * Math.sin(simTime * 4);
          ctx.beginPath();
          ctx.arc(s.x, s.y, r + 7 + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(accent1, 0.4 + pulse * 0.3);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // halo
        const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r + 10);
        halo.addColorStop(0, rgba(baseColor, s.alive ? 0.3 : 0.12));
        halo.addColorStop(1, rgba(baseColor, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 10, 0, Math.PI * 2);
        ctx.fill();

        // body
        ctx.fillStyle = rgba(baseColor, s.alive ? 0.9 : 0.4);
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();

        // role glyph + term label
        ctx.fillStyle = rgba(
          !s.alive ? muted : ([255, 255, 255] as RGB),
          s.alive ? 0.95 : 0.6,
        );
        ctx.font = "600 9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const glyph = !s.alive ? "×" : isLeader ? "L" : isCand ? "C" : "F";
        ctx.fillText(glyph, s.x, s.y);

        // term number above node
        ctx.fillStyle = rgba(muted, 0.9);
        ctx.font = "600 9px ui-monospace, monospace";
        ctx.fillText(`term ${s.term}`, s.x, s.y - r - 10);

        // log row below node
        drawLog(s);
      }
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      // Static frame: elect server 0 as leader with a small committed log.
      servers[0].role = "leader";
      servers[0].term = 2;
      servers[0].log = [
        { term: 1, committed: true },
        { term: 1, committed: true },
        { term: 2, committed: true },
        { term: 2, committed: false },
      ];
      for (let i = 1; i < servers.length; i++) {
        servers[i].term = 2;
        servers[i].log = servers[0].log.map((e) => ({ ...e }));
      }
      draw();
    } else {
      // seed one election so a leader emerges quickly
      becomeCandidate(servers[Math.floor(Math.random() * N)]);
      raf = requestAnimationFrame(loop);
    }

    const themeObserver = new MutationObserver(() => {
      accent1 = hslTripletToRgb("--accent-1");
      accent2 = hslTripletToRgb("--accent-2");
      fg = hslTripletToRgb("--foreground");
      muted = hslTripletToRgb("--muted-foreground");
      border = hslTripletToRgb("--border");
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      themeObserver.disconnect();
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
