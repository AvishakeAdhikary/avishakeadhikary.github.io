"use client";

import { Stethoscope, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { CASES, DIAGNOSES, STEPS_PER_RUN, type DiagnosisId } from "@/lib/ml/debugger-cases";
import { demoTokens, LOSS_FLOOR, TOKEN_LABEL } from "@/lib/ml/trainer-core";
import { TASK_CFG, TinyTransformer } from "@/lib/ml/tiny-transformer";
import { track, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { GameShell, Levels, type WalkStep } from "../../shell";
import { Btn, Log, Stat } from "../../ui";
import { AttnMaps, Dashboard, LogBars, LossChart, Panel } from "./telemetry";
import { useTrainer } from "./use-trainer";

const GAME = "debugger" as const;
const key = (id: string) => `${GAME}/${id}`;

// ── Walkthrough ──────────────────────────────────────────────────────────
function TokenStrip() {
  const toks = [...demoTokens(), 3];
  const model = useMemo(() => new TinyTransformer(TASK_CFG, {}, 1), []);
  const vec = (t: number, pos: number) => Array.from({ length: TASK_CFG.d }, (_, k) => model.tok.v[t * TASK_CFG.d + k] + model.pos.v[pos * TASK_CFG.d + k]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {toks.map((t, i) => (
          <span key={i} className={cn("rounded border px-2 py-1 font-mono text-sm", i > 4 ? "border-signal/60 text-signal-pale" : "border-border-strong")}>
            {TOKEN_LABEL(t)}
          </span>
        ))}
      </div>
      <div className="space-y-1" aria-label="Each token's embedding vector">
        {toks.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4 font-hud text-[0.66rem] text-subtle-foreground">{TOKEN_LABEL(t)}</span>
            <span className="flex flex-1 gap-px">
              {vec(t, i).map((v, k) => (
                <span key={k} className="h-3 flex-1 rounded-[1px]" style={{ background: v > 0 ? "var(--signal)" : "var(--signal-pale)", opacity: Math.min(1, Math.abs(v) * 1.6) + 0.05 }} />
              ))}
            </span>
          </div>
        ))}
      </div>
      <p className="font-hud text-[0.66rem] text-subtle-foreground">task: reverse the digits after the bar · each row = token vector + position vector (24 numbers)</p>
    </div>
  );
}

