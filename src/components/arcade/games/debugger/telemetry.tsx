"use client";

import { Check, X } from "lucide-react";
import { demoTokens, LOSS_FLOOR, TOKEN_LABEL, type Telemetry } from "@/lib/ml/trainer-core";
import { TASK_CFG } from "@/lib/ml/tiny-transformer";
import { cn } from "@/lib/utils";
import { usePalette } from "../../ui";

const CHANCE = Math.log(TASK_CFG.vocab);

export function Panel({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-md border border-border bg-background/60 p-3", className)} aria-label={title}>
      <p className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-hud text-[0.64rem] tracking-[0.14em] text-muted-foreground uppercase">{title}</span>
        {sub ? <span className="font-hud text-[0.6rem] text-subtle-foreground">{sub}</span> : null}
      </p>
      {children}
    </section>
  );
}

/** Training loss (with the entropy floor and chance) + held-out generation accuracy. */
export function LossChart({ history, steps }: { history: Telemetry[]; steps: number }) {
  const pal = usePalette();
  const W = 320;
  const H = 150;
  const top = Math.max(3, CHANCE + 0.4);
  const X = (s: number) => (s / steps) * W;
  const Y = (l: number) => H - (Math.min(l, top) / top) * H;
  const loss = history.map((t) => `${X(t.step).toFixed(1)},${Y(t.loss).toFixed(1)}`).join(" ");
  const acc = history.filter((t) => t.acc !== null).map((t) => `${X(t.step).toFixed(1)},${(H - t.acc! * H).toFixed(1)}`).join(" ");
  const last = history.at(-1);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label="Loss and accuracy over training">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke={pal.border} strokeWidth={0.5} />
        ))}
        <line x1={0} x2={W} y1={Y(LOSS_FLOOR)} y2={Y(LOSS_FLOOR)} stroke={pal.fg} strokeDasharray="4 4" opacity={0.6} />
        <text x={W - 2} y={Y(LOSS_FLOOR) - 4} textAnchor="end" fontSize={9} className="font-hud" fill={pal.muted}>
          entropy floor {LOSS_FLOOR.toFixed(2)}
        </text>
        <line x1={0} x2={W} y1={Y(CHANCE)} y2={Y(CHANCE)} stroke={pal.subtle} strokeDasharray="2 5" />
        <text x={W - 2} y={Y(CHANCE) - 4} textAnchor="end" fontSize={9} className="font-hud" fill={pal.subtle}>
          chance {CHANCE.toFixed(2)}
        </text>
        {acc ? <polyline points={acc} fill="none" stroke="var(--success)" strokeWidth={1.5} strokeDasharray="3 2" /> : null}
        {loss ? <polyline points={loss} fill="none" stroke={pal.signal} strokeWidth={2} strokeLinejoin="round" /> : null}
        {last && last.loss > top ? (
          <text x={X(last.step)} y={10} textAnchor="end" fontSize={10} className="font-hud" fill={pal.soft}>
            ↑ {last.loss.toFixed(1)}
          </text>
        ) : null}
      </svg>
      <p className="mt-1 flex flex-wrap gap-x-4 font-hud text-[0.62rem] text-muted-foreground">
        <span>
          <span className="text-signal">━</span> train loss {last ? last.loss.toFixed(3) : "–"}
        </span>
        <span>
          <span className="text-success">┅</span> reversal accuracy (held out) {last?.acc != null ? `${Math.round(last.acc * 100)}%` : "–"}
        </span>
        <span>step {last?.step ?? 0}</span>
      </p>
    </div>
  );
}

