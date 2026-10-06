"use client";

import { Flag, RotateCcw, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { LR_GRID, par as parFor, simulate, SURFACES, type OptimizerId, type Shot, type Surface } from "@/lib/ml/descent";
import { recordLevel, track, useProgress } from "@/lib/progress";
import { renderDpr } from "@/lib/quality";
import { subscribe } from "@/lib/ticker";
import { GameShell, Levels, type WalkStep } from "../shell";
import { Btn, Log, Seg, Slider, Stat, usePalette } from "../ui";

const GAME = "gradient-golf" as const;
const CLUBS: Record<string, OptimizerId[]> = { bowl: ["sgd"], ravine: ["sgd", "momentum"], banana: ["sgd", "momentum", "adam"], twin: ["sgd", "momentum", "adam"] };
const OPT_LABEL: Record<OptimizerId, string> = { sgd: "SGD", momentum: "Momentum", adam: "Adam" };
const lrFrom = (t: number) => 10 ** (-3 + 3.3 * t);
const tFrom = (lr: number) => (Math.log10(lr) + 3) / 3.3;

// ── Board ────────────────────────────────────────────────────────────────
interface BoardProps {
  surface: Surface;
  path?: [number, number][];
  /** How much of the path is revealed (0..1). */
  reveal?: number;
  extra?: { path: [number, number][]; color: "soft" | "muted" }[];
  arrows?: boolean;
  className?: string;
}

/** Smooth shading (an alpha mask tinted with the theme colour) plus crisp contour lines (marching squares). */
function useField(surface: Surface, signal: string) {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const G = 140;
    const [x0, x1, y0, y1] = surface.domain;
    const vals = new Float32Array((G + 1) * (G + 1));
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = 0; j <= G; j++)
      for (let i = 0; i <= G; i++) {
        const v = surface.f(x0 + (i / G) * (x1 - x0), y1 - (j / G) * (y1 - y0));
        vals[j * (G + 1) + i] = v;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    const norm = (v: number) => Math.log1p(v - lo) / Math.log1p(hi - lo);
    const N = new Float32Array(vals.length);
    for (let k = 0; k < vals.length; k++) N[k] = norm(vals[k]);

    const off = document.createElement("canvas");
    off.width = off.height = G;
    const c = off.getContext("2d")!;
    const img = c.createImageData(G, G);
    for (let j = 0; j < G; j++)
      for (let i = 0; i < G; i++) {
        const k = (j * G + i) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
        img.data[k + 3] = Math.round((1 - N[j * (G + 1) + i]) ** 1.7 * 105 + 6);
      }
    c.putImageData(img, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = signal;
    c.fillRect(0, 0, G, G);

    // Marching squares: segments in unit coordinates for evenly spaced levels.
    const segs: number[] = [];
    const levels = 15;
    for (let l = 1; l < levels; l++) {
      const t = l / levels;
      for (let j = 0; j < G; j++)
        for (let i = 0; i < G; i++) {
          const a = N[j * (G + 1) + i];
          const b = N[j * (G + 1) + i + 1];
          const cc = N[(j + 1) * (G + 1) + i + 1];
          const d = N[(j + 1) * (G + 1) + i];
          const pts: number[] = [];
          const edge = (p: number, q: number, ax: number, ay: number, bx: number, by: number) => {
            if (p < t !== q < t) {
              const f = (t - p) / (q - p);
              pts.push((i + ax + (bx - ax) * f) / G, (j + ay + (by - ay) * f) / G);
            }
          };
          edge(a, b, 0, 0, 1, 0);
          edge(b, cc, 1, 0, 1, 1);
          edge(cc, d, 1, 1, 0, 1);
          edge(d, a, 0, 1, 0, 0);
          if (pts.length >= 4) segs.push(pts[0], pts[1], pts[2], pts[3]);
          if (pts.length === 8) segs.push(pts[4], pts[5], pts[6], pts[7]);
        }
    }
    return { image: off, segs: new Float32Array(segs) };
  }, [surface, signal]);
}

