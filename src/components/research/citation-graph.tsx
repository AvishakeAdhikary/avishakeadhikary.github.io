import type { CSSProperties } from "react";
import { publications } from "@/content/publications";
import { testimonials } from "@/content/testimonials";

/** "Dr. Pushan Kumar Dutta" → "p. k. dutta" so it matches the paper byline "P. K. Dutta". */
const initialsOf = (full: string) => {
  const parts = full.replace(/^Dr\.?\s+/, "").split(/\s+/);
  const last = parts.pop() ?? "";
  return [...parts.map((p) => `${p[0]}.`), last].join(" ").toLowerCase();
};
const shortPublisher = (p: string) => (/wiley/i.test(p) ? "Wiley" : /crc|taylor/i.test(p) ? "CRC Press" : /apple/i.test(p) ? "Apple Academic" : /springer/i.test(p) ? "Springer" : p);

const W = 900;
const H = 560;

/**
 * Papers ↔ co-authors graph built from the real author lists. Hovering a
 * paper or author highlights its edges with CSS :has(), so there is no JS.
 */
export function CitationGraph() {
  const me = { x: W / 2, y: H / 2 };
  const papers = publications.map((p, i) => {
    const a = (i / publications.length) * Math.PI * 2 - Math.PI / 2;
    return { i, p, x: me.x + Math.cos(a) * 170, y: me.y + Math.sin(a) * 150 };
  });
  const authorNames = [...new Set(publications.flatMap((p) => p.authors.filter((_, i) => i !== p.selfIndex)))];
  const authors = authorNames.map((name, i) => {
    const a = (i / authorNames.length) * Math.PI * 2 - Math.PI / 2 + 0.2;
    const recommended = testimonials.some((t) => t.coauthor && initialsOf(t.name) === name.toLowerCase());
    return { i, name, x: me.x + Math.cos(a) * 390, y: me.y + Math.sin(a) * 240, recommended };
  });
  const edges = papers.flatMap((pp) =>
    pp.p.authors
      .filter((_, i) => i !== pp.p.selfIndex)
      .map((name) => ({ paper: pp.i, author: authorNames.indexOf(name) })),
  );

  const css = [
    ...papers.map((p) => `svg:has(.pn-${p.i}:hover) .pe-${p.i}{stroke:var(--signal);stroke-opacity:1} svg:has(.pn-${p.i}:hover) .pa-of-${p.i}{fill:var(--foreground)}`),
    ...authors.map((a) => `svg:has(.an-${a.i}:hover) .ae-${a.i}{stroke:var(--signal);stroke-opacity:1}`),
  ].join("\n");

  return (
    <div className="panel overflow-hidden p-4">
      <style>{css}</style>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Graph of ${publications.length} publications and ${authorNames.length} co-authors.`}>
        {papers.map((p) => (
          <line key={`m${p.i}`} data-drawable className="draw" pathLength={100} style={{ "--len": 100, "--draw-delay": `${p.i * 0.12}s` } as CSSProperties} x1={me.x} y1={me.y} x2={p.x} y2={p.y} stroke="var(--signal-deep)" strokeWidth="1.5" />
        ))}
        {edges.map((e, k) => {
          const p = papers[e.paper];
          const a = authors[e.author];
          return (
            <line
              key={k}
              className={`pe-${e.paper} ae-${e.author} transition-[stroke,stroke-opacity] duration-200`}
              x1={p.x}
              y1={p.y}
              x2={a.x}
              y2={a.y}
              stroke="var(--border-strong)"
              strokeOpacity={0.6}
              strokeDasharray="3 5"
            />
          );
        })}
        <g>
          <circle cx={me.x} cy={me.y} r="34" fill="var(--signal)" opacity="0.1">
            <animate attributeName="r" values="28;40;28" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={me.x} cy={me.y} r="12" fill="var(--signal)" />
          <text x={me.x} y={me.y + 34} textAnchor="middle" className="fill-[var(--foreground)] font-hud text-[13px]">
            A. Adhikary
          </text>
        </g>
        {papers.map((p) => (
          <g key={p.i} className={`pn-${p.i} cursor-default`}>
            <rect x={p.x - 9} y={p.y - 9} width="18" height="18" fill="var(--background)" stroke="var(--signal-soft)" strokeWidth="2" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-[var(--signal-pale)] font-hud text-[10px]">
              {p.i + 1}
            </text>
            <text x={p.x} y={p.y + (p.y > me.y ? 32 : -18)} textAnchor="middle" className="fill-[var(--muted-foreground)] font-hud text-[11px]">
              {p.p.date.slice(0, 4)} · {shortPublisher(p.p.publisher)}
            </text>
          </g>
        ))}
        {authors.map((a) => (
          <g key={a.i} className={`an-${a.i} cursor-default`}>
            <circle cx={a.x} cy={a.y} r={a.recommended ? 7 : 5} fill={a.recommended ? "var(--signal-soft)" : "var(--muted-foreground)"} />
            <text x={a.x} y={a.y - 13} textAnchor="middle" className="fill-[var(--muted-foreground)] font-hud text-[12px]">
              {a.name}
              {a.recommended ? " ✦" : ""}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 px-1 font-hud text-[0.66rem] text-subtle-foreground">
        hover a paper or a co-author · ✦ = co-author who also wrote me a recommendation
      </p>
    </div>
  );
}
