"use client";

import { useState } from "react";

/** Filters the server-rendered certification list in place. */
export function CertSearch({ targetId, total }: { targetId: string; total: number }) {
  const [q, setQ] = useState("");
  const [n, setN] = useState(total);
  const update = (next: string) => {
    setQ(next);
    const words = next.toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    document
      .getElementById(targetId)
      ?.querySelectorAll<HTMLElement>("[data-cert]")
      .forEach((li) => {
        const ok = words.every((w) => (li.dataset.cert ?? "").includes(w));
        li.hidden = !ok;
        if (ok) count++;
      });
    setN(count);
  };
  return (
    <label className="flex items-center gap-3 rounded-md border border-border-strong px-4 py-2.5 font-hud text-sm focus-within:border-signal">
      <span className="text-signal">$ grep</span>
      <input
        value={q}
        onChange={(e) => update(e.target.value)}
        placeholder="aws, google, python, 2024…"
        aria-label="Search certifications"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle-foreground"
      />
      <span className="text-subtle-foreground" aria-live="polite">
        {n}/{total}
      </span>
    </label>
  );
}
