"use client";

import { Play, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { assign, forgy, inertia, kmeansPP, lloyd, update } from "@/lib/ml/kmeans";
import { blobs, dist2, rng, type Pt } from "@/lib/ml/random";
import { recordLevel, useProgress } from "@/lib/progress";
import { subscribe } from "@/lib/ticker";
import { GameShell, Levels, type WalkStep } from "../shell";
import { Btn, catColor, Log, Stat, svgPoint, usePalette } from "../ui";

const GAME = "kmeans" as const;

interface Level {
  name: string;
  k: number;
  specs: Parameters<typeof blobs>[1];
  note: string;
}

const LEVELS: Level[] = [
  {
    name: "Three islands",
    k: 3,
    specs: [
      { cx: 0.25, cy: 0.3, sx: 0.06, sy: 0.06, n: 40 },
      { cx: 0.72, cy: 0.28, sx: 0.06, sy: 0.06, n: 40 },
      { cx: 0.5, cy: 0.75, sx: 0.06, sy: 0.06, n: 40 },
    ],
    note: "Clear groups. Even a random start usually finds them… usually.",
  },
  {
    name: "Close neighbours",
    k: 4,
    specs: [
      { cx: 0.2, cy: 0.22, sx: 0.05, sy: 0.05, n: 30 },
      { cx: 0.33, cy: 0.38, sx: 0.05, sy: 0.05, n: 30 },
      { cx: 0.75, cy: 0.3, sx: 0.08, sy: 0.08, n: 45 },
      { cx: 0.6, cy: 0.78, sx: 0.06, sy: 0.06, n: 35 },
    ],
    note: "Two groups huddle together. Random seeds often merge them and split another.",
  },
  {
    name: "Crowded",
    k: 5,
    specs: [
      { cx: 0.18, cy: 0.2, sx: 0.05, sy: 0.05, n: 28 },
      { cx: 0.42, cy: 0.18, sx: 0.05, sy: 0.05, n: 28 },
      { cx: 0.8, cy: 0.25, sx: 0.06, sy: 0.06, n: 30 },
      { cx: 0.3, cy: 0.72, sx: 0.06, sy: 0.06, n: 30 },
      { cx: 0.72, cy: 0.75, sx: 0.05, sy: 0.05, n: 28 },
    ],
    note: "Five groups, five seeds. One bad seed and two groups share a centroid forever.",
  },
  {
    name: "Not what it seems",
    k: 4,
    specs: [
      { cx: 0.15, cy: 0.18, sx: 0.04, sy: 0.04, n: 25 },
      { cx: 0.3, cy: 0.15, sx: 0.04, sy: 0.04, n: 25 },
      { cx: 0.7, cy: 0.5, sx: 0.09, sy: 0.09, n: 70 },
      { cx: 0.22, cy: 0.8, sx: 0.05, sy: 0.05, n: 30 },
    ],
    note: "k-means minimises inertia, not 'true groups'. Here the lowest inertia splits the big blob and merges the two small ones.",
  },
];

/** For the rules table test (content/achievements GAME_RULES). */
export const LEVEL_COUNT = LEVELS.length;

const best = (pts: Pt[], k: number) => {
  let b = Infinity;
  for (let s = 1; s <= 24; s++) b = Math.min(b, inertia(pts, lloyd(pts, kmeansPP(rng(s * 31), pts, k)).at(-1)!));
  return b;
};

// ── Board ────────────────────────────────────────────────────────────────
function ClusterBoard({
  pts,
  cents,
  k,
  colorBy = "nearest",
  trueLabels,
  onPoint,
  label,
  className,
  dim,
}: {
  pts: Pt[];
  cents: Pt[];
  k: number;
  colorBy?: "nearest" | "truth" | "none";
  trueLabels?: number[];
  onPoint?: (p: Pt, kind: "down" | "move") => void;
  label: string;
  className?: string;
  dim?: boolean;
}) {
  const pal = usePalette();
  const labels = cents.length ? assign(pts, cents) : [];
  const dragging = useRef(false);
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      className={`block aspect-square w-full touch-none rounded-md select-none border border-border bg-background ${onPoint ? "cursor-lock" : ""} ${className ?? ""}`}
      onPointerDown={(e) => {
        if (!onPoint) return;
        e.preventDefault(); // no text selection / native drag (it cancels the pointer mid-drag)
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onPoint(svgPoint(e), "down");
      }}
      onPointerMove={(e) => dragging.current && onPoint?.(svgPoint(e), "move")}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <defs>
        <pattern id="kgrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke={pal.border} strokeWidth="0.15" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#kgrid)" />
      {colorBy === "nearest" && cents.length
        ? pts.map((p, i) => <line key={`l${i}`} x1={p.x * 100} y1={p.y * 100} x2={cents[labels[i]].x * 100} y2={cents[labels[i]].y * 100} stroke={catColor(labels[i], k)} strokeWidth="0.12" opacity="0.25" />)
        : null}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x * 100}
          cy={p.y * 100}
          r="0.9"
          fill={colorBy === "truth" && trueLabels ? catColor(trueLabels[i], k) : colorBy === "nearest" && cents.length ? catColor(labels[i], k) : pal.muted}
          opacity={dim ? 0.4 : 0.9}
        />
      ))}
      {cents.map((c, i) => (
        <g key={`c${i}`} transform={`translate(${c.x * 100} ${c.y * 100})`}>
          <circle r="3.1" fill={pal.bg} stroke={catColor(i, k)} strokeWidth="0.9" />
          <path d="M-1.6 0H1.6M0 -1.6V1.6" stroke={catColor(i, k)} strokeWidth="0.7" />
        </g>
      ))}
    </svg>
  );
}