function SymptomTable() {
  return (
    <ul className="space-y-2">
      {DIAGNOSES.map((d) => (
        <li key={d.id} className="rounded-md border border-border p-2.5">
          <p className="font-mono text-xs font-semibold">{d.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{d.tell}</p>
        </li>
      ))}
    </ul>
  );
}

// ── Game ─────────────────────────────────────────────────────────────────
type Phase = "observe" | "fixing" | "solved" | "relapse";

export default function TransformerDebugger() {
  const progress = useProgress();
  const live = useTrainer();
  const game = useTrainer();
  const [idx, setIdx] = useState(0);
  const c = CASES[idx];
  const [phase, setPhase] = useState<Phase>("observe");
  const [pick, setPick] = useState<DiagnosisId | null>(null);
  const [wrong, setWrong] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const started = useRef(false);
  const cleared = CASES.map((x) => (progress.best[key(x.id)] ?? 0) >= 1);

  // The walkthrough trains a healthy model live so every chart is real.
  const steps: WalkStep[] = [
    {
      title: "Tokens become vectors",
      body: (
        <p>
          This tiny transformer has one job: reverse four digits. Each token is looked up in a table to become a list of 24 numbers, and its position adds its own
          vector, so &ldquo;1 in slot 2&rdquo; differs from &ldquo;1 in slot 4&rdquo;.
        </p>
      ),
      demo: <TokenStrip />,
      deeper: "Learned token embeddings E[token] + learned positional embeddings P[pos], d_model = 24, vocabulary of 7 (digits 0–5 and the separator).",
    },
    {
      title: "Attention: who looks at whom",
      body: (
        <p>
          Each position asks a question (query) and every earlier position offers an answer (key). The heatmaps show how much each row attends to each column. The
          grey triangle is the <b className="text-foreground">causal mask</b>: no peeking at the future. A model is training live right now; watch the patterns sharpen.
        </p>
      ),
      demo: <AttnMaps attn={live.last?.attn} compact />,
      deeper: "softmax(QKᵀ/√d_head + mask)·V per head; 2 layers × 2 heads, pre-LayerNorm blocks with a GELU MLP.",
    },
    {
      title: "Layers, then a guess",
      body: (
        <p>
          Every block adds its result to a running sum, the <b className="text-foreground">residual stream</b>. At the end it&apos;s turned into a score (logit) for
          every possible next token. Healthy activations stay around 1.
        </p>
      ),
      demo: (
        <Panel title="activations (rms)" sub="live">
          <LogBars labels={["embed", "after b0", "after b1"]} values={live.last?.rms ?? []} />
        </Panel>
      ),
      deeper: "x ← x + Attn(LN(x)); x ← x + MLP(LN(x)); logits = LN(x)·W_out. Residuals keep a clean path for both signal and gradient.",
    },
    {
      title: "Loss, and its floor",
      body: (
        <p>
          Loss = −log(probability given to the right token). The first four digits are random, so no honest model can predict them: the loss can never go below the
          dashed <b className="text-foreground">entropy floor</b> ({LOSS_FLOOR.toFixed(2)}). The green line is how many held-out sequences it reverses perfectly.
        </p>
      ),
      demo: <LossChart history={live.history} steps={STEPS_PER_RUN} />,
      deeper: "Cross-entropy over all 8 next-token predictions; 3 of them are uniformly random digits, contributing (3/8)·ln 6 ≈ 0.67 nats that can't be removed.",
    },
    {
      title: "Backprop and the update",
      body: (
        <p>
          The chain rule sends the error backwards through every operation, giving each weight a gradient. The optimizer (Adam) then nudges every weight a little. If
          gradients vanish, nothing learns. If they explode, everything breaks.
        </p>
      ),
      demo: (
        <div className="space-y-3">
          <Panel title="gradient norm" sub="live">
            <LogBars labels={["embed", "block 0", "block 1", "head"]} values={live.last?.grads ?? []} />
          </Panel>
          <Panel title="weight update size" sub="live">
            <LogBars labels={["attn 0", "mlp 0", "attn 1", "mlp 1"]} values={live.last?.updates ?? []} />
          </Panel>
        </div>
      ),
      deeper: "Every op here has a hand-written backward pass (checked against finite differences), running in a Web Worker at ~40 steps per second.",
    },
    {
      title: "Now, the patients",
      body: (
        <>
          <p>
            Seven models, each broken in exactly one real way. Read the telemetry, diagnose, apply the fix, and watch it recover. Every symptom comes from the actual
            maths, not a script.
          </p>
          <p>Here&apos;s your field guide. You can come back to it any time.</p>
        </>
      ),
      demo: <SymptomTable />,
    },
  ];

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    live.run({ bugs: {}, lr: 3e-3, steps: STEPS_PER_RUN, every: 4 });
  }, [live]);

  const startCase = (i: number) => {
    setIdx(i);
    setPhase("observe");
    setPick(null);
    setWrong(0);
    setNote(null);
    live.stop();
    game.run({ ...CASES[i].broken, steps: STEPS_PER_RUN });
  };

  // Begin the first case once the walkthrough is dismissed (the shell renders children then).
  const kicked = useRef(false);
  const begin = () => {
    if (kicked.current) return;
    kicked.current = true;
    startCase(0);
  };

  useEffect(() => {
    const done = CASES.map((x) => progress.best[key(x.id)] ?? 0);
    if (done.every((d) => d >= 1)) track({ t: "cleared", game: GAME });
    if (done.every((d) => d >= 2)) track({ t: "mastered", game: GAME });
  }, [progress.best]);

  const apply = () => {
    if (!pick) return;
    if (pick === c.bug) {
      setPhase("fixing");
      setNote(null);
      sfx("click");
      game.run({ ...c.fixed, steps: STEPS_PER_RUN }, () => {
        setPhase("solved");
        sfx("win");
        track({ t: "best", game: key(c.id), score: wrong === 0 ? 2 : 1 });
      });
    } else {
      setWrong((w) => w + 1);
      setPhase("relapse");
      sfx("error");
      setNote(`Retrained with “${DIAGNOSES.find((d) => d.id === pick)!.fix.toLowerCase()}”: the symptoms are unchanged. That wasn't it.`);
      game.run({ ...c.broken, steps: STEPS_PER_RUN, seed: 2 + wrong });
    }
  };

  const t = game.last;
  return (
    <GameShell
      game={GAME}
      title="Transformer Debugger"
      steps={steps}
      stats={
        <>
          <Stat k="patient" v={`${idx + 1} / ${CASES.length}`} />
          <Stat k="wrong calls" v={wrong} tone={wrong ? "bad" : undefined} />
          <Stat k="solved" v={`${cleared.filter(Boolean).length} / ${CASES.length}`} />
          <Stat k="step" v={t?.step ?? 0} />
        </>
      }
    >
      <Starter onStart={begin} />
      <div className="space-y-4">
        <Levels names={CASES.map((x) => x.title)} current={idx} cleared={cleared} onPick={startCase} />
        <p className="text-sm text-muted-foreground">
          <Stethoscope className="mr-1.5 inline size-4 text-signal" />
          {c.story}
        </p>
        <Dashboard history={game.history} steps={STEPS_PER_RUN} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <fieldset className="space-y-1.5" disabled={phase === "fixing" || phase === "solved"}>
            <legend className="hud mb-2">diagnosis</legend>
            {DIAGNOSES.map((d) => (
              <label
                key={d.id}
                className={cn(
                  "flex cursor-lock items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors",
                  pick === d.id ? "border-signal/60 bg-signal/10" : "border-border hover:border-border-strong",
                )}
              >
                <input type="radio" name="dx" className="mt-1 accent-[var(--signal)]" checked={pick === d.id} onChange={() => setPick(d.id)} />
                <span>
                  <span className="font-medium">{d.label}</span>
                  <span className="block text-xs text-muted-foreground">fix: {d.fix}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-3">
            <Btn variant="primary" className="w-full" onClick={apply} disabled={!pick || phase === "fixing" || phase === "solved" || game.running}>
              <Wrench className="size-4" /> Apply fix &amp; retrain
            </Btn>
            {game.running && phase !== "fixing" ? <Log>training the patient… read the charts while it runs</Log> : null}
            {phase === "fixing" ? <Log>fix applied. retraining…</Log> : null}
            {note ? <Log tone="bad">{note}</Log> : null}
            {phase === "solved" ? (
              <>
                <Log tone="good">
                  Recovered: loss sits on the floor and reversals are {Math.round((t?.acc ?? 0) * 100)}% correct. {wrong === 0 ? "Clean diagnosis, first try." : ""}
                </Log>
                <p className="text-xs text-muted-foreground">{DIAGNOSES.find((d) => d.id === c.bug)!.tell}</p>
                {idx < CASES.length - 1 ? (
                  <Btn className="w-full" onClick={() => startCase(idx + 1)}>
                    Next patient
                  </Btn>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </GameShell>
  );
}

/** Fires once when the game board first mounts (after the walkthrough). */
function Starter({ onStart }: { onStart: () => void }) {
  useEffect(() => {
    onStart();
  }, [onStart]);
  return null;
}
