"use client";

import { BadgeCheck, Briefcase } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { SkillNode } from "@/lib/skill-space";
import { SPACE } from "@/lib/skill-space";
import { track } from "@/lib/progress";
import { cn } from "@/lib/utils";

interface Centre {
  id: string;
  title: string;
  x: number;
  y: number;
}

/**
 * Interactive "embedding space" of skills. Hover/focus a point to see its
 * nearest neighbours and the projects that used it; pick a category to
 * light up its cluster like an attention head. One SVG, no animation loop.
 */
export function SkillMap({ nodes, centres }: { nodes: SkillNode[]; centres: Centre[] }) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [focus, setFocus] = useState<string | null>(null);
  const [head, setHead] = useState<string | null>(null);
  const f = focus ? byId.get(focus) : null;
  const near = new Set(f?.neighbours ?? []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap gap-1.5 border-b border-border p-3" role="toolbar" aria-label="Highlight a skill area">
          <span className="hud mr-1 self-center">attention head</span>
          {centres.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={head === c.id}
              onClick={() => {
                track({ t: "flag", flag: "skill-head" });
                setHead((h) => (h === c.id ? null : c.id));
              }}
              className={cn(
                "rounded border px-2 py-1 font-hud text-[0.66rem] transition-colors",
                head === c.id ? "border-signal bg-signal/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
        <svg viewBox={`0 0 ${SPACE.w} ${SPACE.h}`} className="w-full touch-manipulation select-none" role="group" aria-label="Map of skills grouped by area. Use Tab to move between skills.">
          {centres.map((c) => (
            <text
              key={c.id}
              x={c.x}
              y={c.y + (c.y > SPACE.h / 2 ? 92 : -78)}
              textAnchor="middle"
              className={cn(
                "font-hud text-[13px] uppercase transition-[fill,opacity]",
                head && head !== c.id ? "fill-[var(--subtle-foreground)] opacity-40" : "fill-[var(--muted-foreground)]",
                head === c.id && "fill-[var(--signal-pale)]",
              )}
            >
              {c.title}
            </text>
          ))}
          {f
            ? f.neighbours.map((id) => {
                const b = byId.get(id);
                return b ? <line key={id} x1={f.x} y1={f.y} x2={b.x} y2={b.y} stroke="var(--signal)" strokeOpacity={b.cat === f.cat ? 0.7 : 0.35} strokeDasharray={b.cat === f.cat ? undefined : "4 4"} /> : null;
              })
            : null}
          {nodes.map((n) => {
            const isFocus = n.id === focus;
            const lit = isFocus || near.has(n.id) || (head ? n.cat === head : false);
            const dim = (focus && !lit) || (head && n.cat !== head && !focus);
            return (
              <g
                key={n.id}
                tabIndex={0}
                role="button"
                aria-label={`${n.name}, ${n.catTitle}${n.production ? ", used in production" : ""}`}
                onPointerEnter={() => setFocus(n.id)}
                onFocus={() => setFocus(n.id)}
                onClick={() => setFocus(n.id)}
                className="cursor-lock outline-none"
                style={{ opacity: dim ? 0.18 : 1, transition: "opacity 0.25s" }}
              >
                <circle cx={n.x} cy={n.y} r="11" fill="transparent" />
                <rect
                  x={n.x - (isFocus ? 6 : 4)}
                  y={n.y - (isFocus ? 6 : 4)}
                  width={isFocus ? 12 : 8}
                  height={isFocus ? 12 : 8}
                  fill={lit || n.production ? "var(--signal)" : "var(--muted-foreground)"}
                  opacity={lit ? 1 : n.production ? 0.9 : 0.7}
                />
                {lit ? (
                  <text x={n.x + 10} y={n.y + 4} className={cn("pointer-events-none font-hud", isFocus ? "fill-[var(--foreground)] text-[14px]" : "fill-[var(--muted-foreground)] text-[11px]")}>
                    {n.name}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="panel h-fit p-5 lg:sticky lg:top-24" aria-live="polite">
        {f ? (
          <>
            <p className="hud">{f.catTitle}</p>
            <h3 className="mt-2 font-mono text-2xl font-bold">{f.name}</h3>
            <div className="mt-3 flex flex-wrap gap-2 font-hud text-[0.68rem]">
              {f.production ? (
                <span className="inline-flex items-center gap-1 rounded border border-signal/40 px-1.5 py-0.5 text-signal-pale">
                  <Briefcase className="size-3" /> used in production
                </span>
              ) : null}
              {f.verified ? (
                <span className="inline-flex items-center gap-1 rounded border border-success/40 px-1.5 py-0.5 text-success">
                  <BadgeCheck className="size-3" /> LinkedIn assessment passed
                </span>
              ) : null}
            </div>
            {f.projects.length ? (
              <>
                <p className="hud mt-5">used in</p>
                <ul className="mt-2 space-y-1">
                  {f.projects.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/projects/${p.slug}/`} className="link-mono text-sm">
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="hud mt-5">nearest neighbours</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {f.neighbours.map((id) => {
                const b = byId.get(id);
                return b ? (
                  <li key={id}>
                    <button type="button" onClick={() => setFocus(id)} className="rounded border border-border px-2 py-0.5 font-hud text-[0.68rem] text-muted-foreground hover:border-signal hover:text-foreground">
                      {b.name}
                    </button>
                  </li>
                ) : null;
              })}
            </ul>
          </>
        ) : (
          <>
            <p className="hud">how to read this</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every dot is a skill. Similar skills sit close together, and red dots are ones I&apos;ve used in production. Hover or tab to a dot to see
              what it connects to and which projects used it.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