/** Steps through a Lloyd history on the shared ticker (~3 iterations a second). */
function useHistory(history: Pt[][] | null, perSecond = 3, onEnd?: () => void) {
  const [i, setI] = useState(0);
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  useEffect(() => {
    if (!history) return;
    let t = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new run restarts from its seeds
    setI(0);
    const unsub = subscribe((dt) => {
      t += dt * perSecond;
      const n = Math.min(history.length - 1, Math.floor(t));
      setI((prev) => {
        if (n !== prev) sfx("step");
        return n;
      });
      if (n >= history.length - 1) {
        unsub();
        end.current?.();
      }
    });
    return unsub;
  }, [history, perSecond]);
  return history ? history[Math.min(i, history.length - 1)] : null;
}

// ── Walkthrough demos ────────────────────────────────────────────────────
const DEMO_PTS = blobs(rng(9), [
  { cx: 0.26, cy: 0.3, sx: 0.07, sy: 0.07, n: 30 },
  { cx: 0.72, cy: 0.35, sx: 0.07, sy: 0.07, n: 30 },
  { cx: 0.5, cy: 0.76, sx: 0.07, sy: 0.07, n: 30 },
]);

function DemoReveal() {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-3">
      <ClusterBoard pts={DEMO_PTS} cents={[]} k={3} colorBy={show ? "truth" : "none"} trueLabels={DEMO_PTS.map((p) => (p as Pt & { label: number }).label)} label="Unlabelled points" className="mx-auto max-w-[20rem]" />
      <Btn onClick={() => setShow((s) => !s)}>{show ? "Hide the groups" : "Reveal the hidden groups"}</Btn>
    </div>
  );
}

function DemoAssign() {
  const [cents, setCents] = useState<Pt[]>([
    { x: 0.2, y: 0.8 },
    { x: 0.8, y: 0.2 },
  ]);
  return (
    <div className="space-y-2">
      <ClusterBoard
        pts={DEMO_PTS}
        cents={cents}
        k={2}
        label="Drag the two centroids"
        className="mx-auto max-w-[20rem]"
        onPoint={(p) => {
          const i = dist2(p, cents[0]) < dist2(p, cents[1]) ? 0 : 1;
          setCents((c) => c.map((x, j) => (j === i ? p : x)));
        }}
      />
      <p className="font-hud text-xs text-muted-foreground">drag a centroid · every point joins the nearest one · inertia {inertia(DEMO_PTS, cents).toFixed(2)}</p>
    </div>
  );
}

function DemoLoop() {
  const init: Pt[] = [
    { x: 0.15, y: 0.15 },
    { x: 0.3, y: 0.2 },
    { x: 0.9, y: 0.9 },
  ];
  const [cents, setCents] = useState(init);
  const [it, setIt] = useState(0);
  return (
    <div className="space-y-2">
      <ClusterBoard pts={DEMO_PTS} cents={cents} k={3} label="Assign and update" className="mx-auto max-w-[20rem]" />
      <div className="flex flex-wrap items-center gap-2">
        <Btn
          variant="primary"
          onClick={() => {
            setCents((c) => update(DEMO_PTS, assign(DEMO_PTS, c), c));
            setIt((i) => i + 1);
            sfx("step");
          }}
        >
          Move centroids to their mean
        </Btn>
        <Btn
          onClick={() => {
            setCents(init);
            setIt(0);
          }}
        >
          Reset
        </Btn>
      </div>
      <p className="font-hud text-xs text-muted-foreground">
        iteration {it} · inertia {inertia(DEMO_PTS, cents).toFixed(3)}
      </p>
    </div>
  );
}

