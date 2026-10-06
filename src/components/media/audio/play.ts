"use client";

import { readSettings } from "@/lib/settings";
import type { SfxName } from "./sfx";

/**
 * Tiny, always-loaded entry point for sound effects. The synth (sfx.ts)
 * and the AudioContext are only created on the first sound, which always
 * happens inside a user gesture.
 */
let mod: Promise<typeof import("./sfx")> | null = null;

export const preloadSfx = () => (mod ??= import("./sfx"));

export function sfx(name: SfxName) {
  if (typeof window === "undefined" || !readSettings().sfx) return;
  void preloadSfx().then((m) => m.play(name));
}

export type { SfxName };
