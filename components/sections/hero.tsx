"use client";

import { Counter } from "@/components/motion/counter";
import { RaftCluster } from "@/components/motion/raft-cluster";
import { Button } from "@/components/ui/button";
import { highlights, profile } from "@/lib/data";
import { withBasePath } from "@/lib/utils";
import { ArrowDown, FileText, Github, Linkedin, Mail } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";

export function Hero() {
  const reduced = useReducedMotion();
  const y = reduced ? 0 : 18;

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.11, delayChildren: 0.15 },
    },
  };
  const item: Variants = {
    hidden: { opacity: 0, y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section className="relative isolate overflow-hidden">
      {/* grid texture */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid"
        aria-hidden
      />

      {/* Raft consensus cluster — canonical diagram, ambient on the right */}
      <div
        className="sim-bg pointer-events-none absolute inset-y-0 right-0 hidden w-[64%] opacity-90 lg:block"
        aria-hidden
      >
        <RaftCluster />
      </div>
      {/* scrim: keep the left-side text readable over the sim */}
      <div
        className="hero-scrim pointer-events-none absolute inset-0"
        aria-hidden
      />

      {/* content */}
      <div className="container relative z-10 flex min-h-[calc(100svh-4rem)] flex-col justify-center py-20">
        <motion.div
          className="max-w-2xl"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={item}
            className="flex items-center gap-2 font-mono text-sm text-muted-foreground"
          >
            Hi, I&apos;m
            <span className="inline-flex items-center gap-1 rounded-full border border-accent-1/30 bg-accent-1/10 px-2 py-0.5 text-xs text-accent-1">
              <span className="text-accent-2">@</span>
              {profile.handle}
            </span>
          </motion.p>
          <motion.h1
            variants={item}
            className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl"
          >
            <span className="text-gradient-animated">{profile.name}</span>
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-4 text-xl font-medium text-muted-foreground sm:text-2xl"
          >
            {profile.tagline}
          </motion.p>
          <motion.p
            variants={item}
            className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground"
          >
            {profile.summary}
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button asChild>
              <a href="#contact">
                <Mail className="h-4 w-4" />
                Get in touch
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={withBasePath(profile.resumeUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4" />
                Resume
              </a>
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <Github className="h-5 w-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </Button>
            </div>
          </motion.div>

          <motion.dl
            variants={item}
            className="mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {highlights.map((h) => (
              <div key={h.label}>
                <dt className="text-gradient text-2xl font-bold tracking-tight sm:text-3xl">
                  <Counter value={h.value} />
                </dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  {h.label}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <a
          href="#about"
          className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-muted-foreground transition-colors hover:text-foreground sm:block"
          aria-label="Scroll to about"
        >
          <ArrowDown className="h-5 w-5 animate-bounce" />
        </a>
      </div>
    </section>
  );
}
