import { expect, layoutProblems, test } from "./fixtures";

/** Post-deploy smoke test against the live site (run by CI after Pages deploys). */
test.use({ viewport: { width: 1280, height: 860 } });

for (const path of ["/", "/work/", "/projects/", "/skills/", "/arcade/", "/arcade/debugger/", "/settings/", "/contact/?recovered=1"]) {
  test(`live ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await page.waitForTimeout(1500);
    expect(await layoutProblems(page)).toEqual([]);
  });
}

test("live: the Debugger worker trains", async ({ page }) => {
  await page.goto("/arcade/debugger/");
  await page.getByRole("button", { name: "Skip to the game" }).click();
  await expect(page.getByText("training the patient")).toBeHidden({ timeout: 120000 });
  await expect(page.getByText(/^step$/i).locator("..")).toContainText("240");
});
