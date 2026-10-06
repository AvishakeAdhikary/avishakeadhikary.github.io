"use client";

/**
 * The site's one AudioContext and its mixing desk. Created lazily on the
 * first sound (always inside a user gesture, so it starts running).
 *
 *   music engine ─► musicBus (duck stage) ─┐
 *   sound effects ─► sfxBus (sfx volume) ──┼─► master ─► limiter ─► speakers
 *
 * Sound effects never interrupt the music: when one fires, the music bus
 * dips ~5 dB for a moment (sidechain-style ducking) and swells back, and
 * the limiter keeps the sum from clipping. The CC0 playlist plays through
 * an <audio> element (no MediaElementSource, so a CDN without CORS can't
 * silence it) and is ducked by listeners registered with onDuck().
 */
interface Desk {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
}

let desk: Desk | null = null;

/** Web Audio exists (some embedded/test browsers ship without it). */
export const audioSupported = () =>
  typeof window !== "undefined" && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
let probe: AnalyserNode | null = null;
const duckers = new Set<(depth: number, release: number) => void>();

export function getMixer(): Desk {
  if (desk) return desk;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx({ latencyHint: "interactive" });
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  const master = ctx.createGain();
  const music = ctx.createGain();
  const sfx = ctx.createGain();
  music.connect(master);
  sfx.connect(master);
  master.connect(limiter).connect(ctx.destination);
  desk = { ctx, master, music, sfx };
  return desk;
}

/** Dip the music under a sound effect, then swell back over `release` seconds. */
export function duck(depth = 0.56, release = 0.35) {
  if (!desk) return;
  const g = desk.music.gain;
  const now = desk.ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(depth, now + 0.015);
  g.setTargetAtTime(1, now + 0.09, release / 3);
  duckers.forEach((d) => d(depth, release));
}

export function onDuck(fn: (depth: number, release: number) => void) {
  duckers.add(fn);
  return () => {
    duckers.delete(fn);
  };
}

export async function resumeMixer() {
  if (desk?.ctx.state === "suspended") await desk.ctx.resume().catch(() => undefined);
}

export async function suspendMixer() {
  if (desk?.ctx.state === "running") await desk.ctx.suspend().catch(() => undefined);
}

/** Analyser on the final mix (created on demand; used by checks and visualizers). */
export function masterProbe(): AnalyserNode {
  const { ctx, master } = getMixer();
  if (!probe) {
    probe = ctx.createAnalyser();
    probe.fftSize = 256;
    master.connect(probe);
  }
  return probe;
}
