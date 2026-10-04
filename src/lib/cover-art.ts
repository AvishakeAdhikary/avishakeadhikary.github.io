import type { ResolvedProject } from "./projects";
import { CATEGORY_LABEL } from "./projects";

const W = 1280;
const H = 720;
const COLS = 40;
const ROWS = 22;

const hashOf = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);
const rng = (seed: number) => () => {
  seed = (Math.imul(seed ^ (seed >>> 15), 1 | seed) + 0x6d2b79f5) >>> 0;
  return ((seed ^ (seed >>> 13)) >>> 0) / 4294967296;
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(title: string, max = 16) {
  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = `${cur} ${w}`.trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

/**
 * Deterministic "attention map" cover for projects without a screenshot:
 * a heat grid shaped by a few seeded focal points, plus the project name.
 * Emitted as a static SVG file per project at build time.
 */
export function coverSvg(p: ResolvedProject): string {
  const r = rng(hashOf(p.slug));
  const foci = Array.from({ length: 3 }, () => ({ x: 0.35 + r() * 0.6, y: r() * 0.9, s: 0.12 + r() * 0.2 }));
  const cw = W / COLS;
  const ch = H / ROWS;
  const cells: string[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const u = x / COLS;
      const v = y / ROWS;
      let heat = 0;
      for (const f of foci) heat += Math.exp(-((u - f.x) ** 2 + (v - f.y) ** 2) / (2 * f.s * f.s));
      heat = Math.min(1, heat * 0.75 + r() * 0.18 - 0.12);
      if (heat < 0.12) continue;
      cells.push(
        `<rect x="${(x * cw + 1).toFixed(1)}" y="${(y * ch + 1).toFixed(1)}" width="${(cw - 2).toFixed(1)}" height="${(ch - 2).toFixed(1)}" fill="#ef4444" fill-opacity="${(heat * 0.85).toFixed(2)}"/>`,
      );
    }
  }
  const lines = wrap(p.title);
  const tag = CATEGORY_LABEL[p.categories[0] ?? "systems"];
  const titleSvg = lines
    .map((l, i) => `<text x="72" y="${H - 96 - (lines.length - 1 - i) * 92}" font-size="84" font-weight="800" fill="#f5f0f0" letter-spacing="-3">${esc(l)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'JetBrains Mono','SFMono-Regular',Menlo,Consolas,monospace">
<defs><linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#120b0b"/><stop offset="0.55" stop-color="#120b0b" stop-opacity="0.82"/><stop offset="1" stop-color="#120b0b" stop-opacity="0"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="#120b0b"/>
${cells.join("")}
<rect width="${W}" height="${H}" fill="url(#fade)"/>
<text x="72" y="96" font-size="28" fill="#8f7d7d">avishake/<tspan fill="#cfc4c4">${esc(p.slug)}</tspan></text>
<text x="${W - 72}" y="96" font-size="24" fill="#f87171" text-anchor="end" letter-spacing="3">${esc(tag.toUpperCase())}</text>
${titleSvg}
<text x="72" y="${H - 48}" font-size="26" fill="#b8aaaa">${esc(p.tagline.slice(0, 70))}</text>
</svg>`;
}