/** Log-scale bars (1e-6 … 1e4). */
export function LogBars({ labels, values, unit }: { labels: string[]; values: number[]; unit?: string }) {
  const lo = -6;
  const hi = 4;
  return (
    <ul className="space-y-1.5">
      {labels.map((l, i) => {
        const v = values[i] ?? 0;
        const f = v > 0 ? Math.min(1, Math.max(0.01, (Math.log10(v) - lo) / (hi - lo))) : 0;
        return (
          <li key={l} className="flex items-center gap-2 font-hud text-[0.64rem]">
            <span className="w-16 shrink-0 text-muted-foreground">{l}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <span className={cn("block h-full rounded-full", v > 50 ? "bg-signal" : v === 0 || v < 1e-5 ? "bg-subtle-foreground" : "bg-signal-soft/80")} style={{ width: `${f * 100}%` }} />
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums">
              {v === 0 ? "0" : v < 1e-3 || v >= 1e4 ? v.toExponential(1) : v.toPrecision(3)}
              {unit ?? ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Attention heatmaps for every layer/head on "3 1 4 1 | 1 4 1". Weight above the diagonal = looking at the future. */
export function AttnMaps({ attn, compact }: { attn: number[][][] | undefined; compact?: boolean }) {
  const pal = usePalette();
  const toks = demoTokens();
  const T = toks.length;
  const C = compact ? 12 : 15;
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1].flatMap((l) =>
        [0, 1].map((h) => {
          const P = attn?.[l]?.[h];
          let future = 0;
          if (P) for (let i = 0; i < T; i++) for (let j = i + 1; j < T; j++) future += P[i * T + j];
          future /= T;
          return (
            <figure key={`${l}-${h}`} className="min-w-0">
              <svg viewBox={`0 0 ${C * (T + 1)} ${C * (T + 1)}`} className="w-full" role="img" aria-label={`Layer ${l} head ${h} attention`}>
                {toks.map((t, i) => (
                  <text key={`r${i}`} x={C * 0.5} y={C * (i + 1.7)} textAnchor="middle" fontSize={C * 0.6} className="font-hud" fill={pal.subtle}>
                    {TOKEN_LABEL(t)}
                  </text>
                ))}
                {toks.map((t, j) => (
                  <text key={`c${j}`} x={C * (j + 1.5)} y={C * 0.7} textAnchor="middle" fontSize={C * 0.6} className="font-hud" fill={pal.subtle}>
                    {TOKEN_LABEL(t)}
                  </text>
                ))}
                {toks.map((_, i) =>
                  toks.map((__, j) => {
                    const p = P ? P[i * T + j] : 0;
                    const fut = j > i;
                    return (
                      <rect
                        key={`${i}-${j}`}
                        x={C * (j + 1)}
                        y={C * (i + 1)}
                        width={C - 1}
                        height={C - 1}
                        fill={fut && p > 0.02 ? "#facc15" : pal.signal}
                        opacity={fut && p <= 0.02 ? 0.05 : 0.08 + p * 0.92}
                      />
                    );
                  }),
                )}
              </svg>
              <figcaption className="mt-0.5 font-hud text-[0.6rem] text-muted-foreground">
                L{l} · H{h}
                {future > 0.02 ? <span className="text-[#facc15]"> · {Math.round(future * 100)}% on the future!</span> : null}
              </figcaption>
            </figure>
          );
        }),
      )}
    </div>
  );
}

export function Samples({ t }: { t: Telemetry | null }) {
  if (!t) return <p className="font-hud text-xs text-subtle-foreground">no samples yet</p>;
  return (
    <ul className="space-y-1 font-hud text-xs">
      {t.samples.map((s, i) => (
        <li key={i} className="flex items-center gap-2">
          {s.ok ? <Check className="size-3.5 text-success" /> : <X className="size-3.5 text-signal-soft" />}
          <span className="text-muted-foreground">{s.input.join(" ")} |</span>
          <span className={s.ok ? "text-foreground" : "text-signal-soft"}>{s.output.join(" ")}</span>
          {!s.ok ? <span className="text-subtle-foreground">(want {[...s.input].reverse().join(" ")})</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** The whole dashboard used by both the game and the walkthrough. */
export function Dashboard({ history, steps }: { history: Telemetry[]; steps: number }) {
  const t = history.at(-1) ?? null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="loss & accuracy" sub="per training step">
        <LossChart history={history} steps={steps} />
      </Panel>
      <Panel title="attention" sub="on 3 1 4 1 | 1 4 1 →">
        <AttnMaps attn={t?.attn} />
      </Panel>
      <Panel title="gradient norm" sub="by depth">
        <LogBars labels={["embed", "block 0", "block 1", "head"]} values={t?.grads ?? []} />
      </Panel>
      <Panel title="activations (rms)" sub="residual stream">
        <LogBars labels={["embed", "after b0", "after b1"]} values={t?.rms ?? []} />
      </Panel>
      <Panel title="weight update size" sub="|Δw| / |w| last step">
        <LogBars labels={["attn 0", "mlp 0", "attn 1", "mlp 1"]} values={t?.updates ?? []} />
      </Panel>
      <Panel title="samples" sub="greedy decoding">
        <Samples t={t} />
      </Panel>
    </div>
  );
}
