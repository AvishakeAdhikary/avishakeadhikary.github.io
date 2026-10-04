/**
 * Adaptive quality tiers. Strong machines (discrete GPU, many cores, high-DPR
 * or high-refresh displays) get full device pixel ratio and denser effects;
 * weak ones get DPR 1 and lighter fallbacks. A short frame-time probe can
 * downgrade at runtime if the device struggles.
 */
import { readSettings } from "./settings";

export type Tier = "low" | "mid" | "high";

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

let cached: Tier | null = null;
const listeners = new Set<(t: Tier) => void>();

function gpuHint(): "discrete" | "integrated" | "software" | "unknown" {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return "software";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    if (/swiftshader|llvmpipe|software|basic render/.test(r)) return "software";
    if (/rtx|gtx|radeon rx|rx \d{4}|arc a|quadro|geforce|apple m\d (pro|max|ultra)/.test(r)) return "discrete";
    if (/intel|uhd|iris|adreno|mali|apple/.test(r)) return "integrated";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function getTier(): Tier {
  if (typeof window === "undefined") return "mid";
  // Visitor override from /settings wins over detection.
  const forced = readSettings().quality;
  if (forced !== "auto") return forced;
  if (cached) return cached;
  const nav = navigator as Nav;
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 8;
  const gpu = gpuHint();
  if (nav.connection?.saveData || gpu === "software" || (cores <= 4 && mem <= 4)) cached = "low";
  else if (gpu === "discrete" || (cores >= 12 && mem >= 8)) cached = "high";
  else cached = "mid";
  return cached;
}

/** Called by the shared ticker probe if real frame times are poor. */
export function downgrade() {
  const next: Tier = getTier() === "high" ? "mid" : "low";
  if (next !== cached) {
    cached = next;
    listeners.forEach((l) => l(next));
  }
}

export function onTierChange(fn: (t: Tier) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Device pixel ratio to render canvases at, per tier. */
export function renderDpr(tier: Tier = getTier()): number {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return tier === "high" ? Math.min(dpr, 3) : tier === "mid" ? Math.min(dpr, 2) : 1;
}

