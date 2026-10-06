import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "@/components/link";
import { DiffusionImage } from "@/components/fx/diffusion-image";
import { LatentField } from "@/components/fx/latent-field";
import { Stream } from "@/components/fx/stream";
import { profile } from "@/content/profile";
import { image } from "@/lib/assets";
import { stats } from "@/lib/stats";

export function Hero() {
  const photo = image(profile.photo);
  const statItems = [
    { v: `${stats.yearsBuilding}+`, k: "years shipping software" },
    { v: `${stats.githubStars}★`, k: "on open-source GitHub" },
    { v: String(stats.publications), k: "published research papers" },
    { v: stats.certifications, k: "certifications" },
  ];

  return (
    <section className="snap-start-section relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden pt-24 pb-16" aria-label="Introduction">
      <LatentField className="absolute inset-0 -z-10 size-full" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,transparent,var(--background)_85%)]"
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <Stream
            as="p"
            text="> who is avishake adhikary?"
            unit="char"
            speed={34}
            className="font-hud text-sm text-signal sm:text-base"
          />

          <Stream
            as="h1"
            text="Avishake Adhikary"
            offset={1050}
            speed={140}
            hot={[
              { word: "Avishake", alts: [["Avishake", 0.981], ["Avhishek", 0.014], ["Abhishek", 0.005]] },
              { word: "Adhikary", alts: [["Adhikary", 0.993], ["Adhikari", 0.006], ["Adhikaree", 0.001]] },
            ]}
            className="mt-5 text-[clamp(2.9rem,9vw,6.6rem)] leading-[0.92] font-extrabold glow-soft"
          />

          <Stream
            as="p"
            text="Machine Learning Engineer in Kolkata, India."
            offset={1450}
            speed={45}
            hot={[{ word: "Engineer", alts: [["Engineer", 0.97], ["Researcher", 0.02], ["Wizard", 0.01]] }]}
            className="mt-5 font-mono text-lg text-signal-pale sm:text-2xl"
          />

          <Stream
            as="p"
            text="I build AI that helps doctors and patients, keeps private medical records private, and runs fast on small local machines. Before machine learning took over, I spent years building websites and apps, and I still enjoy it."
            offset={1800}
            speed={14}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          />

          <div data-reveal style={{ ["--i" as string]: 4 }} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/work/"
              className="group inline-flex h-12 items-center gap-2 rounded-md bg-signal-solid px-6 font-mono text-sm font-semibold text-on-signal shadow-[0_0_32px_-6px_var(--signal-glow)] transition-transform hover:-translate-y-0.5"
            >
              See my work <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/projects/" className="inline-flex h-12 items-center rounded-md border border-border-strong px-6 font-mono text-sm transition-colors hover:border-signal">
              Projects
            </Link>
            <Link href="/contact/" className="inline-flex h-12 items-center px-3 font-mono text-sm link-mono text-muted-foreground">
              say hello
            </Link>
          </div>

          <p data-reveal className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-hud text-[0.7rem] tracking-wider text-subtle-foreground uppercase">
            <span className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-success" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              open to opportunities
            </span>
            <span>now · ML engineer @ Minion Technologies</span>
          </p>
        </div>

        {photo ? (
          <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
            <div aria-hidden className="absolute -inset-3 rounded-2xl border border-dashed border-signal/30" />
            <DiffusionImage
              img={photo}
              alt={`Portrait of ${profile.name}`}
              sizes="(min-width: 1024px) 28rem, 80vw"
              priority
              seed="0xa5ad"
              className="aspect-[4/5] rounded-xl border border-border-strong"
            />
            <p className="mt-3 font-hud text-[0.66rem] text-subtle-foreground">prompt: &quot;portrait of avishake, kolkata, 35mm&quot;</p>
          </div>
        ) : null}
      </div>

      <dl className="mx-auto mt-14 grid w-full max-w-7xl grid-cols-2 gap-y-6 px-4 sm:px-6 md:grid-cols-4">
        {statItems.map((s, i) => (
          <div key={s.k} data-reveal style={{ ["--i" as string]: i }} className="flex flex-col-reverse border-l border-border pl-4 first:border-signal">
            <dt className="mt-1 text-sm text-subtle-foreground">{s.k}</dt>
            <dd className="font-mono text-3xl font-bold tabular-nums sm:text-4xl">{s.v}</dd>
          </div>
        ))}
      </dl>

      <a href="#doors" className="mx-auto mt-12 flex flex-col items-center gap-1 font-hud text-[0.65rem] tracking-[0.2em] text-subtle-foreground uppercase hover:text-foreground">
        scroll to explore
        <ArrowDown className="size-4 animate-[float-y_2.4s_ease-in-out_infinite]" />
      </a>
    </section>
  );
}
