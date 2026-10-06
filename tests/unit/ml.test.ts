import { describe, expect, it } from "vitest";
import { CASES } from "@/lib/ml/debugger-cases";
import { LR_GRID, par, simulate, SURFACES } from "@/lib/ml/descent";
import { components, FACTS, INDUCTION, probOf, run, SUPPRESSION, type Tok } from "@/lib/ml/interp";
import { assign, inertia, lloyd, update } from "@/lib/ml/kmeans";
import { classify } from "@/lib/ml/knn";
import { accuracy, train } from "@/lib/ml/perceptron";
import { blobs, rng } from "@/lib/ml/random";
import { entropyBits, processLogits, softmax } from "@/lib/ml/sampling";
import { allSequences, generate, LOSS_FLOOR, makeExample, TASK_CFG, TinyTransformer } from "@/lib/ml/tiny-transformer";

describe("gradient descent", () => {
  it("every hole can be sunk with its allowed clubs, so par is real", () => {
    const clubs: Record<string, ("sgd" | "momentum" | "adam")[]> = { bowl: ["sgd"], ravine: ["sgd", "momentum"], banana: ["sgd", "momentum", "adam"], twin: ["sgd", "momentum", "adam"] };
    for (const s of SURFACES) {
      const p = par(s, clubs[s.id]);
      const best = Math.min(...clubs[s.id].flatMap((o) => LR_GRID.map((lr) => simulate(s, s.tee, lr, o)).filter((r) => r.outcome === "sunk").map((r) => r.steps)));
      expect(best, s.id).toBeLessThanOrEqual(p);
    }
  });

  it("diverges with a huge learning rate and gets trapped in Twin Peaks with plain SGD", () => {
    expect(simulate(SURFACES[0], SURFACES[0].tee, 3, "sgd").outcome).toBe("diverged");
    const twin = SURFACES[3];
    expect(LR_GRID.some((lr) => simulate(twin, twin.tee, lr, "sgd").outcome === "sunk")).toBe(false);
  });
});

describe("k-means", () => {
  it("never increases inertia across Lloyd iterations", () => {
    const pts = blobs(rng(3), [
      { cx: 0.2, cy: 0.2, sx: 0.05, sy: 0.05, n: 30 },
      { cx: 0.8, cy: 0.3, sx: 0.05, sy: 0.05, n: 30 },
      { cx: 0.5, cy: 0.8, sx: 0.05, sy: 0.05, n: 30 },
    ]);
    const hist = lloyd(pts, [
      { x: 0.1, y: 0.1 },
      { x: 0.15, y: 0.12 },
      { x: 0.9, y: 0.9 },
    ]);
    const inertias = hist.map((c) => inertia(pts, c));
    for (let i = 1; i < inertias.length; i++) expect(inertias[i]).toBeLessThanOrEqual(inertias[i - 1] + 1e-12);
  });

  it("keeps an empty cluster's centroid where it was", () => {
    const pts = [{ x: 0.1, y: 0.1 }];
    const prev = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.9 },
    ];
    expect(update(pts, assign(pts, prev), prev)[1]).toEqual(prev[1]);
  });
});

describe("knn", () => {
  const pts = [
    { x: 0, y: 0, label: "a" },
    { x: 1, y: 0, label: "b" },
    { x: 10, y: 0, label: "b" },
  ];
  it("breaks ties by the closest neighbour, deterministically", () => {
    expect(classify(pts, { x: 0.4, y: 0 }, 2, false).winner).toBe("a");
    expect(classify(pts, { x: 0.6, y: 0 }, 2, false).winner).toBe("b");
  });
  it("lets close neighbours outweigh distant ones when weighted", () => {
    const p = [
      { x: 0, y: 0, label: "a" },
      { x: 5, y: 0, label: "b" },
      { x: 6, y: 0, label: "b" },
    ];
    expect(classify(p, { x: 0.5, y: 0 }, 3, false).winner).toBe("b");
    expect(classify(p, { x: 0.5, y: 0 }, 3, true).winner).toBe("a");
  });
});

describe("perceptron", () => {
  it("converges to 100% on separable data and fails on XOR", () => {
    const sep = blobs(rng(1), [
      { cx: 0.25, cy: 0.25, sx: 0.05, sy: 0.05, n: 15, label: 0 },
      { cx: 0.75, cy: 0.75, sx: 0.05, sy: 0.05, n: 15, label: 1 },
    ]).map((p) => ({ x: p.x * 2 - 1, y: p.y * 2 - 1, label: (p.label ? 1 : -1) as 1 | -1 }));
    const r = train(sep, 0.5, 100);
    expect(r.converged).toBe(true);
    expect(accuracy(r.updates.at(-1)!.line, sep)).toBe(1);
    const xor = [
      { x: -0.5, y: -0.5, label: -1 as const },
      { x: 0.5, y: 0.5, label: -1 as const },
      { x: -0.5, y: 0.5, label: 1 as const },
      { x: 0.5, y: -0.5, label: 1 as const },
    ];
    expect(train(xor, 0.5, 50).converged).toBe(false);
  });
});

