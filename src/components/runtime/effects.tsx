"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { motionReduced } from "@/lib/settings";

/** Elements that animate when they enter view. */
const ANIMATED = "[data-reveal],[data-stream],[data-diffuse],[data-drawable]";

/**
 * One tiny island powering every scroll-triggered effect on the site.
 *
 * Fail-safe by design (fixes the v1 "invisible page" bug): markup is
 * fully visible as rendered by the server. On mount we only *arm*
 * elements that start below the fold; anything already on screen just
 * plays. With no JS, an error, or reduced motion, nothing is ever hidden.
 */
export function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = motionReduced();
    const els = [...document.querySelectorAll<HTMLElement>(ANIMATED)];
    if (reduced) return;

    const waiting = new Set<HTMLElement>();
    const play = (el: HTMLElement) => {
      waiting.delete(el);
      delete el.dataset.pending;
      delete el.dataset.armed;
      if (!el.hasAttribute("data-reveal")) el.dataset.play = "";
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          play(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );

    // Wait two frames so hash/restored scroll positions have settled; then
    // only elements below the *actual* viewport get armed (deep links like
    // /#door-projects never start hidden).
    const arm = () => {
      const fold = window.innerHeight * 0.94;
      for (const el of els) {
        if (el.dataset.play !== undefined) continue;
        const top = el.getBoundingClientRect().top;
        if (top < fold) {
          if (!el.hasAttribute("data-reveal")) el.dataset.play = "";
          continue;
        }
        if (el.hasAttribute("data-reveal")) el.dataset.pending = "";
        else el.dataset.armed = "";
        waiting.add(el);
        io.observe(el);
      }
    };
    let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(arm)));

    // Backstop for engines (notably WebKit) whose IntersectionObserver can
    // skip elements that jump past the viewport between frames (fast flings,
    // End key, scrollbar drags): anything already in or above view plays.
    let ticking = 0;
    const sweep = () => {
      ticking = 0;
      const limit = window.innerHeight;
      for (const el of waiting) if (el.getBoundingClientRect().top < limit) play(el);
    };
    const onScroll = () => {
      if (!ticking && waiting.size) ticking = window.setTimeout(sweep, 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const inview = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.target as HTMLElement).dataset.inview = String(e.isIntersecting);
      },
      { rootMargin: "120px 0px" },
    );
    document.querySelectorAll("[data-observe]").forEach((el) => inview.observe(el));

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(ticking);
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      inview.disconnect();
      // Leave nothing hidden if the route unmounts mid-animation.
      document.querySelectorAll<HTMLElement>("[data-pending],[data-armed]").forEach((el) => {
        delete el.dataset.pending;
        delete el.dataset.armed;
      });
    };
  }, [pathname]);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const update = () => {
      frame = 0;
      const el = (last?.target as Element | null)?.closest?.<HTMLElement>(".spotlight");
      if (!el || !last) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--x", `${last.clientX - r.left}px`);
      el.style.setProperty("--y", `${last.clientY - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(update);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
