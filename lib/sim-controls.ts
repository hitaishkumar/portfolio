import type { SimControl } from "@/components/motion/sim-layer";

/**
 * Sim control descriptors live here (not in the sim modules) so sections can
 * import them cheaply while the canvas sim components are lazy-loaded.
 */

export const vectorClockControls: SimControl[] = [
  { key: "procs", label: "processes", min: 2, max: 5, default: 3 },
  { key: "rate", label: "events/s", min: 1, max: 6, default: 2 },
];

export const consistentHashControls: SimControl[] = [
  { key: "nodes", label: "nodes", min: 3, max: 10, default: 5 },
  { key: "keys", label: "keys", min: 10, max: 120, default: 40 },
  { key: "churn", label: "churn", min: 0, max: 10, default: 4 },
];

export const hwmControls: SimControl[] = [
  { key: "servers", label: "servers", min: 6, max: 40, default: 16 },
  { key: "appendRate", label: "append/s", min: 1, max: 12, default: 4 },
  { key: "churn", label: "churn", min: 0, max: 10, default: 4 },
];

export const lsmControls: SimControl[] = [
  { key: "writeRate", label: "writes/s", min: 1, max: 14, default: 8 },
  { key: "fanout", label: "fanout", min: 2, max: 6, default: 3 },
];

export const twoPhaseCommitControls: SimControl[] = [
  { key: "participants", label: "participants", min: 2, max: 6, default: 3 },
  { key: "abortPct", label: "abort %", min: 0, max: 80, step: 5, default: 25, unit: "%" },
];
