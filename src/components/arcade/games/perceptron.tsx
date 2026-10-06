"use client";

import { Ban, Play, RotateCcw, StepForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { accuracy, clip, lineThrough, margin, predict, score, train, type Line, type Sample, type Update } from "@/lib/ml/perceptron";
import { blobs, rng } from "@/lib/ml/random";
import { recordLevel, useProgress } from "@/lib/progress";
import { subscribe } from "@/lib/ticker";
import { GameShell, Levels, type WalkStep } from "../shell";
import { Btn, catColor, Log, Stat, svgPoint, usePalette } from "../ui";

const GAME = "perceptron" as const;
const POS = catColor(1, 6);
const NEG = catColor(4, 6);

const toSamples = (pts: { x: number; y: number; label: number }[]): Sample[] => pts.map((p) => ({ x: p.x * 2 - 1, y: p.y * 2 - 1, label: p.label ? 1 : -1 }));

interface Level {
  name: string;
  note: string;
  samples: Sample[];
  separable: boolean;
}

const LEVELS: Level[] = [
  {
    name: "Wide margin",
    note: "Two well separated groups. Any reasonable line works.",
    separable: true,
    samples: toSamples(
      blobs(rng(21), [
        { cx: 0.28, cy: 0.3, sx: 0.07, sy: 0.07, n: 18, label: 0 },
        { cx: 0.72, cy: 0.7, sx: 0.07, sy: 0.07, n: 18, label: 1 },
      ]),
    ),
  },
  {
    name: "Tilted",
    note: "Closer together, along a diagonal. Angle matters now.",
    separable: true,
    samples: toSamples(
      blobs(rng(22), [
        { cx: 0.38, cy: 0.62, sx: 0.12, sy: 0.04, n: 20, rot: 0.6, label: 0 },
        { cx: 0.6, cy: 0.42, sx: 0.12, sy: 0.04, n: 20, rot: 0.6, label: 1 },
      ]),
    ),
  },
  {
    name: "Tight squeeze",
    note: "A narrow corridor. Precision wins.",
    separable: true,
    samples: toSamples(
      blobs(rng(23), [
        { cx: 0.45, cy: 0.35, sx: 0.06, sy: 0.12, n: 20, label: 0 },
        { cx: 0.58, cy: 0.62, sx: 0.06, sy: 0.12, n: 20, label: 1 },
      ]),
    ),
  },
  {
    name: "Four corners",
    note: "Opposite corners belong together. Try it…",
    separable: false,
    samples: toSamples(
      blobs(rng(24), [
        { cx: 0.25, cy: 0.25, sx: 0.06, sy: 0.06, n: 10, label: 0 },
        { cx: 0.75, cy: 0.75, sx: 0.06, sy: 0.06, n: 10, label: 0 },
        { cx: 0.25, cy: 0.75, sx: 0.06, sy: 0.06, n: 10, label: 1 },
        { cx: 0.75, cy: 0.25, sx: 0.06, sy: 0.06, n: 10, label: 1 },
      ]),
    ),
  },
];

/** For the rules table test (content/achievements GAME_RULES). */
export const LEVEL_COUNT = LEVELS.length;

// Ensure the separable levels really are (the perceptron converges on them).
const SEPARABLE_OK = LEVELS.map((l) => !l.separable || train(l.samples, 0.5, 200).converged);

// ── Board ────────────────────────────────────────────────────────────────
type P = { x: number; y: number };
const V = (v: number) => ((v + 1) / 2) * 100;

function LineBoard({
  samples,
  ends,
  onEnds,
  machine,
  highlight,
  showNormal,
  label,
  className,
}: {
  samples: Sample[];
  ends?: [P, P];
  onEnds?: (e: [P, P]) => void;
  machine?: Line | null;
  highlight?: number;
  showNormal?: boolean;
  label: string;
  className?: string;
}) {
  const pal = usePalette();
  const drag = useRef<number | null>(null);
  const yours = ends ? lineThrough(ends[0], ends[1], samples) : null;
  const shade = yours ?? machine ?? null;
  const fromEvt = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = svgPoint(e);
    return { x: p.x * 2 - 1, y: p.y * 2 - 1 };
  };
  const seg = machine ? clip(machine) : null;
  const n = yours ? Math.hypot(yours.w[0], yours.w[1]) || 1 : 1;
  const mid = ends ? { x: (ends[0].x + ends[1].x) / 2, y: (ends[0].y + ends[1].y) / 2 } : null;
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      className={`block aspect-square w-full touch-none rounded-md select-none border border-border bg-background ${className ?? ""}`}
      onPointerDown={(e) => {
        if (!ends || !onEnds) return;
        e.preventDefault(); // no text selection / native drag (it cancels the pointer mid-drag)
        const p = fromEvt(e);
        const d0 = Math.hypot(p.x - ends[0].x, p.y - ends[0].y);
        const d1 = Math.hypot(p.x - ends[1].x, p.y - ends[1].y);
        drag.current = d0 < d1 ? 0 : 1;
        e.currentTarget.setPointerCapture(e.pointerId);
        onEnds(drag.current ? [ends[0], p] : [p, ends[1]]);
      }}
      onPointerMove={(e) => {
        if (drag.current === null || !ends || !onEnds) return;
        const p = fromEvt(e);
        onEnds(drag.current ? [ends[0], p] : [p, ends[1]]);
      }}
      onPointerUp={() => (drag.current = null)}
    >
      {shade
        ? Array.from({ length: 20 }, (_, j) =>
            Array.from({ length: 20 }, (_, i) => {
              const c = { x: ((i + 0.5) / 20) * 2 - 1, y: ((j + 0.5) / 20) * 2 - 1 };
              return <rect key={`${i}-${j}`} x={i * 5} y={j * 5} width={5.1} height={5.1} fill={predict(shade, c) === 1 ? POS : NEG} opacity={0.1} />;
            }),
          )
        : null}
      {samples.map((p, i) => (
        <g key={i}>
          {highlight === i ? <circle cx={V(p.x)} cy={V(p.y)} r={4} fill="none" stroke={pal.fg} strokeWidth={0.6} /> : null}
          {p.label === 1 ? (
            <circle cx={V(p.x)} cy={V(p.y)} r={1.7} fill={POS} />
          ) : (
            <rect x={V(p.x) - 1.5} y={V(p.y) - 1.5} width={3} height={3} fill={NEG} transform={`rotate(45 ${V(p.x)} ${V(p.y)})`} />
          )}
        </g>
      ))}
      {seg ? <line x1={V(seg[0].x)} y1={V(seg[0].y)} x2={V(seg[1].x)} y2={V(seg[1].y)} stroke={pal.fg} strokeWidth={0.7} strokeDasharray="2 1.5" /> : null}
      {ends && yours ? (
        <>
          {(() => {
            const s = clip(yours);
            return s ? <line x1={V(s[0].x)} y1={V(s[0].y)} x2={V(s[1].x)} y2={V(s[1].y)} stroke={pal.signal} strokeWidth={0.9} /> : null;
          })()}
          {showNormal && mid ? (
            <line x1={V(mid.x)} y1={V(mid.y)} x2={V(mid.x + (yours.w[0] / n) * 0.3)} y2={V(mid.y + (yours.w[1] / n) * 0.3)} stroke={POS} strokeWidth={0.8} markerEnd="url(#pa)" />
          ) : null}
          {ends.map((e, i) => (
            <circle key={i} cx={V(e.x)} cy={V(e.y)} r={2.6} fill={pal.bg} stroke={pal.signal} strokeWidth={0.8} className="cursor-lock" />
          ))}
        </>
      ) : null}
      <defs>
        <marker id="pa" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill={POS} />
        </marker>
      </defs>
    </svg>
  );
}

