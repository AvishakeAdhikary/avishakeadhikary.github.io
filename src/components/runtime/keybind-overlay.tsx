"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { KeybindTable } from "@/components/settings/keybind-table";

/**
 * The `?` cheat sheet (loaded the first time it opens). A small hand-rolled
 * modal rather than the Radix dialog: closing a keyboard-opened Radix
 * dialog here crashed WebKit's renderer, and this needs none of its weight.
 */
export function KeybindOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const panel = useRef<HTMLDivElement>(null);

  // Layout effect: the Esc listener and focus are in place before the sheet paints.
  useLayoutEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === "Tab") {
        // Keep Tab inside the sheet.
        const items = panel.current?.querySelectorAll<HTMLElement>("a[href],button");
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[78] grid place-items-center bg-black/60 p-4" onPointerDown={(e) => e.target === e.currentTarget && onOpenChange(false)}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keybinds-title"
        tabIndex={-1}
        className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border-strong bg-background p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] outline-none"
      >
        <button
          type="button"
          aria-label="Close keybinds"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-subtle-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <h2 id="keybinds-title" className="font-mono text-xl font-bold">
          Keybinds<span className="text-signal">.</span>
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Everything is also reachable by clicking. Find this list any time in{" "}
          <Link href="/settings/#controls" className="link-mono" onClick={() => onOpenChange(false)}>
            settings → controls
          </Link>
          .
        </p>
        <KeybindTable />
      </div>
    </div>
  );
}
