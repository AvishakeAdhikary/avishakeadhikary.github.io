// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

// Sound effects are irrelevant here (and need Web Audio).
vi.mock("@/components/media/audio/play", () => ({ sfx: () => undefined }));

const fresh = async () => {
  vi.resetModules();
  localStorage.clear();
  return import("@/lib/progress");
};

describe("progress", () => {
  beforeEach(() => localStorage.clear());

  it("notifies subscribers only when the record actually changes", async () => {
    const p = await fresh();
    const seen = vi.fn();
    p.subscribeProgress(seen);
    p.track({ t: "page", path: "/" });
    p.track({ t: "page", path: "/" });
    p.track({ t: "page", path: "/" });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("does not loop: re-reporting a cleared game is a no-op", async () => {
    const p = await fresh();
    for (let i = 0; i < 4; i++) p.recordLevel("kmeans", i, "cleared");
    const seen = vi.fn();
    p.subscribeProgress(seen);
    for (let i = 0; i < 4; i++) p.recordLevel("kmeans", i, "cleared");
    p.track({ t: "cleared", game: "kmeans" });
    expect(seen).not.toHaveBeenCalled();
  });

  it("derives clear and mastery from level results", async () => {
    const p = await fresh();
    p.recordLevel("tokens", 0, "cleared");
    expect(p.readProgress().sets.cleared ?? []).not.toContain("tokens");
    for (let i = 0; i < 6; i++) p.recordLevel("tokens", i, "cleared");
    expect(p.readProgress().sets.cleared).toContain("tokens");
    expect(p.readProgress().sets.mastered ?? []).not.toContain("tokens");
    for (let i = 0; i < 6; i++) p.recordLevel("tokens", i, "mastered");
    expect(p.readProgress().sets.mastered).toContain("tokens");
  });

  it("never downgrades a level result", async () => {
    const p = await fresh();
    p.recordLevel("interp", 2, "mastered");
    p.recordLevel("interp", 2, "cleared");
    expect(p.readProgress().levels.interp[2]).toBe(2);
  });

  it("uses the perceptron's own rules (XOR is the mastery level)", async () => {
    const p = await fresh();
    for (let i = 0; i < 3; i++) p.recordLevel("perceptron", i, "cleared");
    expect(p.readProgress().sets.cleared).toContain("perceptron");
    expect(p.readProgress().sets.mastered ?? []).not.toContain("perceptron");
    p.recordLevel("perceptron", 3, "mastered");
    expect(p.readProgress().sets.mastered).toContain("perceptron");
  });

  it("unlocks achievements from the record and ranks by points", async () => {
    const p = await fresh();
    expect(p.standing(p.readProgress()).rank).toBeNull();
    for (const path of ["/", "/work/", "/projects/"]) p.track({ t: "page", path });
    const rec = p.readProgress();
    expect(Object.keys(rec.unlocked)).toEqual(expect.arrayContaining(["hello", "walker"]));
    expect(p.standing(rec).points).toBe(20);
  });

  it("requires every category for All-Rounder", async () => {
    const p = await fresh();
    const { ACHIEVEMENTS } = await import("@/content/achievements");
    const all = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, 1]));
    expect(p.standing({ unlocked: all }).rank).toBe("allrounder");
    const noSecrets = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.cat !== "secrets").map((a) => [a.id, 1]));
    expect(p.standing({ unlocked: noSecrets }).rank).toBe("master");
  });

  it("migrates level results from records written before levels existed", async () => {
    localStorage.setItem("avishake-progress", JSON.stringify({ v: 1, unlocked: {}, sets: {}, counters: {}, days: [], flags: {}, best: { "kmeans/0": 2, "kmeans/1": 1 } }));
    vi.resetModules();
    const p = await import("@/lib/progress");
    expect(p.readProgress().levels.kmeans.slice(0, 2)).toEqual([2, 1]);
  });

  it("migrates golf holes and KNN totals too", async () => {
    localStorage.setItem(
      "avishake-progress",
      JSON.stringify({ v: 1, unlocked: {}, sets: {}, counters: {}, days: [], flags: {}, best: { "gradient-golf/ravine": 40, "knn/correct": 12, "knn/streak": 10 } }),
    );
    vi.resetModules();
    const p = await import("@/lib/progress");
    expect(p.readProgress().levels["gradient-golf"]).toEqual([0, 1]);
    expect(p.readProgress().levels.knn).toEqual([2]);
  });

  it("resets completely and notifies once", async () => {
    const p = await fresh();
    p.track({ t: "page", path: "/" });
    const seen = vi.fn();
    p.subscribeProgress(seen);
    p.resetProgress();
    expect(Object.keys(p.readProgress().unlocked)).toEqual([]);
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
