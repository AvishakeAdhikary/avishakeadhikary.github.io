"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/error-boundary";
import { loadChunk } from "@/lib/lazy";

const TerminalView = dynamic(() => loadChunk(() => import("@/components/terminal/terminal-view")).then((m) => m.TerminalView), {
  ssr: false,
  loading: () => <p className="p-4 font-hud text-xs text-subtle-foreground">booting shell…</p>,
});

export function InlineTerminal() {
  return (
    <div className="panel h-[30rem] overflow-hidden bg-[oklch(0.1_0.006_20)]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-signal" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-2 font-hud text-[0.7rem] text-subtle-foreground">guest@avishake:~ (try: help)</span>
      </div>
      <div className="h-[calc(100%-2.6rem)]">
        <ErrorBoundary name="terminal" fallback={<p className="p-4 font-hud text-xs text-signal-soft">the shell failed to start · reload the page to try again</p>}>
          <TerminalView autoFocus={false} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
