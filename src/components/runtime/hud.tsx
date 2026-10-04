"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { updateSettings, useSettings } from "@/lib/settings";
import { fps as tickerFps, subscribe } from "@/lib/ticker";

type Mem = Performance & { memory?: { usedJSHeapSize: number } };

/**
 * Live runtime readout (desktop only; toggle in /settings). Real numbers, sampled
 * at 2 Hz: display refresh, JS heap (Chromium), words of content "read".
 * It shows off the optimization instead of hiding it.
 */
export function Hud() {
  const pathname = usePathname();
  const { hud } = useSettings();
  const [desktop, setDesktop] = useState(false);
  const [stats, setStats] = useState({ fps: 0, heap: 0, tok: 0 });
  const maxScroll = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- viewport capability is only known in the browser
    setDesktop(window.matchMedia("(min-width: 1024px) and (hover: hover)").matches);
  }, []);
  const hidden = !hud || !desktop;

  useEffect(() => {
    if (hidden) return;
    maxScroll.current = 0;
    // Keep the shared loop warm so fps reflects the display's real refresh rate.
    const unsub = subscribe(() => undefined);
    const words = (document.querySelector("main")?.textContent ?? "").split(/\s+/).length;
    const iv = setInterval(() => {
      const doc = document.documentElement;
      const seen = Math.min(1, (scrollY + innerHeight) / Math.max(1, doc.scrollHeight));
      maxScroll.current = Math.max(maxScroll.current, seen);
      const mem = (performance as Mem).memory;
      setStats({
        fps: tickerFps(),
        heap: mem ? Math.round(mem.usedJSHeapSize / 1048576) : 0,
        tok: Math.round(words * maxScroll.current * 1.3),
      });
    }, 500);
    return () => {
      clearInterval(iv);
      unsub();
    };
  }, [hidden, pathname]);

  if (hidden) return null;
  return (
    <div className="fixed right-4 bottom-11 z-[55] hidden w-44 rounded-md border border-border bg-background/80 px-3 py-2 font-hud text-[0.64rem] leading-5 text-subtle-foreground backdrop-blur lg:block">
      <div className="mb-1 flex items-center justify-between">
        <span className="tracking-[0.18em] text-signal uppercase">runtime</span>
        <button
          type="button"
          aria-label="Hide runtime readout (turn back on in settings)"
          onClick={() => updateSettings({ hud: false })}
          className="text-subtle-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>
      <Row k="route" v={pathname} />
      <Row k="refresh" v={`${stats.fps} fps`} />
      {stats.heap ? <Row k="js heap" v={`${stats.heap} MB`} /> : null}
      <Row k="context" v={`${stats.tok.toLocaleString()} tok`} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{k}</span>
      <span className="truncate text-muted-foreground tabular-nums">{v}</span>
    </div>
  );
}
