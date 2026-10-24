"use client";

import * as React from "react";
import { useInView, useReducedMotion, animate } from "motion/react";

type CounterProps = {
  /** Full display value, e.g. "600M+", "99.9%", "13M/hr", "10M+". */
  value: string;
  className?: string;
};

/**
 * Splits a metric like "99.9%" into { prefix:"", number:99.9, suffix:"%" }
 * and animates the numeric part counting up the first time it enters view.
 */
function parseMetric(value: string) {
  const match = value.match(/^(\D*)([\d.]+)(.*)$/);
  if (!match) return { prefix: "", number: null as number | null, suffix: value };
  const [, prefix, num, suffix] = match;
  return { prefix, number: parseFloat(num), suffix };
}

export function Counter({ value, className }: CounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();

  const { prefix, number, suffix } = React.useMemo(
    () => parseMetric(value),
    [value]
  );
  const decimals = React.useMemo(() => {
    const dot = String(number ?? "").split(".")[1];
    return dot ? dot.length : 0;
  }, [number]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || number === null) return;

    if (reduced) {
      el.textContent = value;
      return;
    }

    if (!inView) {
      el.textContent = `${prefix}0${suffix}`;
      return;
    }

    const controls = animate(0, number, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        el.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
      },
      onComplete: () => {
        el.textContent = value;
      },
    });

    return () => controls.stop();
  }, [inView, reduced, value, prefix, suffix, number, decimals]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
