import { BadgeCheck, Briefcase } from "lucide-react";
import type { Metadata } from "next";
import { SkillIcon } from "@/components/icons/skill-icon";
import { PageHeader } from "@/components/page-header";
import { SkillMap } from "@/components/skills/skill-map";
import { skillCategories, skillCount } from "@/content/skills";
import { buildSkillSpace } from "@/lib/skill-space";
import { stats } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Skills",
  description: "Avishake Adhikary's skills as an embedding space: LLMs, agentic AI, ML, computer vision, web, mobile, data, cloud and hardware.",
  alternates: { canonical: "/skills/" },
};

export default function SkillsPage() {
  const { nodes, centres } = buildSkillSpace();
  const production = nodes.filter((n) => n.production).length;
  return (
    <>
      <PageHeader
        title="Skills"
        sub="embedding space"
        intro={`${skillCount} tools across ${skillCategories.length} areas, ${production} of them used in real production work. I've also learned ${stats.programmingLanguages} programming languages and ${stats.frameworks} frameworks along the way.`}
      />
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6">
        <div className="hidden md:block" data-reveal>
          <SkillMap nodes={nodes} centres={centres} />
        </div>

        <section aria-labelledby="all-skills">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="all-skills" className="text-3xl font-bold sm:text-4xl">
              The full list<span className="text-signal">.</span>
            </h2>
            <p className="flex gap-4 font-hud text-[0.68rem] text-subtle-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-signal" /> used in production
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-3.5 text-success" /> assessment passed
              </span>
            </p>
          </div>
          <div className="mt-8 columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4">
            {skillCategories.map((c, i) => (
              <article key={c.id} data-reveal style={{ ["--i" as string]: i % 3 }} className="spotlight panel break-inside-avoid p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-mono text-lg font-bold">{c.title}</h3>
                  <span className="font-hud text-xs text-subtle-foreground">{String(c.skills.length).padStart(2, "0")}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {c.skills.map((s) => (
                    <li
                      key={s.name}
                      className={cn(
                        "group inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[0.8rem]",
                        s.production ? "border-signal/30 bg-signal/[0.05] text-foreground" : "border-border text-muted-foreground",
                      )}
                    >
                      <SkillIcon icon={s.icon} className="size-3.5" />
                      {s.name}
                      {s.verified ? <BadgeCheck aria-label="assessment passed" className="size-3.5 text-success" /> : null}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
