import { useSyncExternalStore } from "react";
import { SETTINGS_KEY as KEY } from "./settings-script";

/**
 * Visitor preferences (per browser, localStorage). Visual ones are applied
 * to <html> as data attributes before first paint by SETTINGS_SCRIPT, so a
 * reload never flashes the wrong state.
 */
export type MusicSource = "lofi" | "synthwave" | "ambient" | "playlist";
export type Quality = "auto" | "low" | "high";

export interface Settings {
  musicSource: MusicSource;
  volume: number; // 0..100
  pauseHidden: boolean;
  motion: "auto" | "reduced";
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
  volume: 60,
  pauseHidden: true,
  motion: "auto",
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

let cache: Settings | null = null;

export function readSettings(): Settings {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULTS;
  try {
    cache = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

/** Mirrors visual settings onto <html> (same logic as SETTINGS_SCRIPT). */
export function applyToDocument(s: Settings) {
  const html = document.documentElement;
  html.dataset.crt = s.crt ? "on" : "off";
  html.dataset.cursor = s.cursor ? "on" : "off";
  html.dataset.motion = s.motion;
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
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** React hook; returns DEFAULTS during SSR / hydration, then the stored values. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, readSettings, () => DEFAULTS);
}

/** True when the OS asks for reduced motion OR the visitor chose it in settings. */
export function motionReduced(): boolean {
  if (typeof window === "undefined") return false;
  return readSettings().motion === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
