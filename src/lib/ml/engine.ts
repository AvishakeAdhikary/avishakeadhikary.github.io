/**
 * The Debugger's training engine: a tiny decoder-only transformer with real reverse-mode autodiff, small
 * enough to train live in a Web Worker. Pre-LN blocks: x + Attn(LN(x)),
 * x + MLP(LN(x)); learned token + position embeddings; Adam.
 *
 * Ops are fused (linear, layernorm, multi-head causal attention, GELU,
 * cross-entropy), each pushing its own backward closure onto a tape, so a
 * training step is a few dozen matrix ops rather than thousands of scalars.
 *
 * `Bugs` switch real code paths, which is the point of the Debugger game:
 * every symptom you see in the telemetry is produced by the actual math.
 */
export interface Config {
  vocab: number;
  ctx: number;
  d: number;
  heads: number;
  layers: number;
  mlp: number;
}

export interface Bugs {
  /** Attention may look at future positions. */
  noMask?: boolean;
  /** Position embeddings are never added. */
  noPos?: boolean;
  /** Multiplier on attention logits instead of 1/√d_head. */
  attnScale?: number;
  /** LayerNorms skipped. */
  noNorm?: boolean;
  /** Std of the weight init (0.08 is healthy). */
  initStd?: number;
  /** Residual connections removed (x = f(x) instead of x + f(x)). */
  noResidual?: boolean;
  /** The attention weights are never handed to the optimizer (a "detached" bug). */
  frozenAttn?: boolean;
}

interface T2 {
  v: Float32Array;
  g: Float32Array;
  r: number;
  c: number;
}

export interface Param extends T2 {
  name: string;
  layer: number;
  m: Float32Array;
  s: Float32Array;
}

/** What the Debugger shows, posted every few training steps. */
export interface Telemetry {
  step: number;
  loss: number;
  floor: number;
  acc: number | null;
  gnorm: number;
  /** Gradient norm by depth: [embeddings, block 0, block 1, head]. */
  grads: number[];
  /** Residual-stream RMS by depth: [embeddings, after block 0, after block 1]. */
  rms: number[];
  /** Relative weight change in the last step: [attn 0, mlp 0, attn 1, mlp 1]. */
  updates: number[];
  /** Attention on the demo example: [layer][head] → T×T row-major. */
  attn: number[][][];
  samples: { input: number[]; output: number[]; ok: boolean }[];
}

export interface RunOptions {
  bugs: Bugs;
  lr: number;
  steps: number;
  seed?: number;
  every?: number;
}

/** Seeded PRNG (kept local so the worker bundle stays small). */
const rng = (seed: number) => {
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
    int: (n: number) => Math.floor(next() * n),
    gauss: () => Math.sqrt(-2 * Math.log(Math.max(1e-12, next()))) * Math.cos(2 * Math.PI * next()),
    shuffle: <T,>(xs: T[]) => {
      for (let i = xs.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [xs[i], xs[j]] = [xs[j], xs[i]];
      }
      return xs;
    },
  };
};

const t2 = (r: number, c: number, v?: Float32Array): T2 => ({ v: v ?? new Float32Array(r * c), g: new Float32Array(r * c), r, c });

export class TinyTransformer {
  readonly cfg: Config;
  bugs: Bugs;
  params: Param[] = [];
  private tape: (() => void)[] = [];
  private adamT = 0;
  tok: Param;
  pos: Param;
  blocks: { ln1g: Param; ln1b: Param; wq: Param; wk: Param; wv: Param; wo: Param; ln2g: Param; ln2b: Param; w1: Param; b1: Param; w2: Param; b2: Param }[] = [];
  lnfg: Param;
  lnfb: Param;
  wout: Param;
  /** Captured on every forward: attention probs [layer][head] (B*T*T), residual RMS per layer. */
  lastAttn: Float32Array[][] = [];
  lastRms: number[] = [];

