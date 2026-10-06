import { expect, layoutProblems, test, VIEWPORTS } from "./fixtures";

/** Every overlay opens and closes by mouse and keyboard, and nothing inside it overflows. */
for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
  test.describe(`${vp.width}px`, () => {
    test.use({ viewport: vp });

    test("keybind sheet: ? opens, Esc / backdrop / close button close, nothing overflows", async ({ page }) => {
      await page.goto("/about/");
      await page.waitForTimeout(600);
      const sheet = page.getByRole("dialog", { name: /Keybinds/ });
      for (const close of ["Escape", "backdrop", "button"] as const) {
        await test.step(`open with ?, close with ${close}`, async () => {
          await page.keyboard.press("?");
          await expect(sheet).toBeVisible();
          expect(await layoutProblems(page, "dialog[open]")).toEqual([]);
          if (close === "Escape") await page.keyboard.press("Escape");
          else if (close === "button") await sheet.getByRole("button", { name: "Close" }).click();
          else await page.mouse.click(5, vp.height - 5);
          await expect(sheet).toBeHidden();
        });
      }
    });

    test("command palette: button and Ctrl+K open it, Esc closes, typing filters", async ({ page }) => {
      await page.goto("/about/");
      await page.waitForTimeout(600);
      const palette = page.getByRole("dialog", { name: "Command menu" });
      await page.getByRole("button", { name: "Open command menu" }).click();
      await expect(palette).toBeVisible();
      await page.keyboard.type("arcade");
      await expect(palette.getByRole("option", { name: /Arcade/ }).first()).toBeVisible();
      expect(await layoutProblems(page, "dialog[open]")).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(palette).toBeHidden();
      await page.keyboard.press("Control+k");
      await expect(palette).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(palette).toBeHidden();
    });

    test("photo viewer: opens, arrows step, Esc closes", async ({ page }) => {
      await page.goto("/gallery/");
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: /^Open photo/ }).first().click();
      const viewer = page.getByRole("dialog", { name: /^Photo/ });
      await expect(viewer).toBeVisible();
      const first = await viewer.getAttribute("aria-label");
      await page.keyboard.press("ArrowRight");
      await expect(viewer).not.toHaveAttribute("aria-label", first ?? "");
      expect(await layoutProblems(page, "dialog[open]")).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(viewer).toBeHidden();
    });

    test("terminal: ~ opens and closes, Esc closes from the input", async ({ page }) => {
      await page.goto("/about/");
      await page.waitForTimeout(600);
      const term = page.locator("#dropdown-terminal");
      await page.keyboard.press("Backquote");
      const input = term.locator("input");
      await expect(input).toBeVisible();
      await expect(term.getByRole("log")).toContainText("avishake.run terminal");
      expect((await term.getByRole("log").innerText()).match(/avishake\.run terminal/g)?.length).toBe(1);
      await input.press("Escape");
      await expect(term).toHaveAttribute("inert", "");
    });
  });
}

test.describe("phone", () => {
  test.use({ viewport: VIEWPORTS[0] });
  test("mobile menu: opens as a sheet, navigates, closes", async ({ page }) => {
    await page.goto("/about/");
    await page.getByRole("button", { name: "Open navigation" }).click();
    const menu = page.getByRole("dialog", { name: "Navigate" });
    await expect(menu).toBeVisible();
    expect(await layoutProblems(page, "dialog[open]")).toEqual([]);
    await menu.getByRole("link", { name: /Projects/ }).click();
    await page.waitForURL(/\/projects\/$/);
    await expect(menu).toBeHidden();
  });
});
