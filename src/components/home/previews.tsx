import type { CSSProperties } from "react";
import { Stream } from "@/components/fx/stream";
import { degrees, roles } from "@/content/experience";
import { publications } from "@/content/publications";
import { skillCategories } from "@/content/skills";
import { testimonials } from "@/content/testimonials";
import { getProjects } from "@/lib/projects";
import { OpenTerminalButton } from "./open-terminal-button";

const frame = "panel overflow-hidden p-5 sm:p-6";

/* ── Work: career as a training run ───────────────────────────────────── */
const toYear = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return y + (mo - 1) / 12;
};

export function LossCurvePreview() {
  const W = 600;
  const H = 300;
  const x0 = 2018.4;
  const x1 = 2026.9;
  const sx = (y: number) => 30 + ((y - x0) / (x1 - x0)) * (W - 60);
  // Deterministic "loss": exponential decay with a little noise.
  const pts = Array.from({ length: 90 }, (_, i) => {
    const y = x0 + (i / 89) * (x1 - x0);
    const t = (y - x0) / (x1 - x0);
    const noise = Math.sin(i * 1.7) * 0.035 + Math.sin(i * 0.53) * 0.025;
    // High loss sits near the top (small y), so the curve visibly descends over time.
    return [sx(y), H - 50 - (Math.exp(-2.6 * t) * 0.85 + 0.08 + noise) * (H - 90)] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const yAt = (x: number) => pts.reduce((best, p) => (Math.abs(p[0] - x) < Math.abs(best[0] - x) ? p : best))[1];
  const checkpoints = [
    ...degrees.map((d) => ({ when: d.start, label: d.short })),
    ...roles.map((r) => ({ when: r.start, label: r.short ?? r.org.split(" ")[0] })),
  ].sort((a, b) => a.when.localeCompare(b.when));

  return (
    <div className={frame}>
      <div className="mb-3 flex items-center justify-between">
        <span className="hud">career.train() · loss = what I still had to learn</span>
        <span className="font-hud text-[0.65rem] text-success">● running</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="A decreasing curve from 2018 to today with a checkpoint for each degree and job.">
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="30" x2={W - 30} y1={40 + i * 60} y2={40 + i * 60} stroke="var(--border)" strokeDasharray="2 6" />
        ))}
        <path data-drawable className="draw" pathLength={1000} style={{ "--len": 1000 } as CSSProperties} d={d} fill="none" stroke="var(--signal)" strokeWidth="2.2" strokeLinejoin="round" />
        {checkpoints.map((c, i) => {
          const x = sx(toYear(c.when));
          const y = yAt(x);
          const up = i % 2 === 0;
          return (
            <g key={`${c.when}-${c.label}`}>
              <line x1={x} x2={x} y1={y} y2={up ? y - 26 : y + 26} stroke="var(--border-strong)" />
              <circle cx={x} cy={y} r="4.5" fill="var(--background)" stroke="var(--signal-soft)" strokeWidth="2" />
              <text x={x} y={up ? y - 32 : y + 40} textAnchor="middle" className="fill-[var(--muted-foreground)] font-hud text-[11px]">
                {c.label}
              </text>
            </g>
          );
        })}
        {[2019, 2021, 2023, 2025].map((y) => (
          <text key={y} x={sx(y)} y={H - 6} textAnchor="middle" className="fill-[var(--subtle-foreground)] font-hud text-[10px]">
            {y}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ── Projects: shuffling model cards ──────────────────────────────────── */
export function ModelCardsPreview() {
  const picks = getProjects()
    .filter((p) => p.featured)
    .slice(0, 3);
  const poses = [
    { r0: "-2deg", x1: "26px", y1: "18px", r1: "3deg", x2: "-20px", y2: "34px", r2: "-4deg" },
    { r0: "3deg", x1: "-20px", y1: "34px", r1: "-4deg", x2: "0px", y2: "0px", r2: "-2deg" },
    { r0: "-4deg", x1: "0px", y1: "0px", r1: "-2deg", x2: "26px", y2: "18px", r2: "3deg" },
  ];
  // Cards slide up to 26px and tilt 4°: on phones they're inset so the whole shuffle stays visible.
  return (
    <div data-observe className="relative mx-auto h-80 max-w-md overflow-x-clip sm:overflow-visible">
      {picks.map((p, i) => (
        <article
          key={p.slug}
          className="pause-offscreen panel absolute inset-x-9 top-6 bg-background-elevated sm:inset-x-0 p-5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]"
          style={{
            ...Object.fromEntries(Object.entries(poses[i]).map(([k, v]) => [`--${k}`, v])),
            animation: `shuffle 9s cubic-bezier(0.5,0,0.2,1) ${-i * 3}s infinite`,
          } as CSSProperties}
        >
          <p className="font-hud text-xs text-subtle-foreground">
            avishake/<span className="text-foreground">{p.slug}</span>
          </p>
          <h3 className="mt-2 font-mono text-xl font-bold">{p.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.tech.slice(0, 4).map((t) => (
              <span key={t} className="rounded border border-border px-1.5 py-0.5 font-hud text-[0.62rem] text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
          <p className="mt-4 flex justify-between font-hud text-[0.65rem] text-subtle-foreground">
            <span>{p.roleId ? "built at work" : "independent"}</span>
            {p.stats?.stars ? <span>★ {p.stats.stars}</span> : <span className="text-success">● active</span>}
          </p>
        </article>
      ))}
    </div>
  );
}

/* ── Skills: a drifting embedding space ───────────────────────────────── */
const rand = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

export function EmbeddingPreview() {
  const r = rand(42);
  const cats = skillCategories.slice(0, 8);
  const W = 560;
  const H = 340;
  return (
    <div className={frame} data-observe>
      <span className="hud">embedding space · {cats.reduce((n, c) => n + c.skills.length, 0)}+ skills, 2-D projection</span>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Skills shown as clusters of dots, grouped by area.">
        {cats.map((c, ci) => {
          const cx = 80 + (ci % 4) * 133;
          const cy = 90 + Math.floor(ci / 4) * 150;
          return (
            <g key={c.id} className="pause-offscreen" style={{ animation: `drift ${7 + ci}s ease-in-out ${-ci}s infinite` }}>
              {c.skills.slice(0, 10).map((s, i) => {
                const a = r() * Math.PI * 2;
                const d = 10 + r() * 38;
                return <rect key={s.name} x={cx + Math.cos(a) * d - 2} y={cy + Math.sin(a) * d - 2} width="4" height="4" fill={i === 0 ? "var(--signal)" : "var(--muted-foreground)"} opacity={i === 0 ? 1 : 0.55} />;
              })}
              <text x={cx} y={cy + 64} textAnchor="middle" className="fill-[var(--muted-foreground)] font-hud text-[10.5px]">
                {c.title.split(" ")[0].replace(/,$/, "")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Research: a little citation graph ───────────────────────────────── */
export function CitationPreview() {
  const coauthors = ["P. K. Dutta", "D. Sarkar", "S. Debnath"];
  const W = 560;
  const H = 320;
  const papers = publications.map((p, i) => ({ x: 70 + i * 105, y: 240 - (i % 2) * 40, p }));
  const authors = coauthors.map((a, i) => ({ x: 120 + i * 160, y: 70, a }));
  const me = { x: W / 2, y: 160 };
  return (
    <div className={frame}>
      <span className="hud">citation graph · {publications.length} papers · Wiley · Springer · T&amp;F</span>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="A graph linking Avishake to five publications and his co-authors.">
        {papers.map(({ x, y }, i) => (
          <line key={`e${i}`} data-drawable className="draw" pathLength={100} style={{ "--len": 100, "--draw-delay": `${i * 0.15}s` } as CSSProperties} x1={me.x} y1={me.y} x2={x} y2={y} stroke="var(--signal-deep)" />
        ))}
        {authors.map(({ x, y }, i) => (
          <line key={`a${i}`} data-drawable className="draw" pathLength={100} style={{ "--len": 100, "--draw-delay": `${0.8 + i * 0.15}s` } as CSSProperties} x1={me.x} y1={me.y} x2={x} y2={y} stroke="var(--border-strong)" strokeDasharray="3 4" />
        ))}
        <circle cx={me.x} cy={me.y} r="22" fill="var(--signal)" opacity="0.12">
          <animate attributeName="r" values="18;28;18" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={me.x} cy={me.y} r="9" fill="var(--signal)" />
        <text x={me.x + 16} y={me.y + 4} className="fill-[var(--foreground)] font-hud text-[11px]">you are here</text>
        {papers.map(({ x, y, p }) => (
          <g key={p.title}>
            <rect x={x - 6} y={y - 6} width="12" height="12" fill="var(--background)" stroke="var(--signal-soft)" />
            <text x={x} y={y + 24} textAnchor="middle" className="fill-[var(--muted-foreground)] font-hud text-[10px]">
              {p.date.slice(0, 4)}
            </text>
          </g>
        ))}
        {authors.map(({ x, y, a }) => (
          <g key={a}>
            <circle cx={x} cy={y} r="5" fill="var(--muted-foreground)" />
            <text x={x} y={y - 12} textAnchor="middle" className="fill-[var(--muted-foreground)] font-hud text-[10.5px]">
              {a}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 font-hud text-[0.65rem] text-subtle-foreground">
        {testimonials.filter((t) => t.coauthor).length} co-authors also wrote recommendations
      </p>
    </div>
  );
}

/* ── Lab: the terminal teaser ─────────────────────────────────────────── */
export function LabPreview() {
  const lines = [
    { c: "ask what did you build at PTS?", o: "KoyoX, a GPT-4 job assistant with voice and an avatar, shipped within a month of the Assistants API…" },
    { c: "open nexcpp", o: "→ /projects/nexcpp/" },
    { c: "sudo hire-me", o: "✓ access granted. drafting an email…" },
  ];
  return (
    <div className="panel overflow-hidden bg-[oklch(0.1_0.006_20)] font-hud text-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-signal" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-2 text-[0.7rem] text-subtle-foreground">guest@avishake:~</span>
      </div>
      <div className="space-y-3 p-5">
        {lines.map((l, i) => (
          <div key={l.c}>
            <Stream as="p" unit="char" speed={28} offset={i * 1700} text={`$ ${l.c}`} className="text-foreground" />
            <Stream as="p" speed={30} offset={i * 1700 + l.c.length * 28 + 250} text={l.o} className="text-muted-foreground" />
          </div>
        ))}
        <OpenTerminalButton />
      </div>
    </div>
  );
}
