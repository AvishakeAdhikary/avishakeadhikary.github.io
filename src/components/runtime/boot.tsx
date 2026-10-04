"use client";

import { useEffect, useRef } from "react";

const LINES = [
  "avishake.run v2 · inference runtime",
  "probing display … ok",
  "loading weights  kolkata.ckpt ……… ✓",
  "loading weights  curiosity.safetensors ✓",
  "mounting /work /projects /skills /research",
  "warming up attention heads ……… ✓",
  "ready. hello, human.",
];

/**
 * First-visit boot log (home page only, ≤1.2 s, skippable, once per
 * session, can be turned off in settings). Whether it shows is decided by
 * SETTINGS_SCRIPT in <head> before paint, so there is no flash.
 */
export function Boot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("booting")) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ref.current?.classList.add("boot-out");
      setTimeout(() => html.classList.remove("booting"), 430);
    };
    const t = setTimeout(finish, LINES.length * 110 + 380);
    const skip = () => finish();
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);

  return (
    <div ref={ref} className="boot fixed inset-0 z-[95] items-end bg-background p-6 sm:p-10" aria-hidden>
      <div className="font-hud text-xs leading-6 text-muted-foreground sm:text-sm">
        {LINES.map((l, i) => (
          <p key={l} className="boot-line" style={{ ["--b" as string]: i }}>
            <span className="text-signal">›</span> {l}
          </p>
        ))}
        <p className="boot-line mt-3 text-subtle-foreground" style={{ ["--b" as string]: LINES.length }}>
          press any key to skip
        </p>
      </div>
    </div>
  );
}
