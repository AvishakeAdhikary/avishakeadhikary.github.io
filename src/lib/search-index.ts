import { GAME_INFO } from "@/components/arcade/registry";
import { ACHIEVEMENTS } from "@/content/achievements";
import { certifications } from "@/content/certifications";
import { degrees, honors, roles } from "@/content/experience";
import { profile } from "@/content/profile";
import { publications } from "@/content/publications";
import { skillCategories } from "@/content/skills";
import { testimonials } from "@/content/testimonials";
import { formatRange } from "./format";
import { getProjects } from "./projects";
import { stats } from "./stats";

export interface IndexDoc {
  id: string;
  title: string;
  url: string;
  text: string;
}

/**
 * Everything the terminal knows, emitted once at build time as
 * /search-index.json and fetched only when someone opens the terminal.
 */
export function buildSearchIndex() {
  const projects = getProjects();
  const docs: IndexDoc[] = [
    {
      id: "about",
      title: "About Avishake",
      url: "/about/",
      text: `${profile.summary} He is based in ${profile.location.city}, ${profile.location.country}. ${profile.openTo} Languages: ${profile.languages.map((l) => `${l.name} (${l.level})`).join(", ")}. Both degrees were taught in English, and English has been his working language since 2020.`,
    },
    ...roles.map((r) => ({
      id: `role-${r.id}`,
      title: `${r.title} at ${r.org}`,
      url: "/work/",
      text: `${r.title} at ${r.org} (${formatRange(r.start, r.end)}, ${r.location}). ${r.summary} ${r.highlights.join(" ")} Built there: ${projects
        .filter((p) => p.roleId === r.id)
        .map((p) => p.title)
        .join(", ")}.`,
    })),
    ...degrees.map((d) => ({
      id: `edu-${d.id}`,
      title: `${d.degree}, ${d.school}`,
      url: "/work/#education",
      text: `${d.degree} (${d.short}) at ${d.institute}, ${d.school}, ${formatRange(d.start, d.end)}. CGPA ${d.cgpa}, ${d.division}. Medium of instruction: English. Coursework: ${d.coursework.join(", ")}.`,
    })),
    ...honors.map((h, i) => ({ id: `honor-${i}`, title: h.title, url: "/work/#education", text: `${h.title}, ${h.issuer}. ${h.description}` })),
    ...projects.map((p) => ({
      id: `project-${p.slug}`,
      title: p.title,
      url: `/projects/${p.slug}/`,
      text: `${p.title}: ${p.tagline}. ${p.description} ${(p.highlights ?? []).join(" ")} Tech: ${p.tech.join(", ")}.`,
    })),
    ...publications.map((p, i) => ({
      id: `paper-${i}`,
      title: p.title,
      url: "/research/",
      text: `Publication: "${p.title}" by ${p.authors.join(", ")}. ${p.kind} in ${p.venue}, ${p.publisher}, ${p.date.slice(0, 4)}.`,
    })),
    ...skillCategories.map((c) => ({
      id: `skills-${c.id}`,
      title: `Skills: ${c.title}`,
      url: "/skills/",
      text: `${c.title}: ${c.skills.map((s) => s.name).join(", ")}. ${c.blurb}`,
    })),
    {
      id: "certs",
      title: "Certifications",
      url: "/research/#certifications",
      text: `${profile.claims.certifications} certifications, including ${certifications
        .filter((c) => c.highlight)
        .map((c) => `${c.name} (${c.issuer})`)
        .join(", ")}.`,
    },
    ...GAME_INFO.map((g) => ({
      id: `game-${g.id}`,
      title: `Arcade: ${g.name}`,
      url: `/arcade/${g.id}/`,
      text: `${g.name}, an interactive machine-learning mini-game in the Arcade. ${g.tagline} Concepts: ${g.concept}. Each game opens with a walkthrough.`,
    })),
    {
      id: "site-keys",
      title: "Keybinds, achievements and settings",
      url: "/settings/#controls",
      text: `The site has keyboard shortcuts (press ? for the list): ~ terminal, M music, N next track, S sound effects, T theme, C scanlines, R runtime readout, G then a letter to jump between pages, Shift+A for the trophy room. There are ${ACHIEVEMENTS.length} achievements across exploring, the terminal, audio, settings, the Arcade and secrets, with ranks from Bronze to Master and All-Rounder.`,
    },
    ...testimonials.map((t, i) => ({
      id: `rec-${i}`,
      title: `Recommendation from ${t.name}`,
      url: "/work/#feedback",
      text: `${t.name} (${t.title}; ${t.relationship}) wrote: "${t.quote}"`,
    })),
  ];

  return {
    profile: {
      name: profile.name,
      headline: profile.headline,
      location: `${profile.location.city}, ${profile.location.country}`,
      email: profile.email,
      resume: profile.resume,
      socials: profile.socials,
    },
    stats,
    roles: roles.map((r) => ({ id: r.id, title: r.title, org: r.org, range: formatRange(r.start, r.end) })),
    projects: projects.map((p) => ({
      slug: p.slug,
      title: p.title,
      tagline: p.tagline,
      tags: p.categories,
      role: p.roleId ?? null,
      stars: p.stats?.stars ?? null,
    })),
    papers: publications.map((p) => ({ title: p.title, year: p.date.slice(0, 4), venue: p.publisher })),
    skills: skillCategories.map((c) => ({ id: c.id, title: c.title, items: c.skills.map((s) => s.name) })),
    bio: [profile.tagline, profile.summary, ...roles.map((r) => r.summary)].join(" "),
    docs,
  };
}

export type SearchIndex = ReturnType<typeof buildSearchIndex>;