function DemoInit() {
  const pts = DEMO_PTS;
  const good = useMemo(
    () =>
      lloyd(pts, [
        { x: 0.25, y: 0.3 },
        { x: 0.7, y: 0.35 },
        { x: 0.5, y: 0.75 },
      ]),
    [pts],
  );
  const bad = useMemo(
    () =>
      lloyd(pts, [
        { x: 0.6, y: 0.3 },
        { x: 0.8, y: 0.4 },
        { x: 0.4, y: 0.8 },
      ]),
    [pts],
  );
  const [run, setRun] = useState(0);
  const g = useHistory(run ? good : null, 2.5) ?? good[0];
  const b = useHistory(run ? bad : null, 2.5) ?? bad[0];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <ClusterBoard pts={pts} cents={g} k={3} label="Good start" />
          <p className="mt-1 font-hud text-[0.66rem] text-success">good start · {inertia(pts, g).toFixed(2)}</p>
        </div>
        <div>
          <ClusterBoard pts={pts} cents={b} k={3} label="Bad start" />
          <p className="mt-1 font-hud text-[0.66rem] text-signal-soft">bad start · {inertia(pts, b).toFixed(2)}</p>
        </div>
      </div>
      <Btn variant="primary" onClick={() => setRun((r) => r + 1)}>
        <Play className="size-4" /> Run both
      </Btn>
    </div>
  );
}

const STEPS: WalkStep[] = [
  {
    title: "Groups without labels",
    body: (
      <p>
        Nobody told the computer which points belong together. <b className="text-foreground">Clustering</b> finds that structure on its own: customer segments, topics
        in documents, colours in an image.
      </p>
    ),
    demo: <DemoReveal />,
    deeper: "This is unsupervised learning: there is no label to compare against, only the geometry of the data.",
  },
  {
    title: "Step one: assign",
    body: (
      <p>
        k-means keeps <b className="text-foreground">k centroids</b>. Every point joins its nearest one. Drag them around and watch the territories change.
      </p>
    ),
    demo: <DemoAssign />,
    deeper: "Each centroid owns a Voronoi cell. Inertia (within-cluster sum of squares) adds up every point's squared distance to its centroid.",
  },
  {
    title: "Step two: update, repeat",
    body: (
      <p>
        Move each centroid to the average of its points, then re-assign. Repeat until nothing moves. Inertia can only go down each time, so it always stops.
      </p>
    ),
    demo: <DemoLoop />,
    deeper: "Lloyd's algorithm alternates two exact minimisations (labels given centroids, centroids given labels), so inertia is monotone non-increasing.",
  },
  {
    title: "Where you start matters",
    body: (
      <>
        <p>
          It always stops, but not always at the best answer. A bad start can trap two groups under one centroid forever: a <b className="text-foreground">local optimum</b>.
        </p>
        <p>Your job: place the starting seeds. Then both runs go: yours, and the machine&apos;s random start. Lower final inertia wins.</p>
      </>
    ),
    demo: <DemoInit />,
    deeper: "k-means++ picks seeds far apart (probability ∝ squared distance), which provably lands within O(log k) of the optimum in expectation.",
  },
];

// ── Game ─────────────────────────────────────────────────────────────────
type Phase = "place" | "run" | "done";

