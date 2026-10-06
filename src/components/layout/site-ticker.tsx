import { profile } from "@/content/profile";
import { formatDate } from "@/lib/format";
import { getProjects, githubSyncedAt, githubTotals } from "@/lib/projects";
import { stats } from "@/lib/stats";

/**
 * tpb.run-style typewriter ticker along the bottom edge, fed by synced
 * data so it changes on its own every month. One CSS transform animation.
 */
export function SiteTicker() {
  const latest = [...getProjects()]
    .filter((p) => p.stats)
    .sort((a, b) => Date.parse(b.stats!.pushedAt) - Date.parse(a.stats!.pushedAt))[0];
  const items = [
    `now: shipping healthcare AI at Minion Technologies`,
    latest ? `latest commit: ${latest.title} (${formatDate(latest.stats!.pushedAt)})` : null,
    `${githubTotals.stars}★ across ${githubTotals.repos} open-source repos`,
    `${stats.publications} publications · ${stats.citations} citations`,
    `based in ${profile.location.city}, working with the world`,
    `press ~ to open the terminal`,
    `auto-synced ${formatDate(githubSyncedAt)}`,
  ].filter(Boolean) as string[];
  const run = (
    <span className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((t) => (
        <span key={t} className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-signal">●</span>
          {t}
        </span>
      ))}
    </span>
  );
  return (
    <div
      data-observe
      data-clip-ok
      className="fixed inset-x-0 bottom-0 z-40 h-7 overflow-hidden border-t border-border bg-background/90 font-hud text-[0.66rem] tracking-wide text-subtle-foreground backdrop-blur"
      aria-label="Status ticker"
    >
      <div className="pause-offscreen flex h-full w-max animate-ticker items-center hover:[animation-play-state:paused]" style={{ ["--ticker-duration" as string]: "70s" }}>
        {run}
        <span aria-hidden className="flex">
          {run}
        </span>
      </div>
    </div>
  );
}
