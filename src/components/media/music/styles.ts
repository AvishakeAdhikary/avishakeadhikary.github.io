import { bass, clap, hat, keys, kick, lead, pad, pluck, shaker, snare, type Kit } from "./instruments";

export type StyleId = "lofi" | "synthwave" | "ambient";

interface Chord {
  /** Bass-register root (MIDI). */
  root: number;
  /** Intervals above the root. */
  iv: number[];
}

interface Section {
  name: string;
  bars: number;
  drums?: boolean;
  hatsOnly?: boolean;
  bass?: boolean;
  harmony?: boolean;
  melody?: boolean;
  arp?: boolean;
}

export interface StepContext {
  k: Kit;
  t: number;
  /** 16th-note index within the bar (0..15). */
  s: number;
  /** Bar index within the current section. */
  bar: number;
  section: Section;
  chord: Chord;
  nextChord: Chord;
  stepDur: number;
  rng: () => number;
  melody: (bar: number) => MelodyNote[];
}

export interface MelodyNote {
  step: number;
  midi: number;
  len: number;
}

export interface Style {
  id: StyleId;
  name: string;
  bpm: number;
  /** Delay applied to odd 16ths, as a fraction of a 16th. */
  swing: number;
  barsPerChord: number;
  progression: Chord[];
  scale: number[];
  melodyRange: [number, number];
  /** 16th-step rhythm templates for melodic phrases. */
  rhythms: number[][];
  form: Section[];
  tone: number;
  crackle: boolean;
  echoBeats: number;
  play: (c: StepContext) => void;
}

/** Spread chord tones into a comfortable keyboard register (close voicing). */
export function voice(ch: Chord, lo = 55, hi = 74) {
  return ch.iv
    .map((i) => {
      let m = ch.root + 12 + i;
      while (m < lo) m += 12;
      while (m > hi) m -= 12;
      return m;
    })
    .sort((a, b) => a - b);
}

const vary = (rng: () => number, base: number, spread = 0.18) => base * (1 - spread / 2 + rng() * spread);

/* ── Lo-fi beats: 78 BPM, swung, Rhodes 9ths, dusty boom-bap ─────────── */
const lofi: Style = {
  id: "lofi",
  name: "Lo-fi beats",
  bpm: 78,
  swing: 0.28,
  barsPerChord: 1,
  // F major: ii9 – V9 – Imaj9 – vi9
  progression: [
    { root: 43, iv: [0, 3, 7, 10, 14] },
    { root: 48, iv: [0, 4, 7, 10, 14] },
    { root: 41, iv: [0, 4, 7, 11, 14] },
    { root: 38, iv: [0, 3, 7, 10, 14] },
  ],
  scale: [5, 7, 9, 10, 0, 2, 4],
  melodyRange: [72, 86],
  rhythms: [
    [0, 3, 6, 10, 12],
    [2, 4, 7, 11],
    [0, 6, 8, 10, 14],
    [3, 6, 9, 12],
  ],
  form: [
    { name: "intro", bars: 4, harmony: true },
    { name: "A", bars: 8, drums: true, bass: true, harmony: true },
    { name: "B", bars: 8, drums: true, bass: true, harmony: true, melody: true },
    { name: "A", bars: 8, drums: true, bass: true, harmony: true },
    { name: "break", bars: 4, hatsOnly: true, harmony: true, melody: true },
    { name: "B", bars: 8, drums: true, bass: true, harmony: true, melody: true },
  ],
  tone: 3400,
  crackle: true,
  echoBeats: 0.75,
  play({ k, t, s, bar, section, chord, nextChord, stepDur, rng, melody }) {
    if (section.drums) {
      if (s === 0 || s === 10 || (s === 11 && rng() < 0.3)) kick(k, t, vary(rng, s === 0 ? 1 : 0.8));
      if (s === 4 || s === 12) snare(k, t, vary(rng, 0.85), 1600, 0.12);
    }
    if ((section.drums || section.hatsOnly) && s % 2 === 0) hat(k, t, vary(rng, s % 4 === 0 ? 0.8 : 0.55), s === 14 && rng() < 0.25);
    if (section.drums && s % 2 === 1 && rng() < 0.18) hat(k, t, 0.3);
    if (section.bass) {
      if (s === 0) bass(k, t, chord.root, stepDur * 5, 0.95, "round");
      if (s === 7) bass(k, t, chord.root, stepDur * 2, 0.6, "round");
      if (s === 10) bass(k, t, chord.root + 7, stepDur * 3, 0.75, "round");
      if (s === 14 && rng() < 0.6) bass(k, t, nextChord.root - 1, stepDur * 1.5, 0.55, "round");
    }
    if (section.harmony) {
      const v = voice(chord);
      if (s === 0) v.forEach((m, i) => keys(k, t + i * 0.012, m, stepDur * 9, vary(rng, 0.8)));
      if (s === 10 && rng() < 0.7) v.slice(1).forEach((m, i) => keys(k, t + i * 0.01, m, stepDur * 4, vary(rng, 0.55)));
    }
    if (section.melody) for (const n of melody(bar)) if (n.step === s) keys(k, t, n.midi, stepDur * n.len, vary(rng, 0.9), 0.45);
  },
};

