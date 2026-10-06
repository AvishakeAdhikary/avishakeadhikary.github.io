/**
 * Synthesized instruments for the composed soundtrack. Every voice is
 * built from Web Audio nodes scheduled at an exact AudioContext time and
 * cleans itself up after it finishes (no long-lived nodes per note).
 */
import { biquad } from "../audio/mixer";


export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

export interface Kit {
  ctx: AudioContext;
  /** Dry instrument bus. */
  out: AudioNode;
  /** Reverb send. */
  verb: AudioNode;
  /** Tempo-synced delay send. */
  echo: AudioNode;
  noise: AudioBuffer;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number, sustain = 0, release = 0.05, hold = 0) {
  const p = g.gain;
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + attack);
  if (sustain > 0) {
    p.setTargetAtTime(peak * sustain, t + attack, decay / 3);
    p.setValueAtTime(peak * sustain, t + attack + hold);
    p.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  } else {
    p.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
}

function sends(k: Kit, node: AudioNode, verb: number, echo = 0) {
  node.connect(k.out);
  if (verb) {
    const v = k.ctx.createGain();
    v.gain.value = verb;
    node.connect(v).connect(k.verb);
  }
  if (echo) {
    const e = k.ctx.createGain();
    e.gain.value = echo;
    node.connect(e).connect(k.echo);
  }
}

function noiseSource(k: Kit, t: number, dur: number) {
  const src = k.ctx.createBufferSource();
  src.buffer = k.noise;
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur);
  return src;
}

/* ── Drums ─────────────────────────────────────────────────────────────── */

export function kick(k: Kit, t: number, vel = 1, punch = 1) {
  const o = k.ctx.createOscillator();
  const g = k.ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(140 * punch, t);
  o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
  env(g, t, 0.95 * vel, 0.002, 0.42);
  o.connect(g);
  sends(k, g, 0.03);
  o.start(t);
  o.stop(t + 0.5);
}

export function snare(k: Kit, t: number, vel = 1, tone = 1800, verb = 0.18) {
  const n = noiseSource(k, t, 0.25);
  const bp = biquad(k.ctx);
  bp.type = "bandpass";
  bp.frequency.value = tone;
  bp.Q.value = 0.8;
  const g = k.ctx.createGain();
  env(g, t, 0.42 * vel, 0.001, 0.19);
  n.connect(bp).connect(g);
  sends(k, g, verb);

  const body = k.ctx.createOscillator();
  const bg = k.ctx.createGain();
  body.type = "triangle";
  body.frequency.setValueAtTime(190, t);
  body.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  env(bg, t, 0.3 * vel, 0.001, 0.1);
  body.connect(bg);
  sends(k, bg, verb * 0.5);
  body.start(t);
  body.stop(t + 0.15);
}

export function clap(k: Kit, t: number, vel = 1) {
  for (let i = 0; i < 3; i++) {
    const s = t + i * 0.011;
    const n = noiseSource(k, s, i === 2 ? 0.22 : 0.03);
    const bp = biquad(k.ctx);
    bp.type = "bandpass";
    bp.frequency.value = 1300;
    bp.Q.value = 1.2;
    const g = k.ctx.createGain();
    env(g, s, 0.38 * vel, 0.001, i === 2 ? 0.2 : 0.025);
    n.connect(bp).connect(g);
    sends(k, g, 0.3);
  }
}

export function hat(k: Kit, t: number, vel = 1, open = false) {
  const n = noiseSource(k, t, open ? 0.35 : 0.08);
  const hp = biquad(k.ctx);
  hp.type = "highpass";
  hp.frequency.value = 7200;
  const g = k.ctx.createGain();
  env(g, t, 0.13 * vel, 0.001, open ? 0.28 : 0.045);
  n.connect(hp).connect(g);
  sends(k, g, 0.06);
}

export function shaker(k: Kit, t: number, vel = 1) {
  const n = noiseSource(k, t, 0.12);
  const bp = biquad(k.ctx);
  bp.type = "bandpass";
  bp.frequency.value = 5200;
  bp.Q.value = 2;
  const g = k.ctx.createGain();
  env(g, t, 0.08 * vel, 0.02, 0.07);
  n.connect(bp).connect(g);
  sends(k, g, 0.25);
}

/* ── Tonal voices ──────────────────────────────────────────────────────── */

export function bass(k: Kit, t: number, midi: number, dur: number, vel = 1, kind: "sub" | "saw" | "round" = "sub") {
  const o = k.ctx.createOscillator();
  o.type = kind === "saw" ? "sawtooth" : kind === "round" ? "triangle" : "sine";
  o.frequency.value = midiToHz(midi);
  const lp = biquad(k.ctx);
  lp.type = "lowpass";
  lp.Q.value = kind === "saw" ? 6 : 0.7;
  lp.frequency.setValueAtTime(kind === "saw" ? 1600 : 900, t);
  lp.frequency.exponentialRampToValueAtTime(kind === "saw" ? 320 : 400, t + Math.min(dur, 0.35));
  const g = k.ctx.createGain();
  env(g, t, (kind === "saw" ? 0.26 : 0.5) * vel, 0.006, 0.2, 0.75, 0.08, Math.max(0.02, dur - 0.08));
  o.connect(lp).connect(g);
  sends(k, g, 0.02);
  o.start(t);
  o.stop(t + dur + 0.2);
}

