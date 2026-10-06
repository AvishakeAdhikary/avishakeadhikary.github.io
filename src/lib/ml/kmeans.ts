import { dist2, type Pt, type Rng } from "./random";

/** Lloyd's algorithm, step by step, plus the two classic initialisations. */
export const assign = (pts: Pt[], cents: Pt[]) =>
  pts.map((p) => {
    let best = 0;
    let bd = Infinity;
    cents.forEach((c, i) => {
      const d = dist2(p, c);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  });

export const inertia = (pts: Pt[], cents: Pt[], labels = assign(pts, cents)) => pts.reduce((s, p, i) => s + dist2(p, cents[labels[i]]), 0);

/** Move each centroid to the mean of its points (an empty cluster stays put). */
export function update(pts: Pt[], labels: number[], prev: Pt[]): Pt[] {
  const sum = prev.map(() => ({ x: 0, y: 0, n: 0 }));
  pts.forEach((p, i) => {
    const s = sum[labels[i]];
    s.x += p.x;
    s.y += p.y;
    s.n++;
  });
  return sum.map((s, i) => (s.n ? { x: s.x / s.n, y: s.y / s.n } : prev[i]));
}

/** Every intermediate set of centroids until convergence (for animation). */
export function lloyd(pts: Pt[], init: Pt[], maxIter = 40): Pt[][] {
  const history = [init];
  let cents = init;
  for (let it = 0; it < maxIter; it++) {
    const next = update(pts, assign(pts, cents), cents);
    const moved = next.reduce((m, c, i) => Math.max(m, dist2(c, cents[i])), 0);
    history.push(next);
    cents = next;
    if (moved < 1e-10) break;
  }
  return history;
}

/** Forgy: k random data points as seeds. */
export const forgy = (r: Rng, pts: Pt[], k: number) =>
  r
    .shuffle([...pts])
    .slice(0, k)
    .map((p) => ({ x: p.x, y: p.y }));

/** k-means++: each new seed is drawn with probability ∝ squared distance to the nearest seed so far. */
export function kmeansPP(r: Rng, pts: Pt[], k: number): Pt[] {
  const seeds: Pt[] = [pts[r.int(pts.length)]];
  while (seeds.length < k) {
    const d = pts.map((p) => Math.min(...seeds.map((s) => dist2(p, s))));
    const total = d.reduce((a, b) => a + b, 0);
    let t = r.next() * total;
    let i = 0;
    while (t > d[i] && i < d.length - 1) t -= d[i++];
    seeds.push(pts[i]);
  }
  return seeds.map((p) => ({ x: p.x, y: p.y }));
}
