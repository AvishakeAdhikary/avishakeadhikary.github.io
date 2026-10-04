import github from "@/content/generated/github.json";
import { projects as curated, repoOverrides } from "@/content/projects";
import type { Project, ProjectCategory, RoleId } from "@/content/types";

export interface RepoStats {
  name: string;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  languages: { name: string; share: number }[];
  topics: string[];
  license: string | null;
  pushedAt: string;
  createdAt: string;
  summary: string;
  homepage: string | null;
  socialImage: string;
  readmeImage: string | null;
  pinned: boolean;
}

export interface ResolvedProject extends Project {
  stats?: RepoStats;
  /** Came from the GitHub sync without a curated entry. */
  auto?: boolean;
}

type GithubRepo = (typeof github.repos)[number];

const toStats = (r: GithubRepo): RepoStats => ({
  name: r.name,
  url: r.url,
  stars: r.stars,
  forks: r.forks,
  language: r.language,
  languages: r.languages,
  topics: r.topics,
  license: r.license,
  pushedAt: r.pushedAt,
  createdAt: r.createdAt,
  summary: r.summary,
  homepage: r.homepage,
  socialImage: r.socialImage,
  readmeImage: r.readmeImage,
  pinned: r.pinned,
});

const slugify = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const titleize = (name: string) =>
  name
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

const LANGUAGE_CATEGORY: Record<string, ProjectCategory> = {
  "Jupyter Notebook": "ai",
  Python: "ai",
  TypeScript: "web",
  JavaScript: "web",
  Vue: "web",
  "C#": "desktop",
  Kotlin: "mobile",
  Dart: "mobile",
  Java: "mobile",
  C: "systems",
  "C++": "systems",
  Shell: "systems",
  PowerShell: "systems",
};

const month = (iso: string) => iso.slice(0, 7) as Project["start"];

let cache: ResolvedProject[] | null = null;

/**
 * Curated projects enriched with live GitHub stats, plus every other public,
 * non-fork repo from the monthly sync. Sorted: featured → active/recent →
 * stars.
 */
export function getProjects(): ResolvedProject[] {
  if (cache) return cache;
  const repos = new Map(github.repos.map((r) => [r.name, r]));
  const used = new Set<string>();

  const merged: ResolvedProject[] = curated.map((p) => {
    const r = p.repo ? repos.get(p.repo) : undefined;
    if (r) used.add(r.name);
    return { ...p, stats: r ? toStats(r) : undefined };
  });

  for (const r of github.repos) {
    if (used.has(r.name)) continue;
    const o = repoOverrides[r.name] ?? {};
    if (o.hide) continue;
    merged.push({
      slug: o.slug ?? slugify(r.name),
      title: o.title ?? titleize(r.name),
      tagline: o.tagline ?? (r.description || r.summary.split(/(?<=\.)\s/)[0] || "Open-source project"),
      description: r.summary || r.description || "",
      roleId: o.roleId,
      start: month(r.createdAt),
      end: undefined,
      tech: o.tech ?? r.languages.map((l) => l.name),
      categories: o.categories ?? [LANGUAGE_CATEGORY[r.language ?? ""] ?? "systems"],
      links: { repo: r.url, ...(r.homepage ? { live: r.homepage } : {}) },
      image: o.image,
      video: o.video,
      featured: o.featured,
      repo: r.name,
      stats: toStats(r),
      auto: true,
      status: "active",
    });
  }

  const recency = (p: ResolvedProject) =>
    p.end === null ? Date.now() : Date.parse(p.stats?.pushedAt ?? `${p.end ?? p.start}-01`);
  cache = merged.sort(
    (a, b) =>
      Number(!!b.featured) - Number(!!a.featured) ||
      Number(!!a.auto) - Number(!!b.auto) ||
      recency(b) - recency(a) ||
      (b.stats?.stars ?? 0) - (a.stats?.stars ?? 0),
  );
  return cache;
}

export const getProject = (slug: string) => getProjects().find((p) => p.slug === slug);

export const projectsForRole = (roleId: RoleId) => getProjects().filter((p) => p.roleId === roleId);

export const githubSyncedAt = github.syncedAt;
export const githubTotals = github.totals;

export const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  ai: "AI / ML",
  llm: "LLMs",
  agents: "Agents & MCP",
  cv: "Computer Vision",
  web: "Web",
  mobile: "Mobile",
  desktop: "Desktop",
  systems: "Systems",
  iot: "IoT & Edge",
};
