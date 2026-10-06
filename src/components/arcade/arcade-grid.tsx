"use client";

import { ArrowRight, Check, Crown, GraduationCap } from "lucide-react";
import Link from "@/components/link";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { GAME_INFO } from "./registry";

/** The cabinet row: one card per game, with your progress on each. */
export function ArcadeGrid() {
  const p = useProgress();
  const has = (set: string, id: string) => (p.sets[set] ?? []).includes(id);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {GAME_INFO.map((g, i) => {
        const body = (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="font-hud text-[0.62rem] tracking-[0.18em] text-subtle-foreground uppercase">
                {String(i + 1).padStart(2, "0")} · {g.level}
              </span>
              <span className="flex gap-1.5" aria-label="Your progress">
                {[
                  { on: has("tutorials", g.id), Icon: GraduationCap, label: "walkthrough done" },
                  { on: has("cleared", g.id), Icon: Check, label: "cleared" },
                  { on: has("mastered", g.id), Icon: Crown, label: "mastered" },
                ].map(({ on, Icon, label }) => (
                  <span key={label} title={label} className={cn("grid size-6 place-items-center rounded border", on ? "border-signal/60 text-signal" : "border-border text-subtle-foreground/50")}>
                    <Icon className="size-3.5" />
                    <span className="sr-only">
                      {label}: {on ? "yes" : "no"}
                    </span>
                  </span>
                ))}
              </span>
            </div>
            <h3 className="mt-4 font-mono text-xl font-bold">
              {g.name}
              <span className="text-signal">.</span>
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{g.tagline}</p>
            <p className="mt-3 font-hud text-[0.68rem] text-subtle-foreground">{g.concept}</p>
            <span className={cn("mt-5 inline-flex items-center gap-1.5 font-mono text-xs", g.ready ? "text-signal" : "text-subtle-foreground")}>
              {g.ready ? (
                <>
                  insert coin <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </>
              ) : (
                "cabinet arriving soon"
              )}
            </span>
          </>
        );
        return (
          <li key={g.id}>
            {g.ready ? (
              <Link href={`/arcade/${g.id}/`} className="group spotlight panel block h-full p-5 transition-colors hover:border-signal/60">
                {body}
              </Link>
            ) : (
              <div className="panel h-full p-5 opacity-60">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
