"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/** Shared, theme-matched controls for the Arcade games. */
export function Btn({ variant = "ghost", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 font-mono text-xs font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" && "bg-signal text-white hover:brightness-110",
        variant === "ghost" && "border border-border-strong text-foreground hover:border-signal",
        variant === "quiet" && "text-muted-foreground hover:text-foreground",
        className,
      )}
    />
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = String,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("block min-w-40 flex-1", disabled && "opacity-50")}>
      <span className="flex justify-between font-hud text-[0.68rem] text-muted-foreground">
        <span>{label}</span>
        <span className="text-signal-pale tabular-nums">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--signal)]"
      />
    </label>
  );
}

export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string; disabled?: boolean; hint?: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-md border border-border-strong p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={o.disabled}
          title={o.hint}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded px-3 py-1.5 font-mono text-xs transition-colors disabled:opacity-35",
            value === o.id ? "bg-signal text-white" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ k, v, tone }: { k: string; v: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-3 py-1.5">
      <p className="font-hud text-[0.6rem] tracking-wider text-subtle-foreground uppercase">{k}</p>
      <p className={cn("font-mono text-sm font-semibold tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-signal-soft")}>{v}</p>
    </div>
  );
}

/** A short status line under a board ("› converged in 12 steps"). */
export function Log({ children, tone }: { children: ReactNode; tone?: "good" | "bad" }) {
  return (
    <p role="status" className={cn("font-hud text-xs", tone === "good" ? "text-success" : tone === "bad" ? "text-signal-soft" : "text-muted-foreground")}>
      <span className="text-signal">› </span>
      {children}
    </p>
  );
}

export interface Palette {
  signal: string;
  soft: string;
  fg: string;
  muted: string;
  subtle: string;
  border: string;
  bg: string;
}

const read = (): Palette => {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
  return {
    signal: v("--signal", "#f43f5e"),
    soft: v("--signal-soft", "#fb7185"),
    fg: v("--foreground", "#eee"),
    muted: v("--muted-foreground", "#999"),
    subtle: v("--subtle-foreground", "#666"),
    border: v("--border-strong", "#333"),
    bg: v("--background", "#0d0a0a"),
  };
};

/** Theme colours for canvas/SVG drawing; updates when the theme flips. */
export function usePalette(): Palette {
  const { theme } = useSettings();
  const [p, setP] = useState<Palette>(() => (typeof window === "undefined" ? { signal: "#f43f5e", soft: "#fb7185", fg: "#eee", muted: "#999", subtle: "#666", border: "#333", bg: "#0d0a0a" } : read()));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-read CSS variables after the theme attribute changes
    setP(read());
  }, [theme]);
  return p;
}

/** Distinct categorical colours that read well on the dark background. */
export const catColor = (i: number, n: number, l = 0.76) => `oklch(${l} 0.15 ${Math.round((i * 360) / Math.max(1, n) + 20) % 360})`;

/** Pointer position in a viewBox-scaled SVG, as 0..1 coordinates. */
export function svgPoint(e: { clientX: number; clientY: number; currentTarget: Element }, el?: Element | null) {
  const r = (el ?? e.currentTarget).getBoundingClientRect();
  return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
}