function Board({ surface, path, reveal = 1, extra, arrows, className }: BoardProps) {
  const pal = usePalette();
  const field = useField(surface, pal.signal);
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !size || !field) return;
    const dpr = renderDpr();
    cv.width = size * dpr;
    cv.height = size * dpr;
    const c = cv.getContext("2d")!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [x0, x1, y0, y1] = surface.domain;
    const X = (x: number) => ((x - x0) / (x1 - x0)) * size;
    const Y = (y: number) => ((y1 - y) / (y1 - y0)) * size;
    c.fillStyle = pal.bg;
    c.fillRect(0, 0, size, size);
    c.imageSmoothingEnabled = true;
    c.drawImage(field.image, 0, 0, size, size);
    c.strokeStyle = pal.signal;
    c.globalAlpha = 0.5;
    c.lineWidth = 1;
    c.beginPath();
    const sg = field.segs;
    for (let k = 0; k < sg.length; k += 4) {
      c.moveTo(sg[k] * size, sg[k + 1] * size);
      c.lineTo(sg[k + 2] * size, sg[k + 3] * size);
    }
    c.stroke();
    c.globalAlpha = 1;

    if (arrows) {
      c.strokeStyle = pal.fg;
      c.globalAlpha = 0.55;
      c.lineWidth = 1.2;
      const n = 11;
      for (let i = 1; i < n; i++)
        for (let j = 1; j < n; j++) {
          const x = x0 + (i / n) * (x1 - x0);
          const y = y0 + (j / n) * (y1 - y0);
          const [gx, gy] = surface.grad(x, y);
          const m = Math.hypot(gx, gy) || 1;
          const len = (size / n) * 0.38;
          const ax = X(x);
          const ay = Y(y);
          const bx = ax - (gx / m) * len;
          const by = ay + (gy / m) * len;
          c.beginPath();
          c.moveTo(ax, ay);
          c.lineTo(bx, by);
          c.stroke();
          const ang = Math.atan2(by - ay, bx - ax);
          c.beginPath();
          c.moveTo(bx, by);
          c.lineTo(bx - 4 * Math.cos(ang - 0.5), by - 4 * Math.sin(ang - 0.5));
          c.moveTo(bx, by);
          c.lineTo(bx - 4 * Math.cos(ang + 0.5), by - 4 * Math.sin(ang + 0.5));
          c.stroke();
        }
      c.globalAlpha = 1;
    }

    const drawPath = (p: [number, number][], upto: number, color: string, width: number) => {
      if (p.length < 2) return;
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(X(p[0][0]), Y(p[0][1]));
      for (let k = 1; k <= upto && k < p.length; k++) c.lineTo(X(p[k][0]), Y(p[k][1]));
      c.stroke();
      for (let k = 1; k <= upto && k < p.length; k++) {
        c.fillStyle = color;
        c.beginPath();
        c.arc(X(p[k][0]), Y(p[k][1]), 1.6, 0, Math.PI * 2);
        c.fill();
      }
    };
    extra?.forEach((e) => drawPath(e.path, e.path.length, e.color === "soft" ? pal.soft : pal.muted, 1.6));

    // Hole + flag.
    const hx = X(surface.hole[0]);
    const hy = Y(surface.hole[1]);
    c.fillStyle = pal.bg;
    c.strokeStyle = pal.fg;
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(hx, hy, 7, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(hx, hy);
    c.lineTo(hx, hy - 22);
    c.stroke();
    c.fillStyle = pal.signal;
    c.beginPath();
    c.moveTo(hx, hy - 22);
    c.lineTo(hx + 12, hy - 17);
    c.lineTo(hx, hy - 12);
    c.fill();
    // Tee.
    c.strokeStyle = pal.muted;
    c.strokeRect(X(surface.tee[0]) - 5, Y(surface.tee[1]) - 5, 10, 10);

    if (path?.length) {
      const upto = Math.floor(reveal * (path.length - 1));
      drawPath(path, upto, pal.fg, 1.8);
      const at = path[Math.min(upto, path.length - 1)];
      c.shadowColor = pal.signal;
      c.shadowBlur = 14;
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(Math.max(-20, Math.min(size + 20, X(at[0]))), Math.max(-20, Math.min(size + 20, Y(at[1]))), 5.5, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
    }
  }, [size, field, surface, path, reveal, extra, arrows, pal]);

  return (
    <div className={className}>
      <canvas ref={ref} className="block aspect-square w-full rounded-md border border-border" style={{ width: size || undefined, height: size || undefined }} />
    </div>
  );
}

/** Animate a shot along its path on the shared ticker (steps per second, delta-time). */
function useReplay(shot: Shot | null, speed: number, onEnd: () => void) {
  const [reveal, setReveal] = useState(1);
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  useEffect(() => {
    if (!shot) return;
    let shown = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new shot restarts the animation from the tee
    setReveal(0);
    const n = shot.path.length - 1;
    let lastStep = 0;
    const unsub = subscribe((dt) => {
      shown = Math.min(n, shown + dt * speed);
      if (Math.floor(shown) !== lastStep) {
        lastStep = Math.floor(shown);
        if (lastStep % 3 === 0) sfx("step");
      }
      setReveal(n ? shown / n : 1);
      if (shown >= n) {
        unsub();
        end.current();
      }
    });
    return unsub;
  }, [shot, speed]);
  return reveal;
}

