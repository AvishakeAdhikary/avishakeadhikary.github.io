import { expect, hiddenContent, layoutProblems, ROUTES, scrollThrough, test, VIEWPORTS } from "./fixtures";

test.use({ site: { allow404: ["/does-not-exist/"] } });

for (const vp of VIEWPORTS) {
  test.describe(`${vp.width}px`, () => {
    test.use({ viewport: vp });
    for (const route of ROUTES) {
      test(`${route} renders cleanly`, async ({ page }) => {
        const res = await page.goto(route, { waitUntil: "load" });
        expect(res?.status()).toBe(route.startsWith("/does-not-exist") ? 404 : 200);
        await page.waitForTimeout(500);
        await scrollThrough(page);
        // A diffusion image may wait up to 1.2 s for its pixels before playing; nothing may stay armed.
        await expect.poll(() => hiddenContent(page), { timeout: 3000 }).toEqual({ stuck: 0, hiddenTokens: 0 });
        expect(await layoutProblems(page)).toEqual([]);
      });
    }
  });
}

test("the home page stays inside its performance budget", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "JS heap is only measurable in Chromium");
  await page.goto("/");
  await page.waitForTimeout(1500);
  const { dom, heap } = await page.evaluate(() => ({
    dom: document.getElementsByTagName("*").length,
    heap: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
  }));
  expect(dom).toBeLessThan(1500);
  expect(heap / 1048576).toBeLessThan(40);
});
