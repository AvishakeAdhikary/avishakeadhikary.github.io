/**
 * The perceptron (Rosenblatt, 1958): predict sign(w·x + b); on a mistake,
 * w ← w + η·y·x and b ← b + η·y. Coordinates live in [-1, 1]².
 */
export interface Sample {
  x: number;
  y: number;
  label: 1 | -1;
}

export interface Line {
  w: [number, number];
  b: number;
}

export const score = (l: Line, p: { x: number; y: number }) => l.w[0] * p.x + l.w[1] * p.y + l.b;
export const predict = (l: Line, p: { x: number; y: number }): 1 | -1 => (score(l, p) >= 0 ? 1 : -1);
export const accuracy = (l: Line, s: Sample[]) => s.filter((p) => predict(l, p) === p.label).length / s.length;

/** Smallest distance from any point to the boundary (only meaningful when every point is right). */
export const margin = (l: Line, s: Sample[]) => {
  const n = Math.hypot(l.w[0], l.w[1]) || 1;
  return Math.min(...s.map((p) => (p.label * score(l, p)) / n));
};

/** The boundary through two points, oriented whichever way classifies more points correctly. */
export function lineThrough(a: { x: number; y: number }, b: { x: number; y: number }, s: Sample[]): Line {
  const w: [number, number] = [b.y - a.y, -(b.x - a.x)];
  const l: Line = { w, b: -(w[0] * a.x + w[1] * a.y) };
  const flip: Line = { w: [-w[0], -w[1]], b: -l.b };
  return accuracy(l, s) >= accuracy(flip, s) ? l : flip;
}

export interface Update {
  i: number;
  line: Line;
  epoch: number;
}

/** Every update the perceptron makes (one entry per mistake), until an error-free epoch or maxEpochs. */
export function train(s: Sample[], lr = 0.5, maxEpochs = 40): { updates: Update[]; epochs: number; converged: boolean } {
  let line: Line = { w: [0, 0], b: 0 };
  const updates: Update[] = [];
  for (let e = 1; e <= maxEpochs; e++) {
    let mistakes = 0;
    s.forEach((p, i) => {
      if (predict(line, p) !== p.label || score(line, p) === 0) {
        mistakes++;
        line = { w: [line.w[0] + lr * p.label * p.x, line.w[1] + lr * p.label * p.y], b: line.b + lr * p.label };
        updates.push({ i, line, epoch: e });
      }
    });
    if (!mistakes) return { updates, epochs: e, converged: true };
  }
  return { updates, epochs: maxEpochs, converged: false };
}

/** Endpoints of the boundary clipped to the [-1, 1]² box (for drawing). */
export function clip(l: Line): [{ x: number; y: number }, { x: number; y: number }] | null {
  const [a, b] = l.w;
  const pts: { x: number; y: number }[] = [];
  if (Math.abs(b) > 1e-9)
    for (const x of [-1, 1]) {
      const y = -(a * x + l.b) / b;
      if (y >= -1 && y <= 1) pts.push({ x, y });
    }
  if (Math.abs(a) > 1e-9)
    for (const y of [-1, 1]) {
      const x = -(b * y + l.b) / a;
      if (x >= -1 && x <= 1) pts.push({ x, y });
    }
  return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null;
}
