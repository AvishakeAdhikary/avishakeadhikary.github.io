import { FileDown, Settings2 } from "lucide-react";
import Link from "@/components/link";
import { AudioToggle } from "@/components/media/audio-toggle";
import { GAME_INFO } from "@/components/arcade/registry";
import { profile } from "@/content/profile";
import { getProjects } from "@/lib/projects";
import { CommandMenu, type CommandEntry } from "./command-menu";
import { MobileMenu } from "./mobile-menu";
import { NAV_ITEMS } from "./nav-items";
import { NavLinks } from "./nav-links";

function commandEntries(): CommandEntry[] {
  return [
    { group: "Navigate", label: "Home", href: "/" },
    ...NAV_ITEMS.map((n) => ({ group: "Navigate" as const, label: n.label, href: n.href, hint: n.sub })),
    { group: "Navigate", label: "Lab (terminal & playground)", href: "/lab/" },
    { group: "Navigate", label: "Arcade (ML mini-games)", href: "/arcade/", keywords: "games play machine learning" },
    { group: "Navigate", label: "Trophy room (achievements)", href: "/arcade/#trophies", keywords: "rank points progress" },
    ...GAME_INFO.filter((g) => g.ready).map((g) => ({ group: "Navigate" as const, label: `Play: ${g.name}`, href: `/arcade/${g.id}/`, hint: "arcade", keywords: g.concept })),
    { group: "Navigate", label: "Gallery", href: "/gallery/" },
    { group: "Navigate", label: "Settings", href: "/settings/", keywords: "preferences music motion crt theme" },
    ...getProjects().map((p) => ({
      group: "Projects" as const,
      label: p.title,
      hint: p.roleId ? undefined : "indie",
      href: `/projects/${p.slug}/`,
      keywords: `${p.tagline} ${p.tech.join(" ")}`,
    })),
    { group: "Links", label: "GitHub", href: profile.socials.github, hint: "↗" },
    { group: "Links", label: "LinkedIn", href: profile.socials.linkedin, hint: "↗" },
    { group: "Links", label: "Google Scholar", href: profile.socials.scholar, hint: "↗" },
    { group: "Links", label: "Blog", href: profile.socials.blog, hint: "↗" },
    { group: "Actions", label: "Download résumé (PDF)", href: profile.resume },
    { group: "Actions", label: `Copy email: ${profile.email}`, action: "copy-email" },
    { group: "Actions", label: "Toggle ambient soundtrack", action: "toggle-audio", keywords: "music sound audio" },
  ];
}

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline font-mono text-[0.95rem] font-bold tracking-tight" aria-label={`${profile.name}, home`}>
          <span className="text-signal glow">~/</span>
          <span>avishake</span>
          <span className="ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] animate-caret bg-signal" aria-hidden />
        </Link>

        <NavLinks />

        <div className="flex items-center gap-1.5">
          <CommandMenu entries={commandEntries()} email={profile.email} />
          <AudioToggle />
          <Link
            href="/settings/"
            aria-label="Settings"
            title="Settings"
            className="hidden size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground sm:flex"
          >
            <Settings2 className="size-4" />
          </Link>
          <a
            href={profile.resume}
            target="_blank"
            rel="noopener"
            className="hidden h-9 items-center gap-1.5 rounded-md border border-signal/60 bg-signal/10 px-3.5 font-mono text-[0.8rem] text-foreground transition-colors hover:bg-signal-solid hover:text-on-signal sm:flex"
          >
            <FileDown className="size-4" />
            résumé
          </a>
          <MobileMenu resume={profile.resume} />
        </div>
      </div>
    </header>
  );
}
