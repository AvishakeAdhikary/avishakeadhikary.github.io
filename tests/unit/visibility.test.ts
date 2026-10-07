import { describe, expect, it } from "vitest";
import { minionDetailed, roles } from "@/content/experience";
import { projects } from "@/content/projects";
import { getProjects, projectsForRole } from "@/lib/projects";
import { buildSearchIndex } from "@/lib/search-index";

/** The four Minion Technologies projects that stay unpublished while Avishake works there. */
const PRIVATE = ["zoyemed", "phi-deidentification-pipeline", "agentic-crm-automation", "ptz-face-tracking"];

/** Details that belong to the employer: never on a public page while the projects are private. */
const SENSITIVE = ["11,631", "AES-256", "SHA-256", "zonal masking", "Blackwell", "Scaleway", "MedGemma-27B", "30%", "~20×", "multi-terabyte", "kiosk enforcement"];

describe("unpublished Minion projects", () => {
  it("are kept in the content, marked private", () => {
    for (const slug of PRIVATE) {
      const p = projects.find((x) => x.slug === slug);
      expect(p, slug).toBeDefined();
      expect(p?.public, slug).toBe(false);
      expect(p?.description.length, `${slug} content preserved`).toBeGreaterThan(40);
    }
  });

  it("never reach a public surface", () => {
    const listed = getProjects().map((p) => p.slug);
    for (const slug of PRIVATE) expect(listed, slug).not.toContain(slug);
    expect(projectsForRole("minion")).toEqual([]);
    const urls = buildSearchIndex().docs.map((d) => d.url);
    for (const slug of PRIVATE) expect(urls.some((u) => u.includes(slug)), slug).toBe(false);
  });

  it("hide exactly those four: every other curated project stays public", () => {
    const hidden = projects.filter((p) => p.public === false).map((p) => p.slug);
    expect(hidden.sort()).toEqual([...PRIVATE].sort());
    const listed = new Set(getProjects().map((p) => p.slug));
    for (const p of projects) if (p.public !== false) expect(listed.has(p.slug), p.slug).toBe(true);
  });
});

describe("public Minion Technologies entry", () => {
  const minion = roles.find((r) => r.id === "minion")!;

  it("stays public with its company, title, dates and location", () => {
    expect(minion).toMatchObject({ org: "Minion Technologies", title: "Machine Learning Engineer", start: "2025-06", end: null, location: "Kolkata, India · On-site" });
    expect(minion.highlights.length).toBeGreaterThan(4);
  });

  it("shows no employer-internal details, which stay preserved in minionDetailed", () => {
    const text = [minion.summary, ...minion.highlights, ...minion.skills].join(" ");
    for (const s of SENSITIVE) expect(text, s).not.toContain(s);
    expect(text).not.toMatch(/\b(led|architected)\b/i);
    expect(minionDetailed.highlights.join(" ")).toContain("11,631");
  });

  it("keeps employer-internal details out of the terminal's knowledge", () => {
    const doc = buildSearchIndex().docs.find((d) => d.id === "role-minion");
    expect(doc?.text).toContain("Minion Technologies");
    for (const s of SENSITIVE) expect(doc?.text, s).not.toContain(s);
  });
});
