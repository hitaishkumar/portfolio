"use client";

import * as React from "react";

export type RGB = [number, number, number];

/** Resolve a CSS custom property holding an HSL triplet into an RGB tuple. */
export function hslVarToRgb(varName: string): RGB {
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

export const rgba = (c: RGB, a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

/** Theme palette resolved from CSS variables, refreshed on theme toggle. */
export function useSimPalette() {
  const read = React.useCallback(
    () => ({
      accent1: hslVarToRgb("--accent-1"),
      accent2: hslVarToRgb("--accent-2"),
      accent3: hslVarToRgb("--accent-3"),
      fg: hslVarToRgb("--foreground"),
      muted: hslVarToRgb("--muted-foreground"),
      border: hslVarToRgb("--border"),
    }),
    []
  );
  const paletteRef = React.useRef(read());

  React.useEffect(() => {
    paletteRef.current = read();
    const obs = new MutationObserver(() => {
      paletteRef.current = read();
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, [read]);

  return paletteRef;
}

/** Returns true while `ref` is intersecting the viewport (for animation gating). */
export function useOnScreen<T extends Element>(
  ref: React.RefObject<T | null>,
  amount = 0.1
) {
  const [onScreen, setOnScreen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: amount }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, amount]);
  return onScreen;
}
