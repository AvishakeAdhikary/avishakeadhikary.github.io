"use client";

import { Crown, Gem, Medal, Trophy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { dismissToast, useToasts, type Toast } from "@/lib/toast";
import { RANK_LABEL, rankColor, type Rank } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const ICON: Record<Rank, typeof Trophy> = {
  bronze: Medal,
  silver: Medal,
  gold: Trophy,
  platinum: Trophy,
  diamond: Gem,
  master: Crown,
  allrounder: Crown,
};

/** Toast stack under the header (top-right; full width on phones). */
export function Toasts() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed top-16 right-3 left-3 z-[75] flex flex-col items-end gap-2 sm:left-auto sm:w-[22rem]"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const [hover, setHover] = useState(false);
  const left = useRef(toast.ttl);
  useEffect(() => {
    if (hover) return;
    const started = performance.now();
    const t = setTimeout(() => dismissToast(toast.id), left.current);
    return () => {
      clearTimeout(t);
      left.current -= performance.now() - started;
    };
  }, [hover, toast.id]);

  if (toast.kind === "info") {
    return (
      <div role="status" className="toast-in pointer-events-auto rounded-md border border-border-strong bg-background/90 px-3 py-1.5 font-hud text-xs text-muted-foreground shadow-lg backdrop-blur">
        <span className="text-signal">› </span>
        {toast.title}
      </div>
    );
  }

  const tier = toast.tier ?? "bronze";
  const Icon = ICON[tier];
  const color = rankColor(tier);
  return (
    <div
      role="status"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "toast-in pointer-events-auto relative w-full overflow-hidden rounded-lg border bg-background/95 shadow-[0_18px_50px_-18px_rgb(0_0_0/0.9)] backdrop-blur",
        toast.kind === "rank" && "toast-rank",
      )}
      style={{ borderColor: `color-mix(in oklch, ${color} 55%, transparent)` }}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="flex gap-3 py-3 pr-9 pl-4">
        <span
          aria-hidden
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-md border"
          style={{ color, borderColor: `color-mix(in oklch, ${color} 50%, transparent)`, background: `color-mix(in oklch, ${color} 12%, transparent)` }}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-hud text-[0.62rem] tracking-[0.16em] uppercase" style={{ color }}>
            {toast.kind === "rank" ? "rank up" : "achievement unlocked"} · {RANK_LABEL[tier]}
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold text-foreground">{toast.title}</p>
          {toast.body ? <p className="mt-0.5 text-xs text-muted-foreground">{toast.body}</p> : null}
          {toast.points !== undefined || toast.progress !== undefined ? (
            <div className="mt-2 flex items-center gap-2 font-hud text-[0.62rem] text-subtle-foreground">
              {toast.points !== undefined ? <span className="text-foreground">+{toast.points} pts</span> : null}
              {toast.progress !== undefined ? (
                <>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                    <span className="block h-full rounded-full" style={{ width: `${Math.round(toast.progress * 100)}%`, background: color }} />
                  </span>
                  {toast.next ? <span>{toast.next}</span> : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        data-sfx="none"
        onClick={() => dismissToast(toast.id)}
        className="absolute top-2 right-2 text-subtle-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
