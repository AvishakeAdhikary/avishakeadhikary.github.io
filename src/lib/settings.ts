import { useSyncExternalStore } from "react";
import { SETTINGS_KEY as KEY } from "./settings-script";

/**
 * Visitor preferences (per browser, localStorage). Visual ones are applied
 * to <html> as data attributes before first paint by SETTINGS_SCRIPT, so a
 * reload never flashes the wrong state.
 */
export type MusicSource = "lofi" | "synthwave" | "ambient" | "playlist";
export type Quality = "auto" | "low" | "high";
export type Motion = "full" | "system" | "reduced";

export interface Settings {
  musicSource: MusicSource;
  /** Music plays (from the first click/key of a visit) until the visitor turns it off. */
  musicOn: boolean;
  volume: number; // music volume 0..100
  sfx: boolean;
  sfxVolume: number; // 0..100
  pauseHidden: boolean;
  /** full = always animate (default), system = follow the OS preference, reduced = calm. */
  motion: Motion;
  crt: boolean;
  boot: boolean;
  crash: boolean;
  field: boolean;
  hud: boolean;
  dock: boolean;
  theme: "red" | "phosphor";
  cursor: boolean;
  quality: Quality;
}

export const DEFAULTS: Settings = {
  musicSource: "lofi",
  musicOn: true,
  volume: 60,
  sfx: true,
  sfxVolume: 45,
  pauseHidden: true,
  motion: "full",
  crt: true,
  boot: true,
  crash: true,
  field: true,
  hud: true,
  dock: true,
  theme: "red",
  cursor: true,
  quality: "auto",
};

const EVENT = "settings:change";
const REDUCE = "(prefers-reduced-motion: reduce)";

let cache: Settings | null = null;

export function readSettings(): Settings {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULTS;
  try {
    cache = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>) };
  } catch {
    cache = { ...DEFAULTS };
  }
  // Legacy "auto" was labelled "Full" in the panel.
  if ((cache.motion as string) === "auto") cache.motion = "full";
  return cache;
}

/** Mirrors visual settings onto <html> (same logic as SETTINGS_SCRIPT). */
export function applyToDocument(s: Settings) {
  const html = document.documentElement;
  html.dataset.crt = s.crt ? "on" : "off";
  html.dataset.cursor = s.cursor ? "on" : "off";
  html.dataset.motion = isReduced(s) ? "reduced" : "full";
  if (s.theme === "phosphor") html.dataset.theme = "phosphor";
  else delete html.dataset.theme;
}

export function updateSettings(patch: Partial<Settings>) {
  const next = { ...readSettings(), ...patch };
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: settings last for this page view */
  }
  applyToDocument(next);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
}

export function resetSettings() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem("ambient-mode");
    localStorage.removeItem("hud-hidden");
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  cache = { ...DEFAULTS };
  applyToDocument(cache);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: cache }));
}

export function subscribeSettings(fn: () => void) {
  window.addEventListener(EVENT, fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      applyToDocument(readSettings());
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  // "System" motion follows live OS changes.
  const mq = window.matchMedia(REDUCE);
  const onSystem = () => {
    applyToDocument(readSettings());
    fn();
  };
  mq.addEventListener("change", onSystem);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", onStorage);
    mq.removeEventListener("change", onSystem);
  };
}

/** React hook; returns DEFAULTS during SSR / hydration, then the stored values. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, readSettings, () => DEFAULTS);
}

/** True when the OS asks for reduced motion (ignores the visitor's choice). */
export function systemReducesMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCE).matches;
}

function isReduced(s: Settings): boolean {
  return s.motion === "reduced" || (s.motion === "system" && systemReducesMotion());
}

/**
 * True when motion should be calm: the visitor chose Reduced, or chose
 * System and the OS asks for it. Full (the default) always animates.
 */
export function motionReduced(): boolean {
  if (typeof window === "undefined") return false;
  return isReduced(readSettings());
}
