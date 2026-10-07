import { test as base, expect, type Page } from "@playwright/test";

/**
 * Every e2e test runs through this fixture: it seeds a quiet, deterministic
 * visit (no boot log, no music, no toasts unless a test opts in) and FAILS
 * the test if the browser logs any error or warning, throws, or gets an
 * unexpected HTTP error. The site's promise is a silent console.
 */
export interface SiteOptions {
  /** Merged over { musicOn: false, toasts: false }. */
  settings?: Record<string, unknown>;
  /** A whole progress record to start from. */
  progress?: unknown;
  /** Show the boot log (default: skipped). */
  boot?: boolean;
  /** Mark the crash as already seen. */
  crashSeen?: boolean;
  /** Paths whose document may legitimately be a 404 (the not-found test). */
  allow404?: string[];
}

/**
 * How engines word a request cancelled because its document is going away (the same
 * aborts the requestfailed guard skips): WebKit fails prefetch fetches with "access
 * control checks", Firefox warns that a script "failed" to load.
 */
const ABORTED = /access control checks|Load failed|Fetch is aborted|NetworkError when attempting to fetch|Loading failed for the <script>/;

/**
 * Firefox's "preload … not used within a few seconds" is a timing heuristic: it fires when
 * a starved machine can't render for seconds, not when a preload is wrong (a wrong one
 * would warn on every run, and Chromium's equivalent check stays strict).
 */
const TIMING_HINT = /preloaded with link preload was not used within a few seconds/;

export const test = base.extend<{ site: SiteOptions; problems: string[] }>({
  site: [{}, { option: true }],
  problems: async ({}, use) => use([]),
  page: async ({ page, site, problems }, use) => {
    await page.addInitScript((o: SiteOptions) => {
      try {
        if (!o.boot) sessionStorage.setItem("booted", "1");
        if (o.crashSeen) sessionStorage.setItem("crash-seen", "1");
        if (!sessionStorage.getItem("__seeded")) {
          localStorage.setItem("avishake-settings", JSON.stringify({ musicOn: false, toasts: false, ...o.settings }));
          if (o.progress) localStorage.setItem("avishake-progress", JSON.stringify(o.progress));
          sessionStorage.setItem("__seeded", "1");
        }
      } catch {
        /* storage blocked: the site must still work */
      }
      // Instant scrolling under test: Playwright scrolls a target into view and then clicks
      // its coordinates, and the site's smooth scroll would still be moving on a slow runner.
      const instant = () => {
        const s = document.createElement("style");
        s.textContent = "html { scroll-behavior: auto !important; }";
        document.head.append(s);
      };
      if (document.head) instant();
      else document.addEventListener("DOMContentLoaded", instant, { once: true });
    }, site);
    // Navigations resolve once the page is hydrated (html[data-ready]), so a test's first
    // key press or click never lands before the site's listeners exist.
    // While a test navigates or reloads, the outgoing document's in-flight requests are
    // cancelled; engines report those aborts on that document (see ABORTED below).
    let leaving = false;
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    const ready = () => page.locator("html[data-ready]").waitFor({ state: "attached" });
    page.goto = async (url, options) => {
      leaving = true;
      const res = await goto(url, options).finally(() => (leaving = false));
      await ready();
      return res;
    };
    page.reload = async (options) => {
      leaving = true;
      const res = await reload(options).finally(() => (leaving = false));
      await ready();
      return res;
    };
    page.on("console", (m) => {
      if (m.type() !== "error" && m.type() !== "warning") return;
      if (leaving && ABORTED.test(m.text())) return;
      if (TIMING_HINT.test(m.text())) return;
      // The browser logs the deliberate 404 document of the not-found test; nothing else may 404.
      // (WebKit reports it before page.url() commits, so match the failed resource too.)
      const where = [page.url(), m.location().url].map((u) => (/^https?:/.test(u) ? new URL(u).pathname : ""));
      if (/status of 404/.test(m.text()) && site.allow404?.some((p) => where.some((w) => w.startsWith(p)))) return;
      problems.push(`console.${m.type()}: ${m.text()}`);
    });
    page.on("pageerror", (e) => {
      if (leaving && ABORTED.test(e.message)) return;
      problems.push(`uncaught: ${e.message}`);
    });
    page.on("response", (r) => {
      if (r.status() < 400) return;
      const path = new URL(r.url()).pathname;
      if (r.status() === 404 && site.allow404?.some((p) => path.startsWith(p))) return;
      problems.push(`HTTP ${r.status()}: ${r.url()}`);
    });
    page.on("requestfailed", (r) => {
      const err = r.failure()?.errorText ?? "";
      // Aborted requests (navigating away mid-prefetch, media the browser cancels) are not failures.
      if (/abort|cancel|NS_BINDING_ABORTED/i.test(err)) return;
      problems.push(`request failed: ${r.url()} (${err})`);
    });
    await use(page);
    expect(problems, "the console must stay silent").toEqual([]);
  },
});

export { expect };

export const ROUTES = [
  "/",
  "/work/",
  "/projects/",
  "/projects/koyox/",
  "/projects/os-portfolio/",
  "/skills/",
  "/research/",
  "/about/",
  "/gallery/",
  "/lab/",
  "/arcade/",
  "/arcade/gradient-golf/",
  "/arcade/kmeans/",
  "/arcade/knn/",
  "/arcade/perceptron/",
  "/arcade/tokens/",
  "/arcade/debugger/",
  "/arcade/interp/",
  "/settings/",
  "/contact/?recovered=1",
  "/does-not-exist/",
];

