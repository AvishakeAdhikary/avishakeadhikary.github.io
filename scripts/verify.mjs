#!/usr/bin/env node
/**
 * End-to-end check of the built site (out/) in real browsers.
 *
 *   npm run build && npm start   # serve out/ on :3000 (or set VERIFY_URL)
 *   npm run verify               # chromium + firefox + webkit
 *   npm run verify -- chromium   # one engine
 *
 * For every route × viewport: HTTP 200, no console errors, no element left
 * hidden after scrolling (the v1 "invisible page" bug), and in Chromium the
 * JS heap and DOM size. Also exercises the terminal, the crash → recover
 * flow, reduced motion and the Konami theme.
 */
import { chromium, firefox, webkit } from "playwright";

const BASE = (process.env.VERIFY_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ROUTES = ["/", "/work/", "/projects/", "/projects/zoyemed/", "/projects/os-portfolio/", "/skills/", "/research/", "/about/", "/gallery/", "/lab/", "/contact/?recovered=1", "/does-not-exist/"];
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
const ENGINES = { chromium, firefox, webkit };
const pick = process.argv.slice(2).filter((a) => a in ENGINES);
const engines = pick.length ? pick : Object.keys(ENGINES);

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
};

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += Math.round(innerHeight * 0.7)) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    await new Promise((r) => setTimeout(r, 900));
  });
}

