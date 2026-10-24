"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Animate direct children with a stagger instead of the container itself. */
  stagger?: boolean;
  /** Start delay in seconds. */
  delay?: number;
  /** Travel distance in px for the fade-up. */
  distance?: number;
  /** Render element tag. */
  as?: "div" | "section" | "ul" | "dl";
};

/**
 * Fades + lifts content into view the first time it enters the viewport.
 * Built on Framer Motion's `whileInView`, which fires reliably for elements
 * already on-screen at load *and* for elements scrolled into view later.
 * When `stagger` is set, each direct child animates in sequence.
 * Honors `prefers-reduced-motion` automatically.
 */
export function Reveal({
  children,
  className,
  stagger: useStaggerProp = false,
  delay = 0,
  distance = 16,
  as = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  const d = reduced ? 0 : distance;

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: useStaggerProp ? 0.09 : 0,
        delayChildren: delay,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: d },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const MotionTag = motion[as];

  // Staggered mode: wrap each direct child in a motion item.
  if (useStaggerProp) {
    return (
      <MotionTag
        className={cn(className)}
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
      >
        {React.Children.map(children, (child, i) => (
          <motion.div key={i} variants={item} className="h-full">
            {child}
          </motion.div>
        ))}
      </MotionTag>
    );
  }

  // Single-element mode: animate the container itself.
  return (
    <MotionTag
      className={cn(className)}
      variants={item}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}
