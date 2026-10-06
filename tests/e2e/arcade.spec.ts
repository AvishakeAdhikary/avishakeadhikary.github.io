import type { Page } from "@playwright/test";
import { expect, layoutProblems, test } from "./fixtures";

test.use({ viewport: { width: 1280, height: 900 } });

async function clickBoard(page: Page, name: RegExp, spots: [number, number][]) {
  const board = page.getByRole("img", { name });
  await board.scrollIntoViewIfNeeded();
  const bb = (await board.boundingBox())!;
  for (const [x, y] of spots) await page.mouse.click(bb.x + bb.width * x, bb.y + bb.height * y);
}

async function skip(page: Page, game: string) {
  await page.goto(`/arcade/${game}/`);
  await page.getByRole("button", { name: "Skip to the game" }).click();
}

const status = (page: Page, text: RegExp | string) => page.getByRole("status").filter({ hasText: text }).first();

test("Gradient Descent Golf: the full walkthrough, then a swing that sinks the hole", async ({ page }) => {
  await page.goto("/arcade/gradient-golf/");
  const deck = page.getByRole("region", { name: /walkthrough/ });
  for (let i = 0; i < 4; i++) {
    expect(await layoutProblems(page, "main")).toEqual([]);
    await deck.getByRole("button", { name: "Next" }).click();
  }
  await deck.getByRole("button", { name: "Start playing" }).click();
  await page.getByRole("button", { name: "Swing" }).click();
  await expect(status(page, /sunk|diverged|local minimum|ran out/)).toBeVisible({ timeout: 30000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("avishake-progress") || "{}").sets?.tutorials)).toContain("gradient-golf");
});

test("K-Means: place seeds, race Lloyd's algorithm", async ({ page }) => {
  await skip(page, "kmeans");
  await clickBoard(page, /Your board/, [
    [0.25, 0.3],
    [0.72, 0.28],
    [0.5, 0.75],
  ]);
  await page.getByRole("button", { name: /Run Lloyd/ }).click();
  await expect(status(page, /beat the machine|a tie|machine wins/)).toBeVisible({ timeout: 30000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("avishake-progress") || "{}").levels?.kmeans?.[0])).toBeGreaterThanOrEqual(1);
});

test("KNN: answer, see the truth and the model's vote", async ({ page }) => {
  await skip(page, "knn");
  await page.getByRole("group", { name: "Your answer" }).getByRole("button").first().click();
  await expect(page.getByText("It was")).toBeVisible();
  await page.getByRole("button", { name: /Next skill/ }).click();
  await expect(page.getByText("It was")).toBeHidden();
});

test("Perceptron: duel, and the XOR level can be declared impossible", async ({ page }) => {
  await skip(page, "perceptron");
  await page.getByRole("button", { name: /Lock in/ }).click();
  await expect(status(page, /%|win|perfect/)).toBeVisible({ timeout: 30000 });
  await page.getByRole("tab", { name: /Four corners/ }).click();
  await page.getByRole("button", { name: /No line can do this/ }).click();
  await expect(status(page, /correct: no straight line/)).toBeVisible();
});

test("Token Prediction: meet a goal with top-k", async ({ page }) => {
  await skip(page, "tokens");
  await page.getByRole("slider", { name: /top-k/ }).focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(status(page, "goal met")).toBeVisible();
});

test("Transformer Debugger: trains in a Web Worker, and the diagnosis fixes it", async ({ page }) => {
  // Training telemetry must come from a worker: the main-thread fallback posts no worker messages.
  // (Timing-based checks such as long tasks measure CPU contention between parallel tests, not the page.)
  await page.addInitScript(() => {
    const w = window as unknown as { __workerMessages: number; __workerErrors: string[] };
    w.__workerMessages = 0;
    w.__workerErrors = [];
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(...a: ConstructorParameters<typeof Worker>) {
        super(...a);
        this.addEventListener("message", () => w.__workerMessages++);
        this.addEventListener("error", (e) => w.__workerErrors.push(e.message));
      }
    };
  });
  await skip(page, "debugger");
  type W = { __workerMessages: number; __workerErrors: string[] };
  await expect
    .poll(() => page.evaluate(() => (window as unknown as W).__workerMessages), { message: "training telemetry arrives from a worker", timeout: 60000 })
    .toBeGreaterThan(5);
  await expect(page.getByText("training the patient")).toBeHidden({ timeout: 120000 });
  await page.getByText("Causal mask missing").click();
  await page.getByRole("button", { name: /Apply fix/ }).click();
  await expect(status(page, "Recovered")).toBeVisible({ timeout: 120000 });
  expect(await page.evaluate(() => (window as unknown as W).__workerErrors)).toEqual([]);
});

test("Mechanistic Interpretability: ablate, then submit the circuit", async ({ page }) => {
  await skip(page, "interp");
  await page.getByRole("button", { name: "Ablate L0H0" }).click();
  await expect(page.getByText(/^[0-9.]+%$/).first()).toBeVisible();
  const hyp = page.getByRole("region", { name: "Your hypothesis" });
  await hyp.getByLabel("L0H0").check();
  await hyp.getByLabel("L1H0").check();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(hyp.getByRole("status")).toContainText("Correct");
});