/* ── Synthwave: 104 BPM, straight, minor i–VI–III–VII, arps + lead ───── */
const synthwave: Style = {
  id: "synthwave",
  name: "Synthwave",
  bpm: 104,
  swing: 0,
  barsPerChord: 1,
  // A minor: Am – F – C – G
  progression: [
    { root: 45, iv: [0, 3, 7, 14] },
    { root: 41, iv: [0, 4, 7, 11] },
    { root: 48, iv: [0, 4, 7, 14] },
    { root: 43, iv: [0, 4, 7, 9] },
  ],
  scale: [9, 11, 0, 2, 4, 5, 7],
  melodyRange: [69, 84],
  rhythms: [
    [0, 4, 6, 8, 12],
    [0, 3, 6, 10],
    [0, 8, 12, 14],
  ],
  form: [
    { name: "intro", bars: 4, harmony: true, arp: true },
    { name: "A", bars: 8, drums: true, bass: true, harmony: true, arp: true },
    { name: "B", bars: 8, drums: true, bass: true, harmony: true, melody: true },
    { name: "break", bars: 4, harmony: true, melody: true },
    { name: "B", bars: 8, drums: true, bass: true, harmony: true, melody: true, arp: true },
  ],
  tone: 6200,
  crackle: false,
  echoBeats: 0.75,
  play({ k, t, s, bar, section, chord, stepDur, rng, melody }) {
    if (section.drums) {
      if (s % 4 === 0) kick(k, t, s === 0 ? 1 : 0.9, 1.1);
      if (s === 4 || s === 12) {
        snare(k, t, 0.9, 2000, 0.45);
        clap(k, t, 0.5);
      }
      if (s % 2 === 0) hat(k, t, s % 4 === 2 ? 0.75 : 0.4, s % 4 === 2 && rng() < 0.15);
    }
    if (section.bass && s % 2 === 0) bass(k, t, chord.root - 12 + (s % 4 === 2 ? 12 : 0), stepDur * 1.6, 0.85, "saw");
    if (section.harmony && s === 0) pad(k, t, voice(chord, 57, 76), stepDur * 16, 0.9, 1800, 0.5);
    if (section.arp) {
      const v = voice(chord, 64, 84);
      const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
      pluck(k, t, v[pattern[s % 8] % v.length] + (s >= 8 ? 12 : 0), vary(rng, 0.8), false, 0.3, 0.3);
    }
    if (section.melody) for (const n of melody(bar)) if (n.step === s) lead(k, t, n.midi, stepDur * n.len, 0.9);
  },
};

