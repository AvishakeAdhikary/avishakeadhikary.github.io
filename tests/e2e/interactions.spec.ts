import { expect, recordToasts, test } from "./fixtures";

test.use({ viewport: { width: 1280, height: 860 } });

const theme = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.dataset.theme ?? "red");
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Stops the page's timers (they then move only via clock.runFor / resume): call clock.install() before goto. */
async function pauseClock(page: import("@playwright/test").Page) {
  // Page time keeps running while we ask for it; aim a little ahead and retry if a slow machine overshoots.
  for (let ahead = 250; ; ahead *= 2) {
    try {
      return await page.clock.pauseAt((await page.evaluate(() => Date.now())) + ahead);
    } catch (e) {
      if (!/past/.test(String(e)) || ahead > 8000) throw e;
    }
  }
}

test("the terminal answers from the CV", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(800);
  await page.keyboard.press("Backquote");
  const input = page.locator("#dropdown-terminal input");
  await input.fill("ask what did you build at PTS?");
  await input.press("Enter");
  await expect(page.locator("#dropdown-terminal [role=log]")).toContainText("KoyoX", { timeout: 15000 });
});

test("Konami toggles the theme both ways (after using and closing the terminal too)", async ({ page }) => {
  const toasts = await recordToasts(page);
  await page.goto("/about/");
  await page.waitForTimeout(600);
  await page.keyboard.press("Backquote");
  await page.locator("#dropdown-terminal input").press("Escape");
  for (const k of KONAMI) await page.keyboard.press(k);
  expect(await theme(page)).toBe("phosphor");
  await expect.poll(toasts).toContainEqual(expect.stringContaining("jailbreak mode"));
  for (const k of KONAMI) await page.keyboard.press(k);
  expect(await theme(page)).toBe("red");
});

test.describe("the crash", () => {
  test.use({ site: { crashSeen: false } });
  test("Contact crashes into the kernel panic, and any key recovers to the contact page", async ({ page }) => {
    await page.goto("/about/");
    await page.waitForTimeout(800);
    await page.getByRole("banner").getByRole("link", { name: /Contact/ }).click();
    await page.locator('[role="alertdialog"] >> text=Relax, nothing broke.').waitFor();
    await page.keyboard.press("x");
    await page.waitForURL(/\/contact\/\?recovered=1/);
  });
});

test("keybinds work, and never fire while typing or over the crash", async ({ page }) => {
  const toasts = await recordToasts(page);
  await page.clock.install();
  await page.goto("/about/");
  await page.waitForTimeout(600);
  await page.keyboard.press("t");
  expect(await theme(page)).toBe("phosphor");
  await expect.poll(toasts).toContainEqual(expect.stringContaining("theme"));
  await page.keyboard.press("t");
  // The G chord expires after 1.2 s; with the page's clock paused, a slow machine can't let it lapse.
  await pauseClock(page);
  await page.keyboard.press("g");
  await page.keyboard.press("x");
  await page.clock.resume();
  await page.waitForURL(/\/arcade\/$/);
  await page.goto("/contact/?recovered=1");
  await page.locator("form input").first().click();
  await page.keyboard.type("tct?");
  expect(await theme(page)).toBe("red");
  expect(await page.evaluate(() => document.documentElement.dataset.crt)).toBe("on");
  await expect(page.getByRole("dialog", { name: /Keybinds/ })).toBeHidden();
});

