/**
 * A miniature transformer with hand-constructed weights, for the
 * Mechanistic Interpretability game. No training: every weight is set so
 * that a known circuit implements the behaviour, which means the game can
 * check a player's hypothesis against the *real* effect of ablating or
 * patching components in a forward pass.
 *
 * Residual stream = concatenated subspaces:
 *   TOK (current token) · POS (position) · PREV (token one back, written
 *   by L0H0) · PREV2 (token two back, written by L0H1) · OUT (read by the
 *   unembedding) · ONE (a constant 1, like a bias direction)
 *
 * Heads are written in the QK/OV form: score(i,j) = x_iᵀ A x_j (causal),
 * output_i = Σ_j softmax_j(score) · M x_j. The MLP (layer 1) is
 * ReLU(W_in x + b) → W_out.
 */
export const VOCAB = [
  "<bos>",
  "Anna",
  "Bo",
  "Cy",
  "Dee",
  "met",
  "saw",
  ".",
  "Paris",
  "Rome",
  "Tokyo",
  "is",
  "in",
  "France",
  "Italy",
  "Japan",
] as const;
export type Tok = (typeof VOCAB)[number];
const V = VOCAB.length;
const T = 12;
const NAMES: Tok[] = ["Anna", "Bo", "Cy", "Dee"];

const TOK = 0;
const POS = TOK + V;
const PREV = POS + T;
const PREV2 = PREV + V;
const OUT = PREV2 + V;
const ONE = OUT + V;
export const D = ONE + 1;

const id = (t: Tok) => VOCAB.indexOf(t);

type Mat = Float32Array; // D×D, row-major: (row = output dim, col = input dim) for M; A is bilinear (query row, key col)
const mat = () => new Float32Array(D * D);

export type CompId = "L0H0" | "L0H1" | "L1H0" | "L1H1" | `N${number}`;

interface Head {
  id: CompId;
  layer: 0 | 1;
  A: Mat;
  M: Mat;
}

interface Neuron {
  id: CompId;
  w: Float32Array;
  b: number;
  u: Float32Array;
}

export interface Model {
  name: string;
  heads: Head[];
  neurons: Neuron[];
}

function head(idv: CompId, layer: 0 | 1, build: (A: Mat, M: Mat) => void): Head {
  const A = mat();
  const M = mat();
  build(A, M);
  return { id: idv, layer, A, M };
}

const set = (m: Mat, row: number, col: number, v: number) => {
  m[row * D + col] += v;
};

/** L0H0: attends from i to i−1 by position, copies that token into PREV. */
const prevTokenHead = () =>
  head("L0H0", 0, (A, M) => {
    for (let i = 1; i < T; i++) set(A, POS + i, POS + i - 1, 14);
    for (let v = 0; v < V; v++) set(M, PREV + v, TOK + v, 1);
  });

/** L1H0: query = current token, key = PREV (K-composition with L0H0); copies the attended token into OUT. */
const inductionHead = (strength = 9) =>
  head("L1H0", 1, (A, M) => {
    for (let v = 1; v < V; v++) set(A, TOK + v, PREV + v, 14);
    for (let v = 0; v < V; v++) set(M, OUT + v, TOK + v, strength);
  });

/** Copy-suppression: attends evenly to every name seen so far and pushes them all down. */
const suppressionHead = () =>
  head("L1H1", 1, (A, M) => {
    for (const n of NAMES) set(A, ONE, TOK + id(n), 6);
    for (const n of NAMES) set(M, OUT + id(n), TOK + id(n), -40);
  });

/** Looks busy (attends to earlier copies of the current token) but writes nothing anyone reads. */
const duplicateHead = (hid: CompId, layer: 0 | 1) =>
  head(hid, layer, (A) => {
    for (let v = 1; v < V; v++) set(A, TOK + v, TOK + v, 8);
  });

/** L0H1 in the facts model: attends two back by position, copies into PREV2. */
const prevPrevHead = () =>
  head("L0H1", 0, (A, M) => {
    for (let i = 2; i < T; i++) set(A, POS + i, POS + i - 2, 14);
    for (let v = 0; v < V; v++) set(M, PREV2 + v, TOK + v, 1);
  });

function neuron(nid: CompId, reads: [number, number][], b: number, writes: [number, number][]): Neuron {
  const w = new Float32Array(D);
  const u = new Float32Array(D);
  reads.forEach(([i, v]) => (w[i] = v));
  writes.forEach(([i, v]) => (u[i] = v));
  return { id: nid, w, b, u };
}

export const INDUCTION: Model = {
  name: "induction",
  heads: [prevTokenHead(), duplicateHead("L0H1", 0), inductionHead(), duplicateHead("L1H1", 1)],
  neurons: [],
};

export const SUPPRESSION: Model = {
  name: "suppression",
  heads: [prevTokenHead(), duplicateHead("L0H1", 0), inductionHead(11), suppressionHead()],
  neurons: [],
};

const fact = (nid: CompId, subject: Tok, answer: Tok) => neuron(nid, [[PREV2 + id(subject), 1], [TOK + id("in"), 1]], -1, [[OUT + id(answer), 9]]);

export const FACTS: Model = {
  name: "facts",
  heads: [prevTokenHead(), prevPrevHead(), inductionHead(), duplicateHead("L1H1", 1)],
  neurons: [
    fact("N0", "Paris", "France"),
    fact("N1", "Tokyo", "Japan"),
    fact("N2", "Rome", "Italy"),
    // "is" → "in": a grammar neuron, active on a different position.
    neuron("N3", [[TOK + id("is"), 1]], -0.5, [[OUT + id("in"), 6]]),
    // A dead neuron (never clears its bias).
    neuron("N4", [[TOK + id("Anna"), 0.4]], -2, [[OUT + id("Bo"), 5]]),
  ],
};