// ── Walkthrough demos ────────────────────────────────────────────────────
function Valley({ mode }: { mode: "slope" | "step" | "lr" }) {
  const pal = usePalette();
  const f = (x: number) => 0.5 * (x - 0.4) ** 2;
  const df = (x: number) => x - 0.4;
  const [x, setX] = useState(-1.6);
  const [lr, setLr] = useState(0.4);
  const [trail, setTrail] = useState<number[]>([]);
  const W = 320;
  const H = 180;
  const X = (v: number) => ((v + 2.4) / 4.8) * W;
  const Y = (v: number) => H - 14 - (f(v) / 4.2) * (H - 30);
  const curve = Array.from({ length: 97 }, (_, i) => {
    const v = -2.4 + (i / 96) * 4.8;
    return `${i ? "L" : "M"}${X(v).toFixed(1)},${Y(v).toFixed(1)}`;
  }).join("");
  const g = df(x);
  const tx = 0.55;
  const stepOnce = () => {
    const nx = x - lr * g;
    setTrail((t) => [...t, x]);
    setX(Math.max(-9, Math.min(9, nx)));
    sfx("step");
  };
  const run = () => {
    let cur = x;
    const t: number[] = [];
    for (let i = 0; i < 10; i++) {
      t.push(cur);
      cur = Math.max(-9, Math.min(9, cur - lr * df(cur)));
    }
    setTrail(t);
    setX(cur);
    sfx(Math.abs(cur) > 5 ? "error" : "hit");
  };
  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none rounded-md border select-none border-border bg-background"
        onPointerMove={(e) => {
          if (mode !== "slope" || !(e.buttons & 1)) return;
          const r = e.currentTarget.getBoundingClientRect();
          setX(-2.4 + ((e.clientX - r.left) / r.width) * 4.8);
        }}
        onPointerDown={(e) => {
          if (mode !== "slope") return;
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          setX(-2.4 + ((e.clientX - r.left) / r.width) * 4.8);
        }}
        role="img"
        aria-label="A one-dimensional loss valley with a ball and its slope"
      >
        <rect width={W} height={H} fill={pal.signal} opacity={0.04} />
        <path d={curve} fill="none" stroke={pal.signal} strokeWidth={2} />
        {trail.map((t, i) => (
          <circle key={i} cx={X(Math.max(-2.4, Math.min(2.4, t)))} cy={Y(Math.max(-2.4, Math.min(2.4, t)))} r={3} fill={pal.muted} opacity={0.4 + (i / trail.length) * 0.5} />
        ))}
        {Math.abs(x) < 2.6 ? (
          <>
            <line x1={X(x - tx)} y1={Y(x) + (g * tx * (H - 30)) / 4.2} x2={X(x + tx)} y2={Y(x) - (g * tx * (H - 30)) / 4.2} stroke={pal.fg} strokeDasharray="3 3" opacity={0.7} />
            <line x1={X(x)} y1={Y(x) - 12} x2={X(x) - Math.sign(g) * 26} y2={Y(x) - 12} stroke={pal.soft} strokeWidth={2} markerEnd="url(#arrow)" />
            <circle cx={X(x)} cy={Y(x)} r={7} fill="#fff" />
          </>
        ) : (
          <text x={W / 2} y={30} textAnchor="middle" className="font-hud" fontSize={12} fill={pal.soft}>
            the ball flew off: diverged
          </text>
        )}
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill={pal.soft} />
          </marker>
        </defs>
      </svg>
      <p className="font-hud text-xs text-muted-foreground">
        x = {x.toFixed(2)} · slope f′(x) = {g.toFixed(2)} · loss = {f(x).toFixed(3)}
      </p>
      {mode === "step" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="primary" onClick={stepOnce}>
            Take a step
          </Btn>
          <Btn
            onClick={() => {
              setX(-1.6);
              setTrail([]);
            }}
          >
            Reset
          </Btn>
          <span className="font-hud text-xs text-subtle-foreground">
            x ← x − {lr} × {g.toFixed(2)}
          </span>
        </div>
      ) : null}
      {mode === "lr" ? (
        <div className="flex flex-wrap items-end gap-3">
          <Slider label="learning rate η" value={lr} min={0.05} max={2.2} step={0.05} onChange={setLr} format={(v) => v.toFixed(2)} />
          <Btn
            variant="primary"
            onClick={() => {
              setX(-1.6);
              setTrail([]);
              requestAnimationFrame(run);
            }}
          >
            Run 10 steps
          </Btn>
        </div>
      ) : null}
      {mode === "slope" ? <p className="font-hud text-xs text-subtle-foreground">drag along the valley · the arrow points downhill</p> : null}
    </div>
  );
}

