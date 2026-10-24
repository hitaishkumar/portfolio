import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/sections/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { GossipInteractive } from "@/components/motion/gossip-interactive";
import { experiences } from "@/lib/data";

export function Experience() {
  return (
    <section id="experience" className="scroll-mt-20 py-20">
      <div className="container">
        <Reveal>
          <SectionHeading eyebrow="03 — Experience" title="Where I've worked" />
        </Reveal>
      <Reveal stagger className="space-y-10">
        {experiences.map((exp) => (
          <div
            key={exp.title + exp.period}
            className="relative border-l border-border pl-6 md:pl-8"
          >
            <span className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-background">
              <Briefcase className="h-2 w-2" />
            </span>
            <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
              <h3 className="text-lg font-semibold">
                {exp.title}{" "}
                <span className="text-muted-foreground">· {exp.company}</span>
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                {exp.period}
              </p>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{exp.location}</p>

            <div className="mt-5 space-y-6">
              {exp.projects.map((project) => (
                <div key={project.name}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium">{project.name}</h4>
                    {project.scale && (
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {project.scale}
                      </Badge>
                    )}
                    {project.caseStudy && (
                      <Link
                        href={project.caseStudy}
                        className="nav-underline inline-flex items-center gap-1 rounded-full border border-accent-1/40 bg-accent-1/10 px-2.5 py-0.5 font-mono text-[11px] text-accent-1 transition-colors hover:bg-accent-1/20"
                      >
                        Read the deep dive
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  <ul className="mt-3 space-y-2">
                    {project.points.map((point, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                      >
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Reveal>

      <Reveal className="mt-14">
        <GossipInteractive />
      </Reveal>
      </div>
    </section>
  );
}