/** Replays perceptron updates on the shared ticker. */
function useUpdates(updates: Update[] | null, perSecond: number, onEnd?: () => void) {
  const [i, setI] = useState(-1);
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  useEffect(() => {
    if (!updates) return;
    let t = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new training run starts from w = 0
    setI(-1);
    if (!updates.length) {
      end.current?.();
      return;
    }
    const unsub = subscribe((dt) => {
      t += dt * perSecond * (1 + t / 12);
      const n = Math.min(updates.length - 1, Math.floor(t));
      setI((prev) => {
        if (n !== prev && n % 2 === 0) sfx("step");
        return n;
      });
      if (n >= updates.length - 1) {
        unsub();
        end.current?.();
      }
    });
    return unsub;
  }, [updates, perSecond]);
  return updates && i >= 0 ? updates[Math.min(i, updates.length - 1)] : null;
}

// ── Walkthrough demos ────────────────────────────────────────────────────
const START: [P, P] = [
  { x: -0.8, y: 0.6 },
  { x: 0.8, y: 0.5 },
];

function DemoLine({ normal }: { normal?: boolean }) {
  const s = LEVELS[0].samples;
  const [ends, setEnds] = useState<[P, P]>(START);
  const l = lineThrough(ends[0], ends[1], s);
  return (
    <div className="space-y-2">
      <LineBoard samples={s} ends={ends} onEnds={setEnds} showNormal={normal} label="Drag the line's handles" className="mx-auto max-w-[20rem]" />
      <p className="font-hud text-xs text-muted-foreground">
        {normal ? `w = (${l.w[0].toFixed(2)}, ${l.w[1].toFixed(2)}) · b = ${l.b.toFixed(2)} · ` : ""}accuracy {(accuracy(l, s) * 100).toFixed(0)}% · drag a handle
      </p>
    </div>
  );
}

