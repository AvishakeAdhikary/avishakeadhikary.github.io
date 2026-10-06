import { expect, MAXED_PROGRESS, recordToasts, test } from "./fixtures";

test.use({ viewport: { width: 1280, height: 860 } });

test.describe("first visit", () => {
  test.use({ site: { settings: { toasts: true } } });
  test("unlocking raises a toast, persists, shows in the trophy room, and reset clears it", async ({ page }) => {
    const toasts = await recordToasts(page);
    await page.goto("/about/");
    await expect.poll(toasts).toContainEqual(expect.stringContaining("Hello, human"));
    await page.goto("/arcade/#trophies");
    const card = page.locator('section[aria-label="Explore achievements"] li', { hasText: "Hello, human" });
    await expect(card).toContainText("unlocked");
    await page.getByRole("button", { name: /Reset progress/ }).click();
    await page.getByRole("button", { name: /Click again/ }).click();
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("avishake-progress") || "{}").unlocked ?? {}).length)).toBe(0);
  });
});

test.describe("a returning player who has beaten everything", () => {
  // Regression: games used to re-report a cleared state from an effect, which looped forever.
  test.use({ site: { progress: MAXED_PROGRESS, settings: { toasts: true } } });
  for (const path of ["/arcade/", "/arcade/gradient-golf/", "/arcade/kmeans/", "/arcade/knn/", "/arcade/perceptron/", "/arcade/tokens/", "/arcade/debugger/", "/arcade/interp/", "/settings/#progress"]) {
    test(`${path} loads without errors`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(1500);
      // Switch level once, to re-render the board with progress loaded.
      const levels = page.getByRole("tablist", { name: "Levels" }).getByRole("tab");
      if ((await levels.count()) > 1) {
        await levels.nth(1).click();
        await page.waitForTimeout(400);
      }
    });
  }
});
