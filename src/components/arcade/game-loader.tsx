"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { CrashPanel, ErrorBoundary } from "@/components/error-boundary";
import type { GameId } from "@/content/achievements";
import { loadChunk } from "@/lib/lazy";

const loading = () => <p className="panel px-5 py-10 text-center font-hud text-xs text-subtle-foreground">loading weights…</p>;

/** Each game is its own chunk, fetched only on its page. */
const GAMES: Partial<Record<GameId, ComponentType<{ data?: unknown }>>> = {
  "gradient-golf": dynamic(() => loadChunk(() => import("./games/gradient-golf")), { ssr: false, loading }),
  kmeans: dynamic(() => loadChunk(() => import("./games/kmeans")), { ssr: false, loading }),
  knn: dynamic(() => loadChunk(() => import("./games/knn")), { ssr: false, loading }),
  perceptron: dynamic(() => loadChunk(() => import("./games/perceptron")), { ssr: false, loading }),
  debugger: dynamic(() => loadChunk(() => import("./games/debugger")), { ssr: false, loading }),
  tokens: dynamic(() => loadChunk(() => import("./games/tokens")), { ssr: false, loading }),
  interp: dynamic(() => loadChunk(() => import("./games/interp")), { ssr: false, loading }),
};

export function GameLoader({ id, data }: { id: GameId; data?: unknown }) {
  const Game = GAMES[id];
  if (!Game) return <p className="panel px-5 py-10 text-center text-muted-foreground">This cabinet is still being wired up.</p>;
  return (
    <ErrorBoundary name={`game:${id}`} fallback={(reset) => <CrashPanel title="This game hit an error" detail="Your progress is saved. Try again, or reload the page." onRetry={reset} />}>
      <Game data={data} />
    </ErrorBoundary>
  );
}
