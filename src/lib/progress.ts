"use client";

import { useSyncExternalStore } from "react";
import { sfx } from "@/components/media/audio/play";
import { ACHIEVEMENTS, CATEGORIES, type Achievement, type Category, type ProgressView } from "@/content/achievements";
import { readSettings } from "./settings";
import { RANK_LABEL, TIER_POINTS, type Rank } from "./tiers";
import { pushToast } from "./toast";

/**
 * The visitor's progress, in localStorage (never sent anywhere).
 * Components report what happened with track(); achievements are
 * re-evaluated from the record after every event, unlocks raise a toast
 * with a tier sound, and crossing a rank threshold raises a rank-up toast.
 */
const KEY = "avishake-progress";

interface Progress extends ProgressView {
  v: 1;
  unlocked: Record<string, number>;
  best: Record<string, number>;
}

const empty = (): Progress => ({ v: 1, unlocked: {}, sets: {}, counters: {}, days: [], flags: {}, best: {} });

let cache: Progress | null = null;
const listeners = new Set<() => void>();

function load(): Progress {
  if (cache) return cache;
  if (typeof window === "undefined") return empty();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Progress | null;
    cache = raw?.v === 1 ? { ...empty(), ...raw } : empty();
  } catch {
    cache = empty();
  }
  return cache;
}

function save(p: Progress) {
  cache = p;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lasts for this page view */
  }
  listeners.forEach((l) => l());
}

// ── Scoring ────────────────────────────────────────────────────────────────
export const TOTAL_POINTS = ACHIEVEMENTS.reduce((s, a) => s + TIER_POINTS[a.tier], 0);

/** Rank thresholds as a share of all available points. All-Rounder adds a breadth rule. */
const LADDER: { rank: Rank; at: number }[] = [
  { rank: "bronze", at: 0.01 },
  { rank: "silver", at: 0.08 },
  { rank: "gold", at: 0.2 },
  { rank: "platinum", at: 0.38 },
  { rank: "diamond", at: 0.58 },
  { rank: "master", at: 0.8 },
];

export const pointsOf = (p: Pick<Progress, "unlocked">) =>
  ACHIEVEMENTS.reduce((s, a) => s + (p.unlocked[a.id] ? TIER_POINTS[a.tier] : 0), 0);

export function categoryProgress(p: Pick<Progress, "unlocked">) {
  return CATEGORIES.map((c) => {
    const all = ACHIEVEMENTS.filter((a) => a.cat === c.id);
    return { ...c, done: all.filter((a) => p.unlocked[a.id]).length, total: all.length };
  });
}

export interface Standing {
  points: number;
  rank: Rank | null;
  next: { rank: Rank; points: number } | null;
  /** 0..1 progress from the current rank towards the next one. */
  toNext: number;
  /** Categories still missing for All-Rounder. */
  missing: Category[];
}

export function standing(p: Pick<Progress, "unlocked">): Standing {
  const points = pointsOf(p);
  const missing = categoryProgress(p)
    .filter((c) => c.done === 0)
    .map((c) => c.id);
  const need = (j: number) => Math.ceil(LADDER[j].at * TOTAL_POINTS);
  let i = -1;
  for (let j = 0; j < LADDER.length; j++) if (points >= need(j)) i = j;
  const master = i === LADDER.length - 1;
  const rank: Rank | null = i < 0 ? null : master && !missing.length ? "allrounder" : LADDER[i].rank;
  let next: Standing["next"] = null;
  let toNext = 1;
  if (rank === "master") {
    next = { rank: "allrounder", points: need(LADDER.length - 1) };
    toNext = 1 - missing.length / CATEGORIES.length;
  } else if (rank !== "allrounder") {
    next = { rank: LADDER[i + 1].rank, points: need(i + 1) };
    const from = i >= 0 ? need(i) : 0;
    toNext = Math.min(1, (points - from) / Math.max(1, next.points - from));
  }
  return { points, rank, next, toNext, missing };
}

