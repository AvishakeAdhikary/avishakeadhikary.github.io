/** k-nearest neighbours: neighbours, (weighted) votes, deterministic tie-breaks. */
export interface LPt {
  x: number;
  y: number;
  label: string;
}

export function neighbours(pts: LPt[], q: { x: number; y: number }, k: number, exclude = -1) {
  return pts
    .map((p, i) => ({ i, d: Math.hypot(p.x - q.x, p.y - q.y) }))
    .filter((n) => n.i !== exclude)
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
}

export interface Vote {
  winner: string;
  tally: [string, number][];
  tie: boolean;
}

/**
 * Majority (or 1/d-weighted) vote. Ties go to the tied label whose nearest
 * member is closest, so the answer is always deterministic.
 */
export function vote(pts: LPt[], nb: { i: number; d: number }[], weighted: boolean): Vote {
  const t = new Map<string, number>();
  for (const n of nb) t.set(pts[n.i].label, (t.get(pts[n.i].label) ?? 0) + (weighted ? 1 / Math.max(n.d, 1e-6) : 1));
  const tally = [...t.entries()].sort((a, b) => b[1] - a[1]);
  const top = tally.filter(([, v]) => Math.abs(v - tally[0][1]) < 1e-9).map(([l]) => l);
  const winner = top.length === 1 ? top[0] : pts[nb.find((n) => top.includes(pts[n.i].label))!.i].label;
  return { winner, tally, tie: top.length > 1 };
}

export const classify = (pts: LPt[], q: { x: number; y: number }, k: number, weighted: boolean, exclude = -1) => vote(pts, neighbours(pts, q, k, exclude), weighted);
