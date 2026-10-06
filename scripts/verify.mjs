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
 * flow, the motion setting (Full / System / Reduced) and the Konami theme.
 */
import { chromium, firefox, webkit } from "playwright";

const BASE = (process.env.VERIFY_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ROUTES = ["/", "/work/", "/projects/", "/projects/zoyemed/", "/projects/os-portfolio/", "/skills/", "/research/", "/about/", "/gallery/", "/lab/", "/arcade/", "/arcade/gradient-golf/", "/arcade/kmeans/", "/arcade/knn/", "/arcade/perceptron/", "/settings/", "/contact/?recovered=1", "/does-not-exist/"];
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

/** Music is on by default (starts on the first click/key); keep route checks silent. */
const quiet = (ctx) =>
  ctx.addInitScript(() => {
    try {
      if (!localStorage.getItem("avishake-settings")) localStorage.setItem("avishake-settings", JSON.stringify({ musicOn: false }));
    } catch {
      /* ignore */
    }
  });

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
    await quiet(ctx);
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
      // Performance budget for the home page (games, terminal, synth etc. must stay lazy).
      if (route === "/" && (state.dom > 1500 || (state.heapMB && state.heapMB > 40))) fail(`${name} ${vp.width}px /: over budget (dom ${state.dom}, heap ${state.heapMB} MB)`);
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

      const konami = async () => {
        for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) await page.keyboard.press(k);
        return page.evaluate(() => document.documentElement.dataset.theme ?? "red");
      };
      const there = await konami();
      const back = await konami();
      if (there !== "phosphor" || back !== "red") fail(`${name}: konami should toggle both ways (${there} → ${back})`);
      else console.log("  konami both ways ✓");
    }
    await ctx.close();
  }

  // Crash → recover flow on a fresh session.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await quiet(ctx);
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

  // Arcade: every ready game loads, its walkthrough can be skipped, and one
  // real move updates the game.
  {
    const gctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await quiet(gctx);
    await gctx.addInitScript(() => sessionStorage.setItem("booted", "1"));
    const gp = await gctx.newPage();
    const gerr = [];
    gp.on("pageerror", (e) => gerr.push(String(e)));
    gp.on("console", (m) => m.type() === "error" && gerr.push(m.text()));
    const clickBoard = async (name, spots) => {
      const board = gp.getByRole("img", { name });
      await board.scrollIntoViewIfNeeded();
      const bb = await board.boundingBox();
      for (const [x, y] of spots) await gp.mouse.click(bb.x + bb.width * x, bb.y + bb.height * y);
    };
    const GAMES = {
      "gradient-golf": async () => {
        await gp.getByRole("button", { name: "Swing" }).click();
        await gp.locator('[role="status"]', { hasText: /sunk|diverged|local minimum|ran out/ }).waitFor({ timeout: 20000 });
      },
      kmeans: async () => {
        await clickBoard(/Your board/, [
          [0.25, 0.3],
          [0.72, 0.28],
          [0.5, 0.75],
        ]);
        await gp.getByRole("button", { name: /Run Lloyd/ }).click();
        await gp.locator('[role="status"]', { hasText: /beat the machine|a tie|machine wins/ }).waitFor({ timeout: 20000 });
      },
      knn: async () => {
        await gp.getByRole("group", { name: "Your answer" }).getByRole("button").first().click();
        await gp.getByText("It was").waitFor({ timeout: 8000 });
      },
      perceptron: async () => {
        await gp.getByRole("button", { name: /Lock in/ }).click();
        await gp.locator('[role="status"]', { hasText: /%|win|perfect/ }).waitFor({ timeout: 20000 });
      },
    };
    for (const [id, play] of Object.entries(GAMES)) {
      gerr.length = 0;
      try {
        await gp.goto(`${BASE}/arcade/${id}/`);
        await gp.getByRole("button", { name: "Skip to the game" }).click({ timeout: 10000 });
        await play();
        if (gerr.length) fail(`${name}: arcade ${id}: ${gerr[0]}`);
        else console.log(`  arcade ${id} ✓`);
      } catch (e) {
        fail(`${name}: arcade ${id}: ${String(e).split("\n")[0]}`);
      }
    }
    await gctx.close();
  }

  // Keybinds: work on the page, pause while typing and over the crash screen.
  {
    const kctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await quiet(kctx);
    await kctx.addInitScript(() => sessionStorage.setItem("booted", "1"));
    const kp = await kctx.newPage();
    const theme = () => kp.evaluate(() => document.documentElement.dataset.theme ?? "red");
    await kp.goto(BASE + "/about/");
    await kp.waitForTimeout(800);
    await kp.keyboard.press("t");
    const toggled = await theme();
    const toast = await kp.locator('[role="status"]', { hasText: "theme" }).count();
    await kp.keyboard.press("t");
    await kp.keyboard.press("?");
    const overlay = await kp
      .getByRole("dialog", { name: /Keybinds/ })
      .waitFor({ timeout: 6000 })
      .then(() => 1)
      .catch(() => 0);
    await kp.keyboard.press("Escape");
    await kp.waitForTimeout(400); // let the dialog finish closing
    await kp.keyboard.press("g");
    await kp.keyboard.press("p");
    await kp.waitForURL(/\/projects\/$/, { timeout: 8000 }).catch(() => undefined);
    const went = new URL(kp.url()).pathname;
    // Typing in the contact form never fires shortcuts.
    await kp.goto(BASE + "/contact/?recovered=1");
    await kp.locator("form input").first().click();
    await kp.keyboard.type("tct");
    const typingTheme = await theme();
    const typingCrt = await kp.evaluate(() => document.documentElement.dataset.crt);
    // Over the crash screen, keys belong to the crash (any key recovers).
    await kp.goto(BASE + "/about/");
    await kp.locator('header a[href="/contact/"]').click();
    await kp.locator('[role="alertdialog"]').waitFor({ timeout: 8000 });
    await kp.keyboard.press("t"); // glitch phase: must not toggle the theme either
    await kp.locator('[role="alertdialog"] >> text=Relax, nothing broke.').waitFor({ timeout: 8000 });
    await kp.keyboard.press("t");
    await kp.waitForURL(/\/contact\//, { timeout: 8000 });
    const crashTheme = await theme();
    const problems = [
      toggled !== "phosphor" && "T did not toggle the theme",
      !toast && "no toast confirmed the keybind",
      !overlay && "? did not open the keybind overlay",
      went !== "/projects/" && `G P went to ${went}`,
      (typingTheme !== "red" || typingCrt !== "on") && "shortcuts fired while typing in the contact form",
      crashTheme !== "red" && "T fired over the crash screen",
    ].filter(Boolean);
    if (problems.length) fail(`${name}: keybinds: ${problems.join("; ")}`);
    else console.log("  keybinds ✓ (T, ?, G P; blocked while typing and over the crash)");
    await kctx.close();
  }

  // Achievements: unlocking raises a toast, survives reload, shows in the
  // trophy room, and reset clears it.
  {
    const actx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await quiet(actx);
    await actx.addInitScript(() => sessionStorage.setItem("booted", "1"));
    const ap = await actx.newPage();
    await ap.goto(BASE + "/about/");
    const toast = await ap
      .locator('[role="status"]', { hasText: "Hello, human" })
      .waitFor({ timeout: 6000 })
      .then(() => true)
      .catch(() => false);
    await ap.goto(BASE + "/settings/#progress");
    const card = ap.locator('section[aria-label="Explore achievements"] li', { hasText: "Hello, human" });
    await card.waitFor({ timeout: 6000 });
    const unlocked = (await card.innerText()).includes("unlocked");
    const rank = await ap.getByText(/^(Bronze|Unranked)$/).first().innerText().catch(() => "");
    const reset = ap.getByRole("button", { name: /Reset progress/ });
    await reset.click();
    await ap.getByRole("button", { name: /Click again/ }).click();
    const cleared = await ap.evaluate(() => !Object.keys(JSON.parse(localStorage.getItem("avishake-progress") || "{}").unlocked ?? {}).length);
    const problems = [!toast && "no unlock toast", !unlocked && "not shown unlocked after reload", !rank && "no rank card", !cleared && "reset did not clear"].filter(Boolean);
    if (problems.length) fail(`${name}: achievements: ${problems.join("; ")}`);
    else console.log(`  achievements ✓ (toast, persisted, trophy room, reset; rank ${rank})`);
    await actx.close();
  }

  // Settings: persist across reload, applied before paint.
  {
    const sctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await quiet(sctx);
    await sctx.addInitScript(() => sessionStorage.setItem("booted", "1"));
    const sp = await sctx.newPage();
    await sp.goto(BASE + "/settings/");
    await sp.getByRole("tab", { name: /Display/ }).click();
    await sp.getByRole("switch", { name: "Scanlines" }).click();
    await sp.getByRole("radio", { name: "Phosphor" }).click();
    await sp.getByRole("tab", { name: /Motion/ }).click();
    await sp.getByRole("switch", { name: "Contact page crash" }).click();
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

    // Music on by default: the first click of a visit starts it, and sound
    // effects play over it through the mixer (music keeps playing, ducked).
    const actx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await actx.addInitScript(() => {
      sessionStorage.setItem("booted", "1");
      window.__analysers = [];
      const create = AudioContext.prototype.createAnalyser;
      AudioContext.prototype.createAnalyser = function () {
        const a = create.call(this);
        window.__analysers.push(a);
        return a;
      };
      // Tap whatever feeds the speakers: that is the final mix.
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (dest, ...rest) {
        if (dest instanceof AudioDestinationNode && !window.__out) {
          window.__out = create.call(this.context);
          connect.call(this, window.__out);
        }
        return connect.call(this, dest, ...rest);
      };
    });
    const ap = await actx.newPage();
    await ap.goto(BASE + "/about/");
    await ap.waitForTimeout(800);
    await ap.mouse.click(700, 500);
    await ap.locator('header button[aria-pressed="true"][data-music-control]').waitFor({ timeout: 8000 });
    await ap.waitForTimeout(2500);
    const peak = (expr) =>
      ap.evaluate((e) => {
        const a = e === "out" ? window.__out : window.__analysers.at(-1);
        if (!a) return 0;
        const d = new Uint8Array(a.frequencyBinCount);
        let max = 0;
        for (let i = 0; i < 30; i++) {
          a.getByteFrequencyData(d);
          max = Math.max(max, d.reduce((s, v) => s + v, 0));
        }
        return max;
      }, expr);
    await ap.locator('button[aria-label="Open command menu"]').click();
    const palette = ap.locator('[data-slot="dialog-content"]');
    await palette.waitFor({ timeout: 8000 });
    await ap.keyboard.press("Escape");
    await palette.waitFor({ state: "detached", timeout: 8000 });
    const [musicE, outE] = [await peak("music"), await peak("out")];
    if (!musicE || !outE) fail(`${name}: music + sfx mix silent (music ${musicE}, out ${outE})`);
    else console.log(`  music on first click + sfx mix ✓ (music ${musicE}, out ${outE})`);
    const stored = await ap.evaluate(() => JSON.parse(localStorage.getItem("avishake-settings") || "{}").musicOn);
    await ap.locator("header button[data-music-control]").click();
    const off = await ap.evaluate(() => JSON.parse(localStorage.getItem("avishake-settings") || "{}").musicOn);
    if (stored === false || off !== false) fail(`${name}: music on/off not remembered (${stored} → ${off})`);
    else console.log("  music off is remembered ✓");
    await actx.close();
  }

  // Motion: Full is the default even when the OS asks for reduced motion
  // (owner decision); System follows the OS; Reduced always calms.
  const motionCase = async (label, osMotion, motion, expectMotion) => {
    const mctx = await browser.newContext({ reducedMotion: osMotion });
    if (motion) {
      await mctx.addInitScript((m) => {
        try {
          if (!sessionStorage.getItem("seeded")) {
            localStorage.setItem("avishake-settings", JSON.stringify({ motion: m }));
            sessionStorage.setItem("seeded", "1");
          }
        } catch {
          /* ignore */
        }
      }, motion);
    }
    const mp = await mctx.newPage();
    await mp.goto(BASE + "/");
    const r = await mp.evaluate(() => {
      const t = document.querySelector(".animate-ticker");
      return {
        booting: document.documentElement.classList.contains("booting"),
        ticker: t ? parseFloat(getComputedStyle(t).animationDuration) : 0,
        hidden: [...document.querySelectorAll(".tok")].filter((x) => getComputedStyle(x).opacity === "0").length,
      };
    });
    const ok = expectMotion ? r.booting && r.ticker > 1 : !r.booting && r.ticker < 1 && !r.hidden;
    if (!ok) fail(`${name}: motion ${label} (booting=${r.booting}, ticker=${r.ticker}s, hidden tokens=${r.hidden})`);
    else console.log(`  motion ${label} ✓`);
    await mctx.close();
  };
  await motionCase("default + OS reduce → animates", "reduce", null, true);
  await motionCase("system + OS reduce → calm", "reduce", "system", false);
  await motionCase("system + OS no-preference → animates", "no-preference", "system", true);
  await motionCase("reduced → calm", "no-preference", "reduced", false);

  await browser.close();
}

console.log(failures.length ? `\n✗ ${failures.length} problem(s)` : "\n✓ all checks passed");
process.exit(failures.length ? 1 : 0);
