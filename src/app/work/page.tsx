import { Award, ChevronDown, Languages, MessageSquareQuote } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/components/link";
import type { CSSProperties } from "react";
import { DiffusionImage } from "@/components/fx/diffusion-image";
import { Sparkline } from "@/components/home/sparkline";
import { PageHeader } from "@/components/page-header";
import { CheckpointTracker } from "@/components/work/checkpoint-tracker";
import { degrees, honors, roles } from "@/content/experience";
import { testimonials } from "@/content/testimonials";
import type { Degree, Role, Testimonial } from "@/content/types";
import { image } from "@/lib/assets";
import { duration, formatMonth, formatRange } from "@/lib/format";
import { projectsForRole } from "@/lib/projects";
import { stats } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Work",
  description: "Avishake Adhikary's career as a training run: every job and degree from 2018 to today, the projects built at each, and what colleagues said.",
  alternates: { canonical: "/work/" },
};

type Item = { kind: "role"; role: Role } | { kind: "degree"; degree: Degree };

function Feedback({ t }: { t: Testimonial }) {
  const long = t.quote.length > 260;
  return (
    <figure className="rounded-md border border-border bg-white/[0.015] p-4">
      <blockquote className="text-[0.95rem] leading-relaxed text-foreground/90">
        {long ? (
          <details className="group/q">
            <summary className="cursor-lock list-none [&::-webkit-details-marker]:hidden">
              &ldquo;{t.quote.slice(0, 240).replace(/\s+\S*$/, "")}…&rdquo;{" "}
              <span className="font-hud text-[0.7rem] text-signal group-open/q:hidden">read all</span>
            </summary>
            <p className="mt-2">&ldquo;{t.quote}&rdquo;</p>
          </details>
        ) : (
          <>&ldquo;{t.quote}&rdquo;</>
        )}
      </blockquote>
      <figcaption className="mt-3 font-hud text-[0.7rem] text-subtle-foreground">
        <span className="text-foreground">{t.name}</span> · {t.title}
        <br />
        {t.relationship}
        {t.date ? ` · ${formatMonth(t.date)}` : ""}
      </figcaption>
    </figure>
  );
}

