/**
 * Next-token sampling, as LLM decoders do it: logits → temperature →
 * top-k → top-p (nucleus) → renormalise → sample.
 */
export interface Cand {
  tok: string;
  logit: number;
  /** Optional group (e.g. a word sense) for challenges. */
  tag?: string;
}

export interface Knobs {
  temperature: number;
  /** 0 = off. */
  topK: number;
  /** 1 = off. */
  topP: number;
}

export interface Row extends Cand {
  /** Plain softmax at T = 1. */
  p1: number;
  /** After temperature, before any cut. */
  pT: number;
  kept: boolean;
  /** Final probability (0 if cut). */
  p: number;
}

export function softmax(logits: number[], t = 1): number[] {
  const z = logits.map((l) => l / Math.max(t, 1e-3));
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

export function processLogits(cands: Cand[], k: Knobs): Row[] {
  const sorted = [...cands].sort((a, b) => b.logit - a.logit);
  const p1 = softmax(sorted.map((c) => c.logit));
  const pT = softmax(
    sorted.map((c) => c.logit),
    k.temperature,
  );
  const kept = sorted.map((_, i) => (k.topK > 0 ? i < k.topK : true));
  // Nucleus: keep the smallest prefix whose (temperature-adjusted, top-k-filtered) mass reaches top-p.
  if (k.topP < 1) {
    const mass = pT.reduce((s, p, i) => s + (kept[i] ? p : 0), 0);
    let acc = 0;
    let reached = false;
    sorted.forEach((_, i) => {
      if (!kept[i]) return;
      if (reached) kept[i] = false;
      else {
        acc += pT[i] / mass;
        if (acc >= k.topP - 1e-9) reached = true;
      }
    });
  }
  const z = pT.reduce((s, p, i) => s + (kept[i] ? p : 0), 0);
  return sorted.map((c, i) => ({ ...c, p1: p1[i], pT: pT[i], kept: kept[i], p: kept[i] ? pT[i] / z : 0 }));
}

export function sampleRow(rows: Row[], u: number): number {
  let acc = 0;
  for (let i = 0; i < rows.length; i++) {
    acc += rows[i].p;
    if (u < acc) return i;
  }
  return rows.findLastIndex((r) => r.kept);
}

/** Shannon entropy in bits. */
export const entropyBits = (ps: number[]) => -ps.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);

// ── A toy subword tokenizer (greedy longest match), for the walkthrough ──
const PIECES = [
  " the", " cat", " sat", " on", " mat", " and", " transform", "er", "ers", " token", "ize", "izer", "ization", " model", "ing", " learn", " machine",
  " un", "believ", "able", " pre", "dict", " next", " word", " is", " a", " an", " of", " to", " in", "The", "I", " I", " love", " you", "ed", "s", ".", ",", "!", "?",
];

export function tokenize(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let best = "";
    for (const p of PIECES) if (p.length > best.length && text.startsWith(p, i)) best = p;
    if (!best) {
      // Fall back to a leading-space chunk or a single character.
      best = text[i] === " " && /[a-z]/i.test(text[i + 1] ?? "") ? ` ${text[i + 1]}` : text[i];
    }
    out.push(best);
    i += best.length;
  }
  return out;
}

/** Stable small ids for display (a hash into a pretend 50k vocabulary). */
export const tokenId = (piece: string) => [...piece].reduce((h, c) => (h * 131 + c.charCodeAt(0)) % 50257, 7);

// ── A real (tiny) language model: word bigrams counted from a corpus ─────
export function bigramModel(corpus: string) {
  const words = corpus.replace(/\s+/g, " ").trim().split(" ");
  const next = new Map<string, Map<string, number>>();
  for (let i = 0; i < words.length - 1; i++) {
    const m = next.get(words[i]) ?? new Map<string, number>();
    m.set(words[i + 1], (m.get(words[i + 1]) ?? 0) + 1);
    next.set(words[i], m);
  }
  return {
    start: words[0],
    /** Candidates after `w`: logit = ln(count) (exactly what a count-based LM's softmax gives back). */
    candidates(w: string): Cand[] {
      const m = next.get(w);
      return m ? [...m.entries()].map(([tok, n]) => ({ tok, logit: Math.log(n) })) : [];
    },
  };
}