function DemoLearn() {
  const s = LEVELS[0].samples.slice(0, 14);
  const run = useMemo(() => train(s, 0.5, 20), [s]);
  const [n, setN] = useState(0);
  const u = n ? run.updates[n - 1] : null;
  const line = u?.line ?? null;
  const p = u ? s[u.i] : null;
  return (
    <div className="space-y-2">
      <LineBoard samples={s} machine={line} highlight={u?.i} label="The perceptron learning" className="mx-auto max-w-[20rem]" />
      <div className="flex flex-wrap items-center gap-2">
        <Btn
          variant="primary"
          disabled={n >= run.updates.length}
          onClick={() => {
            setN((x) => x + 1);
            sfx("step");
          }}
        >
          <StepForward className="size-4" /> Next mistake
        </Btn>
        <Btn onClick={() => setN(0)}>Reset</Btn>
      </div>
      <p className="font-hud text-xs text-muted-foreground">
        {u && p
          ? `mistake on a ${p.label === 1 ? "circle" : "diamond"} → w += ${p.label > 0 ? "+" : "−"}0.5·x → w = (${u.line.w[0].toFixed(2)}, ${u.line.w[1].toFixed(2)}), b = ${u.line.b.toFixed(2)}`
          : "w = (0, 0), b = 0: the perceptron knows nothing yet"}
        {n >= run.updates.length && n ? ` · converged in ${run.epochs} passes` : ""}
      </p>
    </div>
  );
}

const STEPS: WalkStep[] = [
  {
    title: "A line is a decision",
    body: (
      <p>
        The simplest classifier draws one straight line: everything on one side is a circle, everything on the other a diamond. Drag the handles until every point is
        on its colour.
      </p>
    ),
    demo: <DemoLine />,
    deeper: "A linear classifier: predict sign(w·x + b). Logistic regression, linear SVMs and every neuron share this shape.",
  },
  {
    title: "w · x + b",
    body: (
      <p>
        The line is just three numbers. <b className="text-foreground">w</b> is the arrow pointing to the circle side; <b className="text-foreground">b</b> slides the line.
        For any point, w·x + b above zero means circle.
      </p>
    ),
    demo: <DemoLine normal />,
    deeper: "w is normal to the boundary; |w·x + b| / ‖w‖ is the point's distance from it. That distance, for the closest point, is the margin.",
  },
  {
    title: "Learning from mistakes",
    body: (
      <p>
        The perceptron starts knowing nothing. It looks at points one by one, and only when it gets one wrong does it nudge the line towards fixing it. Step through
        its mistakes.
      </p>
    ),
    demo: <DemoLearn />,
    deeper: "On a mistake: w ← w + η·y·x, b ← b + η·y. If a separating line exists, this provably converges (Novikoff, 1962).",
  },
  {
    title: "The duel",
    body: (
      <>
        <p>
          Draw your line, then the perceptron learns its own. Both separate everything? The <b className="text-foreground">wider margin</b> wins: the perceptron stops at
          the first line that works, not the best one.
        </p>
        <p>One level hides a trap. If no line can win, say so.</p>
      </>
    ),
    demo: <DemoLine />,
    deeper: "Maximising the margin is exactly what a support vector machine does. Problems no line can solve (like XOR) need hidden layers: a neural network.",
  },
];

// ── Game ─────────────────────────────────────────────────────────────────
type Phase = "draw" | "duel" | "done";

