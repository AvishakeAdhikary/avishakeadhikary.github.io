/**
 * Content model. Everything the site renders comes from src/content/*:
 * hand-curated facts (this folder) merged with synced data
 * (src/content/generated/*, written by scripts/).
 */

/** "YYYY-MM" month precision; `null` end means "present". */
export type Month = `${number}-${number}`;

export type RoleId =
  | "minion"
  | "bvb"
  | "pts"
  | "travarsa-2022"
  | "travarsa-2020"
  | "amity-mca"
  | "amity-bca";

export interface Role {
  id: RoleId;
  kind: "work" | "education";
  org: string;
  /** Short label for charts, e.g. "BVB". */
  short?: string;
  orgUrl?: string;
  title: string;
  /** Internal stages within one employer, newest first. */
  stages?: { title: string; start: Month; end: Month; note?: string }[];
  employment?: "Full-time" | "Part-time" | "Internship" | "Apprenticeship";
  start: Month;
  end: Month | null;
  location: string;
  summary: string;
  highlights: string[];
  skills: string[];
  /** Key into media-manifest images (logo or photo). */
  image?: string;
}

export interface Degree {
  id: RoleId;
  degree: string;
  short: string;
  school: string;
  institute: string;
  start: Month;
  end: Month;
  cgpa: number;
  division: string;
  sgpa: number[];
  mediumOfInstruction: "English";
  coursework: string[];
  roles: string[];
  certificates?: string[];
  image?: string;
}

export interface Honor {
  title: string;
  issuer: string;
  date: Month;
  roleId?: RoleId;
  description: string;
  image?: string;
}

export type ProjectCategory = "ai" | "agents" | "cv" | "llm" | "web" | "mobile" | "desktop" | "systems" | "iot";

export interface ProjectLinks {
  repo?: string;
  live?: string;
  store?: string;
  docs?: string;
}

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  highlights?: string[];
  /** Role this was built under; omit for independent work. */
  roleId?: RoleId;
  start: Month;
  end?: Month | null;
  tech: string[];
  categories: ProjectCategory[];
  links: ProjectLinks;
  /** Media-manifest image key, or remote URL. */
  image?: string;
  /** Media-manifest video key. */
  video?: string;
  featured?: boolean;
  metrics?: { label: string; value: string }[];
  /** Matching GitHub repo name, for live stats. */
  repo?: string;
  status?: "active" | "shipped" | "wip" | "archived";
  /**
   * `false` keeps a project unpublished: it stays in the source but gets no
   * listing, link, page, cover, sitemap or search-index entry (it is dropped
   * in getProjects(), so its route is never generated). Omitted = public.
   */
  public?: boolean;
}

/** Per-repo curation applied on top of synced GitHub data. */
export interface RepoOverride {
  hide?: boolean;
  /** Merge this repo into a curated project with the same slug. */
  slug?: string;
  title?: string;
  tagline?: string;
  categories?: ProjectCategory[];
  tech?: string[];
  roleId?: RoleId;
  featured?: boolean;
  image?: string;
  video?: string;
}

export type SkillIcon = { si: string } | { svg: string } | { glyph: string };

export interface Skill {
  name: string;
  icon?: SkillIcon;
  /** Passed LinkedIn skill assessment. */
  verified?: boolean;
  /** Used professionally in production (vs. coursework/hobby). */
  production?: boolean;
}

export interface SkillCategory {
  id: string;
  title: string;
  blurb: string;
  skills: Skill[];
}

export interface Publication {
  title: string;
  authors: string[];
  /** Index into authors of the site owner. */
  selfIndex: number;
  venue: string;
  publisher: string;
  pages?: string;
  date: string;
  doi?: string;
  url: string;
  isbn?: string;
  kind: "Book chapter" | "Conference paper";
  /** Title as it appears on Google Scholar, for citation matching. */
  scholarTitle: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: Month;
  expired?: boolean;
  highlight?: boolean;
  tags?: ("ai" | "cloud" | "data" | "web" | "lang" | "mobile" | "marketing" | "career")[];
}

export interface Testimonial {
  quote: string;
  name: string;
  title: string;
  relationship: string;
  date?: Month;
  roleId?: RoleId;
  /** Shared publications with the recommender. */
  coauthor?: boolean;
  source: "LinkedIn" | "Direct";
}

export interface GalleryItem {
  image: string;
  alt: string;
  caption: string;
}

export interface AudioTrack {
  title: string;
  artist: string;
  src: string;
  license: string;
  sourceUrl: string;
}
