"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProjectShot } from "@/lib/data";
import { withBasePath } from "@/lib/utils";

/**
 * Screenshot gallery for a project card: a horizontal thumbnail strip that
 * opens an accessible lightbox (arrow keys / Esc / click-outside) on select.
 */
export function ProjectGallery({ shots }: { shots: ProjectShot[] }) {
  const [open, setOpen] = React.useState<number | null>(null);
  const isOpen = open !== null;

  const close = React.useCallback(() => setOpen(null), []);
  const step = React.useCallback(
    (dir: number) =>
      setOpen((i) => (i === null ? i : (i + dir + shots.length) % shots.length)),
    [shots.length],
  );

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    // lock scroll while the lightbox is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, close, step]);

  if (shots.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Screenshots
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {shots.map((shot, i) => (
          <button
            key={shot.src}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`View screenshot: ${shot.caption}`}
            className="group relative aspect-video h-16 shrink-0 overflow-hidden rounded-md border bg-background transition-colors hover:border-accent-1/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={withBasePath(shot.src)}
              alt={shot.caption}
              loading="lazy"
              className="h-full w-full object-cover object-left-top transition-transform duration-200 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/70 p-4 backdrop-blur-sm"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="Screenshot viewer"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close viewer"
              className="absolute right-4 top-4 rounded-full border border-white/30 bg-black/30 p-2 text-white transition-colors hover:bg-black/50"
            >
              <X className="h-5 w-5" />
            </button>

            {shots.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  aria-label="Previous screenshot"
                  className="absolute left-4 rounded-full border border-white/30 bg-black/30 p-2 text-white transition-colors hover:bg-black/50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  aria-label="Next screenshot"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/30 p-2 text-white transition-colors hover:bg-black/50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <motion.figure
              key={open}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="flex max-h-[90vh] max-w-5xl flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={withBasePath(shots[open].src)}
                alt={shots[open].caption}
                className="max-h-[80vh] w-auto rounded-lg border border-white/10 object-contain shadow-2xl"
              />
              <figcaption className="rounded-full bg-black/40 px-3 py-1 text-center font-mono text-xs text-white/90">
                {open + 1} / {shots.length} · {shots[open].caption}
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
