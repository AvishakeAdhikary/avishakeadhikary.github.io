// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { GAME_RULES } from "@/content/achievements";
import { CASES } from "@/lib/ml/debugger-cases";
import { SURFACES } from "@/lib/ml/descent";

vi.mock("@/components/media/audio/play", () => ({ sfx: () => undefined }));

describe("GAME_RULES matches every game's real levels", () => {
  it("level counts", async () => {
    expect(GAME_RULES["gradient-golf"].levels).toBe(SURFACES.length);
    expect(GAME_RULES.debugger.levels).toBe(CASES.length);
    expect(GAME_RULES.knn.levels).toBe(1);
    expect(GAME_RULES.kmeans.levels).toBe((await import("@/components/arcade/games/kmeans")).LEVEL_COUNT);
    expect(GAME_RULES.perceptron.levels).toBe((await import("@/components/arcade/games/perceptron")).LEVEL_COUNT);
    expect(GAME_RULES.tokens.levels).toBe((await import("@/components/arcade/games/tokens")).LEVEL_COUNT);
    expect(GAME_RULES.interp.levels).toBe((await import("@/components/arcade/games/interp")).LEVEL_COUNT);
  });
});