function RaceDemo() {
  const ravine = SURFACES[1];
  const sgd = useMemo(() => simulate(ravine, ravine.tee, 0.13, "sgd").path.slice(0, 80), [ravine]);
  const mom = useMemo(() => simulate(ravine, ravine.tee, 0.005, "momentum").path.slice(0, 80), [ravine]);
  return (
    <div className="space-y-2">
      <Board surface={ravine} extra={[{ path: sgd, color: "muted" }]} path={mom} className="mx-auto max-w-[22rem]" />
      <p className="font-hud text-xs text-muted-foreground">grey: SGD (η 0.13) zig-zags wall to wall · white: momentum (η 0.005) curves in along the floor</p>
    </div>
  );
}

const STEPS: WalkStep[] = [
  {
    title: "Lost in the fog",
    body: (
      <p>
        Training a model means lowering its <b className="text-foreground">loss</b>, a number for how wrong it is. Picture a valley in thick fog: you can&apos;t see the
        bottom, only the slope under your feet. Drag the ball and watch the arrow point downhill.
      </p>
    ),
    demo: <Valley mode="slope" />,
    deeper: "The slope is the derivative of the loss with respect to the parameter. Backpropagation computes it for millions of parameters at once.",
  },
  {
    title: "Follow the slope",
    body: (
      <p>
        Gradient descent is just this: take a step <b className="text-foreground">against</b> the slope, then look again. Steep slope, big step; flat ground, small step.
        Tap a few times.
      </p>
    ),
    demo: <Valley mode="step" />,
    deeper: (
      <>
        θ ← θ − η · ∇L(θ). η (eta) is the <i>learning rate</i>: how far you move per unit of slope.
      </>
    ),
  },
  {
    title: "Step size is everything",
    body: (
      <p>
        Too small and you crawl. Too big and you overshoot, bounce from wall to wall, or fly out of the valley entirely. Try η = 0.2, then 1.8, then 2.1.
      </p>
    ),
    demo: <Valley mode="lr" />,
    deeper: "On a quadratic with curvature c, plain gradient descent diverges once η > 2/c. Real networks have many curvatures at once, so one η must suit them all.",
  },
  {
    title: "Now in two dimensions",
    body: (
      <p>
        Real models have many parameters, so the valley has many directions. The arrows show the downhill direction everywhere: always straight across the contour lines.
      </p>
    ),
    demo: <Board surface={SURFACES[0]} arrows className="mx-auto max-w-[22rem]" />,
    deeper: "The gradient is a vector of partial derivatives, perpendicular to the level sets of the loss.",
  },
  {
    title: "Momentum and Adam",
    body: (
      <>
        <p>
          In a narrow ravine plain steps zig-zag. <b className="text-foreground">Momentum</b> keeps some of the previous step, like a heavy ball, so it rolls along the floor.{" "}
          <b className="text-foreground">Adam</b> also rescales each direction by how steep it has been.
        </p>
        <p>Your job: pick the club (optimizer) and the power (learning rate), then sink each hole in as few steps as possible.</p>
      </>
    ),
    demo: <RaceDemo />,
    deeper: "Momentum: v ← 0.9v + g, θ ← θ − ηv. Adam keeps running means of g and g², bias-corrects them and steps by η·m̂/(√v̂+ε).",
  },
];

