import type { IndexDoc } from "@/lib/search-index";

const STOP = new Set(
  "a an and are as at be by did do does for from has have he his how i in is it its me my of on or so tell that the their them this to was what when where which who why with you your about avishake adhikary build built building make made work worked working do done use used using project projects know knows familiar experience experienced good any".split(
    " ",
  ),
);

const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");

/** Everyday words → the concepts the content actually uses. */
const SYNONYMS: Record<string, string[]> = {
  speak: ["english", "bengali", "hindi", "german", "spanish"],
  study: ["degree", "university", "bca", "mca", "amity"],
  studi: ["degree", "university", "bca", "mca", "amity"],
  educat: ["degree", "university", "bca", "mca", "amity"],
  college: ["university", "amity"],
  job: ["engineer", "role"],
  current: ["minion", "zoyemed"],
  now: ["minion", "zoyemed"],
  paper: ["publication"],
  research: ["publication"],
  hire: ["open", "role"],
  award: ["honor", "baljit"],
};
const terms = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);

export interface Answer {
  text: string;
  sources: { title: string; url: string }[];
}

/**
 * Tiny BM25 over sentences of the site's own content. Honest by
 * construction: it can only return sentences that exist on the site.
 */
export function retrieve(question: string, docs: IndexDoc[]): Answer | null {
  const base = terms(question);
  const q = [...new Set([...base, ...base.flatMap((t) => (SYNONYMS[t] ?? []).map(stem))])];
  if (!q.length) return null;

  const sentences = docs.flatMap((d) =>
    d.text
      .split(/(?<=[.!?])\s+(?=[A-Z"])/)
      .filter((s) => s.length > 30)
      .map((s) => ({ doc: d, s, t: terms(`${d.title} ${s}`) })),
  );
  const N = sentences.length;
  const avg = sentences.reduce((a, x) => a + x.t.length, 0) / Math.max(1, N);
  const df = new Map<string, number>();
  for (const x of sentences) for (const t of new Set(x.t)) df.set(t, (df.get(t) ?? 0) + 1);

  // Entity boost: if the question names an org/project (a word from a doc title),
  // sentences from those docs win, e.g. "what did you build at PTS?".
  const titleTerms = (d: IndexDoc) => new Set(terms(d.title));
  const entityDocs = new Set(docs.filter((d) => q.some((t) => t.length > 2 && titleTerms(d).has(t))).map((d) => d.id));

  const wantsBuilt = /\b(build|built|make|made|create|ship|projects?)\b/i.test(question);

  const k1 = 1.4;
  const b = 0.7;
  const scored = sentences
    .map((x) => {
      let score = 0;
      for (const term of q) {
        const f = x.t.filter((t) => t === term || (term.length >= 5 && t.startsWith(term))).length;
        if (!f) continue;
        const idf = Math.log(1 + (N - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * x.t.length) / avg)));
      }
      if (entityDocs.has(x.doc.id)) score *= 4;
      // Intent: "what did you build/make…" prefers sentences about what was built or shipped.
      if (wantsBuilt && /\b(built|build|shipp|developed|created|designed)\w*/i.test(x.s)) score *= 1.8;
      return { ...x, score };
    })
    .filter((x) => x.score > 0 && (!entityDocs.size || entityDocs.has(x.doc.id) || x.score > 6))
    .sort((a, z) => z.score - a.score);

  if (!scored.length) return null;
  const picked: typeof scored = [];
  const perDoc = new Map<string, number>();
  for (const x of scored) {
    if ((perDoc.get(x.doc.id) ?? 0) >= 2) continue;
    if (picked.some((p) => p.s === x.s)) continue;
    picked.push(x);
    perDoc.set(x.doc.id, (perDoc.get(x.doc.id) ?? 0) + 1);
    if (picked.length === 3) break;
  }
  const sources = [...new Map(picked.map((p) => [p.doc.url + p.doc.title, { title: p.doc.title, url: p.doc.url }])).values()];
  return { text: picked.map((p) => p.s).join(" "), sources };
}

/** Levenshtein distance, for "did you mean" suggestions. */
export function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function closest(word: string, options: string[]) {
  let best = "";
  let d = Infinity;
  for (const o of options) {
    const x = distance(word.toLowerCase(), o.toLowerCase());
    if (x < d) {
      d = x;
      best = o;
    }
  }
  return d <= Math.max(2, Math.floor(word.length / 3)) ? best : null;
}
