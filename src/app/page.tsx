import Link from "next/link";
import { Stream } from "@/components/fx/stream";
import { Door } from "@/components/home/door";
import { Globe, type GlobePoint } from "@/components/home/globe";
import { Hero } from "@/components/home/hero";
import { CitationPreview, EmbeddingPreview, LabPreview, LossCurvePreview, ModelCardsPreview } from "@/components/home/previews";
import { profile } from "@/content/profile";
import { GLOBE_HOME, GLOBE_POINTS } from "@/content/places";
import { stats } from "@/lib/stats";
import { roles } from "@/content/experience";
import { getProjects } from "@/lib/projects";

export default function Home() {
  const projects = getProjects();
  const doors = [
    {
      id: "door-work",
      title: "Work",
      sub: "training run",
      pitch: `${stats.yearsBuilding}+ years, ${roles.length} roles and two degrees: from building websites as an intern to shipping healthcare AI used across international markets. Every step is a checkpoint.`,
      href: "/work/",
      cta: "Open the training log",
      preview: <LossCurvePreview />,
    },
    {
      id: "door-projects",
      title: "Projects",
      sub: "model zoo",
      pitch: `${projects.length} things I've built, at work and after hours: clinical AI, AI agents, real-time computer vision, desktop apps, and even an audio router for my guitar. Each one links to where it was made.`,
      href: "/projects/",
      cta: "Browse the projects",
      preview: <ModelCardsPreview />,
    },
    {
      id: "door-skills",
      title: "Skills",
      sub: "embedding space",
      pitch: `${stats.skills} tools mapped by how they relate, so similar skills sit close together. Hover around and see which projects used what.`,
      href: "/skills/",
      cta: "Explore the map",
      preview: <EmbeddingPreview />,
    },
    {
      id: "door-research",
      title: "Research",
      sub: "citation graph",
      pitch: `${stats.publications} published chapters and papers with Wiley, Springer and Taylor & Francis, on deep learning, IoT healthcare and security, plus ${stats.certifications} certifications.`,
      href: "/research/",
      cta: "Read the papers",
      preview: <CitationPreview />,
    },
    {
      id: "door-about",
      title: "About",
      sub: "system card",
      pitch: `Based in ${profile.location.city}, India, and working with the world. Fluent in English (both degrees were taught in English), Bengali and Hindi, and still learning German and Spanish.`,
      href: "/about/",
      cta: "Meet the human",
      preview: (
        <div className="relative mx-auto w-full max-w-[30rem]">
          <Globe home={GLOBE_HOME} points={GLOBE_POINTS as GlobePoint[]} />
        </div>
      ),
    },
    {
      id: "door-lab",
      title: "Lab",
      sub: "playground",
      pitch: "A real terminal that knows my CV. Ask it questions, open projects, or find the easter eggs. It's optional, but it's fun.",
      href: "/lab/",
      cta: "Enter the lab",
      preview: <LabPreview />,
    },
  ];

  return (
    <div className="snap-home">
      <Hero />
      <div id="doors">
        {doors.map((d, i) => (
          <Door key={d.id} {...d} index={i + 1} total={doors.length} flip={i % 2 === 1} />
        ))}
      </div>

      <section className="snap-start-section relative flex min-h-[70svh] items-center justify-center border-t border-border px-4 py-24 text-center" aria-labelledby="hello-title">
        <div>
          <p className="hud">{"// the end of the context window"}</p>
          <h2 id="hello-title" className="mt-5 text-5xl font-extrabold sm:text-7xl">
            <Stream as="span" text="Let's build something" speed={80} />
            <br />
            <span className="text-signal glow">
              <Stream as="span" text="worth remembering." speed={80} offset={350} />
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">Fair warning: the contact page is a little… unstable.</p>
          <Link
            href="/contact/"
            className="mt-9 inline-flex h-14 items-center rounded-md bg-signal px-8 font-mono text-base font-semibold text-white shadow-[0_0_40px_-6px_var(--signal-glow)] transition-transform hover:-translate-y-0.5"
          >
            Contact me
          </Link>
        </div>
      </section>
    </div>
  );
}
