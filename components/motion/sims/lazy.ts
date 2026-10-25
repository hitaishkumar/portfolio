"use client";

/**
 * Lazy, client-only wrappers for the canvas sims. They're decorative and
 * canvas-heavy, so deferring them with next/dynamic(ssr:false) keeps them out
 * of the critical first-load JS and off the server-render path — the page
 * paints fast and the sims hydrate afterward (and only animate while on-screen).
 */
import dynamic from "next/dynamic";

export const VectorClockSim = dynamic(
  () => import("@/components/motion/sims/vector-clock-sim").then((m) => m.VectorClockSim),
  { ssr: false }
);

export const ConsistentHashSim = dynamic(
  () => import("@/components/motion/sims/consistent-hash-sim").then((m) => m.ConsistentHashSim),
  { ssr: false }
);

export const HighWaterMarkSim = dynamic(
  () => import("@/components/motion/sims/high-water-mark-sim").then((m) => m.HighWaterMarkSim),
  { ssr: false }
);

export const LsmSim = dynamic(
  () => import("@/components/motion/sims/lsm-sim").then((m) => m.LsmSim),
  { ssr: false }
);

export const TwoPhaseCommitSim = dynamic(
  () => import("@/components/motion/sims/two-phase-commit-sim").then((m) => m.TwoPhaseCommitSim),
  { ssr: false }
);
