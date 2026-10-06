"use client";

import { useEffect } from "react";
import { preloadSfx, sfx, type SfxName } from "@/components/media/audio/play";
import { readSettings } from "@/lib/settings";

const CLICKABLE = "[data-sfx],button,a[href],summary,[role=switch],[role=radio],[role=tab],[role=menuitem],[role=option],[role=button]";

/**
 * Interface sounds for every click, delegated from one capture listener
 * (it runs before React handlers, so a switch's sound reflects the state
 * it is changing *to*). Elements choose a sound with data-sfx="name", or
 * opt out with data-sfx="none". The synth is fetched on first pointerdown.
 */
export function Sound() {
  useEffect(() => {
    const onDown = () => {
      if (readSettings().sfx) void preloadSfx();
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(CLICKABLE);
      if (!el || el.matches(":disabled,[aria-disabled=true]")) return;
      const named = el.dataset.sfx;
      if (named === "none") return;
      if (named) return sfx(named as SfxName);
      const role = el.getAttribute("role");
      if (role === "switch") return sfx(el.getAttribute("aria-checked") === "true" ? "toggleOff" : "toggleOn");
      if (el.tagName === "A" || role === "tab") return sfx("tap");
      sfx("click");
    };
    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
