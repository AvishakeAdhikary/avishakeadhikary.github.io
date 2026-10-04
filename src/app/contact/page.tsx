import { ArrowUpRight, FileDown } from "lucide-react";
import type { Metadata } from "next";
import { ContactPanel } from "@/components/contact/contact-panel";
import { GitHubIcon, LinkedInIcon, ScholarIcon } from "@/components/icons/brand";
import { PageHeader } from "@/components/page-header";
import { profile } from "@/content/profile";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Avishake Adhikary, Machine Learning Engineer in Kolkata, India. Open to ML/AI engineering roles and collaborations.",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  const channels = [
    { href: profile.socials.linkedin, label: "LinkedIn", sub: "linkedin.com/in/avishakeadhikary", Icon: LinkedInIcon },
    { href: profile.socials.github, label: "GitHub", sub: "github.com/AvishakeAdhikary", Icon: GitHubIcon },
    { href: profile.socials.scholar, label: "Google Scholar", sub: "publications & citations", Icon: ScholarIcon },
    { href: profile.resume, label: "Résumé", sub: "PDF", Icon: FileDown },
  ];
  return (
    <>
      <PageHeader
        title="Contact"
        sub="system recovered"
        intro={`Sorry about the crash (not sorry). ${profile.openTo} I'm in Kolkata (IST) and happy to work remotely across time zones or relocate for the right team.`}
      />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6">
        <ContactPanel email={profile.email} />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map(({ href, label, sub, Icon }) => (
            <li key={label}>
              <a href={href} target="_blank" rel="noopener" className="panel group flex items-center gap-4 p-5 transition-colors hover:border-signal/60">
                <Icon className="size-5 text-signal" />
                <span className="flex-1">
                  <span className="block font-mono font-bold">{label}</span>
                  <span className="block font-hud text-[0.68rem] text-subtle-foreground">{sub}</span>
                </span>
                <ArrowUpRight className="size-4 text-subtle-foreground group-hover:text-foreground" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
