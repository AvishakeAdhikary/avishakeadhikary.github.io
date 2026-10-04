import type { MetadataRoute } from "next";
import { profile } from "@/content/profile";
import { getProjects, githubSyncedAt } from "@/lib/projects";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = profile.site;
  const lastModified = new Date(githubSyncedAt);
  return [
    { url: `${base}/`, lastModified, priority: 1 },
    { url: `${base}/projects/`, lastModified, priority: 0.9 },
    { url: `${base}/experience/`, lastModified, priority: 0.8 },
    { url: `${base}/skills/`, lastModified, priority: 0.6 },
    { url: `${base}/gallery/`, lastModified, priority: 0.4 },
    { url: `${base}/contact-me/`, lastModified, priority: 0.5 },
    ...getProjects().map((p) => ({ url: `${base}/projects/${p.slug}/`, lastModified, priority: 0.7 })),
  ];
}