  constructor(cfg: Config, bugs: Bugs = {}, seed = 1) {
    this.cfg = cfg;
    this.bugs = bugs;
    const r = rng(seed);
    const std = bugs.initStd ?? 0.08;
    const mk = (name: string, layer: number, rows: number, cols: number, init: "normal" | "ones" | "zeros", s = std): Param => {
      const v = new Float32Array(rows * cols);
      if (init === "normal") for (let i = 0; i < v.length; i++) v[i] = r.gauss() * s;
      if (init === "ones") v.fill(1);
      const p: Param = { v, g: new Float32Array(v.length), r: rows, c: cols, name, layer, m: new Float32Array(v.length), s: new Float32Array(v.length) };
      this.params.push(p);
      return p;
    };
    const { vocab, ctx, d, layers, mlp } = cfg;
    this.tok = mk("tok", -1, vocab, d, "normal", 0.3);
    this.pos = mk("pos", -1, ctx, d, "normal", 0.3);
    for (let l = 0; l < layers; l++)
      this.blocks.push({
        ln1g: mk(`L${l}.ln1.g`, l, 1, d, "ones"),
        ln1b: mk(`L${l}.ln1.b`, l, 1, d, "zeros"),
        wq: mk(`L${l}.wq`, l, d, d, "normal"),
        wk: mk(`L${l}.wk`, l, d, d, "normal"),
        wv: mk(`L${l}.wv`, l, d, d, "normal"),
        wo: mk(`L${l}.wo`, l, d, d, "normal"),
        ln2g: mk(`L${l}.ln2.g`, l, 1, d, "ones"),
        ln2b: mk(`L${l}.ln2.b`, l, 1, d, "zeros"),
        w1: mk(`L${l}.w1`, l, d, mlp, "normal"),
        b1: mk(`L${l}.b1`, l, 1, mlp, "zeros"),
        w2: mk(`L${l}.w2`, l, mlp, d, "normal"),
        b2: mk(`L${l}.b2`, l, 1, d, "zeros"),
      });
    this.lnfg = mk("lnf.g", layers, 1, d, "ones");
    this.lnfb = mk("lnf.b", layers, 1, d, "zeros");
    this.wout = mk("wout", layers, d, vocab, "normal");
  }

  // ── ops (forward + backward closure) ────────────────────────────────────
  private embed(tokens: number[][]): T2 {
    const { d } = this.cfg;
    const B = tokens.length;
    const T = tokens[0].length;
    const out = t2(B * T, d);
    const noPos = !!this.bugs.noPos;
    for (let b = 0; b < B; b++)
      for (let t = 0; t < T; t++) {
        const o = (b * T + t) * d;
        const tk = tokens[b][t] * d;
        const ps = t * d;
        for (let k = 0; k < d; k++) out.v[o + k] = this.tok.v[tk + k] + (noPos ? 0 : this.pos.v[ps + k]);
      }
    this.tape.push(() => {
      for (let b = 0; b < B; b++)
        for (let t = 0; t < T; t++) {
          const o = (b * T + t) * d;
          const tk = tokens[b][t] * d;
          const ps = t * d;
          for (let k = 0; k < d; k++) {
            this.tok.g[tk + k] += out.g[o + k];
            if (!noPos) this.pos.g[ps + k] += out.g[o + k];
          }
        }
    });
    return out;
  }