for (const name of engines) {
  console.log(`\n▶ ${name}`);
  const browser = await ENGINES[name].launch();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp });
    // Pre-mark the session so the boot screen and crash don't interfere with route checks.
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem("booted", "1");
        sessionStorage.setItem("crash-seen", "1");
      } catch {
        /* ignore */
      }
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    for (const route of ROUTES) {
      errors.length = 0;
      const res = await page.goto(BASE + route, { waitUntil: "load" });
      const expect404 = route.startsWith("/does-not-exist");
      if (!res || (expect404 ? res.status() !== 404 : res.status() !== 200)) fail(`${name} ${vp.width}px ${route}: HTTP ${res?.status()}`);
      await page.waitForTimeout(600);
      await scrollThrough(page);
      const state = await page.evaluate(() => {
        const stuck = [...document.querySelectorAll("[data-pending],[data-armed]")].length;
        const hiddenTok = [...document.querySelectorAll("[data-stream]:not([data-play]) .tok")].filter((t) => getComputedStyle(t).opacity === "0").length;
        const overflow = document.documentElement.scrollWidth - innerWidth;
        const mem = performance.memory?.usedJSHeapSize;
        return { stuck, hiddenTok, overflow, heapMB: mem ? +(mem / 1048576).toFixed(1) : null, dom: document.getElementsByTagName("*").length };
      });
      const realErrors = errors.filter((e) => !/favicon|Failed to load resource.*404/.test(e) || !expect404);
      if (realErrors.length) fail(`${name} ${vp.width}px ${route}: console errors → ${realErrors.slice(0, 2).join(" | ")}`);
      if (state.stuck || state.hiddenTok) fail(`${name} ${vp.width}px ${route}: ${state.stuck} stuck reveals, ${state.hiddenTok} hidden tokens`);
      if (state.overflow > 1) fail(`${name} ${vp.width}px ${route}: horizontal overflow ${state.overflow}px`);
      console.log(`  ${vp.width}px ${route.padEnd(26)} ok · dom ${state.dom}${state.heapMB ? ` · heap ${state.heapMB} MB` : ""}`);
    }

    // Interactions (desktop only).
    if (vp.width >= 1024) {
      await page.goto(BASE + "/");
      await page.waitForTimeout(800);
      await page.keyboard.press("Backquote");
      const input = page.locator("#dropdown-terminal input");
      await input.waitFor({ timeout: 8000 });
      await input.fill("ask what did you build at PTS?");
      await input.press("Enter");
      await page.waitForTimeout(3500);
      const log = await page.locator("#dropdown-terminal [role=log]").innerText();
      if (!/KoyoX/.test(log)) fail(`${name}: terminal ask did not mention KoyoX`);
      else console.log("  terminal ask ✓");
      await input.press("Escape");

      for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) await page.keyboard.press(k);
      const theme = await page.evaluate(() => document.documentElement.dataset.theme);
      if (theme !== "phosphor") fail(`${name}: konami theme not applied`);
      else console.log("  konami ✓");
    }
    await ctx.close();
  }

  // Crash → recover flow on a fresh session.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => sessionStorage.setItem("booted", "1"));
  const page = await ctx.newPage();
  await page.goto(BASE + "/about/");
  await page.waitForTimeout(800);
  await page.locator('header a[href="/contact/"]').click();
  await page.locator('[role="alertdialog"] >> text=Relax, nothing broke.').waitFor({ timeout: 8000 });
  await page.keyboard.press("x");
  await page.waitForURL(/\/contact\/\?recovered=1/, { timeout: 8000 });
  console.log("  crash → recover ✓");
  await ctx.close();

  // Settings: persist across reload, applied before paint.
  {
    const sctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await sctx.addInitScript(() => sessionStorage.setItem("booted", "1"));
    const sp = await sctx.newPage();
    await sp.goto(BASE + "/settings/");
    await sp.getByRole("switch", { name: "Scanlines" }).click();
    await sp.getByRole("switch", { name: "Contact page crash" }).click();
    await sp.getByRole("radio", { name: "Phosphor" }).click();
    await sp.reload();
    const applied = await sp.evaluate(() => ({
      crt: document.documentElement.dataset.crt,
      theme: document.documentElement.dataset.theme,
      layer: getComputedStyle(document.querySelector(".crt-layer")).display,
    }));
    if (applied.crt !== "off" || applied.theme !== "phosphor" || applied.layer !== "none") fail(`${name}: settings not applied after reload ${JSON.stringify(applied)}`);
    // Crash off → Contact goes straight to the contact page.
    await sp.goto(BASE + "/about/");
    await sp.locator('header a[href="/contact/"]').click();
    await sp.waitForURL(/\/contact\/$/, { timeout: 8000 });
    if (await sp.locator('[role="alertdialog"]').count()) fail(`${name}: crash shown although disabled`);
    else console.log("  settings ✓");
    await sctx.close();
  }

  // Music: each composed style must actually produce sound (analyser energy).
  if (name !== "webkit") {
    const mctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await mctx.addInitScript(() => {
      sessionStorage.setItem("booted", "1");
      const orig = AudioContext.prototype.createAnalyser;
      window.__analysers = [];
      window.__played = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        window.__played.push(this.currentSrc || this.src);
        return play.call(this);
      };
      AudioContext.prototype.createAnalyser = function () {
        const a = orig.call(this);
        window.__analysers.push(a);
        return a;
      };
    });
    const mp = await mctx.newPage();
    await mp.goto(BASE + "/settings/");
    const energy = () =>
      mp.evaluate(() => {
        const a = window.__analysers.at(-1);
        if (!a) return 0;
        const d = new Uint8Array(a.frequencyBinCount);
        let max = 0;
        for (let i = 0; i < 40; i++) {
          a.getByteFrequencyData(d);
          max = Math.max(max, d.reduce((s, v) => s + v, 0));
        }
        return max;
      });
    await mp.getByRole("button", { name: "Play", exact: true }).click();
    for (const style of ["Lo-fi", "Synthwave", "Ambient"]) {
      await mp.getByRole("radio", { name: style }).click();
      await mp.waitForTimeout(4500);
      const e = await energy();
      if (!e) fail(`${name}: no audio energy for ${style}`);
      else console.log(`  music ${style} ✓ (energy ${e})`);
    }
    await mp.getByRole("radio", { name: "CC0 playlist" }).click();
    await mp.waitForTimeout(3000);
    const played = await mp.evaluate(() => window.__played);
    if (!played.some((u) => /\.m4a$/.test(u))) fail(`${name}: CC0 playlist did not start (${played.join(", ")})`);
    else console.log("  music CC0 playlist ✓");
    await mp.getByRole("button", { name: "Pause", exact: true }).click();
    await mctx.close();
  }

  // Reduced motion: nothing hidden, no boot, no crash.
  const rctx = await browser.newContext({ reducedMotion: "reduce" });
  const rp = await rctx.newPage();
  await rp.goto(BASE + "/");
  const booting = await rp.evaluate(() => document.documentElement.classList.contains("booting"));
  const hidden = await rp.evaluate(() => [...document.querySelectorAll(".tok")].filter((t) => getComputedStyle(t).opacity === "0").length);
  if (booting || hidden) fail(`${name}: reduced motion still animates (booting=${booting}, hidden tokens=${hidden})`);
  else console.log("  reduced motion ✓");
  await rctx.close();

  await browser.close();
}

console.log(failures.length ? `\n✗ ${failures.length} problem(s)` : "\n✓ all checks passed");
process.exit(failures.length ? 1 : 0);
