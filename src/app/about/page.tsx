import { ArrowRight, Clock, Languages, MapPin, Music } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DiffusionImage } from "@/components/fx/diffusion-image";
import { Globe } from "@/components/home/globe";
import { PageHeader } from "@/components/page-header";
import { gallery } from "@/content/gallery";
import { GLOBE_HOME, GLOBE_POINTS } from "@/content/places";
import { profile } from "@/content/profile";
import { image } from "@/lib/assets";

export const metadata: Metadata = {
  title: "About",
  description: "About Avishake Adhikary: a Machine Learning Engineer from Kolkata, India, building healthcare AI and open-source tools.",
  alternates: { canonical: "/about/" },
};

const STORY = [
  "I grew up in Kolkata and studied computer applications at Amity University Kolkata: a BCA, then an MCA, both with First Division. At my MCA convocation I received the Shree Baljit Shastri Award for the best in human and traditional values.",
  "I started in 2020 building WordPress sites and running digital-marketing campaigns as an intern at Travarsa. From there I moved through Java, Angular and React, then into machine learning, shipping a GPT-4 job assistant, document AI and single sign-on at PTS Consulting Services.",
  "After a semester teaching design and databases to 50+ students, I joined Minion Technologies. There I build the AI inside ZoyeMed, an autonomous medical kiosk deployed across international markets: models that run on local hardware, voice assistants for doctors and patients, and pipelines that keep medical records private.",
  "Outside work I build open-source tools: MCP servers that teach AI agents new skills, an app that turns an Android phone into a remote for a Windows PC, and an audio router I wrote because I play guitar and got tired of paying twice to hear it.",
];

export default function AboutPage() {
  const picks = gallery.slice(0, 6).flatMap((g) => {
    const img = image(g.image);
    return img ? [{ ...g, img }] : [];
  });
  return (
    <>
      <PageHeader title="About" sub="system card" intro={`${profile.headline} from ${profile.location.city}, India. ${profile.openTo}`} />

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-14 sm:px-6">
        <section className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative mx-auto w-full max-w-[34rem]" data-reveal>
            <Globe home={GLOBE_HOME} points={GLOBE_POINTS} />
            <div className="panel absolute bottom-[4%] left-0 px-4 py-3 font-hud text-[0.7rem] leading-relaxed">
              <p className="flex items-center gap-1.5 text-foreground">
                <MapPin className="size-3.5 text-signal" /> Kolkata, IN
              </p>
              <p className="text-subtle-foreground">
                {profile.location.lat.toFixed(4)}°N · {profile.location.lng.toFixed(4)}°E
              </p>
              <p className="flex items-center gap-1.5 text-subtle-foreground">
                <Clock className="size-3" /> IST · UTC+05:30
              </p>
            </div>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-muted-foreground">
            {STORY.map((p, i) => (
              <p key={i} data-reveal style={{ ["--i" as string]: i }}>
                {p}
              </p>
            ))}
            <div data-reveal className="pt-2">
              <p className="hud mb-3">the lines on the globe</p>
              <ul className="space-y-1.5 font-hud text-[0.78rem]">
                {GLOBE_POINTS.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="h-px w-5 bg-signal" /> {p.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2" aria-labelledby="langs">
          <div className="panel p-6" data-reveal>
            <p className="hud flex items-center gap-2">
              <Languages className="size-3.5 text-signal" /> languages
            </p>
            <h2 id="langs" className="sr-only">
              Languages
            </h2>
            <ul className="mt-4 space-y-4">
              {profile.languages.map((l) => (
                <li key={l.name}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-mono text-lg font-bold">{l.name}</span>
                    <span className="font-hud text-xs text-signal-pale">{l.level}</span>
                  </div>
                  {"note" in l && l.note ? <p className="text-sm text-muted-foreground">{l.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-6" data-reveal style={{ ["--i" as string]: 1 }}>
            <p className="hud">english, for the record</p>
            <p className="mt-4 text-lg leading-relaxed text-foreground/90">
              Both of my degrees (BCA 2018–21 and MCA 2021–23, Amity University Kolkata) were taught entirely in English.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Every role since 2020 has used English as its working language: documentation and code reviews, client work with CEOs and COOs, university
              teaching, an internationally deployed product, and five peer-reviewed publications.
            </p>
          </div>
        </section>

        <section aria-labelledby="moments">
          <div className="flex items-end justify-between gap-4">
            <h2 id="moments" className="text-3xl font-bold sm:text-4xl">
              Moments<span className="text-signal">.</span>
            </h2>
            <Link href="/gallery/" className="inline-flex items-center gap-1 font-mono text-sm link-mono">
              full gallery <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            {picks.map((g, i) => (
              <li key={g.image} data-reveal style={{ ["--i" as string]: i % 3 }}>
                <DiffusionImage img={g.img} alt={g.alt} sizes="(min-width: 768px) 33vw, 50vw" className="aspect-[4/3] rounded-md border border-border" />
                <p className="mt-2 font-hud text-[0.68rem] text-subtle-foreground">{g.caption}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel flex flex-wrap items-center gap-4 p-6" data-reveal>
          <Music className="size-5 text-signal" />
          <p className="flex-1 text-muted-foreground">
            <span className="text-foreground">About the music:</span> press &ldquo;music&rdquo; in the header for lo-fi, synthwave or ambient tracks composed live in your browser (no audio files, never the same twice), or switch to a playlist of real public-domain (CC0) tracks in{" "}
            <Link href="/settings/" className="link-mono">
              settings
            </Link>
            . It never plays unless you ask.
          </p>
        </section>
      </div>
    </>
  );
}
