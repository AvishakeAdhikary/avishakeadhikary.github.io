import { ArrowLeft, ArrowRight, ArrowUpRight, GitFork, Scale, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Stream } from "@/components/fx/stream";
import { GitHubIcon } from "@/components/icons/brand";
import { VideoPlayer } from "@/components/media/video-player";
import { builtAt } from "@/components/projects/model-card";
import { ProjectCover } from "@/components/projects/project-cover";
import { degreeById, roleById } from "@/content/experience";
import { video } from "@/lib/assets";
import { formatDate, formatRange } from "@/lib/format";
import { CATEGORY_LABEL, getProject, getProjects } from "@/lib/projects";

export const dynamicParams = false;

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: `${p.tagline}. ${p.description}`.slice(0, 300),
    alternates: { canonical: `/projects/${p.slug}/` },
    openGraph: { title: `${p.title} · Avishake Adhikary`, description: p.tagline },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = getProjects();
  const idx = all.findIndex((p) => p.slug === slug);
  const p = all[idx];
  if (!p) notFound();

  const role = p.roleId ? roleById(p.roleId) : undefined;
  const degree = p.roleId ? degreeById(p.roleId) : undefined;
  const at = builtAt(p);
  const vid = video(p.video);
  const prev = all[(idx - 1 + all.length) % all.length];
  const next = all[(idx + 1) % all.length];
  const siblings = p.roleId ? all.filter((x) => x.roleId === p.roleId && x.slug !== p.slug) : [];
  const links = [
    p.links.live && { href: p.links.live, label: "Live", primary: true },
    p.links.repo && { href: p.links.repo, label: "Source", icon: true },
    p.links.docs && { href: p.links.docs, label: "Docs" },
    p.links.store && { href: p.links.store, label: "Store" },
  ].filter(Boolean) as { href: string; label: string; primary?: boolean; icon?: boolean }[];

  return (
    <article className="mx-auto max-w-6xl px-4 pt-28 pb-24 sm:px-6 md:pt-32">
      <Link href="/projects/" className="inline-flex items-center gap-1.5 font-hud text-xs text-subtle-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> cd ../projects
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <p className="font-hud text-sm text-subtle-foreground">
            avishake/<span className="text-foreground">{p.slug}</span>
          </p>
          <h1 className="mt-3 text-5xl leading-none font-extrabold sm:text-7xl">
            <Stream as="span" text={p.title} unit="char" speed={40} />
            <span className="text-signal glow">.</span>
          </h1>
          <Stream as="p" text={p.tagline} offset={400} speed={30} className="mt-4 text-xl text-muted-foreground" />
          <div className="mt-5 flex flex-wrap gap-1.5">
            {p.categories.map((c) => (
              <span key={c} className="rounded border border-signal/30 bg-signal/[0.06] px-2 py-0.5 font-hud text-[0.68rem] text-signal-pale">
                {CATEGORY_LABEL[c]}
              </span>
            ))}
            {p.status === "wip" ? <span className="rounded border border-warning/40 px-2 py-0.5 font-hud text-[0.68rem] text-warning">in development</span> : null}
            {p.status === "active" && p.end === null ? <span className="rounded border border-success/40 px-2 py-0.5 font-hud text-[0.68rem] text-success">● active</span> : null}
          </div>
          {links.length ? (
            <div className="mt-7 flex flex-wrap gap-3">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener"
                  className={
                    l.primary
                      ? "inline-flex h-11 items-center gap-2 rounded-md bg-signal px-5 font-mono text-sm font-semibold text-white"
                      : "inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-5 font-mono text-sm hover:border-signal"
                  }
                >
                  {l.icon ? <GitHubIcon className="size-4" /> : null}
                  {l.label}
                  <ArrowUpRight className="size-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="panel h-fit p-5 font-hud text-[0.78rem]">
          <dl className="space-y-3">
            <div>
              <dt className="text-subtle-foreground">built at</dt>
              <dd className="text-foreground">
                {role ? (
                  <Link href={`/work/#ckpt-${role.id}`} className="link-mono">
                    {role.title} · {role.org}
                  </Link>
                ) : degree ? (
                  `${degree.short} · ${degree.school}`
                ) : (
                  at.short
                )}
              </dd>
            </div>
            <div>
              <dt className="text-subtle-foreground">timeline</dt>
              <dd className="text-foreground">{formatRange(p.start, p.end)}</dd>
            </div>
            {p.stats ? (
              <>
                <div className="flex gap-4 text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5" /> {p.stats.stars}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork className="size-3.5" /> {p.stats.forks}
                  </span>
                  {p.stats.license ? (
                    <span className="inline-flex items-center gap-1">
                      <Scale className="size-3.5" /> {p.stats.license}
                    </span>
                  ) : null}
                </div>
                {p.stats.languages.length ? (
                  <div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
                      {p.stats.languages.map((l, i) => (
                        <span key={l.name} style={{ width: `${l.share * 100}%`, opacity: 1 - i * 0.15 }} className="bg-signal" />
                      ))}
                    </div>
                    <p className="mt-2 text-subtle-foreground">{p.stats.languages.map((l) => `${l.name} ${Math.round(l.share * 100)}%`).join(" · ")}</p>
                  </div>
                ) : null}
                <p className="text-subtle-foreground">last push {formatDate(p.stats.pushedAt)}</p>
              </>
            ) : null}
            <div>
              <dt className="text-subtle-foreground">stack</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {p.tech.map((t) => (
                  <span key={t} className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="mt-10">
        {vid ? (
          <VideoPlayer src={vid} title={`${p.title} · demo`} />
        ) : (
          <ViewTransition name={`cover-${p.slug}`} share="morph" default="none">
            <ProjectCover project={p} priority sizes="(min-width: 1024px) 72rem, 100vw" className="aspect-[16/8] rounded-lg border border-border" />
          </ViewTransition>
        )}
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="hud">model card · description</h2>
          <p className="mt-4 text-lg leading-relaxed text-foreground/90">{p.description}</p>
          {p.highlights?.length ? (
            <ul className="mt-8 space-y-3">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-3 leading-relaxed text-muted-foreground">
                  <span className="mt-[0.6em] size-1.5 shrink-0 bg-signal" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {p.metrics?.length ? (
            <>
              <h2 className="hud mt-12">evaluation</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.metrics.map((m) => (
                  <div key={m.label} className="panel p-4">
                    <dd className="font-mono text-2xl font-bold">{m.value}</dd>
                    <dt className="mt-1 text-xs text-subtle-foreground">{m.label}</dt>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
          {p.auto && p.stats?.summary && p.stats.summary !== p.description ? (
            <p className="mt-8 border-l-2 border-signal/40 pl-4 text-sm text-muted-foreground">From the README: {p.stats.summary}</p>
          ) : null}
        </div>
        {siblings.length ? (
          <aside>
            <h2 className="hud">also built at {role?.org ?? degree?.school}</h2>
            <ul className="mt-4 space-y-2">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link href={`/projects/${s.slug}/`} className="link-mono text-sm text-muted-foreground">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>

      <nav aria-label="More projects" className="mt-20 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
        <Link href={`/projects/${prev.slug}/`} className="panel group p-5 hover:border-signal/50">
          <span className="flex items-center gap-1.5 font-hud text-xs text-subtle-foreground">
            <ArrowLeft className="size-3.5" /> previous
          </span>
          <span className="mt-1 block font-mono font-bold group-hover:text-signal-pale">{prev.title}</span>
        </Link>
        <Link href={`/projects/${next.slug}/`} className="panel group p-5 text-right hover:border-signal/50">
          <span className="flex items-center justify-end gap-1.5 font-hud text-xs text-subtle-foreground">
            next <ArrowRight className="size-3.5" />
          </span>
          <span className="mt-1 block font-mono font-bold group-hover:text-signal-pale">{next.title}</span>
        </Link>
      </nav>
    </article>
  );
}