describe("sampling", () => {
  const cands = [
    { tok: "a", logit: 3 },
    { tok: "b", logit: 2 },
    { tok: "c", logit: 1 },
    { tok: "d", logit: -1 },
  ];
  it("softmax sums to one and temperature sharpens / flattens", () => {
    expect(softmax([1, 2, 3]).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const h = (t: number) => entropyBits(processLogits(cands, { temperature: t, topK: 0, topP: 1 }).map((r) => r.p));
    expect(h(0.3)).toBeLessThan(h(1));
    expect(h(1)).toBeLessThan(h(3));
  });
  it("applies top-k, then top-p, and renormalises", () => {
    const rows = processLogits(cands, { temperature: 1, topK: 3, topP: 0.8 });
    expect(rows.filter((r) => r.kept).map((r) => r.tok)).toEqual(["a", "b"]);
    expect(rows.reduce((s, r) => s + r.p, 0)).toBeCloseTo(1);
  });
});

describe("tiny transformer (Debugger engine)", () => {
  it("has gradients that match finite differences", () => {
    const m = new TinyTransformer({ vocab: 7, ctx: 9, d: 8, heads: 2, layers: 2, mlp: 12 }, {}, 3) as unknown as {
      params: { v: Float32Array; g: Float32Array; name: string }[];
      step: (t: number[][], y: number[], lr: number) => void;
      forward: (t: number[][]) => unknown;
      xent: (l: unknown, y: number[]) => number;
      tape: (() => void)[];
    };
    const ex = [makeExample([1, 2, 3, 4]), makeExample([5, 0, 2, 1])];
    const toks = ex.map((e) => e.input);
    const tg = ex.flatMap((e) => e.target);
    const loss = () => {
      m.tape = [];
      const l = m.xent(m.forward(toks), tg);
      m.tape = [];
      return l;
    };
    m.step(toks, tg, 0); // lr 0: computes gradients, changes nothing
    let worst = 0;
    for (const p of m.params)
      for (const i of [0, Math.floor(p.v.length / 2)]) {
        const ana = p.g[i];
        const old = p.v[i];
        p.v[i] = old + 1e-2;
        const up = loss();
        p.v[i] = old - 1e-2;
        const down = loss();
        p.v[i] = old;
        const num = (up - down) / 2e-2;
        if (Math.abs(num) + Math.abs(ana) > 1e-4) worst = Math.max(worst, Math.abs(num - ana) / (Math.abs(num) + Math.abs(ana)));
      }
    expect(worst).toBeLessThan(0.05);
  });

  const trainCase = (bugs: object, lr: number, steps: number) => {
    const all = allSequences();
    const r = rng(5);
    r.shuffle(all);
    const test = all.slice(0, 60);
    const trainSet = all.slice(60);
    const model = new TinyTransformer(TASK_CFG, bugs, 1);
    let loss = 0;
    for (let s = 0; s < steps; s++) {
      const b = Array.from({ length: 32 }, () => makeExample(trainSet[r.int(trainSet.length)]));
      loss = model.step(
        b.map((x) => x.input),
        b.flatMap((x) => x.target),
        lr,
      ).loss;
    }
    const acc = generate(model, test).filter((g, i) => g.join() === [...test[i]].reverse().join()).length / test.length;
    return { loss, acc, rms: model.lastRms };
  };

  it("learns reversal when healthy, and each patient's fix makes it learn", () => {
    const healthy = trainCase({}, 3e-3, 150);
    expect(healthy.acc).toBeGreaterThan(0.9);
    expect(healthy.loss).toBeGreaterThan(LOSS_FLOOR * 0.9);
  });

  it("shows the causal-mask leak as loss below the entropy floor", () => {
    const c = CASES.find((x) => x.bug === "mask")!;
    expect(trainCase(c.broken.bugs, c.broken.lr, 150).loss).toBeLessThan(LOSS_FLOOR * 0.5);
  });

  it("shows a far-too-high learning rate as exploding activations", () => {
    const c = CASES.find((x) => x.bug === "lr-high")!;
    expect(Math.max(...trainCase(c.broken.bugs, c.broken.lr, 60).rms)).toBeGreaterThan(100);
  });

  it("shows missing LayerNorm (with a large init) as a huge loss", () => {
    const c = CASES.find((x) => x.bug === "norm")!;
    expect(trainCase(c.broken.bugs, c.broken.lr, 20).loss).toBeGreaterThan(5);
  });
});

describe("interpretability model", () => {
  const necessary = (m: typeof INDUCTION, toks: Tok[], ans: Tok) => {
    const base = probOf(run(m, toks), ans);
    return components(m).filter((c) => probOf(run(m, toks, { ablate: new Set([c]) }), ans) < base * 0.5);
  };
  it("implements the induction circuit L0H0 → L1H0", () => {
    const toks: Tok[] = ["<bos>", "Anna", "met", "Bo", ".", "Anna", "met"];
    expect(probOf(run(INDUCTION, toks), "Bo")).toBeGreaterThan(0.95);
    expect(necessary(INDUCTION, toks, "Bo").sort()).toEqual(["L0H0", "L1H0"]);
  });
  it("has a suppression head whose removal raises the answer", () => {
    const toks: Tok[] = ["<bos>", "Anna", "met", "Bo", ".", "Cy", "saw", "Dee", ".", "Anna", "met"];
    const base = probOf(run(SUPPRESSION, toks), "Bo");
    expect(probOf(run(SUPPRESSION, toks, { ablate: new Set(["L1H1"]) }), "Bo")).toBeGreaterThan(base + 0.15);
  });
  it("stores the fact in N2, fed by the two-back head", () => {
    expect(necessary(FACTS, ["<bos>", "Rome", "is", "in"], "Italy").sort()).toEqual(["L0H1", "N2"]);
  });
  it("localises the corruption to L1H0 with activation patching", () => {
    const clean = run(INDUCTION, ["<bos>", "Anna", "met", "Bo", ".", "Anna", "met"]);
    const restored = components(INDUCTION).filter((c) => probOf(run(INDUCTION, ["<bos>", "Anna", "met", "Bo", ".", "Anna", "saw"], { patch: { from: clean, ids: new Set([c]) } }), "Bo") > 0.5);
    expect(restored).toEqual(["L1H0"]);
  });
});
