import { skillCategories } from "@/content/skills";
import { getProjects } from "./projects";

export interface SkillNode {
  id: string;
  name: string;
  cat: string;
  catTitle: string;
  x: number;
  y: number;
  production: boolean;
  verified: boolean;
  neighbours: string[];
  projects: { slug: string; title: string }[];
}

export const SPACE = { w: 1000, h: 640 };

/** Deterministic PRNG so the map is identical on every build. */
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * A 2-D "embedding" of every skill, computed at build time: categories
 * are cluster centres on an ellipse, related categories sit next to each
 * other, skills scatter around their centre on a golden-angle spiral.
 * Neighbours = nearest skills in the same cluster plus skills that were
 * used together in a project.
 */
export function buildSkillSpace() {
  const r = rng(7);
  const projects = getProjects();
  const n = skillCategories.length;
  const cx = SPACE.w / 2;
  const cy = SPACE.h / 2;
  const centres = skillCategories.map((c, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { id: c.id, title: c.title, x: cx + Math.cos(a) * 360, y: cy + Math.sin(a) * 225 };
  });

  const nodes: SkillNode[] = [];
  skillCategories.forEach((c, ci) => {
    const centre = centres[ci];
    c.skills.forEach((s, i) => {
      const angle = i * 2.39996 + r() * 0.4;
      const dist = 16 + Math.sqrt(i + 1) * 18 + r() * 6;
      const parts = s.name
        .toLowerCase()
        .split(/[·/(),]|\s+/)
        .map((x) => x.trim())
        .filter((x) => x.length > 1 && !["and", "the", "api", "sso", "&"].includes(x));
      const used = projects.filter((p) => p.tech.some((t) => parts.some((part) => t.toLowerCase().includes(part) && part.length > 2)));
      nodes.push({
        id: `${c.id}-${slug(s.name)}`,
        name: s.name,
        cat: c.id,
        catTitle: c.title,
        x: centre.x + Math.cos(angle) * dist,
        y: centre.y + Math.sin(angle) * dist * 0.85,
        production: !!s.production,
        verified: !!s.verified,
        neighbours: [],
        projects: used.slice(0, 6).map((p) => ({ slug: p.slug, title: p.title })),
      });
    });
  });

  for (const a of nodes) {
    const near = nodes
      .filter((b) => b !== a && b.cat === a.cat)
      .sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))
      .slice(0, 3);
    const coUsed = nodes
      .filter((b) => b.cat !== a.cat && b.projects.some((bp) => a.projects.some((ap) => ap.slug === bp.slug)))
      .slice(0, 4);
    a.neighbours = [...near, ...coUsed].map((b) => b.id);
  }
  return { nodes, centres };
}
