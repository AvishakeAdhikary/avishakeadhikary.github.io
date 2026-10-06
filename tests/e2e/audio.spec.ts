import { expect, test } from "./fixtures";

test.use({ viewport: { width: 1280, height: 860 } });

/** Taps every analyser and the final mix so the tests can "hear" the page. */
async function listen(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __analysers: AnalyserNode[];
      __out?: AnalyserNode;
      __played: string[];
      __gains: GainNode[];
      __ramps: { param: AudioParam; value: number }[];
    };
    w.__analysers = [];
    w.__played = [];
    w.__gains = [];
    w.__ramps = [];
    const ramp = AudioParam.prototype.linearRampToValueAtTime;
    AudioParam.prototype.linearRampToValueAtTime = function (value: number, time: number) {
      w.__ramps.push({ param: this, value });
      return ramp.call(this, value, time);
    };
    const create = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function () {
      const a = create.call(this);
      w.__analysers.push(a);
      return a;
    };
    const gain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const g = gain.call(this);
      w.__gains.push(g);
      return g;
    };
    const connect = AudioNode.prototype.connect as (this: AudioNode, ...a: unknown[]) => AudioNode;
    AudioNode.prototype.connect = function (this: AudioNode, dest: unknown, ...rest: unknown[]) {
      if (dest instanceof AudioDestinationNode && !w.__out) {
        w.__out = create.call(this.context as AudioContext);
        connect.call(this, w.__out);
      }
      return connect.call(this, dest, ...rest);
    } as typeof AudioNode.prototype.connect;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      w.__played.push(this.currentSrc || this.src);
      return play.call(this);
    };
  });
}

/** Summed spectrum of the music analyser (or the final mix), sampled over ~1 s so a rest between notes can't read as silence. */
const energy = (page: import("@playwright/test").Page, which: "music" | "out") =>
  page.evaluate(async (k) => {
    const w = window as unknown as { __analysers: AnalyserNode[]; __out?: AnalyserNode };
    const a = k === "out" ? w.__out : w.__analysers.at(-1);
    if (!a) return 0;
    const d = new Uint8Array(a.frequencyBinCount);
    let max = 0;
    for (let i = 0; i < 20 && max === 0; i++) {
      a.getByteFrequencyData(d);
      max = Math.max(max, d.reduce((s, v) => s + v, 0));
      await new Promise((r) => setTimeout(r, 50));
    }
    return max;
  }, which);

test.beforeEach(({ browserName }) => {
  test.skip(browserName === "webkit", "Playwright's WebKit build ships without Web Audio");
});

test("every composed style makes sound, and the CC0 playlist plays", async ({ page }) => {
  await listen(page);
  await page.goto("/settings/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  for (const style of ["Lo-fi", "Synthwave", "Ambient"]) {
    await page.getByRole("radio", { name: style }).click();
    await expect.poll(() => energy(page, "music"), { message: style, timeout: 15000 }).toBeGreaterThan(0);
  }
  await page.getByRole("radio", { name: "CC0 playlist" }).click();
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => (window as unknown as { __played: string[] }).__played.some((u) => /\.m4a$/.test(u)))).toBe(true);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

test.describe("music on by default", () => {
  test.use({ site: { settings: { musicOn: true } } });
  test("starts on the first click, mixes with sound effects (ducked, not cut), and off is remembered", async ({ page }) => {
    await listen(page);
    await page.goto("/about/");
    await page.waitForTimeout(800);
    await page.mouse.click(700, 500);
    await expect(page.locator('header button[aria-pressed="true"][data-music-control]')).toBeVisible();
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: "Open command menu" }).click();
    // The music bus (second gain the mixer creates) is ramped down under the effect, then swells back.
    type W = { __gains: GainNode[]; __ramps: { param: AudioParam; value: number }[] };
    const dips = () => page.evaluate(() => (window as unknown as W).__ramps.filter((r) => r.param === (window as unknown as W).__gains[1].gain).map((r) => r.value));
    await expect.poll(async () => (await dips()).length, { message: "the effect ducks the music bus" }).toBeGreaterThan(0);
    const depth = Math.min(...(await dips()));
    expect(depth, "ducked").toBeLessThan(0.9);
    expect(depth, "not cut").toBeGreaterThan(0.2);
    await expect.poll(() => page.evaluate(() => (window as unknown as W).__gains[1].gain.value)).toBeGreaterThan(0.95);
    await expect.poll(() => energy(page, "music"), { message: "music" }).toBeGreaterThan(0);
    await expect.poll(() => energy(page, "out"), { message: "final mix" }).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await page.locator("header button[data-music-control]").click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("avishake-settings") || "{}").musicOn)).toBe(false);
  });
});
