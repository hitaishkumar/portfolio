import { Github, Linkedin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/sections/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { SimLayer } from "@/components/motion/sim-layer";
import { TwoPhaseCommitSim } from "@/components/motion/sims/two-phase-commit-sim";
import { profile } from "@/lib/data";

export function Contact() {
  return (
    <section id="contact" className="relative scroll-mt-20 overflow-hidden py-20">
      <SimLayer
        algo="Two-Phase Commit"
        description="An atomic-commit protocol: the coordinator asks every participant to PREPARE and collect votes; if all vote yes it broadcasts COMMIT, otherwise ABORT. Guarantees all-or-nothing across nodes — at the cost of blocking if the coordinator fails."
        side="right"
        opacity={0.64}
        sim={TwoPhaseCommitSim}
      />
      <div className="container relative z-10">
        <Reveal>
          <SectionHeading eyebrow="06 — Contact" title="Let's work together" />
        </Reveal>
      <Reveal className="max-w-2xl">
        <p className="text-base leading-relaxed text-muted-foreground">
          I&apos;m open to backend and distributed systems roles. If you&apos;re
          building something that needs to scale reliably, I&apos;d love to hear
          about it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <a href={`mailto:${profile.email}`}>
              <Mail className="h-4 w-4" />
              {profile.email}
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>
              <Phone className="h-4 w-4" />
              {profile.phone}
            </a>
          </Button>
        </div>
        <div className="mt-4 flex gap-1">
          <Button variant="ghost" size="icon" asChild>
            <a href={profile.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {profile.name}{" "}
          <span className="text-muted-foreground/70">· @{profile.handle}</span>
        </p>
        <p className="font-mono text-xs">Built with Next.js · Tailwind · shadcn/ui</p>
      </div>
    </footer>
  );
}
