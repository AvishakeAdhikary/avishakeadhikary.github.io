import Link from "next/link";
import { GitHubIcon, LinkedInIcon, ScholarIcon } from "@/components/icons/brand";
import { profile } from "@/content/profile";
import { NAV_ITEMS } from "./nav-items";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border pb-14">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-mono text-lg font-bold">
            <span className="text-signal">~/</span>avishake
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {profile.headline} in {profile.location.city}, India. Building AI that is useful, private and fast.
          </p>
          <p className="mt-4 font-hud text-[0.68rem] text-subtle-foreground">
            © {year} {profile.name} · {profile.location.lat.toFixed(2)}°N {profile.location.lng.toFixed(2)}°E · IST
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm">
          {NAV_ITEMS.map((n) => (
            <Link key={n.href} href={n.href} className="text-muted-foreground hover:text-foreground">
              {n.label}
            </Link>
          ))}
          <Link href="/lab/" className="text-muted-foreground hover:text-foreground">
            Lab
          </Link>
          <Link href="/arcade/" className="text-muted-foreground hover:text-foreground">
            Arcade
          </Link>
          <Link href="/gallery/" className="text-muted-foreground hover:text-foreground">
            Gallery
          </Link>
          <Link href="/settings/" className="text-muted-foreground hover:text-foreground">
            Settings
          </Link>
        </nav>
        <div className="flex items-start gap-2 md:justify-end">
          {[
            { href: profile.socials.github, label: "GitHub", Icon: GitHubIcon },
            { href: profile.socials.linkedin, label: "LinkedIn", Icon: LinkedInIcon },
            { href: profile.socials.scholar, label: "Google Scholar", Icon: ScholarIcon },
          ].map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener"
              aria-label={label}
              className="flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-signal hover:text-foreground"
            >
              <Icon className="size-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
