"use client";

import { useEffect } from "react";

/**
 * Highlights the checkpoint currently being read: sets data-active on the
 * matching chart node and drives --progress on the chart (0..1). The chart
 * and the cards are static server HTML; this only flips attributes.
 */
export function CheckpointTracker({ ids }: { ids: string[] }) {
  useEffect(() => {
    const chart = document.getElementById("training-chart");
    const nodes = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const set = (i: number) => {
      chart?.style.setProperty("--progress", String((i + 1) / ids.length));
      chart?.querySelectorAll<SVGGElement>("[data-ckpt]").forEach((g) => {
        if (g.dataset.ckpt === ids[i]) g.setAttribute("data-active", "");
        else g.removeAttribute("data-active");
        g.toggleAttribute("data-done", ids.indexOf(g.dataset.ckpt ?? "") <= i);
      });
      const label = document.getElementById("training-current");
      if (label) label.textContent = nodes[i]?.dataset.label ?? "";
    };
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) set(nodes.indexOf(visible[0].target as HTMLElement));
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    nodes.forEach((n) => io.observe(n));
    set(0);
    return () => io.disconnect();
  }, [ids]);
  return null;
}
