"use client";

import { Check, Eye, Grid3x3, SkipForward, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { classify, neighbours, vote, type LPt } from "@/lib/ml/knn";
import { blobs, rng } from "@/lib/ml/random";
import { recordLevel, track, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { GameShell, type WalkStep } from "../shell";
import { Btn, catColor, Log, Slider, Stat, svgPoint, usePalette } from "../ui";

const GAME = "knn" as const;
const W = 1000;
const H = 640;

interface Node {
  id: string;
  name: string;
  cat: string;
  x: number;
  y: number;
}
interface Centre {
  id: string;
  title: string;
  x: number;
  y: number;
}
interface Data {
  nodes: Node[];
  centres: Centre[];
}

// ── Board ────────────────────────────────────────────────────────────────
function KnnBoard({
  pts,
  labels,
  w,
  h,
  probe,
  k,
  weighted,
  heat,
  hideIndex = -1,
  showVote,
  onProbe,
  centres,
  className,
  r = 6,
}: {
  pts: LPt[];
  labels: string[];
  w: number;
  h: number;
  probe: { x: number; y: number } | null;
  k: number;
  weighted: boolean;
  heat?: boolean;
  hideIndex?: number;
  showVote?: boolean;
  onProbe?: (p: { x: number; y: number }) => void;
  centres?: Centre[];
  className?: string;
  r?: number;
}) {
  const pal = usePalette();
  const color = (l: string) => catColor(labels.indexOf(l), labels.length);
  const nb = probe && showVote ? neighbours(pts, probe, k, hideIndex) : [];
  const cells = useMemo(() => {
    if (!heat) return [];
    const cw = w / 50;
    const ch = h / 32;
    const out: { x: number; y: number; l: string }[] = [];
    for (let j = 0; j < 32; j++) for (let i = 0; i < 50; i++) out.push({ x: i * cw, y: j * ch, l: classify(pts, { x: (i + 0.5) * cw, y: (j + 0.5) * ch }, k, weighted, hideIndex).winner });
    return out;
  }, [heat, pts, k, weighted, hideIndex, w, h]);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Skill embedding map"
      className={cn("block w-full touch-none rounded-md select-none border border-border bg-background", onProbe && "cursor-lock", className)}
      onPointerDown={(e) => {
        if (!onProbe) return;
        e.preventDefault(); // no text selection / native drag (it cancels the pointer mid-drag)
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = svgPoint(e);
        onProbe({ x: p.x * w, y: p.y * h });
      }}
      onPointerMove={(e) => {
        if (!onProbe || !(e.buttons & 1)) return;
        const p = svgPoint(e);
        onProbe({ x: p.x * w, y: p.y * h });
      }}
    >
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={w / 50 + 0.5} height={h / 32 + 0.5} fill={color(c.l)} opacity={0.16} />
      ))}
      {centres?.map((c) => (
        <text key={c.id} x={c.x} y={c.y - 46} textAnchor="middle" fontSize={15} className="font-hud" fill={pal.subtle}>
          {c.title}
        </text>
      ))}
      {probe
        ? nb.map((n) => <line key={n.i} x1={probe.x} y1={probe.y} x2={pts[n.i].x} y2={pts[n.i].y} stroke={color(pts[n.i].label)} strokeWidth={2} opacity={0.85} />)
        : null}
      {probe && showVote && nb.length ? (
        <circle cx={probe.x} cy={probe.y} r={nb.at(-1)!.d} fill="none" stroke={pal.fg} strokeDasharray="5 6" opacity={0.35} />
      ) : null}
      {pts.map((p, i) =>
        i === hideIndex ? null : <circle key={i} cx={p.x} cy={p.y} r={nb.some((n) => n.i === i) ? r * 1.5 : r} fill={color(p.label)} stroke={pal.bg} strokeWidth={1.5} />,
      )}
      {probe ? (
        <g transform={`translate(${probe.x} ${probe.y})`}>
          <circle r={r * 2.2} fill={pal.bg} stroke={pal.fg} strokeWidth={2} />
          <text y={r * 0.9} textAnchor="middle" fontSize={r * 2.4} fontWeight={700} className="font-mono" fill={pal.fg}>
            ?
          </text>
        </g>
      ) : null}
    </svg>
  );
}

