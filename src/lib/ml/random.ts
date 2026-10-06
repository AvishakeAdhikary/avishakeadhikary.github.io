/** Seeded randomness so every level is reproducible. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a: number, b: number) => a + (b - a) * next(),
    int: (n: number) => Math.floor(next() * n),
    /** Standard normal (Box–Muller). */
    gauss: () => {
      const u = Math.max(1e-12, next());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    },
    pick: <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)],
    shuffle: <T>(xs: T[]) => {
      for (let i = xs.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [xs[i], xs[j]] = [xs[j], xs[i]];
      }
      return xs;
    },
  };
}
export type Rng = ReturnType<typeof rng>;

export interface Pt {
  x: number;
  y: number;
}

/** Gaussian blobs (optionally stretched/rotated) in the unit square. */
export function blobs(r: Rng, specs: { cx: number; cy: number; sx: number; sy: number; n: number; rot?: number; label?: number }[]) {
  const pts: (Pt & { label: number })[] = [];
  specs.forEach((b, i) => {
    const c = Math.cos(b.rot ?? 0);
    const s = Math.sin(b.rot ?? 0);
    for (let k = 0; k < b.n; k++) {
      const u = r.gauss() * b.sx;
      const v = r.gauss() * b.sy;
      pts.push({ x: clamp01(b.cx + u * c - v * s), y: clamp01(b.cy + u * s + v * c), label: b.label ?? i });
    }
  });
  return pts;
}

export const clamp01 = (v: number) => Math.min(0.98, Math.max(0.02, v));
export const dist2 = (a: Pt, b: Pt) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
