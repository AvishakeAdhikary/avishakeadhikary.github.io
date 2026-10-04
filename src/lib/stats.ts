import scholar from "@/content/generated/scholar.json";
import { roles } from "@/content/experience";
import { profile } from "@/content/profile";
import { publications } from "@/content/publications";
import { skillCount } from "@/content/skills";
import { githubTotals } from "./projects";

/** Professional experience in years since the first internship, computed at build time. */
function yearsSince(firstMonth: string) {
  const [y, m] = firstMonth.split("-").map(Number);
  const now = new Date();
  return Math.floor((now.getFullYear() - y) + (now.getMonth() + 1 - m) / 12);
}

const firstWork = roles.filter((r) => r.kind === "work").at(-1)?.start ?? "2020-04";

export const stats = {
  githubStars: githubTotals.stars,
  githubRepos: githubTotals.repos,
  publications: publications.length,
  citations: scholar.citations,
  hIndex: scholar.hIndex,
  scholarSyncedAt: scholar.syncedAt,
  yearsBuilding: yearsSince(firstWork),
  skills: skillCount,
  certifications: profile.claims.certifications,
  programmingLanguages: profile.claims.programmingLanguages,
  frameworks: profile.claims.frameworks,
};

/** Per-paper citation counts from the Scholar snapshot (fuzzy title match). */
export function citationsFor(scholarTitle: string): number | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return scholar.papers.find((p) => norm(p.title) === norm(scholarTitle))?.citations;
}
