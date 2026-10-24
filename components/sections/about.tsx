import { Reveal } from "@/components/motion/reveal";
import { EduLogo } from "@/components/motion/edu-logo";
import { SimLayer } from "@/components/motion/sim-layer";
import { VectorClockSim } from "@/components/motion/sims/vector-clock-sim";
import { SectionHeading } from "@/components/sections/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { education, profile } from "@/lib/data";
import { MapPin } from "lucide-react";

export function About() {
  return (
    <section id="about" className="relative scroll-mt-20 overflow-hidden py-20">
      <SimLayer
        algo="Vector Clocks"
        description="Each process keeps a vector of logical counters. Local events bump its own entry; a received message merges the sender's vector (component-wise max) then increments — capturing causal 'happened-before' ordering without synced clocks."
        side="right"
        opacity={0.95}
        sim={VectorClockSim}
      />
      <div className="container relative z-10">
        <Reveal>
          <SectionHeading eyebrow="01 — About" title="A bit about me" />
        </Reveal>
        <div className="grid gap-10 md:grid-cols-5">
          <Reveal className="md:col-span-3">
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                I&apos;m a backend engineer who enjoys the hard parts of
                distributed systems — concurrency, backpressure, exactly-once
                semantics, and keeping services healthy under real production
                load. Most of my work lives in Go, close to message queues,
                databases, and the metrics that tell you what&apos;s actually
                happening.
              </p>
              <p>
                At KFINTECH I own systems end-to-end: from design docs and
                architecture through deployment, on-call, and root-cause
                analysis. I care about systems that are reliable, observable,
                and cost-efficient at scale.
              </p>
              <p>
                KFINTECH is one of India&apos;s largest registered transfer
                agents and fintech infrastructure providers — the kind of
                environment where a dropped message or a double-send isn&apos;t
                a bug, it&apos;s a compliance incident. Years of building there
                have made audit trails, exactly-once delivery, graceful
                degradation, and zero-data-loss shutdowns my defaults rather
                than afterthoughts. That instinct for correctness under
                regulatory scrutiny translates directly to any domain where
                reliability is non-negotiable — payments, healthcare, infra.
              </p>
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                {profile.location}
              </p>
            </div>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.15}>
            <Card className="card-lift">
              <CardContent className="p-6">
                <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Education
                </p>
                <div className="space-y-5">
                  {education.map((edu) => (
                    <div key={edu.school} className="flex items-start gap-3">
                      <EduLogo
                        logo={edu.logo}
                        monogram={edu.monogram}
                        alt={`${edu.school} logo`}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold leading-snug">
                            {edu.school}
                          </h3>
                          {edu.current && (
                            <span className="rounded-full border border-accent-1/40 bg-accent-1/10 px-2 py-0.5 font-mono text-[10px] text-accent-1">
                              pursuing
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {edu.degree}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {edu.detail ? `${edu.detail} · ` : ""}
                          {edu.period}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {edu.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
