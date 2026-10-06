"use client";

import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { sfx } from "@/components/media/audio/play";
import type { GameId } from "@/content/achievements";
import { keyBlocked } from "@/lib/keybinds";
import { track, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { Btn } from "./ui";

export interface WalkStep {
  /** Short, plain-language title ("Follow the slope"). */
  title: string;
  /** One or two sentences. */
  body: ReactNode;
  /** A small interactive demo; the heart of each step. */
  demo?: ReactNode;
  /** Optional "under the hood" line for the technically curious. */
  deeper?: ReactNode;
}

/**
 * The walkthrough: a deck of steps, each a tiny interactive demo plus a
 * line or two. Concept first, mechanics after. Back / Next (or ← →),
 * Skip any time, replayable from the game header.
 */
export function Walkthrough({ steps, onDone, onSkip, title }: { steps: WalkStep[]; onDone: () => void; onSkip: () => void; title: string }) {
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;
  const go = useCallback(
    (d: number) => {
      setI((x) => {
        const n = Math.max(0, Math.min(steps.length - 1, x + d));
        if (n !== x) sfx("step");
        return n;
      });
    },
    [steps.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (keyBlocked(e)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (last) onDone();
        else go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, last, onDone]);

  const s = steps[i];
  return (
    <section aria-label={`${title} walkthrough`} className="panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="hud">
          walkthrough · step {i + 1}/{steps.length}
        </p>
        <div className="flex items-center gap-1.5" aria-hidden>
          {steps.map((_, j) => (
            <span key={j} className={cn("h-1.5 rounded-full transition-all", j === i ? "w-6 bg-signal" : j < i ? "w-1.5 bg-signal/60" : "w-1.5 bg-white/15")} />
          ))}
        </div>
        <Btn variant="quiet" className="h-8 px-2" onClick={onSkip}>
          Skip to the game
        </Btn>
      </header>
      <div key={i} className="toast-in grid gap-6 p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:p-6">
        <div className="min-w-0">{s.demo}</div>
        <div className="flex min-w-0 flex-col">
          <h2 className="font-mono text-2xl font-bold">
            {s.title}
            <span className="text-signal">.</span>
          </h2>
          <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">{s.body}</div>
          {s.deeper ? (
            <p className="mt-4 rounded-md border border-dashed border-border-strong px-3 py-2 font-hud text-xs leading-relaxed text-subtle-foreground">
              <span className="text-signal-pale">under the hood · </span>
              {s.deeper}
            </p>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-3 pt-6">
            <Btn onClick={() => go(-1)} disabled={i === 0} aria-label="Previous step">
              <ChevronLeft className="size-4" /> Back
            </Btn>
            <Btn variant="primary" onClick={() => (last ? onDone() : go(1))}>
              {last ? "Start playing" : "Next"} <ChevronRight className="size-4" />
            </Btn>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Frame for every game: title bar with live stats, the walkthrough on
 * first play (replayable), and the board.
 */
export function GameShell({ game, title, steps, stats, children }: { game: GameId; title: string; steps: WalkStep[]; stats?: ReactNode; children: ReactNode }) {
  const progress = useProgress();
  const seen = (progress.sets.tutorials ?? []).includes(game);
  const [tutorial, setTutorial] = useState(() => !seen);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">{tutorial ? null : stats}</div>
        {tutorial ? null : (
          <Btn onClick={() => setTutorial(true)}>
            <BookOpen className="size-4" /> How it works
          </Btn>
        )}
      </div>
      {tutorial ? (
        <Walkthrough
          title={title}
          steps={steps}
          onDone={() => {
            track({ t: "tutorial", game });
            sfx("success");
            setTutorial(false);
          }}
          onSkip={() => setTutorial(false)}
        />
      ) : (
        children
      )}
    </div>
  );
}

/** Level picker: numbered tabs with a tick once cleared. */
export function Levels({ names, current, cleared, onPick }: { names: string[]; current: number; cleared: boolean[]; onPick: (i: number) => void }) {
  return (
    <div role="tablist" aria-label="Levels" className="flex flex-wrap gap-1.5">
      {names.map((n, i) => (
        <button
          key={n}
          type="button"
          role="tab"
          aria-selected={i === current}
          onClick={() => onPick(i)}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors",
            i === current ? "border-signal/60 bg-signal/10 text-foreground" : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
          )}
        >
          <span className={cn("font-hud text-[0.6rem]", cleared[i] ? "text-success" : "text-subtle-foreground")}>{cleared[i] ? "✓" : String(i + 1).padStart(2, "0")}</span>
          {n}
        </button>
      ))}
    </div>
  );
}
