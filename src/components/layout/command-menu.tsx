"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { track } from "@/lib/progress";

export interface CommandEntry {
  group: "Navigate" | "Projects" | "Links" | "Actions";
  label: string;
  hint?: string;
  href?: string;
  action?: "copy-email" | "toggle-audio";
  keywords?: string;
}

// cmdk + dialog are only downloaded the first time the palette opens.
const CommandPalette = dynamic(() => import("./command-palette").then((m) => m.CommandPalette), { ssr: false });

export function CommandMenu({ entries, email }: { entries: CommandEntry[]; email: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    sfx(open ? "open" : "close");
    if (open) track({ t: "flag", flag: "palette" });
  }, [open]);

  useEffect(() => {
    // ⌘K / Ctrl+K is handled by the global keybinds island.
    const onToggle = () => {
      setLoaded(true);
      setOpen((o) => !o);
    };
    window.addEventListener("palette:toggle", onToggle);
    return () => window.removeEventListener("palette:toggle", onToggle);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
        onPointerEnter={() => setLoaded(true)}
        data-sfx="none"
        className="group flex h-9 cursor-lock items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        aria-label="Open command menu"
      >
        <Search className="size-3.5" />
        <span className="hidden xl:inline">Search</span>
        <kbd className="hidden rounded border border-border bg-white/[0.04] px-1.5 font-mono text-[0.65rem] sm:inline">⌘K</kbd>
      </button>
      {loaded ? <CommandPalette open={open} onOpenChange={setOpen} entries={entries} email={email} /> : null}
    </>
  );
}
