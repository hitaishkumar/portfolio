import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/sections/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { SkillBadge } from "@/components/motion/brand-logo";
import { ProjectGallery } from "@/components/motion/project-gallery";
import { SimLayer } from "@/components/motion/sim-layer";
import { LsmSim } from "@/components/motion/sims/lazy";
import { lsmControls } from "@/lib/sim-controls";
import { projects, type Project } from "@/lib/data";

function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="card-lift flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col p-6">
        <h3 className="font-semibold leading-snug">{project.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{project.subtitle}</p>
        <ul className="mt-4 flex-1 space-y-2">
          {project.points.map((point, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <SkillBadge key={tag} label={tag} />
          ))}
        </div>
        {project.screenshots && project.screenshots.length > 0 && (
          <ProjectGallery shots={project.screenshots} />
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {project.caseStudy && (
            <Link
              href={project.caseStudy}
              className="nav-underline inline-flex w-fit items-center gap-1 rounded-full border border-accent-1/40 bg-accent-1/10 px-2.5 py-1 font-mono text-[11px] text-accent-1 transition-colors hover:bg-accent-1/20"
            >
              Read the deep dive
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {project.repo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Github className="h-3 w-3" />
              View on GitHub
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function Projects() {
  return (
    <section
      id="projects"
      className="relative scroll-mt-20 overflow-hidden border-t border-border bg-muted/30 py-20"
    >
      <SimLayer
        algo="LSM-Tree Compaction"
        description="Writes buffer in an in-memory memtable, flush to immutable L0 SSTables, then compact down through levels — merging many small segments into fewer larger ones. Trades write-amplification for fast sequential writes. The storage engine behind RocksDB, Cassandra & ClickHouse."
        side="full"
        opacity={0.5}
        sim={LsmSim}
        controls={lsmControls}
      />
      <div className="container relative z-10">
        <Reveal>
          <SectionHeading eyebrow="05 — Projects" title="Things I've built" />
        </Reveal>
        <Reveal
          stagger
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
