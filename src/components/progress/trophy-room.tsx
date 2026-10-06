"use client";

import { Crown, Gem, Lock, Medal, RotateCcw, Trophy } from "lucide-react";
import { useState } from "react";
import { ACHIEVEMENTS, CATEGORIES } from "@/content/achievements";
import { categoryProgress, resetProgress, standing, TOTAL_POINTS, useProgress } from "@/lib/progress";
import { RANK_LABEL, rankColor, TIER_POINTS, type Rank } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const ICON: Record<Rank, typeof Trophy> = { bronze: Medal, silver: Medal, gold: Trophy, platinum: Trophy, diamond: Gem, master: Crown, allrounder: Crown };
const LADDER: Rank[] = ["bronze", "silver", "gold", "platinum", "diamond", "master", "allrounder"];

/** Rank, points, per-category progress and every achievement (locked ones show how to earn them). */
export function TrophyRoom({ compact = false }: { compact?: boolean }) {
  const p = useProgress();
  const s = standing(p);
  const cats = categoryProgress(p);
  const [confirm, setConfirm] = useState(false);
  const unlocked = Object.keys(p.unlocked).length;
  const RankIcon = s.rank ? ICON[s.rank] : Medal;
  const color = s.rank ? rankColor(s.rank) : "var(--muted-foreground)";

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="panel relative overflow-hidden p-5">
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} />
          <p className="hud">your rank</p>
          <div className="mt-3 flex items-center gap-4">
            <span
              className="grid size-16 shrink-0 place-items-center rounded-lg border"
              style={{ color, borderColor: `color-mix(in oklch, ${color} 50%, transparent)`, background: `color-mix(in oklch, ${color} 12%, transparent)` }}
            >
              <RankIcon className="size-8" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-2xl font-extrabold" style={{ color }}>
                {s.rank ? RANK_LABEL[s.rank] : "Unranked"}
              </p>
              <p className="font-hud text-xs text-muted-foreground tabular-nums">
                {s.points} / {TOTAL_POINTS} pts · {unlocked} / {ACHIEVEMENTS.length} achievements
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(s.toNext * 100)}%`, background: color }} />
            </div>
            <p className="mt-1.5 font-hud text-[0.66rem] text-subtle-foreground">
              {s.next
                ? s.next.rank === "allrounder"
                  ? `All-Rounder: earn one achievement in ${s.missing.map((m) => CATEGORIES.find((c) => c.id === m)?.label).join(", ") || "every category"}`
                  : `${s.next.points - s.points} pts to ${RANK_LABEL[s.next.rank]}`
                : "Every rank earned."}
            </p>
          </div>
          <ol className="mt-4 flex flex-wrap gap-1" aria-label="Rank ladder">
            {LADDER.map((r) => {
              const reached = s.rank && LADDER.indexOf(r) <= LADDER.indexOf(s.rank);
              return (
                <li
                  key={r}
                  className={cn("rounded border px-1.5 py-0.5 font-hud text-[0.6rem] uppercase", !reached && "opacity-40")}
                  style={{ color: rankColor(r), borderColor: `color-mix(in oklch, ${rankColor(r)} 40%, transparent)` }}
                >
                  {RANK_LABEL[r]}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="panel p-5">
          <p className="hud">categories</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {cats.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="font-hud text-[0.66rem] text-subtle-foreground tabular-nums">
                    {c.done}/{c.total}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full bg-signal" style={{ width: `${(c.done / c.total) * 100}%` }} />
                </div>
                <p className="mt-0.5 font-hud text-[0.6rem] text-subtle-foreground">{`// ${c.sub}`}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {CATEGORIES.map((c) => (
        <section key={c.id} aria-label={`${c.label} achievements`}>
          <h3 className="mb-3 font-mono text-lg font-bold">
            {c.label}
            <span className="text-signal">.</span>
          </h3>
          <ul className={cn("grid gap-2 sm:grid-cols-2", !compact && "xl:grid-cols-3")}>
            {ACHIEVEMENTS.filter((a) => a.cat === c.id).map((a) => {
              const at = p.unlocked[a.id];
              const hidden = a.secret && !at;
              const tc = rankColor(a.tier);
              return (
                <li
                  key={a.id}
                  className={cn("relative flex gap-3 overflow-hidden rounded-md border bg-background-elevated/60 p-3", !at && "opacity-60")}
                  style={{ borderColor: at ? `color-mix(in oklch, ${tc} 45%, transparent)` : undefined }}
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-md border"
                    style={{ color: at ? tc : "var(--subtle-foreground)", borderColor: at ? `color-mix(in oklch, ${tc} 45%, transparent)` : "var(--border)" }}
                  >
                    {at ? a.tier === "diamond" ? <Gem className="size-4" /> : <Trophy className="size-4" /> : <Lock className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-mono text-sm font-semibold">{hidden ? "Secret achievement" : a.title}</span>
                      <span className="shrink-0 font-hud text-[0.6rem] uppercase" style={{ color: tc }}>
                        {RANK_LABEL[a.tier]} · {TIER_POINTS[a.tier]}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{hidden ? "Keep exploring. It reveals itself when you earn it." : a.desc}</p>
                    {at ? <p className="mt-1 font-hud text-[0.6rem] text-subtle-foreground">unlocked {new Date(at).toLocaleDateString()}</p> : null}
                  </div>
                  <span className="sr-only">{at ? "Unlocked" : "Locked"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-border-strong px-5 py-4">
        <p className="text-sm text-muted-foreground">Progress is saved only in this browser. Nothing is sent anywhere.</p>
        <button
          type="button"
          onClick={() => {
            if (!confirm) return setConfirm(true);
            resetProgress();
            setConfirm(false);
          }}
          onBlur={() => setConfirm(false)}
          className={cn("inline-flex h-10 items-center gap-2 rounded-md border px-4 font-mono text-xs", confirm ? "border-signal text-signal" : "border-border-strong hover:border-signal")}
        >
          <RotateCcw className="size-3.5" /> {confirm ? "Click again to wipe progress" : "Reset progress"}
        </button>
      </div>
    </div>
  );
}