export default function PerceptronDuel() {
  const progress = useProgress();
  const [level, setLevel] = useState(0);
  const L = LEVELS[level];
  const [ends, setEnds] = useState<[P, P]>(START);
  const [phase, setPhase] = useState<Phase>("draw");
  const [run, setRun] = useState<ReturnType<typeof train> | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const yours = lineThrough(ends[0], ends[1], L.samples);
  const acc = accuracy(yours, L.samples);
  /** Called by the replay when the perceptron's last update has played. */
  const finish = () => {
    setPhase("done");
    if (!run) return;
    const m = run.updates.at(-1)?.line ?? { w: [0, 0] as [number, number], b: 0 };
    const mAcc = accuracy(m, L.samples);
    if (acc === 1) {
      const ym = margin(yours, L.samples);
      const mm = mAcc === 1 ? margin(m, L.samples) : -Infinity;
      recordLevel(GAME, level, ym > mm ? "mastered" : "cleared");
      sfx(ym > mm ? "win" : "success");
      setVerdict(
        ym > mm
          ? `you win: every point right and a wider margin (${ym.toFixed(3)} vs ${mm === -Infinity ? "–" : mm.toFixed(3)}). the perceptron stopped at its first working line.`
          : `both perfect, but the perceptron's margin is wider (${mm.toFixed(3)} vs ${ym.toFixed(3)}). level cleared; widen the gap to win.`,
      );
    } else {
      sfx("lose");
      setVerdict(`your line gets ${(acc * 100).toFixed(0)}% right; the perceptron reached ${(mAcc * 100).toFixed(0)}%${run.converged ? ` in ${run.epochs} passes` : " and never converged"}.`);
    }
  };

  const u = useUpdates(run?.updates ?? null, 7, () => finish());
  const machine = u?.line ?? (run ? { w: [0, 0] as [number, number], b: 0 } : null);
  const uIdx = u && run ? run.updates.indexOf(u) : -1;
  // The line *before* this update: the point was misclassified by it (y · score ≤ 0).
  const before: Line = uIdx > 0 && run ? run.updates[uIdx - 1].line : { w: [0, 0], b: 0 };
  const levels = progress.levels[GAME] ?? [];
  const cleared = LEVELS.map((_, i) => (levels[i] ?? 0) >= 1);

  const reset = (i = level) => {
    setLevel(i);
    setEnds(START);
    setPhase("draw");
    setRun(null);
    setVerdict(null);
  };

  const declare = () => {
    if (!L.separable) {
      recordLevel(GAME, level, "mastered");
      sfx("win");
      setVerdict("correct: no straight line separates XOR-style data. one neuron can't; two layers can. that insight (Minsky & Papert, 1969) is why networks have hidden layers.");
    } else {
      sfx("error");
      setVerdict("not this one: a separating line exists here. keep adjusting.");
    }
  };

  return (
    <GameShell
      game={GAME}
      title="Perceptron Duel"
      steps={STEPS}
      stats={
        <>
          <Stat k="level" v={`${level + 1} / ${LEVELS.length}`} />
          <Stat k="your accuracy" v={`${(acc * 100).toFixed(0)}%`} tone={acc === 1 ? "good" : undefined} />
          <Stat k="your margin" v={acc === 1 ? margin(yours, L.samples).toFixed(3) : "–"} />
          <Stat k="perceptron" v={machine ? `${(accuracy(machine, L.samples) * 100).toFixed(0)}%` : "–"} />
        </>
      }
    >
      <div className="space-y-4">
        <Levels names={LEVELS.map((l) => l.name)} current={level} cleared={cleared} onPick={(i) => reset(i)} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <LineBoard
            samples={L.samples}
            ends={ends}
            onEnds={phase === "draw" ? setEnds : undefined}
            machine={phase === "draw" ? null : machine}
            highlight={u?.i}
            label="Draw your decision line"
            className="mx-auto max-w-[36rem]"
          />
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{L.note}</p>
            <p className="font-hud text-xs text-subtle-foreground">
              your line: solid · perceptron: dashed
              {u && run ? ` · update ${uIdx + 1}/${run.updates.length}, pass ${u.epoch}` : ""}
            </p>
            {u ? (
              <p className="font-hud text-xs text-muted-foreground">
                mistake: y·(w·x + b) = {(L.samples[u.i].label * score(before, L.samples[u.i])).toFixed(2)} ≤ 0 → w = ({u.line.w[0].toFixed(2)}, {u.line.w[1].toFixed(2)}), b ={" "}
                {u.line.b.toFixed(2)}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Btn
                variant="primary"
                disabled={phase === "duel"}
                onClick={() => {
                  setVerdict(null);
                  setRun(train(L.samples, 0.5, 40));
                  setPhase("duel");
                  sfx("click");
                }}
              >
                <Play className="size-4" /> {phase === "done" ? "Duel again" : "Lock in & duel"}
              </Btn>
              <Btn onClick={() => reset()}>
                <RotateCcw className="size-4" /> Reset
              </Btn>
              <Btn variant="quiet" onClick={declare} disabled={phase === "duel"}>
                <Ban className="size-4" /> No line can do this
              </Btn>
            </div>
            {verdict ? <Log tone={verdict.startsWith("you win") || verdict.startsWith("correct") ? "good" : verdict.startsWith("both") ? undefined : "bad"}>{verdict}</Log> : <Log>drag the two handles to place your line</Log>}
            {!SEPARABLE_OK[level] ? <Log tone="bad">level data check failed</Log> : null}
          </div>
        </div>
      </div>
    </GameShell>
  );
}
