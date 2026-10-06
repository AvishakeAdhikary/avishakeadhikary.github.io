import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameLoader } from "@/components/arcade/game-loader";
import { GAME_INFO, gameInfo } from "@/components/arcade/registry";
import { PageHeader } from "@/components/page-header";
import { buildSkillSpace } from "@/lib/skill-space";

export const dynamicParams = false;

export function generateStaticParams() {
  return GAME_INFO.map((g) => ({ game: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const { game } = await params;
  const g = gameInfo(game);
  if (!g) return {};
  return {
    title: `${g.name} · Arcade`,
    description: `${g.tagline} An interactive ML mini-game: ${g.concept}.`,
    alternates: { canonical: `/arcade/${g.id}/` },
  };
}

/** Only the KNN game needs build-time data: the real skill embedding. */
function dataFor(id: string) {
  if (id !== "knn") return undefined;
  const { nodes, centres } = buildSkillSpace();
  return {
    nodes: nodes.map((n) => ({ id: n.id, name: n.name, cat: n.cat, x: n.x, y: n.y })),
    centres: centres.map((c) => ({ id: c.id, title: c.title, x: c.x, y: c.y })),
  };
}

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const g = gameInfo(game);
  if (!g) notFound();
  return (
    <>
      <PageHeader title={g.name} sub={`arcade // ${g.level.toLowerCase()}`} intro={g.tagline}>
        <p className="mt-5 font-hud text-xs text-subtle-foreground">{g.concept}</p>
      </PageHeader>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
        <Link href="/arcade/" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> all games
        </Link>
        <GameLoader id={g.id} data={dataFor(g.id)} />
      </div>
    </>
  );
}
