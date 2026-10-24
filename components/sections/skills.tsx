import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/sections/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { BrandLogo, SkillBadge } from "@/components/motion/brand-logo";
import { SimLayer } from "@/components/motion/sim-layer";
import { ConsistentHashSim } from "@/components/motion/sims/consistent-hash-sim";
import { skills, featuredTech } from "@/lib/data";

export function Skills() {
  return (
    <section
      id="skills"
      className="relative scroll-mt-20 overflow-hidden border-t border-border bg-muted/30 py-20"
    >
      <SimLayer
        algo="Consistent Hashing"
        description="Nodes and keys are hashed onto a ring; each key is owned by the first node clockwise. Adding or removing a node only remaps the keys in its arc — not the whole keyspace — so rebalancing stays cheap as the cluster changes."
        side="right"
        opacity={0.62}
        sim={ConsistentHashSim}
      />
      <div className="container relative z-10">
        <Reveal>
          <SectionHeading eyebrow="02 — Skills" title="Tools & technologies" />
        </Reveal>

        {/* Featured stack — auto-scrolling, always-colored brand logos */}
        <Reveal className="mb-12">
          <div className="marquee">
            <div className="marquee-track">
              {[...featuredTech, ...featuredTech].map((tech, i) => (
                <div
                  key={`${tech.name}-${i}`}
                  className="card-lift glass mr-3 flex w-28 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border p-4"
                  title={tech.name}
                  aria-hidden={i >= featuredTech.length}
                >
                  <BrandLogo
                    icon={tech.icon}
                    name={tech.name}
                    className="h-7 w-7"
                  />
                  <span className="text-center text-[10px] leading-tight text-muted-foreground">
                    {tech.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((group) => (
            <Card key={group.category} className="card-lift h-full">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">{group.category}</h3>
                <div className="mt-3 flex flex-col items-start gap-2">
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
