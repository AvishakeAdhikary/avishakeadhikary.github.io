"use client";

import { FlaskConical, Microscope, Send, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { components, decode, dla, FACTS, INDUCTION, probOf, run, SUPPRESSION, VOCAB, type CompId, type Model, type Run, type Tok } from "@/lib/ml/interp";
import { track, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { GameShell, Levels, type WalkStep } from "../shell";
import { Btn, Log, Stat, usePalette } from "../ui";

const GAME = "interp" as const;
const key = (i: number) => `${GAME}/${i}`;

type Kind = "necessary" | "fighting" | "patch";

interface Level {
  name: string;
  model: Model;
  tokens: Tok[];
  corrupted?: Tok[];
  answer: Tok;
  kind: Kind;
  question: string;
  hint: string;
}

const LEVELS: Level[] = [
  {
    name: "The copy machine",
    model: INDUCTION,
    tokens: ["<bos>", "Anna", "met", "Bo", ".", "Anna", "met"],
    answer: "Bo",
    kind: "necessary",
    question: "The model completes “Anna met Bo . Anna met” with “Bo”. Which components does it need? Submit every one whose removal breaks the answer.",
    hint: "Two heads work as a pair. One of them only matters because of what it feeds the other.",
  },
  {
    name: "The saboteur",
    model: SUPPRESSION,
    tokens: ["<bos>", "Anna", "met", "Bo", ".", "Cy", "saw", "Dee", ".", "Anna", "met"],
    answer: "Bo",
    kind: "fighting",
    question: "Same trick, but the model is only 63% sure of “Bo”. Something is fighting the answer. Find the component(s) whose removal makes the model more confident.",
    hint: "Look for a negative direct contribution to “Bo”.",
  },
  {
    name: "Where facts live",
    model: FACTS,
    tokens: ["<bos>", "Rome", "is", "in"],
    answer: "Italy",
    kind: "necessary",
    question: "“Rome is in” → “Italy”. This model has an MLP layer too. Which components does the fact depend on?",
    hint: "The subject is two tokens back. Something has to fetch it, and something has to know the answer.",
  },
  {
    name: "Patch it back",
    model: INDUCTION,
    tokens: ["<bos>", "Anna", "met", "Bo", ".", "Anna", "met"],
    corrupted: ["<bos>", "Anna", "met", "Bo", ".", "Anna", "saw"],
    answer: "Bo",
    kind: "patch",
    question: "Corrupt the last word (“met” → “saw”) and “Bo” disappears. Patch single components from the clean run into the corrupted one: which ones bring “Bo” back?",
    hint: "Activation patching localises where the difference between two inputs is carried.",
  },
];

/** The ground truth, computed from real interventions on the real model. */
function truth(L: Level): Set<string> {
  const comps = components(L.model);
  if (L.kind === "patch") {
    const clean = run(L.model, L.tokens);
    const base = probOf(clean, L.answer);
    return new Set(comps.filter((c) => probOf(run(L.model, L.corrupted!, { patch: { from: clean, ids: new Set([c]) } }), L.answer) >= base * 0.5));
  }
  const base = probOf(run(L.model, L.tokens), L.answer);
  return new Set(
    comps.filter((c) => {
      const p = probOf(run(L.model, L.tokens, { ablate: new Set([c]) }), L.answer);
      return L.kind === "necessary" ? p < base * 0.5 : p > base + 0.15;
    }),
  );
}

// ── Views ────────────────────────────────────────────────────────────────
function Tokens({ tokens, highlight }: { tokens: Tok[]; highlight?: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tokens.map((t, i) => (
        <span key={i} className={cn("rounded border px-1.5 py-0.5 font-mono text-xs", i === highlight ? "border-signal text-signal-pale" : "border-border-strong text-muted-foreground")}>
          <sub className="mr-1 text-[0.55rem] text-subtle-foreground">{i}</sub>
          {t}
        </span>
      ))}
    </div>
  );
}

function Output({ r, answer }: { r: Run; answer: Tok }) {
  const top = VOCAB.map((t, i) => ({ t, p: r.probs[i] }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 5);
  return (
    <ul className="space-y-1">
      {top.map(({ t, p }) => (
        <li key={t} className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-2 font-hud text-xs">
          <span className={t === answer ? "text-signal-pale" : "text-muted-foreground"}>{t}</span>
          <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <span className={cn("block h-full rounded-full transition-[width] duration-300", t === answer ? "bg-signal" : "bg-subtle-foreground/60")} style={{ width: `${p * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{(p * 100).toFixed(p < 0.1 ? 1 : 0)}%</span>
        </li>
      ))}
    </ul>
  );
}

function AttnHeat({ r, head }: { r: Run; head: string }) {
  const pal = usePalette();
  const P = r.attn[head];
  const n = r.tokens.length;
  const C = 22;
  if (!P) return null;
  return (
    <svg viewBox={`0 0 ${C * (n + 2.6)} ${C * (n + 2.6)}`} className="w-full max-w-[22rem]" role="img" aria-label={`${head} attention pattern`}>
      {r.tokens.map((t, i) => (
        <text key={`q${i}`} x={C * 2.4} y={C * (i + 2.25)} textAnchor="end" fontSize={9} className="font-hud" fill={pal.muted}>
          {t}
        </text>
      ))}
      {r.tokens.map((t, j) => (
        <text key={`k${j}`} x={C * (j + 3.1)} y={C * 1.4} textAnchor="start" fontSize={9} className="font-hud" fill={pal.muted} transform={`rotate(-45 ${C * (j + 3.1)} ${C * 1.4})`}>
          {t}
        </text>
      ))}
      {r.tokens.map((_, i) =>
        r.tokens.map((__, j) => (
          <rect key={`${i}-${j}`} x={C * (j + 2.6)} y={C * (i + 1.6)} width={C - 2} height={C - 2} rx={2} fill={j > i ? pal.border : pal.signal} opacity={j > i ? 0.25 : 0.07 + P[i * n + j] * 0.93} />
        )),
      )}
      <text x={C * 2.6} y={C * (n + 2.4)} fontSize={9} className="font-hud" fill={pal.subtle}>
        rows: query (reading) · columns: key (being read)
      </text>
    </svg>
  );
}

function Lens({ r, model }: { r: Run; model: Model }) {
  const stages = ["embedding", "after layer 0", "after layer 1 attention", ...(model.neurons.length ? ["after the MLP"] : [])];
  return (
    <ol className="space-y-1.5">
      {r.lens.map((x, i) => {
        const p = decode(x);
        const top = VOCAB.map((t, k) => ({ t, p: p[k] }))
          .sort((a, b) => b.p - a.p)
          .slice(0, 2);
        const flat = top[0].p < 0.1;
        return (
          <li key={i} className="flex items-center justify-between gap-3 font-hud text-xs">
            <span className="text-muted-foreground">{stages[i]}</span>
            <span className={flat ? "text-subtle-foreground" : "text-foreground"}>{flat ? "no opinion yet" : top.map((x) => `${x.t} ${(x.p * 100).toFixed(0)}%`).join(" · ")}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ── Walkthrough ──────────────────────────────────────────────────────────
const W_TOKENS: Tok[] = ["<bos>", "Anna", "met", "Bo", ".", "Anna", "met"];

function DemoOutput() {
  const r = useMemo(() => run(INDUCTION, W_TOKENS), []);
  return (
    <div className="space-y-3">
      <Tokens tokens={W_TOKENS} highlight={6} />
      <Output r={r} answer="Bo" />
      <p className="font-hud text-[0.66rem] text-subtle-foreground">a 2-layer, 4-head transformer · we know what it says. why does it say it?</p>
    </div>
  );
}

function DemoLens() {
  const r = useMemo(() => run(INDUCTION, W_TOKENS), []);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-hud text-[0.66rem] text-subtle-foreground">
        {["embed", "L0 heads", "L1 heads", "unembed"].map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className="rounded border border-border-strong px-2 py-1 text-muted-foreground">{s}</span>
            {i < 3 ? "→" : null}
          </span>
        ))}
      </div>
      <Lens r={r} model={INDUCTION} />
      <p className="font-hud text-[0.66rem] text-subtle-foreground">logit lens: decode the stream at each stage as if it were the end</p>
    </div>
  );
}

function DemoHeads() {
  const r = useMemo(() => run(INDUCTION, W_TOKENS), []);
  const [h, setH] = useState<CompId>("L0H0");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {(["L0H0", "L0H1", "L1H0", "L1H1"] as CompId[]).map((x) => (
          <Btn key={x} variant={h === x ? "primary" : "ghost"} className="h-8 px-3" onClick={() => setH(x)}>
            {x}
          </Btn>
        ))}
      </div>
      <AttnHeat r={r} head={h} />
    </div>
  );
}

function DemoAblate() {
  const [off, setOff] = useState<Set<string>>(new Set());
  const r = run(INDUCTION, W_TOKENS, { ablate: off });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(["L0H0", "L0H1", "L1H0", "L1H1"] as CompId[]).map((x) => (
          <Btn
            key={x}
            variant={off.has(x) ? "primary" : "ghost"}
            className="h-8 px-3"
            onClick={() =>
              setOff((s) => {
                const n = new Set(s);
                if (n.has(x)) n.delete(x);
                else n.add(x);
                return n;
              })
            }
          >
            {off.has(x) ? `${x} off` : x}
          </Btn>
        ))}
      </div>
      <Output r={r} answer="Bo" />
    </div>
  );
}

const STEPS: WalkStep[] = [
  {
    title: "Opening the black box",
    body: (
      <p>
        Asking <i>whether</i> a model is right is easy. <b className="text-foreground">Mechanistic interpretability</b> asks <i>why</i>: which parts of the network
        compute the answer, and how. This tiny model has a habit: when a pattern repeats, it completes it.
      </p>
    ),
    demo: <DemoOutput />,
    deeper: "Its weights are constructed by hand (no training), so there is a ground-truth circuit for you to find, and every experiment below is a real forward pass.",
  },
  {
    title: "The residual stream",
    body: (
      <p>
        Each position carries a vector through the model. Every attention head and neuron reads from it and adds its result back: a shared bus. Decoding the bus at
        each stage (the &ldquo;logit lens&rdquo;) shows <b className="text-foreground">when</b> the answer appears.
      </p>
    ),
    demo: <DemoLens />,
    deeper: "x_final = embed + Σ head outputs + Σ MLP outputs. Linear, so contributions can be attributed: that's direct logit attribution.",
  },
  {
    title: "Attention heads",
    body: (
      <p>
        A head decides which earlier positions to read. L0H0 always looks one step back. L1H0 looks for the token that came <i>after</i> an earlier copy of the
        current word. L0H1 looks busy but writes nothing anyone uses. Patterns alone can mislead.
      </p>
    ),
    demo: <DemoHeads />,
    deeper: "Each head: score(i,j) = x_iᵀ W_QK x_j with a causal mask, output = Σ softmax · W_OV x_j.",
  },
  {
    title: "Ablation",
    body: (
      <p>
        To test a hypothesis, intervene. Switch a component off (zero its output) and see what breaks. Switch off L0H0 or L1H0 and “Bo” collapses. The other two
        change nothing.
      </p>
    ),
    demo: <DemoAblate />,
    deeper: "Zero-ablation here; real work also uses mean-ablation and resampling to avoid knocking the model off-distribution.",
  },
  {
    title: "Circuits",
    body: (
      <>
        <p>
          Why does L1H0 need L0H0? L0H0 writes “the previous token was <i>met</i>” into position 3. L1H0, at the last “met”, searches the keys for exactly that note,
          finds position 3, and copies “Bo”. One head&apos;s output becomes another&apos;s key: <b className="text-foreground">K-composition</b>. That pair is an
          induction circuit, the same mechanism found in real language models.
        </p>
        <p>Your cases: find the circuit, the saboteur, where a fact lives, and where a difference is carried. Fewer interventions score higher.</p>
      </>
    ),
    demo: (
      <div className="space-y-2 rounded-md border border-border p-3 font-hud text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="text-signal-pale">L0H0</span> at pos 3 (Bo): reads pos 2 (met) → writes PREV = met
        </p>
        <p>
          <span className="text-signal-pale">L1H0</span> at pos 6 (met): query “met” · key PREV = met at pos 3 → match
        </p>
        <p>
          <span className="text-signal-pale">L1H0</span> copies pos 3&apos;s token → logit(Bo) ↑
        </p>
      </div>
    ),
    deeper: "Olsson et al. (2022) showed induction heads form in real transformers and underpin much of in-context learning.",
  },
];

// ── Game ─────────────────────────────────────────────────────────────────
export default function InterpGame() {
  const progress = useProgress();
  const [level, setLevel] = useState(0);
  const L = LEVELS[level];
  const comps = components(L.model);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [patched, setPatched] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string>("L0H0");
  const [claim, setClaim] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const answerSet = useMemo(() => truth(L), [L]);

  const clean = useMemo(() => run(L.model, L.tokens), [L]);
  const live = L.kind === "patch" ? run(L.model, L.corrupted!, { patch: { from: clean, ids: patched } }) : run(L.model, L.tokens, { ablate: off });
  const cleared = LEVELS.map((_, i) => (progress.best[key(i)] ?? 0) >= 1);

  useEffect(() => {
    const b = LEVELS.map((_, i) => progress.best[key(i)] ?? 0);
    if (b.every((x) => x >= 1)) track({ t: "cleared", game: GAME });
    if (b.every((x) => x >= 2)) track({ t: "mastered", game: GAME });
  }, [progress.best]);

  const pick = (i: number) => {
    setLevel(i);
    setOff(new Set());
    setPatched(new Set());
    setFocus("L0H0");
    setClaim(new Set());
    setMoves(0);
    setWrong(0);
    setResult(null);
  };

  const toggle = (set: (f: (s: Set<string>) => Set<string>) => void, c: string) => {
    set((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
    setMoves((m) => m + 1);
    sfx("click");
  };

  const submit = () => {
    const ok = claim.size === answerSet.size && [...claim].every((c) => answerSet.has(c));
    if (ok) {
      sfx("win");
      const efficient = moves <= 4 && wrong === 0;
      track({ t: "best", game: key(level), score: efficient ? 2 : 1 });
      setResult({
        ok,
        msg: `Correct: {${[...answerSet].join(", ")}}. ${efficient ? "Efficient science: few interventions, no wrong guesses." : "Solved. Try it again with fewer interventions to master it."}`,
      });
    } else {
      sfx("error");
      setWrong((w) => w + 1);
      const extra = [...claim].filter((c) => !answerSet.has(c));
      const missing = [...answerSet].filter((c) => !claim.has(c));
      setResult({
        ok,
        msg: extra.length
          ? `Not quite: ${extra[0]} isn't part of it. Test it on its own and see.`
          : `Not quite: something is still missing (${missing.length} component${missing.length > 1 ? "s" : ""}).`,
      });
    }
  };

  const focusIsHead = focus.startsWith("L");
  const answerP = probOf(live, L.answer);

  return (
    <GameShell
      game={GAME}
      title="Mechanistic Interpretability"
      steps={STEPS}
      stats={
        <>
          <Stat k="case" v={`${level + 1} / ${LEVELS.length}`} />
          <Stat k={`p(${L.answer})`} v={`${(answerP * 100).toFixed(1)}%`} tone={answerP > 0.5 ? "good" : "bad"} />
          <Stat k="interventions" v={moves} />
          <Stat k="wrong claims" v={wrong} tone={wrong ? "bad" : undefined} />
        </>
      }
    >
      <div className="space-y-4">
        <Levels names={LEVELS.map((l) => l.name)} current={level} cleared={cleared} onPick={pick} />
        <div className="rounded-md border border-border p-3">
          <p className="hud">case file</p>
          <p className="mt-1 text-sm">{L.question}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="space-y-3 rounded-md border border-border p-3" aria-label="Input and output">
            <p className="hud">{L.kind === "patch" ? "corrupted input (patched)" : "input"}</p>
            <Tokens tokens={L.kind === "patch" ? L.corrupted! : L.tokens} highlight={(L.kind === "patch" ? L.corrupted! : L.tokens).length - 1} />
            {L.kind === "patch" ? (
              <>
                <p className="hud">clean input</p>
                <Tokens tokens={L.tokens} />
              </>
            ) : null}
            <p className="hud pt-2">next-token prediction</p>
            <Output r={live} answer={L.answer} />
            <p className="hud pt-2">logit lens · last position</p>
            <Lens r={live} model={L.model} />
          </section>

          <section className="space-y-2 rounded-md border border-border p-3" aria-label="Components">
            <p className="hud">components · {L.kind === "patch" ? "patch from clean" : "ablate"} · inspect</p>
            <ul className="space-y-1.5">
              {comps.map((c) => {
                const d = dla(L.kind === "patch" ? live : run(L.model, L.tokens), c, L.answer);
                const on = L.kind === "patch" ? patched.has(c) : off.has(c);
                return (
                  <li key={c} className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5", focus === c ? "border-signal/60" : "border-border")}>
                    <button type="button" onClick={() => setFocus(c)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label={`Inspect ${c}`}>
                      <Microscope className="size-3.5 shrink-0 text-subtle-foreground" />
                      <span className="font-mono text-xs font-semibold">{c}</span>
                      <span className="ml-auto font-hud text-[0.6rem] text-subtle-foreground tabular-nums" title={`direct logit attribution to “${L.answer}”`}>
                        DLA {d >= 0 ? "+" : ""}
                        {d.toFixed(1)}
                      </span>
                    </button>
                    <Btn
                      variant={on ? "primary" : "ghost"}
                      className="h-7 px-2 text-[0.66rem]"
                      onClick={() => toggle(L.kind === "patch" ? setPatched : setOff, c)}
                      aria-pressed={on}
                      aria-label={`${L.kind === "patch" ? "Patch" : "Ablate"} ${c}`}
                    >
                      {L.kind === "patch" ? (on ? "patched" : "patch") : on ? "off" : "ablate"}
                    </Btn>
                  </li>
                );
              })}
            </ul>
            <Btn
              variant="quiet"
              onClick={() => {
                setOff(new Set());
                setPatched(new Set());
              }}
            >
              <Undo2 className="size-4" /> Restore all
            </Btn>
          </section>

          <section className="space-y-2 rounded-md border border-border p-3" aria-label="Inspector">
            <p className="hud">inspector · {focus}</p>
            {focusIsHead ? (
              <AttnHeat r={live} head={focus} />
            ) : (
              <div className="space-y-1">
                <p className="font-hud text-[0.66rem] text-muted-foreground">activation by position</p>
                {live.tokens.map((t, i) => {
                  const a = live.acts[focus]?.[i] ?? 0;
                  return (
                    <div key={i} className="grid grid-cols-[3.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 font-hud text-xs">
                      <span className="text-muted-foreground">{t}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <span className="block h-full rounded-full bg-signal" style={{ width: `${Math.min(1, a) * 100}%` }} />
                      </span>
                      <span className="text-right tabular-nums">{a.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="font-hud text-[0.62rem] text-subtle-foreground">DLA = how much a component writes directly towards “{L.answer}” at the last position. Indirect help is invisible to it.</p>
          </section>
        </div>

        <section className="space-y-3 rounded-md border border-border p-3" aria-label="Your hypothesis">
          <p className="hud">your hypothesis</p>
          <div className="flex flex-wrap gap-1.5">
            {comps.map((c) => (
              <label key={c} className={cn("flex cursor-lock items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs", claim.has(c) ? "border-signal/60 bg-signal/10" : "border-border")}>
                <input type="checkbox" className="accent-[var(--signal)]" checked={claim.has(c)} onChange={() => setClaim((s) => (s.has(c) ? new Set([...s].filter((x) => x !== c)) : new Set([...s, c])))} />
                {c}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={submit} disabled={!claim.size}>
              <Send className="size-4" /> Submit
            </Btn>
            {result ? <Log tone={result.ok ? "good" : "bad"}>{result.msg}</Log> : <Log>
                <FlaskConical className="mr-1 inline size-3.5" />
                hint: {L.hint}
              </Log>}
          </div>
        </section>
      </div>
    </GameShell>
  );
}
