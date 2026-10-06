"use client";

import { Dice5 } from "lucide-react";
import { useMemo, useState } from "react";
import { Range } from "@/components/ui/range";

type Chain = Map<string, Map<string, number>>;

function train(text: string): Chain {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const chain: Chain = new Map();
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    const m = chain.get(a) ?? new Map<string, number>();
    m.set(b, (m.get(b) ?? 0) + 1);
    chain.set(a, m);
  }
  return chain;
}

/** Temperature + nucleus (top-p) sampling over bigram counts. */
function sample(next: Map<string, number>, temperature: number, topP: number) {
  const entries = [...next.entries()].map(([w, c]) => [w, Math.pow(c, 1 / Math.max(0.05, temperature))] as const);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const probs = entries.map(([w, v]) => [w, v / total] as const).sort((a, b) => b[1] - a[1]);
  const kept: (readonly [string, number])[] = [];
  let acc = 0;
  for (const p of probs) {
    kept.push(p);
    acc += p[1];
    if (acc >= topP) break;
  }
  const norm = kept.reduce((s, [, p]) => s + p, 0);
  let r = Math.random() * norm;
  for (const [w, p] of kept) {
    r -= p;
    if (r <= 0) return { word: w, p: p / norm };
  }
  return { word: kept[0][0], p: kept[0][1] / norm };
}

/**
 * A deliberately tiny "language model": a bigram Markov chain trained on
 * my own bio. Turn up the temperature and watch it get creative. It is a
 * toy for intuition about sampling, and it says so.
 */
export function Sampler({ corpus }: { corpus: string }) {
  const chain = useMemo(() => train(corpus), [corpus]);
  const starts = useMemo(() => [...chain.keys()].filter((w) => /^[A-Z]/.test(w)), [chain]);
  const [temperature, setTemperature] = useState(0.8);
  const [topP, setTopP] = useState(0.9);
  const [out, setOut] = useState<{ word: string; p: number }[]>([]);

  const generate = () => {
    let w = starts[Math.floor(Math.random() * starts.length)] ?? "I";
    const tokens = [{ word: w, p: 1 }];
    for (let i = 0; i < 38; i++) {
      const next = chain.get(w);
      if (!next) break;
      const s = sample(next, temperature, topP);
      tokens.push(s);
      w = s.word;
      if (/[.!?]$/.test(w) && i > 12) break;
    }
    setOut(tokens);
  };

  return (
    <div className="panel p-6">
      <p className="hud">toy model · bigram markov chain · trained on my bio</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block font-hud text-xs">
          <span className="flex justify-between text-muted-foreground">
            temperature <span className="text-foreground tabular-nums">{temperature.toFixed(2)}</span>
          </span>
          <Range min={0.1} max={2} step={0.05} value={temperature} onChange={(e) => setTemperature(+e.target.value)} className="mt-2" />
        </label>
        <label className="block font-hud text-xs">
          <span className="flex justify-between text-muted-foreground">
            top-p <span className="text-foreground tabular-nums">{topP.toFixed(2)}</span>
          </span>
          <Range min={0.1} max={1} step={0.05} value={topP} onChange={(e) => setTopP(+e.target.value)} className="mt-2" />
        </label>
      </div>
      <button
        type="button"
        onClick={generate}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-signal-solid px-4 font-mono text-xs font-semibold text-on-signal transition-transform hover:-translate-y-0.5"
      >
        <Dice5 className="size-4" /> Generate
      </button>
      <p className="mt-5 min-h-24 font-mono text-[0.95rem] leading-relaxed" aria-live="polite">
        {out.length ? (
          out.map((t, i) => (
            <span
              key={`${i}-${out.length}-${t.word}`}
              title={`p = ${t.p.toFixed(2)}`}
              className="tok"
              style={{
                animation: `tok-in 0.4s cubic-bezier(0.2,0.7,0.2,1) ${i * 45}ms both`,
                color: `color-mix(in oklch, var(--foreground) ${Math.round(40 + t.p * 60)}%, var(--signal))`,
              }}
            >
              {t.word}{" "}
            </span>
          ))
        ) : (
          <span className="text-subtle-foreground">Press generate. Low temperature = safe and repetitive; high = creative nonsense. Hover a word to see its probability.</span>
        )}
      </p>
    </div>
  );
}
