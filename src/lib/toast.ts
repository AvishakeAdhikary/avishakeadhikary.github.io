import { useSyncExternalStore } from "react";
import type { Rank } from "./tiers";

/**
 * Tiny toast store (no library). "info" toasts confirm keybinds and
 * actions; "achievement" and "rank" toasts are raised by progress.ts.
 */
export interface Toast {
  id: number;
  kind: "info" | "achievement" | "rank";
  title: string;
  body?: string;
  tier?: Rank;
  points?: number;
  /** 0..1 progress towards the next rank, shown as a bar. */
  progress?: number;
  next?: string;
  ttl: number;
}

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function pushToast(t: Omit<Toast, "id" | "ttl"> & { ttl?: number }) {
  const toast: Toast = { ttl: t.kind === "info" ? 2200 : 5200, ...t, id: ++seq };
  // Info toasts replace each other (rapid keybind presses shouldn't stack up).
  toasts = [...(t.kind === "info" ? toasts.filter((x) => x.kind !== "info") : toasts), toast].slice(-4);
  emit();
  return toast.id;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const EMPTY: Toast[] = [];

export function useToasts() {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );
}