// ── Game ─────────────────────────────────────────────────────────────────
export default function GradientGolf() {
  const progress = useProgress();
  const [level, setLevel] = useState(0);
  const surface = SURFACES[level];
  const clubs = CLUBS[surface.id];
  const [opt, setOpt] = useState<OptimizerId>("sgd");
  const [lrT, setLrT] = useState(tFrom(0.1));
  const lr = lrFrom(lrT);
  const [shot, setShot] = useState<Shot | null>(null);
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState("");
  const pars = useMemo(() => SURFACES.map((s) => parFor(s, CLUBS[s.id])), []);
  const par = pars[level];
  const best = (i: number) => progress.best[`${GAME}/${SURFACES[i].id}`];
  const levels = progress.levels[GAME] ?? [];
  const cleared = SURFACES.map((_, i) => (levels[i] ?? 0) >= 1);

  const reveal = useReplay(shot, shot && shot.path.length > 120 ? 90 : 45, () => {
    if (!shot) return;
    setDone(true);
    if (shot.outcome === "sunk") {
      sfx(shot.steps <= par ? "win" : "hit");
      track({ t: "best", game: `${GAME}/${surface.id}`, score: shot.steps, lower: true });
      recordLevel(GAME, level, shot.steps <= par ? "mastered" : "cleared");
    } else sfx(shot.outcome === "diverged" ? "error" : "lose");
  });

  const pick = (i: number) => {
    setLevel(i);
    setShot(null);
    setDone(false);
    setHint("");
    const allowed = CLUBS[SURFACES[i].id];
    if (!allowed.includes(opt)) setOpt("sgd");
  };
  const swing = () => {
    setDone(false);
    setShot(simulate(surface, surface.tee, lr, opt));
    sfx("click");
  };

  const result = shot && done ? shot : null;
  const message = !result
    ? shot
      ? "rolling…"
      : "pick a club and a power, then swing"
    : result.outcome === "sunk"
      ? `sunk in ${result.steps} steps (par ${par})${result.steps <= par ? " · under par!" : ""}`
      : result.outcome === "diverged"
        ? "diverged: the steps grew until the ball left the course. lower the learning rate."
        : result.outcome === "local"
          ? "stuck in a local minimum: flat ground, but not the deepest valley. try momentum, or more power."
          : `ran out of steps (${result.steps}). more power, or a better club.`;

  return (
    <GameShell
      game={GAME}
      title="Gradient Descent Golf"
      steps={STEPS}
      stats={
        <>
          <Stat k="hole" v={`${level + 1} / ${SURFACES.length}`} />
          <Stat k="par" v={par} />
          <Stat k="steps" v={shot ? Math.round(reveal * (shot.path.length - 1)) : "–"} />
          <Stat k="best" v={best(level) ?? "–"} tone={best(level) !== undefined && best(level)! <= par ? "good" : undefined} />
        </>
      }
    >
      <div className="space-y-4">
        <Levels names={SURFACES.map((s) => s.name)} current={level} cleared={cleared} onPick={pick} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Board surface={surface} path={shot?.path} reveal={shot ? reveal : 1} className="mx-auto w-full max-w-[36rem]" />
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{surface.blurb}</p>
            <div>
              <p className="hud mb-1.5">club · optimizer</p>
              <Seg
                label="Optimizer"
                value={opt}
                onChange={setOpt}
                options={(["sgd", "momentum", "adam"] as OptimizerId[]).map((o) => ({ id: o, label: OPT_LABEL[o], disabled: !clubs.includes(o), hint: clubs.includes(o) ? undefined : "unlocks on a later hole" }))}
              />
            </div>
            <Slider label="power · learning rate η" value={lrT} min={0} max={1} step={0.005} onChange={setLrT} format={() => lr.toPrecision(2)} />
            <div className="flex flex-wrap gap-2">
              <Btn variant="primary" onClick={swing} disabled={!!shot && !done}>
                <Flag className="size-4" /> Swing
              </Btn>
              <Btn
                onClick={() => {
                  setShot(null);
                  setDone(false);
                }}
              >
                <RotateCcw className="size-4" /> Reset
              </Btn>
              <Btn
                variant="quiet"
                title="Shows the learning-rate range that sinks this hole (costs nothing, teaches a lot)"
                onClick={() => {
                  const ok = LR_GRID.filter((l) => simulate(surface, surface.tee, l, opt).outcome === "sunk");
                  setShot(null);
                  setHint(ok.length ? `${OPT_LABEL[opt]} sinks this hole for η ≈ ${ok[0].toPrecision(2)} to ${ok.at(-1)!.toPrecision(2)}` : `${OPT_LABEL[opt]} can't sink this hole from the tee. Try another club.`);
                }}
              >
                <Zap className="size-4" /> Caddie hint
              </Btn>
            </div>
            <Log tone={result ? (result.outcome === "sunk" ? "good" : "bad") : undefined}>{message}</Log>
            {hint ? <p className="font-hud text-xs text-subtle-foreground">caddie: {hint}</p> : null}
          </div>
        </div>
      </div>
    </GameShell>
  );
}
