/**
 * 2-D loss surfaces with exact gradients, and the three optimizers the
 * golf game teaches (SGD, momentum, Adam), written out in full.
 */
export interface Surface {
  id: string;
  name: string;
  blurb: string;
  /** Visible domain [xmin, xmax, ymin, ymax]. */
  domain: [number, number, number, number];
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  /** The global minimum (the hole). */
  hole: [number, number];
  tee: [number, number];
}

const gaussWell = (x: number, y: number, cx: number, cy: number, depth: number, w: number) => {
  const e = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * w * w));
  return { v: -depth * e, gx: (depth * e * (x - cx)) / (w * w), gy: (depth * e * (y - cy)) / (w * w) };
};

export const SURFACES: Surface[] = [
  {
    id: "bowl",
    name: "The Bowl",
    blurb: "A perfectly round valley. Any sensible step size gets you down.",
    domain: [-3, 3, -3, 3],
    f: (x, y) => 0.5 * (x * x + y * y),
    grad: (x, y) => [x, y],
    hole: [0, 0],
    tee: [-2.4, 2.1],
  },
  {
    id: "ravine",
    name: "The Ravine",
    blurb: "Steep walls, a gentle floor. Plain SGD zig-zags; momentum glides.",
    domain: [-3, 3, -3, 3],
    f: (x, y) => 0.5 * (0.6 * x * x + 14 * y * y),
    grad: (x, y) => [0.6 * x, 14 * y],
    hole: [0, 0],
    tee: [-2.7, 1.3],
  },
  {
    id: "banana",
    name: "The Banana",
    blurb: "Rosenbrock's curved valley: easy to find, slow to follow. Adam adapts.",
    domain: [-2, 2, -1, 3],
    f: (x, y) => (1 - x) ** 2 + 10 * (y - x * x) ** 2,
    grad: (x, y) => [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)],
    hole: [1, 1],
    tee: [-1.5, 2.4],
  },
  {
    id: "twin",
    name: "Twin Peaks",
    blurb: "Two valleys, one deeper. Start in the wrong basin and you'll settle for less.",
    domain: [-3, 3, -3, 3],
    f: (x, y) => 0.08 * (x * x + y * y) + gaussWell(x, y, 1.3, -1, 2.2, 0.8).v + gaussWell(x, y, -1.4, 1.1, 1.3, 0.75).v,
    grad: (x, y) => {
      const a = gaussWell(x, y, 1.3, -1, 2.2, 0.8);
      const b = gaussWell(x, y, -1.4, 1.1, 1.3, 0.75);
      return [0.16 * x + a.gx + b.gx, 0.16 * y + a.gy + b.gy];
    },
    hole: [1.3, -1],
    tee: [-2.3, 2.4],
  },
];

export type OptimizerId = "sgd" | "momentum" | "adam";

export interface OptState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mx: number;
  my: number;
  t: number;
}

export const initOpt = (x: number, y: number): OptState => ({ x, y, vx: 0, vy: 0, mx: 0, my: 0, t: 0 });

/** One optimizer step. Mutates and returns the state. */
export function step(s: OptState, g: [number, number], lr: number, opt: OptimizerId): OptState {
  s.t++;
  if (opt === "sgd") {
    s.x -= lr * g[0];
    s.y -= lr * g[1];
  } else if (opt === "momentum") {
    // v ← βv + g ; θ ← θ − η v
    s.vx = 0.9 * s.vx + g[0];
    s.vy = 0.9 * s.vy + g[1];
    s.x -= lr * s.vx;
    s.y -= lr * s.vy;
  } else {
    // Adam: m ← β1 m + (1−β1) g ; v ← β2 v + (1−β2) g² ; bias-corrected
    const b1 = 0.9;
    const b2 = 0.999;
    s.mx = b1 * s.mx + (1 - b1) * g[0];
    s.my = b1 * s.my + (1 - b1) * g[1];
    s.vx = b2 * s.vx + (1 - b2) * g[0] * g[0];
    s.vy = b2 * s.vy + (1 - b2) * g[1] * g[1];
    const c1 = 1 - b1 ** s.t;
    const c2 = 1 - b2 ** s.t;
    s.x -= (lr * (s.mx / c1)) / (Math.sqrt(s.vx / c2) + 1e-8);
    s.y -= (lr * (s.my / c1)) / (Math.sqrt(s.vy / c2) + 1e-8);
  }
  return s;
}

export type Outcome = "sunk" | "local" | "diverged" | "timeout";

export interface Shot {
  path: [number, number][];
  outcome: Outcome;
  steps: number;
}

export const MAX_STEPS = 400;
const HOLE_RADIUS = 0.12;

/** Simulate a full shot (used for par and for results; the game animates the same path). */
export function simulate(s: Surface, start: [number, number], lr: number, opt: OptimizerId): Shot {
  const st = initOpt(start[0], start[1]);
  const path: [number, number][] = [[st.x, st.y]];
  const [x0, x1, y0, y1] = s.domain;
  const span = Math.max(x1 - x0, y1 - y0);
  for (let i = 0; i < MAX_STEPS; i++) {
    const g = s.grad(st.x, st.y);
    step(st, g, lr, opt);
    path.push([st.x, st.y]);
    if (!Number.isFinite(st.x) || !Number.isFinite(st.y) || Math.abs(st.x - (x0 + x1) / 2) > span * 1.5 || Math.abs(st.y - (y0 + y1) / 2) > span * 1.5)
      return { path, outcome: "diverged", steps: i + 1 };
    const moved = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    const gn = Math.hypot(g[0], g[1]);
    if (Math.hypot(st.x - s.hole[0], st.y - s.hole[1]) < HOLE_RADIUS && moved < 0.02) return { path, outcome: "sunk", steps: i + 1 };
    if (gn < 1e-3 && moved < 1e-4) return { path, outcome: "local", steps: i + 1 };
  }
  const near = Math.hypot(st.x - s.hole[0], st.y - s.hole[1]) < HOLE_RADIUS;
  return { path, outcome: near ? "sunk" : "timeout", steps: MAX_STEPS };
}

export const LR_GRID = Array.from({ length: 41 }, (_, i) => 10 ** (-3 + (i * 3.3) / 40));

/** Par: the best achievable step count from the tee with the allowed optimizers, plus some slack. */
export function par(s: Surface, opts: OptimizerId[]): number {
  let best = Infinity;
  for (const opt of opts) for (const lr of LR_GRID) {
    const r = simulate(s, s.tee, lr, opt);
    if (r.outcome === "sunk") best = Math.min(best, r.steps);
  }
  return Number.isFinite(best) ? Math.ceil(best * 1.6) + 2 : MAX_STEPS;
}
