"use client";

import { CheckCircle2, Dices, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { bigramModel, entropyBits, processLogits, sampleRow, softmax, tokenId, tokenize, type Cand, type Knobs, type Row } from "@/lib/ml/sampling";
import { track, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { GameShell, Levels, type WalkStep } from "../shell";
import { Btn, Log, Slider, Stat } from "../ui";

const GAME = "tokens" as const;
const key = (i: number) => `${GAME}/${i}`;
const DEFAULT: Knobs = { temperature: 1, topK: 0, topP: 1 };
/** The dice (only ever rolled from event handlers). */
const roll = () => Math.random();

// ── Distribution view ────────────────────────────────────────────────────
function Bars({ rows, showLogits = true, pick, onToggle, selected }: { rows: Row[]; showLogits?: boolean; pick?: number | null; onToggle?: (tok: string) => void; selected?: Set<string> }) {
  const lo = Math.min(0, ...rows.map((r) => r.logit));
  const hi = Math.max(...rows.map((r) => r.logit));
  return (
    <ul className="space-y-1" aria-label="Next-token distribution">
      {rows.map((r, i) => (
        <li key={r.tok}>
          <button
            type="button"
            disabled={!onToggle}
            onClick={() => onToggle?.(r.tok)}
            aria-pressed={onToggle ? selected?.has(r.tok) : undefined}
            className={cn(
              "grid w-full grid-cols-[5.5rem_minmax(0,1fr)_3.2rem] items-center gap-2 rounded px-1 py-0.5 text-left font-hud text-xs transition-colors disabled:cursor-default",
              pick === i && "bg-signal/15",
              onToggle && selected?.has(r.tok) && "outline outline-1 outline-signal",
            )}
          >
            <span className={cn("truncate", r.kept ? "text-foreground" : "text-subtle-foreground line-through")}>
              {JSON.stringify(r.tok).slice(1, -1).replace(/^ /, "␣")}
            </span>
            <span className="relative h-4">
              {showLogits ? (
                <span
                  className="absolute top-0 h-1.5 rounded-full bg-white/20"
                  style={{ left: `${((Math.min(0, r.logit) - lo) / (hi - lo || 1)) * 100}%`, width: `${(Math.abs(r.logit) / (hi - lo || 1)) * 100}%` }}
                  title={`logit ${r.logit.toFixed(2)}`}
                />
              ) : null}
              <span
                className={cn("absolute bottom-0 left-0 h-2 rounded-full transition-[width] duration-300", r.kept ? "bg-signal" : "bg-subtle-foreground/40")}
                style={{ width: `${Math.max(r.kept ? r.p : r.pT, 0.002) * 100}%` }}
              />
            </span>
            <span className={cn("text-right tabular-nums", r.kept ? "text-foreground" : "text-subtle-foreground")}>{(r.p * 100).toFixed(r.p < 0.1 ? 1 : 0)}%</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function KnobPanel({ k, set, n, lock }: { k: Knobs; set: (k: Knobs) => void; n: number; lock?: (keyof Knobs)[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      <Slider label="temperature" value={k.temperature} min={0.05} max={2.5} step={0.05} onChange={(v) => set({ ...k, temperature: v })} format={(v) => v.toFixed(2)} disabled={lock?.includes("temperature")} />
      <Slider label="top-k" value={k.topK} min={0} max={n} onChange={(v) => set({ ...k, topK: v })} format={(v) => (v ? String(v) : "off")} disabled={lock?.includes("topK")} />
      <Slider label="top-p" value={k.topP} min={0.05} max={1} step={0.01} onChange={(v) => set({ ...k, topP: v })} format={(v) => (v >= 1 ? "off" : v.toFixed(2))} disabled={lock?.includes("topP")} />
    </div>
  );
}

// ── Contexts (logits are illustrative, hand-set to resemble a real model) ─
const CAT: Cand[] = [
  { tok: " mat", logit: 4.2 },
  { tok: " floor", logit: 3.7 },
  { tok: " sofa", logit: 3.3 },
  { tok: " couch", logit: 3.1 },
  { tok: " bed", logit: 2.9 },
  { tok: " roof", logit: 2.3 },
  { tok: " chair", logit: 2.2 },
  { tok: " windowsill", logit: 1.9 },
  { tok: " keyboard", logit: 1.4 },
  { tok: " moon", logit: -0.6 },
];
const CUP: Cand[] = [
  { tok: " tea", logit: 4.4 },
  { tok: " coffee", logit: 4.3 },
  { tok: " hot", logit: 2.9 },
  { tok: " water", logit: 2.6 },
  { tok: " sugar", logit: 1.9 },
  { tok: " milk", logit: 1.7 },
  { tok: " soup", logit: 1.1 },
  { tok: " joe", logit: 0.9 },
  { tok: " kindness", logit: 0.2 },
];
const ONCE: Cand[] = [
  { tok: " little", logit: 3.9 },
  { tok: " young", logit: 3.4 },
  { tok: " king", logit: 3.2 },
  { tok: " girl", logit: 3.1 },
  { tok: " boy", logit: 2.9 },
  { tok: " princess", logit: 2.7 },
  { tok: " small", logit: 2.4 },
  { tok: " dragon", logit: 2.1 },
  { tok: " wise", logit: 1.8 },
  { tok: " robot", logit: 0.9 },
  { tok: " spreadsheet", logit: -1.2 },
  { tok: " the", logit: -2.4 },
];
const RIVER_PROMPTS: { text: string; cands: Cand[] }[] = [
  {
    text: "She walked to the bank to",
    cands: [
      { tok: " deposit", logit: 3.6, tag: "money" },
      { tok: " withdraw", logit: 3.3, tag: "money" },
      { tok: " open", logit: 2.7, tag: "money" },
      { tok: " cash", logit: 2.3, tag: "money" },
      { tok: " fish", logit: 1.9, tag: "river" },
      { tok: " sit", logit: 1.6, tag: "river" },
      { tok: " watch", logit: 1.3, tag: "river" },
      { tok: " swim", logit: 0.7, tag: "river" },
    ],
  },
  {
    text: "She walked along the river bank to",
    cands: [
      { tok: " fish", logit: 3.5, tag: "river" },
      { tok: " watch", logit: 3.3, tag: "river" },
      { tok: " sit", logit: 3.0, tag: "river" },
      { tok: " swim", logit: 2.1, tag: "river" },
      { tok: " deposit", logit: 0.4, tag: "money" },
      { tok: " withdraw", logit: 0.1, tag: "money" },
      { tok: " open", logit: 0.6, tag: "money" },
      { tok: " cash", logit: -0.3, tag: "money" },
    ],
  },
  {
    text: "She walked into the bank to",
    cands: [
      { tok: " deposit", logit: 4.1, tag: "money" },
      { tok: " withdraw", logit: 3.8, tag: "money" },
      { tok: " open", logit: 3.0, tag: "money" },
      { tok: " cash", logit: 2.6, tag: "money" },
      { tok: " fish", logit: 0.2, tag: "river" },
      { tok: " sit", logit: 0.9, tag: "river" },
      { tok: " watch", logit: 0.5, tag: "river" },
      { tok: " swim", logit: -0.8, tag: "river" },
    ],
  },
];
const RAIN: Cand[] = [
  { tok: " muddy", logit: 3.6 },
  { tok: " flooded", logit: 3.4 },
  { tok: " slippery", logit: 3.0 },
  { tok: " wet", logit: 2.9 },
  { tok: " empty", logit: 2.1 },
  { tok: " green", logit: 1.8 },
  { tok: " quiet", logit: 1.5 },
  { tok: " closed", logit: 0.9 },
  { tok: " profitable", logit: -0.5 },
];

/** An illustrative little language model (a Markov chain over words) built to loop when greedy and babble when hot. */
const MARKOV: Record<string, [string, number][]> = {
  The: [["model", 3.0], ["network", 2.5], ["data", 2.0], ["robot", 0.4], ["banana", -0.2], ["teapot", -0.4]],
  the: [["model", 3.0], ["network", 2.6], ["data", 2.3], ["layers", 1.8], ["moon", -0.3], ["sock", -0.5]],
  model: [["learns", 3.0], ["predicts", 2.6], ["sees", 2.0], ["dances", -0.3], ["sneezes", -0.6]],
  network: [["learns", 2.8], ["predicts", 2.4], ["grows", 1.5], ["sings", -0.4], ["melts", -0.6]],
  data: [["shows", 2.6], ["flows", 2.2], ["learns", 1.8], ["explodes", -0.3], ["giggles", -0.5]],
  learns: [["the", 3.0], ["patterns", 2.7], ["from", 2.4], ["quickly", 1.6], ["spaghetti", -0.2]],
  predicts: [["the", 3.0], ["words", 2.6], ["tokens", 2.4], ["everything", 0.5], ["pizza", -0.3]],
  sees: [["patterns", 2.5], ["the", 2.4], ["data", 1.8], ["ghosts", -0.4]],
  shows: [["patterns", 2.6], ["the", 2.2], ["off", -0.2]],
  flows: [["through", 2.5], ["into", 2.2], ["backwards", -0.3]],
  through: [["the", 3.0], ["layers", 2.6], ["jelly", -0.5]],
  into: [["the", 2.8], ["layers", 2.3], ["soup", -0.5]],
  from: [["data", 2.8], ["examples", 2.5], ["mistakes", 2.2], ["vibes", -0.2]],
  patterns: [["in", 2.8], ["and", 2.4], ["quickly", 1.2], ["wobbly", -0.5]],
  in: [["the", 2.9], ["data", 2.4], ["pyjamas", -0.4]],
  and: [["predicts", 2.6], ["learns", 2.4], ["sees", 2.0], ["naps", -0.4]],
  words: [["and", 2.5], [".", 2.3]],
  tokens: [["and", 2.6], [".", 2.3]],
  layers: [[".", 2.6], ["and", 2.2]],
  examples: [[".", 2.5], ["and", 2.2]],
  mistakes: [[".", 2.7], ["and", 2.0]],
  quickly: [[".", 2.6], ["and", 2.0]],
  grows: [[".", 2.0], ["and", 1.5]],
};
const markov = (w: string): Cand[] => (MARKOV[w] ?? [[".", 0]]).map(([tok, logit]) => ({ tok, logit }));

/** One generation from the Markov model; "clean" = no loop, no wild pick, at least 4 words. */
function generateOnce(k: Knobs) {
  let w = "The";
  const out: { word: string; p: number }[] = [];
  for (let i = 0; i < 12 && w !== "."; i++) {
    const rs = processLogits(markov(w), k);
    const j = sampleRow(rs, roll());
    out.push({ word: rs[j].tok, p: rs[j].p1 });
    w = rs[j].tok;
  }
  const counts = new Map<string, number>();
  ["The", ...out.map((o) => o.word)].forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  const loop = [...counts.entries()].find(([x, n]) => n >= 3 && x.length > 3)?.[0];
  const wild = out.find((o) => o.p < 0.05);
  return { out, loop, wild, clean: !loop && !wild && out.length >= 4 };
}

interface Level {
  name: string;
  context: string;
  cands: Cand[];
  goal: string;
  hint: string;
  locked?: Partial<Knobs>;
  start?: Partial<Knobs>;
  mode?: "select" | "prompt" | "generate";
  check?: (rows: Row[], k: Knobs) => boolean;
}

const massOf = (rows: Row[], tag: string) => rows.reduce((s, r) => s + (r.tag === tag ? r.p : 0), 0);

const LEVELS: Level[] = [
  {
    name: "Make it certain",
    context: "The cat sat on the",
    cands: CAT,
    goal: "Make the model say “mat” at least 99% of the time.",
    hint: "Cold temperatures sharpen the distribution. Or keep only the top candidate.",
    check: (rows) => (rows.find((r) => r.tok === " mat")?.p ?? 0) >= 0.99,
  },
  {
    name: "Exactly three",
    context: "I'd like a cup of",
    cands: CUP,
    goal: "Leave exactly three possible words, using top-p only (top-k off).",
    hint: "Top-p keeps the smallest set of words whose probability adds up to p.",
    check: (rows, k) => k.topK === 0 && rows.filter((r) => r.kept).length === 3,
  },
  {
    name: "Creative, not chaotic",
    context: "Once upon a time, there was a",
    cands: ONCE,
    goal: "Spread the odds (entropy 2.4–3.1 bits) while every remaining word has at least a 2% chance.",
    hint: "Warm it up to spread probability, then trim the silly tail with top-p.",
    check: (rows) => {
      const kept = rows.filter((r) => r.kept);
      const h = entropyBits(kept.map((r) => r.p));
      return h >= 2.4 && h <= 3.1 && kept.every((r) => r.p >= 0.02);
    },
  },
  {
    name: "Which can it say?",
    context: "After the rain, the river bank was",
    cands: RAIN,
    goal: "With these settings fixed (T 0.8, top-k 6, top-p 0.85), select every word the model could possibly sample.",
    hint: "Top-k cuts first (6 words), then top-p keeps the smallest prefix reaching 85% of what's left.",
    locked: { temperature: 0.8, topK: 6, topP: 0.85 },
    mode: "select",
  },
  {
    name: "Change its mind",
    context: RIVER_PROMPTS[0].text,
    cands: RIVER_PROMPTS[0].cands,
    goal: "Make the river meaning (fish, sit, watch, swim) more likely than the money meaning.",
    hint: "Top-k and top-p only ever cut the unlikely tail. Temperature can't flip the order. What else could change?",
    mode: "prompt",
  },
  {
    name: "Write with it",
    context: "",
    cands: [],
    goal: "This model is set to greedy decoding and it loops. Fix it: at least 2 of 3 generations must avoid loops and never pick a word the model gave under 5%.",
    hint: "Too cold and it loops on its favourite phrase; too hot and it grabs silly words from the tail. Warm it up, then trim the tail.",
    mode: "generate",
    start: { temperature: 0.1 },
  },
];

// ── Walkthrough demos ────────────────────────────────────────────────────
function TokenizerDemo() {
  const [text, setText] = useState("The cat sat on the mat. Tokenization is unbelievable!");
  const toks = tokenize(text);
  return (
    <div className="space-y-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 80))}
        aria-label="Text to tokenize"
        className="w-full rounded-md border border-border-strong bg-background px-3 py-2 font-mono text-sm outline-none focus:border-signal"
      />
      <div className="flex flex-wrap gap-1">
        {toks.map((t, i) => (
          <span key={i} className="rounded border border-signal/40 bg-signal/10 px-1.5 py-0.5 font-mono text-xs" title={`id ${tokenId(t)}`}>
            {t.replace(/ /g, "␣")}
            <sub className="ml-1 text-[0.55rem] text-subtle-foreground">{tokenId(t)}</sub>
          </span>
        ))}
      </div>
      <p className="font-hud text-[0.66rem] text-subtle-foreground">{toks.length} tokens · ␣ marks a leading space · try a long or made-up word</p>
    </div>
  );
}

function SoftmaxDemo() {
  const [l, setL] = useState([3, 2, 0.5]);
  const names = [" mat", " floor", " moon"];
  const p = softmax(l);
  return (
    <div className="space-y-3">
      {names.map((n, i) => (
        <div key={n} className="grid grid-cols-[4rem_minmax(0,1fr)_3rem] items-center gap-3">
          <span className="font-mono text-sm">{n.trim()}</span>
          <Slider label={`logit ${l[i].toFixed(1)}`} value={l[i]} min={-3} max={6} step={0.1} onChange={(v) => setL((x) => x.map((y, j) => (j === i ? v : y)))} />
          <span className="text-right font-hud text-sm tabular-nums">{(p[i] * 100).toFixed(0)}%</span>
        </div>
      ))}
      <p className="font-hud text-xs text-muted-foreground">p(i) = e^(logit i) / Σ e^(logit j) · probabilities always sum to 100%</p>
    </div>
  );
}

function KnobDemo({ only }: { only: "temperature" | "cuts" }) {
  const [k, setK] = useState<Knobs>(DEFAULT);
  const rows = processLogits(CAT, k);
  const h = entropyBits(rows.filter((r) => r.kept).map((r) => r.p));
  return (
    <div className="space-y-3">
      <p className="font-mono text-sm text-muted-foreground">The cat sat on the …</p>
      <Bars rows={rows} />
      <KnobPanel k={k} set={setK} n={CAT.length} lock={only === "temperature" ? ["topK", "topP"] : ["temperature"]} />
      <p className="font-hud text-[0.66rem] text-subtle-foreground">
        entropy {h.toFixed(2)} bits · {rows.filter((r) => r.kept).length} candidates left
      </p>
    </div>
  );
}

function LoopDemo({ corpus }: { corpus: string }) {
  const lm = useMemo(() => bigramModel(corpus), [corpus]);
  const [words, setWords] = useState<string[]>([lm.start]);
  const cands = lm.candidates(words.at(-1)!);
  const rows = processLogits(cands, { temperature: 0.9, topK: 6, topP: 0.95 }).slice(0, 6);
  return (
    <div className="space-y-3">
      <p className="min-h-12 font-mono text-sm leading-relaxed">
        {words.map((w, i) => (
          <span key={i} className={i === words.length - 1 ? "text-signal-pale" : "text-muted-foreground"}>
            {w}{" "}
          </span>
        ))}
      </p>
      {rows.length ? <Bars rows={rows} showLogits={false} /> : <p className="font-hud text-xs text-subtle-foreground">no known continuation: end of text</p>}
      <div className="flex gap-2">
        <Btn
          variant="primary"
          disabled={!rows.length}
          onClick={() => {
            const full = processLogits(cands, { temperature: 0.9, topK: 6, topP: 0.95 });
            setWords((w) => [...w, full[sampleRow(full, roll())].tok]);
            sfx("key");
          }}
        >
          <Dices className="size-4" /> Sample the next word
        </Btn>
        <Btn onClick={() => setWords([lm.start])}>Reset</Btn>
      </div>
    </div>
  );
}

const steps = (corpus: string): WalkStep[] => [
  {
    title: "Text becomes tokens",
    body: (
      <p>
        A language model never sees letters or words. It sees <b className="text-foreground">tokens</b>: common chunks of text, each with an id. Frequent words are
        one token; rare ones get split into pieces. Type anything.
      </p>
    ),
    demo: <TokenizerDemo />,
    deeper: "Real tokenizers (BPE, SentencePiece) learn ~50–200k pieces by repeatedly merging the most frequent pairs in a corpus. This toy uses greedy longest-match.",
  },
  {
    title: "Every token gets a score",
    body: (
      <p>
        After reading the context, the model outputs one number per token in its whole vocabulary: a <b className="text-foreground">logit</b>. Higher means more
        likely. They aren&apos;t probabilities yet; they can be negative.
      </p>
    ),
    demo: (
      <div className="space-y-2">
        <p className="font-mono text-sm text-muted-foreground">The cat sat on the …</p>
        <Bars rows={processLogits(CAT, DEFAULT)} />
        <p className="font-hud text-[0.66rem] text-subtle-foreground">thin grey bar: the logit · thick bar: the resulting probability</p>
      </div>
    ),
    deeper: "logits = h_final · W_unembed: one dot product per vocabulary entry.",
  },
  {
    title: "Softmax makes probabilities",
    body: <p>Softmax exponentiates every logit and divides by the total, so the results are positive and sum to one. Small logit gaps become big probability gaps.</p>,
    demo: <SoftmaxDemo />,
  },
  {
    title: "Temperature",
    body: (
      <p>
        Divide every logit by a temperature before softmax. Below 1 the favourite dominates (focused, repetitive). Above 1 the odds flatten (varied, eventually
        nonsense).
      </p>
    ),
    demo: <KnobDemo only="temperature" />,
    deeper: "p ∝ exp(logit / T). As T → 0 this becomes greedy argmax decoding; as T → ∞ it becomes uniform.",
  },
  {
    title: "Top-k and top-p",
    body: (
      <p>
        Two ways to cut the long tail of unlikely words. <b className="text-foreground">Top-k</b> keeps the k best. <b className="text-foreground">Top-p</b> (nucleus)
        keeps the smallest set that covers p of the probability. Crossed-out words can never be picked.
      </p>
    ),
    demo: <KnobDemo only="cuts" />,
    deeper: "Order here: temperature → top-k → top-p → renormalise, the usual order in open-source decoders.",
  },
  {
    title: "Sample, append, repeat",
    body: (
      <>
        <p>
          Pick one token at random by those odds, stick it on the end, and run the model again. That&apos;s all generation is. This one is a real (tiny) model: word
          pairs counted from my bio.
        </p>
        <p>Your challenges: steer the dice. The last level shows why there is rarely one &ldquo;correct&rdquo; next word.</p>
      </>
    ),
    demo: <LoopDemo corpus={corpus} />,
  },
];

// ── Game ─────────────────────────────────────────────────────────────────
export default function TokenPrediction({ data }: { data?: unknown }) {
  const corpus = (data as { corpus: string } | undefined)?.corpus ?? "";
  const progress = useProgress();
  const [level, setLevel] = useState(0);
  const L = LEVELS[level];
  const [k, setK] = useState<Knobs>(DEFAULT);
  const [prompt, setPrompt] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [gens, setGens] = useState<ReturnType<typeof generateOnce>[]>([]);
  const [pick, setPick] = useState<number | null>(null);

  const knobs: Knobs = { ...k, ...L.locked };
  const cands = L.mode === "prompt" ? RIVER_PROMPTS[prompt].cands : L.cands;
  const context = L.mode === "prompt" ? RIVER_PROMPTS[prompt].text : L.context;
  const rows = processLogits(cands, knobs);
  const cleared = LEVELS.map((_, i) => (progress.best[key(i)] ?? 0) >= 1);

  useEffect(() => {
    const b = LEVELS.map((_, i) => progress.best[key(i)] ?? 0);
    if (b.every((x) => x >= 1)) track({ t: "cleared", game: GAME });
    if (b.every((x) => x >= 2)) track({ t: "mastered", game: GAME });
  }, [progress.best]);

  const pickLevel = (i: number) => {
    setLevel(i);
    setK({ ...DEFAULT, ...LEVELS[i].start });
    setPrompt(0);
    setSelected(new Set());
    setAttempts(0);
    setResult(null);
    setGens([]);
    setPick(null);
  };

  const finish = (ok: boolean, msg: string) => {
    setResult({ ok, msg });
    const first = attempts === 0;
    setAttempts((a) => a + 1);
    if (ok) {
      sfx("win");
      track({ t: "best", game: key(level), score: first ? 2 : 1 });
    } else sfx("miss");
  };

  const check = () => {
    if (L.mode === "select") {
      const truth = new Set(rows.filter((r) => r.kept).map((r) => r.tok));
      const ok = truth.size === selected.size && [...truth].every((t) => selected.has(t));
      return finish(ok, ok ? "exactly right: those are the only words that survive both cuts." : `not quite. the survivors are: ${[...truth].map((t) => t.trim()).join(", ")}.`);
    }
    if (L.mode === "prompt") {
      const river = massOf(rows, "river");
      const ok = river > 0.5;
      return finish(
        ok,
        ok
          ? `river meaning now ${(river * 100).toFixed(0)}%. the knobs only reshape odds; the context decides what the model means.`
          : `river meaning only ${(river * 100).toFixed(0)}%. no sampling setting can flip which meaning the model prefers.`,
      );
    }
    const ok = L.check!(rows, knobs);
    finish(ok, ok ? "goal met." : "not yet. look at the bars again.");
  };

  const generate = () => {
    const runs = [generateOnce(knobs), generateOnce(knobs), generateOnce(knobs)];
    setGens(runs);
    sfx("key");
    const good = runs.filter((g) => g.clean).length;
    const bad = runs.find((g) => !g.clean);
    finish(
      good >= 2,
      good >= 2
        ? `${good} of 3 clean: varied, plausible, no loops. that balance is why chat models rarely decode greedily.`
        : bad?.loop
          ? `it looped on “${bad.loop}”. near-greedy decoding keeps taking the same favourite path; warm it up.`
          : bad?.wild
            ? `“${bad.wild.word}” had only ${(bad.wild.p * 100).toFixed(1)}% probability. too hot; trim the tail with top-p or top-k.`
            : "too many stopped after a few words. try again.",
    );
  };

  const sampleOnce = () => {
    const j = sampleRow(rows, roll());
    setPick(j);
    sfx("key");
  };

  return (
    <GameShell
      game={GAME}
      title="Token Prediction"
      steps={steps(corpus)}
      stats={
        <>
          <Stat k="challenge" v={`${level + 1} / ${LEVELS.length}`} />
          <Stat k="entropy" v={`${entropyBits(rows.filter((r) => r.kept).map((r) => r.p)).toFixed(2)} bits`} />
          <Stat k="candidates" v={rows.filter((r) => r.kept).length || "–"} />
          <Stat k="tries" v={attempts} />
        </>
      }
    >
      <div className="space-y-4">
        <Levels names={LEVELS.map((l) => l.name)} current={level} cleared={cleared} onPick={pickLevel} />
        <div className="rounded-md border border-border p-3">
          <p className="hud">goal</p>
          <p className="mt-1 text-sm">{L.goal}</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            {L.mode === "generate" ? (
              <>
                <p className="hud">three generations · hover a word for its probability</p>
                <ol className="space-y-2">
                  {(gens.length ? gens : [null, null, null]).map((g, n) => (
                    <li key={n} className={cn("min-h-11 rounded-md border p-2.5 font-mono text-sm leading-relaxed", g ? (g.clean ? "border-success/50" : "border-signal-soft/50") : "border-border")}>
                      <span className="text-muted-foreground">The </span>
                      {g?.out.map((o, i) => (
                        <span key={i} className={o.p < 0.05 ? "text-signal-soft underline" : g.loop === o.word ? "text-[#facc15]" : "text-foreground"} title={`${(o.p * 100).toFixed(1)}%`}>
                          {o.word}{" "}
                        </span>
                      ))}
                    </li>
                  ))}
                </ol>
                <details className="rounded-md border border-dashed border-border-strong p-3">
                  <summary className="font-hud text-xs text-muted-foreground">sandbox · a real (tiny) model: word pairs counted from my bio</summary>
                  <div className="mt-3">
                    <LoopDemo corpus={corpus} />
                  </div>
                </details>
              </>
            ) : (
              <>
                <p className="font-mono text-base">
                  <span className="text-muted-foreground">{context}</span>
                  <span className="ml-1 inline-block animate-caret text-signal">▍</span>
                  {pick !== null && rows[pick] ? <span className="text-signal-pale">{rows[pick].tok}</span> : null}
                </p>
                {L.mode === "prompt" ? (
                  <div className="space-y-1" role="radiogroup" aria-label="Prompt">
                    <p className="hud">rewrite the prompt</p>
                    {RIVER_PROMPTS.map((pr, i) => (
                      <button
                        key={pr.text}
                        type="button"
                        role="radio"
                        aria-checked={prompt === i}
                        onClick={() => setPrompt(i)}
                        className={cn("block w-full rounded-md border px-3 py-1.5 text-left font-mono text-xs", prompt === i ? "border-signal/60 bg-signal/10" : "border-border text-muted-foreground")}
                      >
                        {pr.text} …
                      </button>
                    ))}
                  </div>
                ) : null}
                <Bars
                  rows={rows}
                  pick={pick}
                  onToggle={
                    L.mode === "select"
                      ? (tok) =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (n.has(tok)) n.delete(tok);
                            else n.add(tok);
                            return n;
                          })
                      : undefined
                  }
                  selected={selected}
                />
                {L.mode === "select" ? <p className="font-hud text-[0.66rem] text-subtle-foreground">click words to select them · the bars show T-adjusted odds before the cuts</p> : null}
              </>
            )}
          </div>
          <div className="space-y-4">
            <KnobPanel k={knobs} set={setK} n={Math.max(1, cands.length || 12)} lock={L.locked ? (Object.keys(L.locked) as (keyof Knobs)[]) : undefined} />
            <div className="flex flex-wrap gap-2">
              {L.mode === "generate" ? (
                <Btn variant="primary" onClick={generate}>
                  <Sparkles className="size-4" /> Generate 3 times
                </Btn>
              ) : (
                <>
                  <Btn variant="primary" onClick={check}>
                    <CheckCircle2 className="size-4" /> Check
                  </Btn>
                  <Btn onClick={sampleOnce}>
                    <Dices className="size-4" /> Sample once
                  </Btn>
                </>
              )}
              <Btn
                variant="quiet"
                onClick={() => {
                  setK(DEFAULT);
                  setResult(null);
                  setPick(null);
                }}
              >
                <RotateCcw className="size-4" /> Reset knobs
              </Btn>
            </div>
            {result ? <Log tone={result.ok ? "good" : "bad"}>{result.msg}</Log> : <Log>hint: {L.hint}</Log>}
            <p className="font-hud text-[0.62rem] text-subtle-foreground">logits here are illustrative, hand-set to behave like a real model&apos;s; the maths applied to them is exact.</p>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