  private linear(x: T2, w: Param, bias?: Param): T2 {
    const N = x.r;
    const K = x.c;
    const M = w.c;
    const out = t2(N, M);
    for (let i = 0; i < N; i++) {
      const xo = i * K;
      const oo = i * M;
      if (bias) for (let j = 0; j < M; j++) out.v[oo + j] = bias.v[j];
      for (let k = 0; k < K; k++) {
        const xv = x.v[xo + k];
        if (xv === 0) continue;
        const wo = k * M;
        for (let j = 0; j < M; j++) out.v[oo + j] += xv * w.v[wo + j];
      }
    }
    this.tape.push(() => {
      for (let i = 0; i < N; i++) {
        const xo = i * K;
        const oo = i * M;
        for (let k = 0; k < K; k++) {
          const wo = k * M;
          const xv = x.v[xo + k];
          let gx = 0;
          for (let j = 0; j < M; j++) {
            const go = out.g[oo + j];
            gx += go * w.v[wo + j];
            w.g[wo + j] += xv * go;
          }
          x.g[xo + k] += gx;
        }
        if (bias) for (let j = 0; j < M; j++) bias.g[j] += out.g[oo + j];
      }
    });
    return out;
  }

  private layernorm(x: T2, g: Param, b: Param): T2 {
    if (this.bugs.noNorm) return x;
    const N = x.r;
    const D = x.c;
    const out = t2(N, D);
    const xhat = new Float32Array(N * D);
    const rstd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const o = i * D;
      let mu = 0;
      for (let k = 0; k < D; k++) mu += x.v[o + k];
      mu /= D;
      let va = 0;
      for (let k = 0; k < D; k++) va += (x.v[o + k] - mu) ** 2;
      const rs = 1 / Math.sqrt(va / D + 1e-5);
      rstd[i] = rs;
      for (let k = 0; k < D; k++) {
        const h = (x.v[o + k] - mu) * rs;
        xhat[o + k] = h;
        out.v[o + k] = h * g.v[k] + b.v[k];
      }
    }
    this.tape.push(() => {
      for (let i = 0; i < N; i++) {
        const o = i * D;
        let sg = 0;
        let sgh = 0;
        for (let k = 0; k < D; k++) {
          const gh = out.g[o + k] * g.v[k];
          sg += gh;
          sgh += gh * xhat[o + k];
          g.g[k] += out.g[o + k] * xhat[o + k];
          b.g[k] += out.g[o + k];
        }
        for (let k = 0; k < D; k++) {
          const gh = out.g[o + k] * g.v[k];
          x.g[o + k] += (rstd[i] / D) * (D * gh - sg - xhat[o + k] * sgh);
        }
      }
    });
    return out;
  }

  private gelu(x: T2): T2 {
    const out = t2(x.r, x.c);
    const c = Math.sqrt(2 / Math.PI);
    for (let i = 0; i < x.v.length; i++) {
      const v = x.v[i];
      out.v[i] = 0.5 * v * (1 + Math.tanh(c * (v + 0.044715 * v * v * v)));
    }
    this.tape.push(() => {
      for (let i = 0; i < x.v.length; i++) {
        const v = x.v[i];
        const u = c * (v + 0.044715 * v * v * v);
        const th = Math.tanh(u);
        const du = c * (1 + 3 * 0.044715 * v * v);
        x.g[i] += out.g[i] * (0.5 * (1 + th) + 0.5 * v * (1 - th * th) * du);
      }
    });
    return out;
  }

  private add(a: T2, b: T2): T2 {
    const out = t2(a.r, a.c);
    for (let i = 0; i < out.v.length; i++) out.v[i] = a.v[i] + b.v[i];
    this.tape.push(() => {
      for (let i = 0; i < out.v.length; i++) {
        a.g[i] += out.g[i];
        b.g[i] += out.g[i];
      }
    });
    return out;
  }

  /** Multi-head (causal) self-attention over B sequences of length T, fused. */
  private attention(q: T2, k: T2, v: T2, B: number, T: number, layer: number): T2 {
    const { d, heads } = this.cfg;
    const hd = d / heads;
    const scale = this.bugs.attnScale ?? 1 / Math.sqrt(hd);
    const causal = !this.bugs.noMask;
    const out = t2(B * T, d);
    const P: Float32Array[] = Array.from({ length: heads }, () => new Float32Array(B * T * T));
    for (let h = 0; h < heads; h++) {
      const off = h * hd;
      const Ph = P[h];
      for (let b = 0; b < B; b++)
        for (let i = 0; i < T; i++) {
          const qi = (b * T + i) * d + off;
          const row = (b * T + i) * T;
          let mx = -Infinity;
          const lim = causal ? i : T - 1;
          for (let j = 0; j <= lim; j++) {
            const kj = (b * T + j) * d + off;
            let s = 0;
            for (let e = 0; e < hd; e++) s += q.v[qi + e] * k.v[kj + e];
            s *= scale;
            Ph[row + j] = s;
            if (s > mx) mx = s;
          }
          let sum = 0;
          for (let j = 0; j <= lim; j++) {
            const e = Math.exp(Ph[row + j] - mx);
            Ph[row + j] = e;
            sum += e;
          }
          for (let j = 0; j <= lim; j++) Ph[row + j] /= sum;
          for (let j = lim + 1; j < T; j++) Ph[row + j] = 0;
          const oi = (b * T + i) * d + off;
          for (let j = 0; j <= lim; j++) {
            const p = Ph[row + j];
            const vj = (b * T + j) * d + off;
            for (let e = 0; e < hd; e++) out.v[oi + e] += p * v.v[vj + e];
          }
        }
    }
    this.lastAttn[layer] = P;
    this.tape.push(() => {
      for (let h = 0; h < heads; h++) {
        const off = h * hd;
        const Ph = P[h];
        const dP = new Float32Array(T);
        for (let b = 0; b < B; b++)
          for (let i = 0; i < T; i++) {
            const oi = (b * T + i) * d + off;
            const row = (b * T + i) * T;
            const lim = causal ? i : T - 1;
            let dot = 0;
            for (let j = 0; j <= lim; j++) {
              const vj = (b * T + j) * d + off;
              let g = 0;
              for (let e = 0; e < hd; e++) {
                g += out.g[oi + e] * v.v[vj + e];
                v.g[vj + e] += Ph[row + j] * out.g[oi + e];
              }
              dP[j] = g;
              dot += g * Ph[row + j];
            }
            const qi = (b * T + i) * d + off;
            for (let j = 0; j <= lim; j++) {
              const ds = Ph[row + j] * (dP[j] - dot) * scale;
              if (ds === 0) continue;
              const kj = (b * T + j) * d + off;
              for (let e = 0; e < hd; e++) {
                q.g[qi + e] += ds * k.v[kj + e];
                k.g[kj + e] += ds * q.v[qi + e];
              }
            }
          }
      }
    });
    return out;
  }

  /** Mean cross-entropy over positions whose target ≥ 0. */
  private xent(logits: T2, targets: number[]): number {
    const N = logits.r;
    const V = logits.c;
    let loss = 0;
    let n = 0;
    const probs = new Float32Array(N * V);
    for (let i = 0; i < N; i++) {
      if (targets[i] < 0) continue;
      const o = i * V;
      let mx = -Infinity;
      for (let j = 0; j < V; j++) mx = Math.max(mx, logits.v[o + j]);
      let sum = 0;
      for (let j = 0; j < V; j++) sum += probs[o + j] = Math.exp(logits.v[o + j] - mx);
      for (let j = 0; j < V; j++) probs[o + j] /= sum;
      loss -= Math.log(Math.max(probs[o + targets[i]], 1e-12));
      n++;
    }
    this.tape.push(() => {
      for (let i = 0; i < N; i++) {
        if (targets[i] < 0) continue;
        const o = i * V;
        for (let j = 0; j < V; j++) logits.g[o + j] += (probs[o + j] - (j === targets[i] ? 1 : 0)) / n;
      }
    });
    return loss / Math.max(1, n);
  }

  private rms(x: T2) {
    let s = 0;
    for (let i = 0; i < x.v.length; i++) s += x.v[i] * x.v[i];
    return Math.sqrt(s / x.v.length);
  }

  // ── model ───────────────────────────────────────────────────────────────
  /** Forward pass; returns logits (B*T × vocab). Records attention + residual RMS. */
  forward(tokens: number[][]): T2 {
    const B = tokens.length;
    const T = tokens[0].length;
    let x = this.embed(tokens);
    this.lastRms = [this.rms(x)];
    const res = !this.bugs.noResidual;
    this.blocks.forEach((L, l) => {
      const h = this.layernorm(x, L.ln1g, L.ln1b);
      const a = this.linear(this.attention(this.linear(h, L.wq), this.linear(h, L.wk), this.linear(h, L.wv), B, T, l), L.wo);
      x = res ? this.add(x, a) : a;
      const h2 = this.layernorm(x, L.ln2g, L.ln2b);
      const m = this.linear(this.gelu(this.linear(h2, L.w1, L.b1)), L.w2, L.b2);
      x = res ? this.add(x, m) : m;
      this.lastRms.push(this.rms(x));
    });
    return this.linear(this.layernorm(x, this.lnfg, this.lnfb), this.wout);
  }

  /** Inference only (no tape kept). */
  predict(tokens: number[][]): Float32Array {
    const logits = this.forward(tokens);
    this.tape = [];
    return logits.v;
  }

  /** One training step. Returns the loss and gradient norms (global + per layer). */
  step(tokens: number[][], targets: number[], lr: number, clip = 0) {
    this.tape = [];
    for (const p of this.params) p.g.fill(0);
    const logits = this.forward(tokens);
    const loss = this.xent(logits, targets);
    for (let i = this.tape.length - 1; i >= 0; i--) this.tape[i]();
    this.tape = [];
    const perLayer = new Array(this.cfg.layers + 2).fill(0);
    let total = 0;
    for (const p of this.params) {
      let s = 0;
      for (let i = 0; i < p.g.length; i++) s += p.g[i] * p.g[i];
      total += s;
      perLayer[p.layer + 1] += s;
    }
    const gnorm = Math.sqrt(total);
    const k = clip && gnorm > clip ? clip / gnorm : 1;
    this.adamT++;
    const b1 = 0.9;
    const b2 = 0.98;
    const c1 = 1 - b1 ** this.adamT;
    const c2 = 1 - b2 ** this.adamT;
    const frozen = this.bugs.frozenAttn;
    for (const p of this.params) {
      if (frozen && /\.w[qkvo]$/.test(p.name)) continue;
      for (let i = 0; i < p.v.length; i++) {
        const g = p.g[i] * k;
        p.m[i] = b1 * p.m[i] + (1 - b1) * g;
        p.s[i] = b2 * p.s[i] + (1 - b2) * g * g;
        p.v[i] -= (lr * (p.m[i] / c1)) / (Math.sqrt(p.s[i] / c2) + 1e-8);
      }
    }
    return { loss, gnorm, layerNorms: perLayer.map(Math.sqrt) };
  }
}

