"use client";

import { SquareTerminal, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

// The whole terminal (engine + retrieval) downloads only on first open.
const TerminalView = dynamic(() => import("./terminal-view").then((m) => m.TerminalView), {
  ssr: false,
  loading: () => <p className="px-4 py-3 font-hud text-xs text-subtle-foreground">booting shell…</p>,
});

/** Quake-style drop-down terminal, available on every page. */
export function TerminalDock() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { dock } = useSettings();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    sfx(open ? "open" : "close");
    // Closing leaves focus inside the now-inert terminal; hand it back to the
    // page so keybinds (and Tab order) work again.
    const term = document.getElementById("dropdown-terminal");
    if (!open && term?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  }, [open]);

  useEffect(() => {
    // Keys are handled by the global keybinds island, which dispatches these.
    const onToggle = () => {
      setLoaded(true);
      setOpen((o) => !o);
    };
    const onOpen = () => {
      setLoaded(true);
      setOpen(true);
    };
    window.addEventListener("terminal:toggle", onToggle);
    window.addEventListener("terminal:open", onOpen);
    return () => {
      window.removeEventListener("terminal:toggle", onToggle);
      window.removeEventListener("terminal:open", onOpen);
    };
  }, []);

  return (
    <>
      {dock ? (
      <button
        type="button"
        onClick={() => {
          setLoaded(true);
          setOpen((o) => !o);
        }}
        onPointerEnter={() => setLoaded(true)}
        data-sfx="none"
        aria-expanded={open}
        aria-controls="dropdown-terminal"
        className="group fixed bottom-11 left-4 z-[60] hidden items-center gap-2 rounded-md border border-border-strong bg-background/85 px-3 py-2 font-hud text-xs text-muted-foreground backdrop-blur transition-colors hover:border-signal hover:text-foreground sm:flex"
      >
        <SquareTerminal className="size-4 text-signal" />
        Try the terminal
        <kbd className="rounded border border-border px-1 text-[0.65rem] text-subtle-foreground">~</kbd>
      </button>
      ) : null}

      <div
        id="dropdown-terminal"
        role="dialog"
        aria-modal="false"
        aria-label="Terminal"
        className={cn(
          "fixed inset-x-0 top-0 z-[65] mx-auto h-[min(62vh,34rem)] max-w-5xl overflow-hidden rounded-b-xl border border-t-0 border-border-strong bg-[oklch(0.1_0.006_20/0.96)] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          open ? "translate-y-0" : "-translate-y-[105%]",
        )}
        inert={!open}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="hud">guest@avishake · terminal</span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close terminal" data-sfx="none" className="text-subtle-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="h-[calc(100%-2.3rem)]">{loaded ? <TerminalView autoFocus={open} onClose={() => setOpen(false)} /> : null}</div>
      </div>
    </>
  );
}