export default function KMeansRush() {
  const progress = useProgress();
  const [level, setLevel] = useState(0);
  const L = LEVELS[level];
  const pts = useMemo(() => blobs(rng(100 + level), L.specs), [level, L.specs]);
  const optimum = useMemo(() => best(pts, L.k), [pts, L.k]);
  const [seeds, setSeeds] = useState<Pt[]>([]);
  const [phase, setPhase] = useState<Phase>("place");
  const [duel, setDuel] = useState(0);
  const [mine, setMine] = useState<Pt[][] | null>(null);
  const [theirs, setTheirs] = useState<Pt[][] | null>(null);
  const [pp, setPp] = useState<Pt[][] | null>(null);
  const finished = useRef(0);

  const onEnd = () => {
    finished.current++;
    if (finished.current !== 2 || !mine || !theirs) return;
    setPhase("done");
    const mineI = inertia(pts, mine.at(-1)!);
    const theirsI = inertia(pts, theirs.at(-1)!);
    const result = mineI < theirsI * 0.995 ? "win" : mineI <= theirsI * 1.005 ? "tie" : "lose";
    const ok = mineI <= optimum * 1.02;
    sfx(result === "win" ? "win" : result === "tie" && ok ? "success" : "lose");
    if (ok) recordLevel(GAME, level, result === "win" ? "mastered" : "cleared");
  };
  const myCents = useHistory(mine, 3, onEnd);
  const theirCents = useHistory(theirs, 3, onEnd);
  const ppCents = useHistory(pp, 3);

  const myFinal = mine ? inertia(pts, mine.at(-1)!) : null;
  const theirFinal = theirs ? inertia(pts, theirs.at(-1)!) : null;
  const outcome = phase === "done" && myFinal !== null && theirFinal !== null ? (myFinal < theirFinal * 0.995 ? "win" : myFinal <= theirFinal * 1.005 ? "tie" : "lose") : null;
  const levels = progress.levels[GAME] ?? [];
  const cleared = LEVELS.map((_, i) => (levels[i] ?? 0) >= 1);

  const reset = (i = level) => {
    setLevel(i);
    setSeeds([]);
    setPhase("place");
    setMine(null);
    setTheirs(null);
    setPp(null);
    finished.current = 0;
  };

  const place = (p: Pt, kind: "down" | "move") => {
    if (phase !== "place") return;
    setSeeds((s) => {
      if (kind === "down" && s.length < L.k) {
        sfx("click");
        return [...s, p];
      }
      if (!s.length) return s;
      let j = 0;
      s.forEach((c, i) => {
        if (dist2(c, p) < dist2(s[j], p)) j = i;
      });
      return s.map((c, i) => (i === j ? p : c));
    });
  };

  const go = () => {
    finished.current = 0;
    setDuel((d) => d + 1);
    setMine(lloyd(pts, seeds));
    setTheirs(lloyd(pts, forgy(rng(Date.now() + duel), pts, L.k)));
    setPp(null);
    setPhase("run");
    sfx("click");
  };

  const shown = phase === "place" ? seeds : (myCents ?? seeds);
  const message =
    phase === "place"
      ? seeds.length < L.k
        ? `click to drop seed ${seeds.length + 1} of ${L.k} · drag to adjust`
        : "seeds placed. live inertia shows how good they already are. run when ready."
      : phase === "run"
        ? "both runs are iterating: assign, update, repeat…"
        : outcome === "win"
          ? `you beat the machine: ${myFinal!.toFixed(3)} vs ${theirFinal!.toFixed(3)}${myFinal! <= optimum * 1.02 ? " · level cleared" : ""}`
          : outcome === "tie"
            ? `a tie at ${myFinal!.toFixed(3)}${myFinal! <= optimum * 1.02 ? " · level cleared. beat its random start to master it." : ""}`
            : `the machine wins: ${theirFinal!.toFixed(3)} vs your ${myFinal!.toFixed(3)}. your seeds converged to a local optimum.`;

  return (
    <GameShell
      game={GAME}
      title="K-Means Cluster Rush"
      steps={STEPS}
      stats={
        <>
          <Stat k="level" v={`${level + 1} / ${LEVELS.length}`} />
          <Stat k="k" v={L.k} />
          <Stat k="your inertia" v={myFinal?.toFixed(3) ?? (seeds.length === L.k ? inertia(pts, seeds).toFixed(3) : "–")} />
          <Stat k="best possible" v={optimum.toFixed(3)} />
        </>
      }
    >
      <div className="space-y-4">
        <Levels names={LEVELS.map((l) => l.name)} current={level} cleared={cleared} onPick={(i) => reset(i)} />
        <p className="text-sm text-muted-foreground">{L.note}</p>
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          <div>
            <p className="hud mb-1.5">you · your seeds</p>
            <ClusterBoard pts={pts} cents={shown} k={L.k} onPoint={phase === "place" ? place : undefined} label="Your board: click to place seeds" />
          </div>
          <div>
            <p className="hud mb-1.5">machine · random seeds{pp ? " → then k-means++" : ""}</p>
            <ClusterBoard pts={pts} cents={pp ? (ppCents ?? []) : (theirCents ?? [])} k={L.k} label="The machine's board" dim={phase === "place"} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="primary" onClick={go} disabled={seeds.length < L.k || phase === "run"}>
            <Play className="size-4" /> {phase === "done" ? "Duel again" : "Run Lloyd's algorithm"}
          </Btn>
          <Btn onClick={() => reset()}>
            <RotateCcw className="size-4" /> New seeds
          </Btn>
          <Btn
            variant="quiet"
            disabled={phase === "run"}
            onClick={() => {
              setSeeds(forgy(rng(Date.now()), pts, L.k));
              setPhase("place");
            }}
          >
            <Shuffle className="size-4" /> Random seeds for me
          </Btn>
          {phase === "done" ? (
            <Btn variant="quiet" onClick={() => setPp(lloyd(pts, kmeansPP(rng(Date.now()), pts, L.k)))}>
              <Sparkles className="size-4" /> Show k-means++
            </Btn>
          ) : null}
        </div>
        <Log tone={outcome === "win" ? "good" : outcome === "lose" ? "bad" : undefined}>{message}</Log>
        {pp && phase === "done" ? <Log>k-means++ spreads its seeds out first: final inertia {inertia(pts, pp.at(-1)!).toFixed(3)}.</Log> : null}
      </div>
    </GameShell>
  );
}
