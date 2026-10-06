import { describe, expect, it } from "vitest";
import { GAME_INFO } from "@/components/arcade/registry";
import { ACHIEVEMENTS, GAMES, MAIN_PAGES } from "@/content/achievements";
import { certifications } from "@/content/certifications";
import { roles } from "@/content/experience";
import { gallery } from "@/content/gallery";
import manifest from "@/content/generated/media-manifest.json";
import { publications } from "@/content/publications";
import { skillCategories } from "@/content/skills";
import { testimonials } from "@/content/testimonials";
import { GO_TO, KEYBINDS } from "@/lib/keybinds";
import { getProjects } from "@/lib/projects";
import { buildSkillSpace } from "@/lib/skill-space";

const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);

describe("content integrity", () => {
  it("gives every skill a unique id (React keys)", () => {
    const { nodes, centres } = buildSkillSpace();
    expect(dupes(nodes.map((n) => n.id))).toEqual([]);
    expect(dupes(centres.map((c) => c.id))).toEqual([]);
  });

  it("only links skills to neighbours that exist", () => {
    const { nodes } = buildSkillSpace();
    const ids = new Set(nodes.map((n) => n.id));
    for (const n of nodes) for (const nb of n.neighbours) expect(ids.has(nb), `${n.id} → ${nb}`).toBe(true);
  });

  it("has unique achievement ids and three achievements per game", () => {
    expect(dupes(ACHIEVEMENTS.map((a) => a.id))).toEqual([]);
    for (const g of GAMES) for (const s of ["tutorial", "clear", "master"]) expect(ACHIEVEMENTS.some((a) => a.id === `${g.id}-${s}`), `${g.id}-${s}`).toBe(true);
  });

  it("lists the same games in the registry and the achievements", () => {
    expect(GAME_INFO.map((g) => g.id).sort()).toEqual(GAMES.map((g) => g.id).sort());
    expect(GAME_INFO.every((g) => g.ready)).toBe(true);
  });

  it("has unique keybinds and go-to targets that are real pages", () => {
    expect(dupes(KEYBINDS.map((k) => k.id))).toEqual([]);
    const pages = new Set([...MAIN_PAGES, "/gallery/", "/lab/", "/settings/"]);
    for (const { href } of Object.values(GO_TO)) expect(pages.has(href), href).toBe(true);
  });

  it("has no duplicates in content lists that are rendered as React keys", () => {
    for (const p of getProjects()) {
      expect(dupes(p.tech), `${p.slug} tech`).toEqual([]);
      expect(dupes(p.highlights ?? []), `${p.slug} highlights`).toEqual([]);
    }
    for (const r of roles) expect(dupes(r.highlights), `${r.id} highlights`).toEqual([]);
    for (const p of publications) expect(dupes(p.authors), `${p.title} authors`).toEqual([]);
    for (const c of skillCategories) expect(dupes(c.skills.map((s) => s.name)), c.id).toEqual([]);
    expect(dupes(testimonials.map((t) => t.name))).toEqual([]);
    expect(dupes(certifications.map((c) => `${c.name}-${c.issuer}`))).toEqual([]);
    expect(dupes(gallery.map((g) => g.image))).toEqual([]);
  });

  it("only uses gallery images that the media pipeline produced", () => {
    const images = manifest.images as Record<string, unknown>;
    for (const g of gallery) expect(images[g.image], g.image).toBeDefined();
  });
});