function Tally({ v, labels, names }: { v: ReturnType<typeof vote>; labels: string[]; names?: Record<string, string> }) {
  const max = Math.max(...v.tally.map((t) => t[1]));
  return (
    <ul className="space-y-1">
      {v.tally.map(([l, n]) => (
        <li key={l} className="flex items-center gap-2 font-hud text-xs">
          <span className="w-28 truncate text-muted-foreground">{names?.[l] ?? l}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: catColor(labels.indexOf(l), labels.length) }} />
          </span>
          <span className="w-10 text-right tabular-nums">{Number.isInteger(n) ? n : n.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Walkthrough demos (a small two-class world) ──────────────────────────
const TOY_LABELS = ["orange", "blue"];
const TOY: LPt[] = blobs(rng(4), [
  { cx: 0.33, cy: 0.42, sx: 0.12, sy: 0.12, n: 26, label: 0 },
  { cx: 0.66, cy: 0.58, sx: 0.12, sy: 0.12, n: 26, label: 1 },
]).map((p) => ({ x: p.x * 600, y: p.y * 400, label: TOY_LABELS[p.label] }));

function ToyDemo({ kMode, weightMode }: { kMode?: boolean; weightMode?: boolean }) {
  const [probe, setProbe] = useState({ x: 300, y: 200 });
  const [k, setK] = useState(kMode ? 1 : 3);
  const [weighted, setWeighted] = useState(false);
  const v = classify(TOY, probe, k, weighted);
  return (
    <div className="space-y-3">
      <KnnBoard pts={TOY} labels={TOY_LABELS} w={600} h={400} probe={probe} k={k} weighted={weighted} showVote onProbe={setProbe} heat={kMode} r={7} />
      <div className="flex flex-wrap items-end gap-4">
        {kMode ? <Slider label="k" value={k} min={1} max={25} step={2} onChange={setK} /> : null}
        {weightMode ? (
          <Btn onClick={() => setWeighted((w) => !w)} aria-pressed={weighted}>
            {weighted ? "weighted by 1/distance" : "one neighbour, one vote"}
          </Btn>
        ) : null}
        <p className="font-hud text-xs text-muted-foreground">
          prediction: <b style={{ color: catColor(TOY_LABELS.indexOf(v.winner), 2) }}>{v.winner}</b>
          {v.tie ? " (tie, broken by the closest neighbour)" : ""}
        </p>
      </div>
      <p className="font-hud text-[0.66rem] text-subtle-foreground">drag the ? anywhere</p>
    </div>
  );
}

function SkillPreview({ data }: { data: Data }) {
  const labels = data.centres.map((c) => c.id);
  const pts = data.nodes.map((n) => ({ x: n.x, y: n.y, label: n.cat }));
  return <KnnBoard pts={pts} labels={labels} w={W} h={H} probe={null} k={5} weighted={false} heat centres={data.centres} r={5} />;
}

const steps = (data: Data): WalkStep[] => [
  {
    title: "You are who your neighbours are",
    body: (
      <p>
        k-nearest neighbours is the simplest classifier there is. To label a new point, look at the <b className="text-foreground">k closest</b> labelled points and
        let them vote. No training at all: the data <i>is</i> the model.
      </p>
    ),
    demo: <ToyDemo />,
    deeper: "KNN is a non-parametric, lazy learner: all the work happens at query time (here, Euclidean distance in 2-D).",
  },
  {
    title: "Choosing k",
    body: (
      <p>
        With k = 1 the boundary hugs every point and noise wins. With a big k it smooths out, but small groups get outvoted. The shading shows what the model would
        predict everywhere. Slide k and watch the regions move.
      </p>
    ),
    demo: <ToyDemo kMode />,
    deeper: "Small k: low bias, high variance. Large k: high bias, low variance. In practice k is chosen by cross-validation.",
  },
  {
    title: "Fair votes",
    body: (
      <p>
        Should a neighbour right next to the point count the same as one far away? Weighting votes by 1/distance lets close neighbours speak louder, and settles most
        ties.
      </p>
    ),
    demo: <ToyDemo weightMode />,
    deeper: "Ties are broken here by the label of the single closest tied neighbour, so every answer is deterministic.",
  },
  {
    title: "The real skill map",
    body: (
      <>
        <p>
          This is my actual skill map from the Skills page: {data.nodes.length} tools in {data.centres.length} areas. The shading is a k = 5 classifier trained on it.
        </p>
        <p>
          In the game one skill is hidden. You see only where it sits. Classify it like KNN would, then see the truth, and what KNN said. Points near the borders are
          the hard ones.
        </p>
      </>
    ),
    demo: <SkillPreview data={data} />,
  },
];

// ── Game ─────────────────────────────────────────────────────────────────
export default function KnnGame({ data }: { data?: unknown }) {
  const d = data as Data;
  const progress = useProgress();
  const labels = useMemo(() => d.centres.map((c) => c.id), [d]);
  const names = useMemo(() => Object.fromEntries(d.centres.map((c) => [c.id, c.title])), [d]);
  const pts = useMemo<LPt[]>(() => d.nodes.map((n) => ({ x: n.x, y: n.y, label: n.cat })), [d]);

  // Ambiguity: how close the nearest other-area skill is compared to the nearest same-area one.
  const order = useMemo(() => {
    const margin = pts.map((p, i) => {
      let same = Infinity;
      let other = Infinity;
      pts.forEach((q, j) => {
        if (i === j) return;
        const dd = Math.hypot(p.x - q.x, p.y - q.y);
        if (q.label === p.label) same = Math.min(same, dd);
        else other = Math.min(other, dd);
      });
      return other - same;
    });
    return pts.map((_, i) => i).sort((a, b) => margin[a] - margin[b]);
  }, [pts]);

  const [seed] = useState(() => Date.now() & 0xffff);
  const r = useMemo(() => rng(seed), [seed]);
  const pickNext = () => (r.next() < 0.55 ? order[r.int(Math.ceil(order.length * 0.35))] : r.int(pts.length));
  const [hidden, setHidden] = useState(() => pickNext());
  const [k, setK] = useState(5);
  const [weighted, setWeighted] = useState(false);
  const [heat, setHeat] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0, knnRight: 0 });

  const target = pts[hidden];
  const model = classify(pts, target, k, weighted, hidden);
  const revealed = guess !== null;
  const correct = guess === target.label;

  const answer = (l: string) => {
    if (revealed) return;
    setGuess(l);
    const ok = l === target.label;
    sfx(ok ? "hit" : "miss");
    const s = score;
    const nextScore = { right: s.right + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0, knnRight: s.knnRight + (model.winner === target.label ? 1 : 0) };
    setScore(nextScore);
    const total = (progress.best[`${GAME}/correct`] ?? 0) + (ok ? 1 : 0);
    if (ok) track({ t: "best", game: `${GAME}/correct`, score: total });
    track({ t: "best", game: `${GAME}/streak`, score: nextScore.streak });
    if (total >= 10) recordLevel(GAME, 0, nextScore.streak >= 10 ? "mastered" : "cleared");
  };

  const next = () => {
    setGuess(null);
    setHidden(pickNext());
    sfx("tap");
  };

  return (
    <GameShell
      game={GAME}
      title="KNN: Classify the Skill"
      steps={steps(d)}
      stats={
        <>
          <Stat k="you" v={`${score.right} / ${score.total}`} />
          <Stat k="streak" v={score.streak} tone={score.streak >= 5 ? "good" : undefined} />
          <Stat k={`knn (k=${k})`} v={`${score.knnRight} / ${score.total}`} />
          <Stat k="best streak" v={progress.best[`${GAME}/streak`] ?? 0} />
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-2">
          <KnnBoard pts={pts} labels={labels} w={W} h={H} probe={target} k={k} weighted={weighted} heat={heat} hideIndex={hidden} showVote={revealed} centres={d.centres} />
          <div className="flex flex-wrap items-end gap-4">
            <Slider label="k (neighbours that vote)" value={k} min={1} max={15} onChange={setK} disabled={revealed} />
            <Btn onClick={() => setWeighted((w) => !w)} aria-pressed={weighted} disabled={revealed}>
              {weighted ? "weighted votes" : "equal votes"}
            </Btn>
            <Btn variant="quiet" onClick={() => setHeat((h) => !h)} aria-pressed={heat}>
              <Grid3x3 className="size-4" /> {heat ? "hide" : "show"} decision regions
            </Btn>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            One skill is hidden behind the <b className="text-foreground">?</b>. Which area does it belong to? Judge by its neighbours, exactly like KNN.
          </p>
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Your answer">
            {d.centres.map((c, i) => (
              <button
                key={c.id}
                type="button"
                disabled={revealed}
                onClick={() => answer(c.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors disabled:cursor-default",
                  revealed && c.id === target.label ? "border-success text-foreground" : revealed && c.id === guess ? "border-signal-soft text-signal-soft" : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: catColor(i, labels.length) }} />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
          </div>
          {revealed ? (
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="flex gap-2 font-mono text-sm">
                {correct ? <Check className="mt-0.5 size-4 shrink-0 text-success" /> : <X className="mt-0.5 size-4 shrink-0 text-signal-soft" />}
                <span>
                  It was <b className="text-foreground">{d.nodes[hidden].name}</b> ({names[target.label]})
                </span>
              </p>
              <p className="font-hud text-xs text-muted-foreground">
                KNN (k={k}, {weighted ? "weighted" : "equal"}) said {names[model.winner]} {model.winner === target.label ? "✓" : "✗"}
                {model.tie ? " after a tie-break" : ""}
              </p>
              <Tally v={model} labels={labels} names={names} />
              <Btn variant="primary" onClick={next} className="w-full">
                <SkipForward className="size-4" /> Next skill
              </Btn>
            </div>
          ) : (
            <Log>
              <Eye className="mr-1 inline size-3.5" />
              look at the colours closest to the ?, then answer
            </Log>
          )}
        </div>
      </div>
    </GameShell>
  );
}
