import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/sections/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { SkillBadge } from "@/components/motion/brand-logo";
import { aiWorkflow } from "@/lib/data";

export function AiWorkflow() {
  return (
    <section
      id="ai"
      className="relative scroll-mt-20 overflow-hidden border-t border-border py-20"
    >
      <div className="container relative z-10">
        <Reveal>
          <SectionHeading eyebrow="03 — AI Workflow" title="Engineering with AI" />
        </Reveal>

        <Reveal className="mb-10 max-w-3xl">
          <p className="text-base leading-relaxed text-muted-foreground">
            {aiWorkflow.intro}
          </p>
        </Reveal>

        <Reveal stagger className="grid gap-4 md:grid-cols-2">
          {aiWorkflow.groups.map((group) => (
            <Card key={group.title} className="card-lift h-full">
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-accent-1/40 bg-accent-1/10">
                    <Sparkles className="h-3.5 w-3.5 text-accent-1" />
                  </span>
                  <h3 className="font-semibold leading-snug">{group.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {group.blurb}
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <SkillBadge key={item} label={item} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
