// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { processLogits } from "@/lib/ml/sampling";

vi.mock("@/components/media/audio/play", () => ({ sfx: () => undefined }));

const load = () => import("@/components/arcade/games/tokens");

describe("Token Prediction challenges are fair", () => {
  it("challenges 1–3 fail at default knobs and have solutions", async () => {
    const { TOKEN_LEVELS } = await load();
    for (const i of [0, 1, 2]) {
      const L = TOKEN_LEVELS[i];
      const ok = (temperature: number, topK: number, topP: number) => L.check!(processLogits(L.cands, { temperature, topK, topP }), { temperature, topK, topP });
      expect(ok(1, 0, 1), `${L.name} solved by defaults`).toBe(false);
      let solutions = 0;
      for (let t = 0.05; t <= 2.5; t += 0.05) for (let p = 0.05; p <= 1.0001; p += 0.01) if (ok(t, 0, Math.min(1, p))) solutions++;
      expect(solutions, `${L.name} has no solution`).toBeGreaterThan(0);
    }
  });

  it("the prompt challenge cannot be won by knobs, only by rewriting the prompt", async () => {
    const { TOKEN_LEVELS } = await load();
    const L = TOKEN_LEVELS[4];
    const river = (cands: typeof L.cands, t: number) => processLogits(cands, { temperature: t, topK: 0, topP: 1 }).reduce((s, r) => s + (r.tag === "river" ? r.p : 0), 0);
    for (let t = 0.05; t <= 50; t *= 1.5) expect(river(L.cands, t)).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it("near-greedy decoding loops; a warm, trimmed setting usually doesn't", async () => {
    const { generateOnce } = await load();
    // Seeded sampling (mulberry32): the same draws every run, so this never flakes.
    let seed = 42;
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    });
    const rate = (temperature: number, topP: number) => {
      let clean = 0;
      for (let i = 0; i < 1000; i++) if (generateOnce({ temperature, topK: 0, topP }).clean) clean++;
      return clean / 1000;
    };
    // T = 0.1 is near-greedy, not greedy: a rare escape is possible, a habit is not.
    expect(rate(0.1, 1)).toBeLessThan(0.01);
    expect(rate(1, 0.9)).toBeGreaterThan(0.6);
    random.mockRestore();
  });
});
