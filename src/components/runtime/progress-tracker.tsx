"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { MAIN_PAGES } from "@/content/achievements";
import { profile } from "@/content/profile";
import { isFirstVisit, markDay, track } from "@/lib/progress";
import { readSettings, type Settings } from "@/lib/settings";
import { pushToast } from "@/lib/toast";

const SPEEDRUN_MS = 3 * 60 * 1000;
const SOCIAL: string[] = Object.values(profile.socials);

/**
 * Reports what the visitor does to lib/progress (achievements). Page
 * visits, reading to the end, return visits and secrets are observed
 * here; résumé, contact and citation interactions are caught by one
 * delegated listener; components report their own moments with track().
 */
export function ProgressTracker() {
  const pathname = usePathname();

  // Once per load: the first-visit nudge, today's date, night owl.
  useEffect(() => {
    if (isFirstVisit()) {
      setTimeout(() => pushToast({ kind: "info", title: "explore pages, games & keybinds to rank up · shift+a shows progress", ttl: 6500 }), 2600);
    }
    markDay();
    if (new Date().getHours() < 5) track({ t: "flag", flag: "night" });
  }, []);

  // Every route: page set, project pages, 404s, the speedrun clock, reading to the end.
  useEffect(() => {
    const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
    if (document.querySelector("[data-not-found]")) {
      track({ t: "flag", flag: "404" });
      return;
    }
    track({ t: "page", path });
    const project = path.match(/^\/projects\/([^/]+)\/$/);
    if (project) track({ t: "project", slug: project[1] });

    try {
      const start = Number(sessionStorage.getItem("speedrun-start")) || Date.now();
      sessionStorage.setItem("speedrun-start", String(start));
      const seen = new Set<string>(JSON.parse(sessionStorage.getItem("speedrun-pages") ?? "[]"));
      seen.add(path);
      sessionStorage.setItem("speedrun-pages", JSON.stringify([...seen]));
      if (Date.now() - start <= SPEEDRUN_MS && MAIN_PAGES.every((m) => seen.has(m))) track({ t: "flag", flag: "speedrun" });
    } catch {
      /* ignore */
    }

    if (path !== "/work/") return;
    let done = false;
    const onScroll = () => {
      if (done) return;
      const doc = document.documentElement;
      if (scrollY + innerHeight >= doc.scrollHeight - 240) {
        done = true;
        track({ t: "read", path });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Delegated: résumé, contact, citation graph, keybinds, settings, tab return.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>("a[href],[data-track]");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";
      if (href.endsWith(profile.resume) || el.dataset.track === "resume") track({ t: "flag", flag: "resume" });
      const contactScope = location.pathname.startsWith("/contact") || el.closest("[role=alertdialog]");
      if (href.startsWith("mailto:") || el.dataset.track === "contact" || (contactScope && SOCIAL.includes(href))) track({ t: "flag", flag: "contact" });
    };
    const onOver = (e: Event) => {
      if ((e.target as Element | null)?.closest?.('[data-track="paper"]')) track({ t: "flag", flag: "paper" });
    };
    const onKeybind = (e: Event) => track({ t: "key", id: String((e as CustomEvent).detail) });
    const onKonami = () => track({ t: "flag", flag: "konami" });
    let prev: Settings = readSettings();
    const onSettings = (e: Event) => {
      const next = (e as CustomEvent<Settings>).detail;
      for (const k of Object.keys(next) as (keyof Settings)[]) if (next[k] !== prev[k]) track({ t: "setting", key: k });
      prev = next;
    };
    let wasHidden = false;
    const onVis = () => {
      if (document.hidden) wasHidden = true;
      else if (wasHidden) track({ t: "flag", flag: "resumed" });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("focusin", onOver);
    window.addEventListener("keybind:used", onKeybind);
    window.addEventListener("konami", onKonami);
    window.addEventListener("settings:change", onSettings);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onOver);
      window.removeEventListener("keybind:used", onKeybind);
      window.removeEventListener("konami", onKonami);
      window.removeEventListener("settings:change", onSettings);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
