"use client";

import { useEffect } from "react";
import { readSettings, updateSettings } from "@/lib/settings";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Small surprises: tab title when you leave, a console note, and the Konami "jailbreak" theme. */
export function Delights({ email }: { email: string }) {
  useEffect(() => {
    let original = document.title;
    const onVis = () => {
      if (document.hidden) {
        original = document.title;
        document.title = "⏸ inference paused… come back";
      } else document.title = original;
    };
    document.addEventListener("visibilitychange", onVis);

    // eslint-disable-next-line no-console -- intentional easter egg for developers who open the console
    console.log(
      "%c avishake.run %c\n\nYou opened the console, so you're my kind of person.\nThis site is a static Next.js export: one shared rAF loop, CSS-first motion, ~20 MB heap.\nHiring? → " +
        email +
        "\nTry: press ~ for the terminal, or ↑↑↓↓←→←→BA.",
      "background:#e11d48;color:#fff;font:700 14px monospace;padding:4px 8px;border-radius:3px",
      "color:inherit;font:12px monospace",
    );

    let pos = 0;
    const onKey = (e: KeyboardEvent) => {
      const want = KONAMI[pos];
      pos = e.key === want || e.key.toLowerCase() === want ? pos + 1 : e.key === KONAMI[0] ? 1 : 0;
      if (pos === KONAMI.length) {
        pos = 0;
        updateSettings({ theme: readSettings().theme === "phosphor" ? "red" : "phosphor" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey);
    };
  }, [email]);

  return null;
}
