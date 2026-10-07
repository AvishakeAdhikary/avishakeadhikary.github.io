import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { builtAt, ModelCard } from "@/components/projects/model-card";
import { Pipeline } from "@/components/projects/pipeline";
import { ZooFilter } from "@/components/projects/zoo-filter";
import type { ProjectCategory } from "@/content/types";
import { formatDate } from "@/lib/format";
import { CATEGORY_LABEL, getProject, getProjects, githubSyncedAt, githubTotals } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Every project by Avishake Adhikary as a model zoo: production AI at Minion Technologies and PTS, plus independent open source, auto-synced from GitHub.",
  alternates: { canonical: "/projects/" },
};

export default function ProjectsPage() {
  const projects = getProjects();
  const tasks = (Object.keys(CATEGORY_LABEL) as ProjectCategory[])
    .map((id) => ({ id, label: CATEGORY_LABEL[id], count: projects.filter((p) => p.categories.includes(id)).length }))
    .filter((t) => t.count);
  const placeCount = new Map<string, { label: string; count: number }>();
  for (const p of projects) {
    const at = builtAt(p);
    const cur = placeCount.get(at.key) ?? { label: at.short, count: 0 };
    placeCount.set(at.key, { label: cur.label, count: cur.count + 1 });
  }
  const places = [...placeCount.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader
        title="Projects"
        sub="model zoo"
        intro={`${projects.length} projects, each tagged with where it was built. ${githubTotals.repos} are public on GitHub (${githubTotals.stars} stars), and new repos show up here on their own every month. Last sync ${formatDate(githubSyncedAt)}.`}
      />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6">
        {/* The banner presents the de-identification project: shown only while that project is public. */}
        {getProject("phi-deidentification-pipeline") ? (
          <div data-reveal>
            <Pipeline />
          </div>
        ) : null}
        <ZooFilter targetId="zoo" tasks={tasks} places={places} total={projects.length} />
        <ul id="zoo" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <li key={p.slug} data-reveal style={{ ["--i" as string]: i % 3 }}>
              <ModelCard project={p} priority={i < 3} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