/** Electric piano: a two-operator FM pair with a decaying modulation index. */
export function keys(k: Kit, t: number, midi: number, dur: number, vel = 1, verb = 0.35) {
  const f = midiToHz(midi);
  const car = k.ctx.createOscillator();
  const mod = k.ctx.createOscillator();
  const idx = k.ctx.createGain();
  car.type = "sine";
  mod.type = "sine";
  car.frequency.value = f;
  mod.frequency.value = f * 2;
  idx.gain.setValueAtTime(f * 1.6 * vel, t);
  idx.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.6);
  mod.connect(idx).connect(car.frequency);
  const g = k.ctx.createGain();
  env(g, t, 0.11 * vel, 0.004, 0.9, 0.35, 0.35, Math.max(0.05, dur - 0.2));
  const trem = k.ctx.createOscillator();
  const tg = k.ctx.createGain();
  trem.frequency.value = 4.6;
  tg.gain.value = 0.025;
  trem.connect(tg).connect(g.gain);
  car.connect(g);
  sends(k, g, verb, 0.08);
  const end = t + dur + 0.6;
  [car, mod, trem].forEach((o) => {
    o.start(t);
    o.stop(end);
  });
}

export function pad(k: Kit, t: number, midis: number[], dur: number, vel = 1, bright = 900, verb = 0.6) {
  const lp = biquad(k.ctx);
  lp.type = "lowpass";
  lp.Q.value = 0.5;
  lp.frequency.setValueAtTime(bright * 0.5, t);
  lp.frequency.linearRampToValueAtTime(bright, t + dur * 0.5);
  lp.frequency.linearRampToValueAtTime(bright * 0.6, t + dur);
  const g = k.ctx.createGain();
  const attack = Math.min(0.8, dur * 0.3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05 * vel, t + attack);
  g.gain.setValueAtTime(0.05 * vel, t + dur - 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
  lp.connect(g);
  sends(k, g, verb, 0.05);
  for (const m of midis) {
    for (const det of [-9, 8]) {
      const o = k.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = midiToHz(m);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 1.3);
    }
  }
}

export function pluck(k: Kit, t: number, midi: number, vel = 1, glass = false, verb = 0.4, echo = 0.25) {
  const o = k.ctx.createOscillator();
  o.type = glass ? "sine" : "square";
  o.frequency.value = midiToHz(midi);
  const g = k.ctx.createGain();
  const lp = biquad(k.ctx);
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(glass ? 6000 : 3800, t);
  lp.frequency.exponentialRampToValueAtTime(glass ? 1800 : 500, t + 0.25);
  env(g, t, (glass ? 0.09 : 0.055) * vel, 0.002, glass ? 1.1 : 0.28);
  o.connect(lp).connect(g);
  if (glass) {
    const o2 = k.ctx.createOscillator();
    const g2 = k.ctx.createGain();
    o2.type = "sine";
    o2.frequency.value = midiToHz(midi + 19);
    env(g2, t, 0.025 * vel, 0.002, 0.5);
    o2.connect(g2).connect(g);
    o2.start(t);
    o2.stop(t + 0.6);
  }
  sends(k, g, verb, echo);
  o.start(t);
  o.stop(t + (glass ? 1.3 : 0.4));
}

export function lead(k: Kit, t: number, midi: number, dur: number, vel = 1) {
  const o = k.ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = midiToHz(midi);
  const vib = k.ctx.createOscillator();
  const vg = k.ctx.createGain();
  vib.frequency.value = 5.4;
  vg.gain.setValueAtTime(0, t);
  vg.gain.linearRampToValueAtTime(6, t + 0.25);
  vib.connect(vg).connect(o.detune);
  const lp = biquad(k.ctx);
  lp.type = "lowpass";
  lp.frequency.value = 2600;
  lp.Q.value = 2;
  const g = k.ctx.createGain();
  env(g, t, 0.06 * vel, 0.02, 0.3, 0.7, 0.25, Math.max(0.05, dur - 0.1));
  o.connect(lp).connect(g);
  sends(k, g, 0.35, 0.3);
  const end = t + dur + 0.4;
  [o, vib].forEach((x) => {
    x.start(t);
    x.stop(end);
  });
}

/** Sparse vinyl crackle: a looping buffer of random clicks. */
export function crackleBuffer(ctx: AudioContext) {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * 0.012;
    if (Math.random() < 0.00025) d[i] = (Math.random() * 2 - 1) * 0.6;
  }
  return buf;
}