export const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

export async function scrollThrough(page: Page) {
  // A person scrolls with real input, which ends the browser's LCP measurement; scripted
  // scrollTo doesn't. One real key event (bare Shift: no shortcut uses it) keeps lazy photos far
  // down the page from being judged as the "largest contentful paint".
  await page.keyboard.press("Shift");
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += Math.round(innerHeight * 0.7)) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    await new Promise((r) => setTimeout(r, 700));
  });
}

/**
 * Layout guard: nothing may spill out of the box it lives in.
 *  - the page never scrolls sideways;
 *  - a scroll container (overflow auto/scroll) never scrolls sideways unless
 *    it is meant to (data-scroll-x);
 *  - inside a clipping container (overflow hidden/clip) no element pokes out
 *    horizontally, unless the clip is the point (data-clip-ok: marquees,
 *    decorative backgrounds).
 * This is what catches a row of keycaps overflowing a dialog.
 */
/** Resolves when every finite animation has finished (entrances, token streams); infinite loops are ignored. */
export async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => Number.isFinite(Number(a.effect?.getComputedTiming().endTime)))
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

export async function layoutProblems(page: Page, scope = "body") {
  // Measure settled layout: an entrance animation (e.g. a slide-in) is mid-flight, not overflow.
  await settled(page);
  return page.evaluate((sel) => {
    const out: string[] = [];
    const name = (el: Element) => {
      const id = el.id ? `#${el.id}` : "";
      const cls = typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
      return `${el.tagName.toLowerCase()}${id}${cls} "${(el.textContent ?? "").trim().slice(0, 40)}"`;
    };
    const root = document.querySelector(sel);
    if (!root) return [`no ${sel}`];
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`page scrolls sideways by ${document.documentElement.scrollWidth - innerWidth}px`);
    const visible = (el: Element) => {
      if (!(el instanceof HTMLElement)) return false;
      if (!el.getClientRects().length) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== "hidden" && cs.opacity !== "0";
    };
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      if (!visible(el) || el.closest("svg,[data-clip-ok],[aria-hidden=true]")) continue;
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && !el.closest("[data-scroll-x]")) out.push(`scrolls sideways: ${name(el)} (${el.scrollWidth} > ${el.clientWidth})`);
      if (!/(hidden|clip)/.test(cs.overflowX) || el.closest("[data-scroll-x]")) continue;
      const box = el.getBoundingClientRect();
      for (const child of el.querySelectorAll<HTMLElement>("*")) {
        if (!visible(child) || child.closest("svg,[data-clip-ok],[aria-hidden=true]")) continue;
        // Only direct clip relationships: skip children that have their own clipping ancestor below `el`.
        let a = child.parentElement;
        let nearest: HTMLElement | null = null;
        while (a && a !== el) {
          if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) {
            nearest = a;
            break;
          }
          a = a.parentElement;
        }
        if (nearest) continue;
        const r = child.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.right > box.right + 1 || r.left < box.left - 1) out.push(`clipped: ${name(child)} spills out of ${name(el)} by ${Math.round(Math.max(r.right - box.right, box.left - r.left))}px`);
      }
    }
    return [...new Set(out)].slice(0, 12);
  }, scope);
}

/** Content hidden by the reveal system that never came back (the v1 "invisible page" bug). */
export async function hiddenContent(page: Page) {
  return page.evaluate(() => ({
    stuck: document.querySelectorAll("[data-pending],[data-armed]").length,
    hiddenTokens: [...document.querySelectorAll("[data-stream]:not([data-play]) .tok")].filter((t) => getComputedStyle(t).opacity === "0").length,
  }));
}

/** A fully maxed progress record: every game cleared and mastered, every level done. */
export const MAXED_PROGRESS = {
  v: 1,
  unlocked: {},
  sets: {
    pages: ["/"],
    tutorials: ["gradient-golf", "kmeans", "knn", "perceptron", "tokens", "debugger", "interp"],
    cleared: ["gradient-golf", "kmeans", "knn", "perceptron", "tokens", "debugger", "interp"],
    mastered: ["gradient-golf", "kmeans", "knn", "perceptron", "tokens", "debugger", "interp"],
  },
  counters: {},
  days: [],
  flags: {},
  best: { "knn/correct": 40, "knn/streak": 12, "gradient-golf/bowl": 3 },
  levels: { "gradient-golf": [2, 2, 2, 2], kmeans: [2, 2, 2, 2], knn: [2], perceptron: [2, 2, 2, 2], tokens: [2, 2, 2, 2, 2, 2], debugger: [2, 2, 2, 2, 2, 2, 2], interp: [2, 2, 2, 2] },
};

/** Records the text of every status toast that appears (they auto-dismiss after ~2 s). */
export async function recordToasts(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = ((window as unknown as { __toasts: string[] }).__toasts = []);
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          // The toast itself, or toasts inside a stack that mounted with them.
          for (const el of [n, ...n.querySelectorAll("[role=status]")]) if (el.getAttribute("role") === "status") seen.push(el.textContent ?? "");
        }
    }).observe(document, { childList: true, subtree: true });
  });
  return () => page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts);
}
