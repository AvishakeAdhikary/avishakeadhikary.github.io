"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { GameId } from "@/content/achievements";

const loading = () => <p className="panel px-5 py-10 text-center font-hud text-xs text-subtle-foreground">loading weights…</p>;

/** Each game is its own chunk, fetched only on its page. */
const GAMES: Partial<Record<GameId, ComponentType<{ data?: unknown }>>> = {
  "gradient-golf": dynamic(() => import("./games/gradient-golf"), { ssr: false, loading }),
  kmeans: dynamic(() => import("./games/kmeans"), { ssr: false, loading }),
  knn: dynamic(() => import("./games/knn"), { ssr: false, loading }),
  perceptron: dynamic(() => import("./games/perceptron"), { ssr: false, loading }),
  debugger: dynamic(() => import("./games/debugger"), { ssr: false, loading }),
  tokens: dynamic(() => import("./games/tokens"), { ssr: false, loading }),
  interp: dynamic(() => import("./games/interp"), { ssr: false, loading }),
};

export function GameLoader({ id, data }: { id: GameId; data?: unknown }) {
  const Game = GAMES[id];
  return Game ? <Game data={data} /> : <p className="panel px-5 py-10 text-center text-muted-foreground">This cabinet is still being wired up.</p>;
}
