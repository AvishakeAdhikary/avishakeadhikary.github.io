import AxeBuilder from "@axe-core/playwright";
import { expect, ROUTES, settled, test } from "./fixtures";

/** WCAG 2.2 A/AA (axe-core) on every route and on every overlay while open. */
test.use({ viewport: { width: 1280, height: 860 }, site: { allow404: ["/does-not-exist/"] } });

const audit = (page: import("@playwright/test").Page, include?: string) => {
  const b = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);
  return (include ? b.include(include) : b).analyze();
};
const summary = (r: Awaited<ReturnType<typeof audit>>) => r.violations.map((v) => `${v.id}: ${v.nodes.length}× ${v.nodes[0]?.target.join(" ")}`);

for (const route of ROUTES) {
  test(`${route} has no accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    // Contrast is judged on settled text, not on a token halfway through its fade-in.
    await settled(page);
    expect(summary(await audit(page))).toEqual([]);
  });
}

test("open overlays have no accessibility violations", async ({ page }) => {
  await page.goto("/gallery/");
  await page.waitForTimeout(800);
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: /Keybinds/ })).toBeVisible();
  await settled(page);
  expect(summary(await audit(page, "dialog[open]"))).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open command menu" }).click();
  await expect(page.getByRole("dialog", { name: "Command menu" })).toBeVisible();
  await settled(page);
  expect(summary(await audit(page, "dialog[open]"))).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Open photo/ }).first().click();
  await expect(page.getByRole("dialog", { name: /^Photo/ })).toBeVisible();
  await settled(page);
  expect(summary(await audit(page, "dialog[open]"))).toEqual([]);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Backquote");
  await expect(page.locator("#dropdown-terminal input")).toBeVisible();
  await settled(page);
  expect(summary(await audit(page, "#dropdown-terminal"))).toEqual([]);
});