// ── Forward pass with hooks ──────────────────────────────────────────────
export interface Run {
  tokens: Tok[];
  probs: number[];
  logits: number[];
  /** Attention [head][i*n + j]. */
  attn: Record<string, number[]>;
  /** Each component's output (n × D, flattened). */
  outputs: Record<string, Float32Array>;
  /** Final-position residual after: embed, layer 0, layer 1 attention, MLP. */
  lens: Float32Array[];
  /** Neuron activation per position. */
  acts: Record<string, number[]>;
}

export interface Intervene {
  ablate?: Set<string>;
  /** Replace these components' outputs with the ones from `from` (activation patching). */
  patch?: { from: Run; ids: Set<string> };
}

function mv(m: Mat, x: Float32Array): Float32Array {
  const y = new Float32Array(D);
  for (let r = 0; r < D; r++) {
    let s = 0;
    const o = r * D;
    for (let c = 0; c < D; c++) {
      const w = m[o + c];
      if (w) s += w * x[c];
    }
    y[r] = s;
  }
  return y;
}

export function run(model: Model, tokens: Tok[], iv: Intervene = {}): Run {
  const n = tokens.length;
  const xs: Float32Array[] = tokens.map((t, i) => {
    const x = new Float32Array(D);
    x[TOK + id(t)] = 1;
    x[POS + i] = 1;
    x[ONE] = 1;
    return x;
  });
  const attn: Record<string, number[]> = {};
  const outputs: Record<string, Float32Array> = {};
  const acts: Record<string, number[]> = {};
  const lens: Float32Array[] = [Float32Array.from(xs[n - 1])];

  const runHead = (h: Head, xin: Float32Array[]) => {
    // A[q][k] pairs a query dim with a key dim, so (A x_j) is indexed by query dims and score(i, j) = x_i · (A x_j).
    const keys = xin.map((x) => mv(h.A, x));
    const vals = xin.map((x) => mv(h.M, x));
    const P: number[] = new Array(n * n).fill(0);
    const out = new Float32Array(n * D);
    for (let i = 0; i < n; i++) {
      const s: number[] = [];
      for (let j = 0; j <= i; j++) {
        let v = 0;
        for (let k = 0; k < D; k++) v += xin[i][k] * keys[j][k];
        s.push(v);
      }
      const m = Math.max(...s);
      const e = s.map((v) => Math.exp(v - m));
      const z = e.reduce((a, b) => a + b, 0);
      for (let j = 0; j <= i; j++) {
        const p = e[j] / z;
        P[i * n + j] = p;
        for (let k = 0; k < D; k++) out[i * D + k] += p * vals[j][k];
      }
    }
    attn[h.id] = P;
    let o = out;
    if (iv.patch?.ids.has(h.id)) o = Float32Array.from(iv.patch.from.outputs[h.id]);
    if (iv.ablate?.has(h.id)) o = new Float32Array(n * D);
    outputs[h.id] = o;
    return o;
  };

  for (const layer of [0, 1] as const) {
    const xin = xs.map((x) => Float32Array.from(x));
    for (const h of model.heads.filter((hh) => hh.layer === layer)) {
      const o = runHead(h, xin);
      for (let i = 0; i < n; i++) for (let k = 0; k < D; k++) xs[i][k] += o[i * D + k];
    }
    lens.push(Float32Array.from(xs[n - 1]));
  }

  if (model.neurons.length) {
    for (const nn of model.neurons) {
      const a: number[] = [];
      const out = new Float32Array(n * D);
      for (let i = 0; i < n; i++) {
        let s = nn.b;
        for (let k = 0; k < D; k++) if (nn.w[k]) s += nn.w[k] * xs[i][k];
        const act = iv.ablate?.has(nn.id) ? 0 : Math.max(0, s);
        a.push(Math.max(0, s));
        for (let k = 0; k < D; k++) if (nn.u[k]) out[i * D + k] = act * nn.u[k];
      }
      acts[nn.id] = a;
      outputs[nn.id] = out;
    }
    for (const nn of model.neurons) for (let i = 0; i < n; i++) for (let k = 0; k < D; k++) xs[i][k] += outputs[nn.id][i * D + k];
    lens.push(Float32Array.from(xs[n - 1]));
  }

  const last = xs[n - 1];
  const logits = VOCAB.map((_, v) => last[OUT + v]);
  return { tokens, logits, probs: softmax(logits), attn, outputs, lens, acts };
}

export const softmax = (l: number[]) => {
  const m = Math.max(...l);
  const e = l.map((v) => Math.exp(v - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / z);
};

/** Logit lens: decode a residual vector's OUT block. */
export const decode = (x: Float32Array) => softmax(VOCAB.map((_, v) => x[OUT + v]));

/** Direct logit attribution of a component to token `t` at the final position. */
export const dla = (r: Run, comp: string, t: Tok) => {
  const o = r.outputs[comp];
  return o ? o[(r.tokens.length - 1) * D + OUT + id(t)] : 0;
};

export const probOf = (r: Run, t: Tok) => r.probs[id(t)];
export const components = (m: Model): CompId[] => [...m.heads.map((h) => h.id), ...m.neurons.map((n) => n.id)];