// ── The task: reverse a sequence of digits ─────────────────────────────
export const DIGITS = 6;
export const LEN = 4;
export const SEP = DIGITS;
export const TASK_CFG: Config = { vocab: DIGITS + 1, ctx: LEN * 2 + 1, d: 24, heads: 2, layers: 2, mlp: 48 };

/**
 * "3 1 4 1 | 1 4 1 3": a language-model objective over every position.
 * The first half is random, so no honest model can predict it: the loss
 * has a floor (LOSS_FLOOR). A model whose loss goes *below* it is cheating
 * (e.g. attention can see the future).
 */
export function makeExample(digits: number[]) {
  const seq = [...digits, SEP, ...[...digits].reverse()];
  return { input: seq.slice(0, -1), target: seq.slice(1) };
}

/** Irreducible loss: LEN − 1 random digits out of 2·LEN predicted tokens, each ln(DIGITS) nats. */
export const LOSS_FLOOR = ((LEN - 1) / (2 * LEN)) * Math.log(DIGITS);

export function allSequences(): number[][] {
  const out: number[][] = [];
  const total = DIGITS ** LEN;
  for (let n = 0; n < total; n++) {
    const s: number[] = [];
    let x = n;
    for (let i = 0; i < LEN; i++) {
      s.push(x % DIGITS);
      x = Math.floor(x / DIGITS);
    }
    out.push(s);
  }
  return out;
}

