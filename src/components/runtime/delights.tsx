"use client";

import { useEffect } from "react";

/** Small surprises: tab title when you leave and a console note. (Konami lives in keybinds.tsx.) */
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
        "\nTry: press ~ for the terminal, ? for every keybind, or ↑↑↓↓←→←→BA.",
      "background:#e11d48;color:#fff;font:700 14px monospace;padding:4px 8px;border-radius:3px",
      "color:inherit;font:12px monospace",
    );

    return () => document.removeEventListener("visibilitychange", onVis);
  }, [email]);

  return null;
}