// ── Events ─────────────────────────────────────────────────────────────────
export type TrackEvent =
  | { t: "page"; path: string }
  | { t: "read"; path: string }
  | { t: "project"; slug: string }
  | { t: "photo"; src: string; total: number }
  | { t: "command"; cmd: string }
  | { t: "source"; source: string }
  | { t: "setting"; key: string }
  | { t: "key"; id: string }
  | { t: "flag"; flag: string }
  | { t: "tutorial"; game: string }
  | { t: "cleared"; game: string }
  | { t: "mastered"; game: string }
  /** A per-game/level best ("golf/bowl" → strokes). `lower` = lower scores are better. */
  | { t: "best"; game: string; score: number; lower?: boolean };

const add = (p: Progress, set: string, v: string) => {
  const cur = p.sets[set] ?? [];
  if (cur.includes(v)) return false;
  p.sets = { ...p.sets, [set]: [...cur, v] };
  return true;
};

export function track(ev: TrackEvent) {
  if (typeof window === "undefined") return;
  const p: Progress = structuredClone(load());
  switch (ev.t) {
    case "page":
      add(p, "pages", ev.path);
      break;
    case "read":
      add(p, "read", ev.path);
      break;
    case "project":
      add(p, "projects", ev.slug);
      break;
    case "photo":
      add(p, "photos", ev.src);
      p.counters = { ...p.counters, photoTotal: ev.total };
      break;
    case "command":
      add(p, "commands", ev.cmd);
      break;
    case "source":
      add(p, "sources", ev.source);
      break;
    case "setting":
      add(p, "settings", ev.key);
      break;
    case "key":
      add(p, "keys", ev.id);
      break;
    case "flag":
      p.flags = { ...p.flags, [ev.flag]: true };
      break;
    case "tutorial":
      add(p, "tutorials", ev.game);
      break;
    case "cleared":
      add(p, "cleared", ev.game);
      break;
    case "mastered":
      add(p, "mastered", ev.game);
      break;
    case "best":
      if (!(ev.game in p.best) || (ev.lower ? ev.score < p.best[ev.game] : ev.score > p.best[ev.game])) p.best = { ...p.best, [ev.game]: ev.score };
      break;
  }
  commit(p);
}

/** Record today's date (for the "returning user" secret). */
export function markDay() {
  const day = new Date().toISOString().slice(0, 10);
  const p = load();
  if (p.days.includes(day)) return;
  commit({ ...structuredClone(p), days: [...p.days, day] });
}

function commit(p: Progress) {
  const before = standing(p);
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!p.unlocked[a.id] && a.test(p)) {
      p.unlocked = { ...p.unlocked, [a.id]: Date.now() };
      fresh.push(a);
    }
  }
  save(p);
  if (!fresh.length) return;
  announce(fresh, before, standing(p));
}

function announce(fresh: Achievement[], before: Standing, after: Standing) {
  if (!readSettings().toasts) return;
  const nextLabel = after.next ? `${after.points}/${after.next.points} → ${RANK_LABEL[after.next.rank]}` : `${after.points} pts · maxed`;
  fresh.forEach((a, i) => {
    setTimeout(() => {
      pushToast({ kind: "achievement", tier: a.tier, title: a.title, body: a.desc, points: TIER_POINTS[a.tier], progress: after.toNext, next: nextLabel });
      sfx(a.tier);
    }, i * 650);
  });
  if (after.rank && after.rank !== before.rank) {
    setTimeout(
      () => {
        pushToast({
          kind: "rank",
          tier: after.rank!,
          title: `You are now ${RANK_LABEL[after.rank!]}`,
          body: after.rank === "allrounder" ? "Every corner of the runtime explored. Respect." : "Keep exploring: every page, game and keybind counts.",
          progress: after.toNext,
          next: nextLabel,
        });
        sfx(after.rank === "master" || after.rank === "allrounder" ? "master" : "rankup");
      },
      fresh.length * 650 + 300,
    );
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  save(empty());
}

// ── React ──────────────────────────────────────────────────────────────────
function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}
const SERVER = empty();

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, load, () => SERVER);
}

export const isFirstVisit = () => !Object.keys(load().unlocked).length && !(load().sets.pages ?? []).length;