/** Greedy autoregressive generation of the answer half; returns the produced digits. */
export function generate(model: TinyTransformer, digits: number[][]): number[][] {
  const seqs = digits.map((d) => [...d, SEP]);
  for (let step = 0; step < LEN; step++) {
    const T = seqs[0].length;
    const logits = model.predict(seqs);
    const V = model.cfg.vocab;
    seqs.forEach((s, b) => {
      const o = (b * T + T - 1) * V;
      let best = 0;
      for (let j = 1; j < DIGITS; j++) if (logits[o + j] > logits[o + best]) best = j;
      s.push(best);
    });
  }
  return seqs.map((s) => s.slice(LEN + 1));
}

export const DEMO = [3, 1, 4, 1];
export const demoTokens = () => makeExample(DEMO).input;

/**
 * Train for `steps`, calling `post` with telemetry every `every` steps.
 * Cooperative: yields to the event loop between chunks so a worker (or the
 * main-thread fallback) can be stopped.
 */
export async function runTraining(opts: RunOptions, post: (t: Telemetry) => void, stopped: () => boolean) {
  const all = allSequences();
  const r = rng(opts.seed ?? 5);
  r.shuffle(all);
  const test = all.slice(0, 60);
  const train = all.slice(60);
  const model = new TinyTransformer(TASK_CFG, opts.bugs, opts.seed ?? 1);
  const every = opts.every ?? 8;
  let acc: number | null = null;

  const groups = model.blocks.flatMap((b) => [
    [b.wq, b.wk, b.wv, b.wo],
    [b.w1, b.w2],
  ]);
  const norm = (ps: { v: Float32Array }[]) => Math.sqrt(ps.reduce((s, p) => s + p.v.reduce((a, x) => a + x * x, 0), 0));

  for (let s = 1; s <= opts.steps; s++) {
    if (stopped()) return;
    const batch = Array.from({ length: 32 }, () => makeExample(train[r.int(train.length)]));
    const report = s % every === 0 || s === 1 || s === opts.steps;
    const before = report ? groups.map((g) => g.map((p) => Float32Array.from(p.v))) : null;
    const st = model.step(
      batch.map((b) => b.input),
      batch.flatMap((b) => b.target),
      opts.lr,
    );
    if (report) {
      const updates = groups.map((g, gi) => {
        let d = 0;
        g.forEach((p, pi) => p.v.forEach((x, i) => (d += (x - before![gi][pi][i]) ** 2)));
        return Math.sqrt(d) / Math.max(1e-12, norm(g));
      });
      const rms = [...model.lastRms];
      if (s % (every * 5) === 0 || s === opts.steps || s === 1) {
        const gen = generate(model, test);
        acc = gen.filter((g, i) => g.join() === [...test[i]].reverse().join()).length / test.length;
      }
      model.predict([demoTokens()]);
      const T = demoTokens().length;
      const attn = model.lastAttn.map((heads) => heads.map((P) => Array.from(P.slice(0, T * T))));
      const picks = [test[0], test[1], test[2]];
      const outs = generate(model, picks);
      post({
        step: s,
        loss: Number.isFinite(st.loss) ? st.loss : 99,
        floor: LOSS_FLOOR,
        acc,
        gnorm: Number.isFinite(st.gnorm) ? st.gnorm : 1e6,
        grads: st.layerNorms,
        rms,
        updates,
        attn,
        samples: picks.map((p, i) => ({ input: p, output: outs[i], ok: outs[i].join() === [...p].reverse().join() })),
      });
      await new Promise((res) => setTimeout(res, 0));
    }
  }
}

