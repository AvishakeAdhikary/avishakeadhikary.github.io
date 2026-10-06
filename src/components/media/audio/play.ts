"use client";

import { readSettings } from "@/lib/settings";
import { audioSupported } from "./mixer";
import type { SfxName } from "./sfx";

/**
 * Tiny, always-loaded entry point for sound effects. The synth (sfx.ts)
 * and the AudioContext are only created on the first sound, and sounds
 * only play once the visitor has interacted with the page (browsers block
 * audio before that; an achievement unlocked by simply loading a page
 * stays silent rather than creating a blocked context).
 */
let mod: Promise<typeof import("./sfx")> | null = null;
let interacted = false;

if (typeof window !== "undefined") {
  const mark = () => {
    interacted = true;
    window.removeEventListener("pointerdown", mark, true);
    window.removeEventListener("keydown", mark, true);
  };
  window.addEventListener("pointerdown", mark, true);
  window.addEventListener("keydown", mark, true);
}

const activated = () => interacted || !!(navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;

export const preloadSfx = () => (mod ??= import("./sfx"));

export function sfx(name: SfxName) {
  if (typeof window === "undefined" || !readSettings().sfx || !activated() || !audioSupported()) return;
  void preloadSfx()
    .then((m) => m.play(name))
    .catch(() => undefined);
}

export type { SfxName };