/* ── Ambient electronica: 64 BPM, wide pads, glassy plucks, soft pulse ─ */
const ambient: Style = {
  id: "ambient",
  name: "Ambient",
  bpm: 64,
  swing: 0.1,
  barsPerChord: 2,
  // E major / lydian colour: Emaj9 – C#m9 – Amaj9#11 – B6sus2
  progression: [
    { root: 40, iv: [0, 4, 7, 11, 14] },
    { root: 37, iv: [0, 3, 7, 10, 14] },
    { root: 45, iv: [0, 4, 7, 11, 18] },
    { root: 47, iv: [0, 2, 7, 9] },
  ],
  scale: [4, 6, 8, 11, 1],
  melodyRange: [76, 91],
  rhythms: [
    [0, 6, 10],
    [2, 8, 12],
    [0, 4, 11],
  ],
  form: [
    { name: "intro", bars: 4, harmony: true },
    { name: "A", bars: 8, harmony: true, melody: true },
    { name: "B", bars: 8, harmony: true, melody: true, drums: true, bass: true },
    { name: "A", bars: 8, harmony: true, melody: true },
    { name: "outro", bars: 4, harmony: true, arp: true },
  ],
  tone: 4200,
  crackle: false,
  echoBeats: 1.5,
  play({ k, t, s, bar, section, chord, stepDur, rng, melody }) {
    if (section.harmony && s === 0 && bar % 2 === 0) pad(k, t, voice(chord, 52, 76), stepDur * 32, 1.1, 1200, 0.85);
    if (section.bass && s === 0 && bar % 2 === 0) bass(k, t, chord.root, stepDur * 30, 0.55, "sub");
    if (section.drums) {
      if (s === 0 || s === 8) kick(k, t, 0.42, 0.8);
      if (s === 4 || s === 12) shaker(k, t, vary(rng, 0.8));
      if (s % 2 === 1 && rng() < 0.25) shaker(k, t, 0.35);
    }
    if (section.melody) for (const n of melody(bar)) if (n.step === s) pluck(k, t, n.midi, vary(rng, 0.85), true, 0.75, 0.45);
    if (section.arp && s % 4 === 0 && rng() < 0.4) {
      const v = voice(chord, 72, 90);
      pluck(k, t, v[Math.floor(rng() * v.length)], 0.5, true, 0.8, 0.5);
    }
  },
};

export const STYLES: Record<StyleId, Style> = { lofi, synthwave, ambient };

/* ── Melody: motif-based, chord-aware, repeats with variation ─────────── */

const nearestInSet = (m: number, set: number[]) => {
  let best = m;
  let d = Infinity;
  for (let x = m - 6; x <= m + 6; x++) {
    if (set.includes(((x % 12) + 12) % 12) && Math.abs(x - m) < d) {
      d = Math.abs(x - m);
      best = x;
    }
  }
  return best;
};

/**
 * Builds a 2-bar phrase: a rhythm template, a contour that random-walks
 * through the scale, strong beats snapped to chord tones, phrase ending on
 * a chord tone. Phrases repeat (A A' structure) so it sounds composed.
 */
export function makePhrase(style: Style, rng: () => number, chords: [Chord, Chord]): MelodyNote[][] {
  const [lo, hi] = style.melodyRange;
  let pitch = Math.round((lo + hi) / 2);
  return chords.map((chord, barIdx) => {
    const rhythm = style.rhythms[Math.floor(rng() * style.rhythms.length)];
    const chordPcs = chord.iv.map((i) => (chord.root + i) % 12);
    return rhythm.map((step, i) => {
      const strong = step % 4 === 0;
      pitch += Math.round((rng() - 0.5) * 5);
      pitch = Math.max(lo, Math.min(hi, pitch));
      pitch = strong || (barIdx === 1 && i === rhythm.length - 1) ? nearestInSet(pitch, chordPcs) : nearestInSet(pitch, style.scale);
      const next = rhythm[i + 1] ?? 16;
      return { step, midi: pitch, len: Math.max(1, Math.min(next - step, 6)) };
    });
  });
}
