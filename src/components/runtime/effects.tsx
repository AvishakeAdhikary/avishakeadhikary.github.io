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
    // The page is interactive: every runtime island's listeners are attached (same commit).
    document.documentElement.dataset.ready = "";
  }, []);

  useEffect(() => {
    // react-dom's startViewTransition chains `transition.finished.finally()`
    // without a catch. When the browser aborts a crossfade because the DOM update took
    // too long (a starved CPU), that rejection surfaces as an uncaught error even though
    // React already finished the update. Mark exactly that rejection handled.
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as unknown;
      if (r instanceof DOMException && r.name === "TimeoutError" && /view transition|Transition was aborted/i.test(r.message)) e.preventDefault();
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  useEffect(() => {
    const reduced = motionReduced();
    const els = [...document.querySelectorAll<HTMLElement>(ANIMATED)];
    if (reduced) return;

    const waiting = new Set<HTMLElement>();
    const start = (el: HTMLElement) => {
      delete el.dataset.pending;
      delete el.dataset.armed;
      if (!el.hasAttribute("data-reveal")) el.dataset.play = "";
    };
    const play = (el: HTMLElement) => {
      waiting.delete(el);
      // A diffusion image denoises its pixels, not an empty box: wait for
      // the image (capped, so a slow network never leaves it hidden).
      const img = el.hasAttribute("data-diffuse") ? el.querySelector("img") : null;
      if (img && !img.complete) {
        let done = false;
        const go = () => {
          if (done) return;
          done = true;
          clearTimeout(cap);
          start(el);
        };
        const cap = setTimeout(go, 1200);
        img.addEventListener("load", go, { once: true });
        img.addEventListener("error", go, { once: true });
        return;
      }
      start(el);
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
          if (!el.hasAttribute("data-reveal")) play(el);
          continue;
        }
        if (el.hasAttribute("data-reveal")) el.dataset.pending = "";
        else el.dataset.armed = "";
        waiting.add(el);
        io.observe(el);
      }
    };
    // Visibility must never wait on frame rate: an engine that paints slowly
    // (software rendering, a busy device) gets a timer instead of frame two.
    let armed = false;
    const armOnce = () => {
      if (armed) return;
      armed = true;
      arm();
    };
    let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(armOnce)));
    const armTimer = window.setTimeout(armOnce, 150);

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
      clearTimeout(armTimer);
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