function RoleCheckpoint({ role, n }: { role: Role; n: number }) {
  const built = projectsForRole(role.id);
  const fb = testimonials.filter((t) => t.roleId === role.id);
  const lead = role.highlights.slice(0, 3);
  const rest = role.highlights.slice(3);
  return (
    <article id={`ckpt-${role.id}`} data-label={`${role.org} · ${formatMonth(role.start)}`} className="scroll-mt-28">
      <p className="hud flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-signal">ckpt-{String(n).padStart(2, "0")}</span>
        <span>{formatRange(role.start, role.end)}</span>
        <span>· {duration(role.start, role.end)}</span>
        {role.employment ? <span>· {role.employment}</span> : null}
        {role.end === null ? <span className="text-success">· current</span> : null}
      </p>
      <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{role.title}</h2>
      <p className="mt-1 font-mono text-signal-pale">
        {role.org} <span className="text-subtle-foreground">· {role.location}</span>
      </p>
      {role.stages ? (
        <ol className="mt-4 space-y-1 border-l border-border-strong pl-4 text-sm">
          {role.stages.map((s) => (
            <li key={s.title}>
              <span className="text-foreground">{s.title}</span> <span className="font-hud text-xs text-subtle-foreground">{formatRange(s.start, s.end)}</span>
              {s.note ? <p className="text-muted-foreground">{s.note}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{role.summary}</p>
      <ul className="mt-4 space-y-2.5 leading-relaxed text-muted-foreground">
        {lead.map((h) => (
          <li key={h} className="flex gap-3">
            <span className="mt-[0.6em] size-1.5 shrink-0 bg-signal" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
      {rest.length ? (
        <details className="group/d mt-3">
          <summary className="flex w-fit cursor-lock list-none items-center gap-1 font-hud text-xs text-signal [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-3.5 transition-transform group-open/d:rotate-180" />
            <span className="group-open/d:hidden">{rest.length} more details</span>
            <span className="hidden group-open/d:inline">fewer details</span>
          </summary>
          <ul className="mt-3 space-y-2.5 leading-relaxed text-muted-foreground">
            {rest.map((h) => (
              <li key={h} className="flex gap-3">
                <span className="mt-[0.6em] size-1.5 shrink-0 bg-signal/60" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {built.length ? (
        <div className="mt-6">
          <p className="hud mb-2">built here</p>
          <div className="flex flex-wrap gap-2">
            {built.map((p) => (
              <Link key={p.slug} href={`/projects/${p.slug}/`} className="rounded-md border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:border-signal hover:text-signal-pale">
                {p.title} →
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {fb.length ? (
        <div className="mt-6">
          <p className="hud mb-2 flex items-center gap-2">
            <MessageSquareQuote className="size-3.5 text-signal" /> human feedback
          </p>
          <div className="grid gap-3">
            {fb.map((t) => (
              <Feedback key={t.name} t={t} />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DegreeCheckpoint({ d, n }: { d: Degree; n: number }) {
  const award = honors.find((h) => h.roleId === d.id);
  const awardImg = image(award?.image);
  const fb = testimonials.filter((t) => t.roleId === d.id);
  const built = projectsForRole(d.id);
  return (
    <article id={`ckpt-${d.id}`} data-label={`${d.short} · ${d.school}`} className="scroll-mt-28">
      <p className="hud flex flex-wrap gap-x-3">
        <span className="text-signal">ckpt-{String(n).padStart(2, "0")}</span>
        <span>{formatRange(d.start, d.end)}</span>
        <span>· pre-training</span>
      </p>
      <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{d.degree}</h2>
      <p className="mt-1 font-mono text-signal-pale">
        {d.institute} <span className="text-subtle-foreground">· {d.school}</span>
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-6">
        <div>
          <p className="font-mono text-4xl font-bold">{d.cgpa.toFixed(2)}</p>
          <p className="hud">cgpa · {d.division}</p>
        </div>
        <div className="flex items-center gap-3">
          <Sparkline values={d.sgpa} label={`SGPA by semester: ${d.sgpa.join(", ")}`} />
          <p className="font-hud text-[0.7rem] text-subtle-foreground">
            sgpa per semester
            <br />
            {d.sgpa.map((s) => s.toFixed(2)).join(" → ")}
          </p>
        </div>
      </div>
      <p className="mt-5 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
        <Languages className="size-4 text-signal" /> Medium of instruction: <strong className="font-semibold">{d.mediumOfInstruction}</strong>
      </p>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        <span className="text-foreground">Coursework:</span> {d.coursework.join(" · ")}
      </p>
      {d.certificates ? (
        <p className="mt-2 leading-relaxed text-muted-foreground">
          <span className="text-foreground">Also completed:</span> {d.certificates.join(" · ")}
        </p>
      ) : null}
      <p className="mt-2 text-muted-foreground">
        <span className="text-foreground">Roles:</span> {d.roles.join(" · ")}
      </p>
      {built.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {built.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}/`} className="rounded-md border border-border px-3 py-1.5 font-mono text-xs hover:border-signal">
              {p.title} →
            </Link>
          ))}
        </div>
      ) : null}
      {award ? (
        <div className="mt-6 grid gap-5 rounded-lg border border-signal/40 bg-signal/[0.05] p-5 sm:grid-cols-[9rem_1fr]">
          {awardImg ? <DiffusionImage img={awardImg} alt="The Shree Baljit Shastri Award plate" sizes="144px" caption={false} className="aspect-square rounded-md" /> : null}
          <div>
            <p className="hud flex items-center gap-2 text-signal">
              <Award className="size-3.5" /> honor · convocation {award.date.slice(0, 4)}
            </p>
            <h3 className="mt-2 text-xl font-bold">{award.title}</h3>
            <p className="mt-1 text-sm text-signal-pale">{award.issuer}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{award.description}</p>
          </div>
        </div>
      ) : null}
      {fb.length ? (
        <div className="mt-6 grid gap-3">
          <p className="hud flex items-center gap-2">
            <MessageSquareQuote className="size-3.5 text-signal" /> human feedback
          </p>
          {fb.map((t) => (
            <Feedback key={t.name} t={t} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function WorkPage() {
  const items: Item[] = [
    ...roles.map((role) => ({ kind: "role" as const, role })),
    ...degrees.map((degree) => ({ kind: "degree" as const, degree })),
  ].sort((a, b) => (a.kind === "role" ? a.role.start : a.degree.start).localeCompare(b.kind === "role" ? b.role.start : b.degree.start));
  const ids = items.map((it) => `ckpt-${it.kind === "role" ? it.role.id : it.degree.id}`);
  const unattached = testimonials.filter((t) => !t.roleId);

  // Vertical training curve: time flows down, "still to learn" shrinks right→left.
  const H = 520;
  const W = 220;
  const start = 2018.5;
  const end = 2026.9;
  const yOf = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return 24 + ((y + (mo - 1) / 12 - start) / (end - start)) * (H - 48);
  };
  const curve = Array.from({ length: 80 }, (_, i) => {
    const t = i / 79;
    const x = 20 + (Math.exp(-2.4 * t) * 0.82 + 0.1 + Math.sin(i * 1.3) * 0.02) * (W - 40);
    return `${i ? "L" : "M"}${x.toFixed(1)},${(24 + t * (H - 48)).toFixed(1)}`;
  }).join(" ");

  return (
    <>
      <PageHeader
        title="Work"
        sub="training run"
        intro={`My career as a training run: ${roles.length} roles and 2 degrees over ${stats.yearsBuilding}+ years, oldest first. Every checkpoint lists what I did, what I built there, and what the people around me said.`}
      />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[15rem_1fr] lg:gap-16">
        <aside className="hidden lg:block">
          <div id="training-chart" className="panel sticky top-24 p-4" style={{ "--progress": 0 } as CSSProperties}>
            <p className="hud">training curve</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden>
              <path d={curve} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
              <path
                d={curve}
                fill="none"
                stroke="var(--signal)"
                strokeWidth="2.2"
                pathLength={1}
                strokeDasharray="1"
                style={{ strokeDashoffset: "calc(1 - var(--progress))", transition: "stroke-dashoffset 0.8s cubic-bezier(0.2,0.7,0.2,1)" }}
              />
              {items.map((it) => {
                const id = it.kind === "role" ? it.role.id : it.degree.id;
                const y = yOf(it.kind === "role" ? it.role.start : it.degree.start);
                const label = it.kind === "role" ? (it.role.short ?? it.role.org.split(" ")[0]) : it.degree.short;
                return (
                  <g key={id} data-ckpt={`ckpt-${id}`} className="group/c [&[data-active]_circle]:fill-[var(--signal)] [&[data-active]_text]:fill-[var(--foreground)] [&[data-done]_circle]:stroke-[var(--signal)]">
                    <circle cx={W - 14} cy={y} r="5" fill="var(--background)" stroke="var(--border-strong)" strokeWidth="2" />
                    <text x={W - 26} y={y + 4} textAnchor="end" className="fill-[var(--subtle-foreground)] font-hud text-[12px]">
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="mt-3 font-hud text-[0.65rem] text-subtle-foreground">now reading</p>
            <p id="training-current" className="font-mono text-xs text-signal-pale" />
          </div>
        </aside>

        <div className="space-y-24">
          {items.map((it, i) =>
            it.kind === "role" ? <RoleCheckpoint key={it.role.id} role={it.role} n={i + 1} /> : <DegreeCheckpoint key={it.degree.id} d={it.degree} n={i + 1} />,
          )}

          {unattached.length ? (
            <section id="feedback" className="scroll-mt-28">
              <p className="hud">more human feedback</p>
              <div className="mt-4 grid gap-3">
                {unattached.map((t) => (
                  <Feedback key={t.name} t={t} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <CheckpointTracker ids={ids} />
    </>
  );
}
