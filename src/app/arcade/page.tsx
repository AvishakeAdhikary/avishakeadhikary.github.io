import type { Metadata } from "next";
import { ArcadeGrid } from "@/components/arcade/arcade-grid";
import { PageHeader } from "@/components/page-header";
import { TrophyRoom } from "@/components/progress/trophy-room";

export const metadata: Metadata = {
  title: "Arcade",
  description: "Machine-learning mini-games with walkthroughs: gradient descent golf, k-means, KNN on a real skill map, perceptrons, token sampling, transformer debugging and mechanistic interpretability.",
  alternates: { canonical: "/arcade/" },
};

export default function ArcadePage() {
  return (
    <>
      <PageHeader
        title="Arcade"
        sub="ml mini-games"
        intro="Machine learning, played instead of read. Every game opens with a short interactive walkthrough (skip it if you know the trick), and every game is real: the algorithms run live in your browser."
      />
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6">
        <section aria-labelledby="cabinets">
          <h2 id="cabinets" className="mb-5 font-mono text-2xl font-bold">
            Pick a cabinet<span className="text-signal">.</span>
          </h2>
          <ArcadeGrid />
        </section>
        <section id="trophies" aria-labelledby="trophies-title" className="scroll-mt-24">
          <h2 id="trophies-title" className="mb-2 font-mono text-2xl font-bold">
            Trophy room<span className="text-signal">.</span>
          </h2>
          <p className="mb-6 max-w-2xl text-muted-foreground">
            Points come from everywhere on the site, not just the games: pages, the terminal, the soundtrack, settings, secrets. Climb from Bronze to Master; earn
            something in every category to become an All-Rounder.
          </p>
          <TrophyRoom />
        </section>
      </div>
    </>
  );
}