test.describe("keybinds over the crash", () => {
  test.use({ site: { crashSeen: false } });
  test("T does nothing while the crash owns the keyboard", async ({ page }) => {
    // The page's clock moves only when the test says so: "t" lands in the glitch phase every time.
    await page.clock.install();
    await page.goto("/about/");
    await page.waitForTimeout(600);
    await pauseClock(page);
    await page.getByRole("banner").getByRole("link", { name: /Contact/ }).click();
    // Step page time in small increments until the (lazy) crash screen mounts: its glitch phase lasts 1.1 s of page time.
    const crash = page.getByRole("alertdialog");
    await expect
      .poll(async () => {
        await page.clock.runFor(100);
        return crash.isVisible();
      })
      .toBe(true);
    await page.keyboard.press("t");
    expect(await theme(page)).toBe("red");
    await expect(crash).toBeVisible();
    await page.clock.runFor(2000);
    await expect(crash.getByText("Relax, nothing broke.")).toBeVisible();
    // In the panic screen any key (including "t") continues to Contact; it never toggles the theme.
    await page.keyboard.press("t");
    await page.waitForURL(/\/contact\//);
    expect(await theme(page)).toBe("red");
  });
});

test("settings: tabs (click, Q/E, hash), persistence across reload, applied before paint", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByRole("tab", { name: /Display/ }).click();
  await expect(page).toHaveURL(/#display$/);
  await page.getByRole("switch", { name: "Scanlines" }).click();
  await page.getByRole("radio", { name: "Phosphor" }).click();
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("e");
  await expect(page.getByRole("tab", { name: /Motion/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("switch", { name: "Contact page crash" }).click();
  await page.reload();
  await expect(page.getByRole("tab", { name: /Motion/ })).toHaveAttribute("aria-selected", "true");
  const applied = await page.evaluate(() => ({
    crt: document.documentElement.dataset.crt,
    theme: document.documentElement.dataset.theme,
    layer: getComputedStyle(document.querySelector(".crt-layer")!).display,
  }));
  expect(applied).toEqual({ crt: "off", theme: "phosphor", layer: "none" });
  await page.goto("/about/");
  await page.getByRole("banner").getByRole("link", { name: /Contact/ }).click();
  await page.waitForURL(/\/contact\/$/);
  await expect(page.locator('[role="alertdialog"]')).toHaveCount(0);
});

test("sliders are themed controls with their own cursor (never a text I-beam)", async ({ page }) => {
  await page.goto("/settings/");
  const slider = page.getByRole("slider", { name: "Music volume" });
  const style = await slider.evaluate((el) => ({ cursor: getComputedStyle(el).cursor, appearance: getComputedStyle(el).appearance }));
  expect(style.cursor).toContain("url(");
  expect(style.cursor).not.toBe("text");
  expect(style.appearance).toBe("none");
});

for (const [label, os, motion, animates] of [
  ["default + OS reduce → animates", "reduce", null, true],
  ["system + OS reduce → calm", "reduce", "system", false],
  ["system + OS no-preference → animates", "no-preference", "system", true],
  ["reduced → calm", "no-preference", "reduced", false],
] as const) {
  test.describe(`motion: ${label}`, () => {
    test.use({ reducedMotion: os, site: { boot: true, settings: motion ? { motion } : {} } });
    test("boot, ticker and reveals follow the motion setting", async ({ page }) => {
      // The head script decides the boot screen before first paint; record that decision
      // (the boot may already be over once the page has hydrated).
      await page.addInitScript(() =>
        document.addEventListener("DOMContentLoaded", () => {
          (window as unknown as { __booting: boolean }).__booting = document.documentElement.classList.contains("booting");
        }),
      );
      await page.goto("/");
      const r = await page.evaluate(() => {
        const t = document.querySelector(".animate-ticker");
        return {
          booting: (window as unknown as { __booting: boolean }).__booting,
          ticker: t ? parseFloat(getComputedStyle(t).animationDuration) : 0,
          hidden: [...document.querySelectorAll(".tok")].filter((x) => getComputedStyle(x).opacity === "0").length,
        };
      });
      if (animates) expect(r.booting && r.ticker > 1).toBe(true);
      else expect(r).toEqual({ booting: false, ticker: expect.any(Number), hidden: 0 });
      if (!animates) expect(r.ticker).toBeLessThan(1);
    });
  });
}

test("the page crossfade plays on navigation only, never on a lazy island's reveal", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "counts document.startViewTransition calls (Chromium)");
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: number };
    w.__vt = 0;
    const start = document.startViewTransition?.bind(document);
    if (start) document.startViewTransition = ((arg: Parameters<typeof start>[0]) => (w.__vt++, start(arg))) as typeof start;
  });
  const transitions = () => page.evaluate(() => (window as unknown as { __vt: number }).__vt);
  await page.goto("/arcade/debugger/");
  await page.getByRole("button", { name: "Skip to the game" }).click();
  await page.keyboard.press("Backquote");
  await expect(page.locator("#dropdown-terminal input")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await transitions(), "Suspense reveals and lazy islands").toBe(0);
  await page.getByRole("banner").getByRole("link", { name: /About/ }).click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect.poll(transitions, { message: "a navigation crossfades" }).toBeGreaterThan(0);
});
