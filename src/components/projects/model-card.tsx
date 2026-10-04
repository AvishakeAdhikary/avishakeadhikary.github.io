import { GitFork, Star } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { roleById } from "@/content/experience";
import { CATEGORY_LABEL, type ResolvedProject } from "@/lib/projects";
import { formatRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProjectCover } from "./project-cover";

/** Where a project was built, in plain words. */
export function builtAt(p: ResolvedProject) {
  if (!p.roleId) return { short: "Independent", key: "indie" };
  if (p.roleId.startsWith("amity")) return { short: "Amity University", key: "amity" };
  const r = roleById(p.roleId);
  const org = r?.org ?? p.roleId;
  return { short: org.replace(" Private Limited", "").replace(" Consulting Services", ""), key: p.roleId.split("-")[0] };
}

/**
 * Hugging Face-style "model card" for a project. Server-rendered; the
 * cover morphs into the detail page hero via a shared ViewTransition name.
 */
export function ModelCard({ project: p, priority }: { project: ResolvedProject; priority?: boolean }) {
  const at = builtAt(p);
  const search = [p.title, p.tagline, ...p.tech, ...p.categories.map((c) => CATEGORY_LABEL[c]), at.short].join(" ").toLowerCase();
  return (
    <article
      data-model
      data-task={p.categories.join(" ")}
      data-at={at.key}
      data-search={search}
      className="group spotlight panel relative flex h-full flex-col overflow-hidden transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-signal/50"
    >
      <ViewTransition name={`cover-${p.slug}`} share="morph" default="none">
        <ProjectCover project={p} priority={priority} className="aspect-[16/9] border-b border-border" />
      </ViewTransition>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-hud text-[0.72rem] text-subtle-foreground">
          avishake/<span className="text-foreground">{p.slug}</span>
        </p>
        <h3 className="mt-2 text-xl leading-tight font-bold">
          <Link href={`/projects/${p.slug}/`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {p.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{p.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.categories.slice(0, 3).map((c) => (
            <span key={c} className="rounded border border-signal/30 bg-signal/[0.06] px-1.5 py-0.5 font-hud text-[0.62rem] text-signal-pale">
              {CATEGORY_LABEL[c]}
            </span>
          ))}
          {p.tech.slice(0, 2).map((t) => (
            <span key={t} className="rounded border border-border px-1.5 py-0.5 font-hud text-[0.62rem] text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5 font-hud text-[0.66rem] text-subtle-foreground">
          <span className={cn("inline-flex items-center gap-1.5", p.roleId ? "text-signal-pale" : "")}>
            <span className={cn("size-1.5 rounded-full", p.roleId ? "bg-signal" : "bg-muted-foreground")} />
            {at.short}
          </span>
          <span className="flex items-center gap-3">
            {p.stats?.stars ? (
              <span className="inline-flex items-center gap-1" title="GitHub stars">
                <Star className="size-3" /> {p.stats.stars}
              </span>
            ) : null}
            {p.stats?.forks ? (
              <span className="inline-flex items-center gap-1" title="Forks">
                <GitFork className="size-3" /> {p.stats.forks}
              </span>
            ) : null}
            {!p.stats?.stars ? <span>{formatRange(p.start, p.end).split(" – ")[0]}</span> : null}
          </span>
        </div>
      </div>
    </article>
  );
}
