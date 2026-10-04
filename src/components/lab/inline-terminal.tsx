"use client";

import dynamic from "next/dynamic";

const TerminalView = dynamic(() => import("@/components/terminal/terminal-view").then((m) => m.TerminalView), {
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
        <TerminalView autoFocus={false} />
      </div>
    </div>
  );
}
