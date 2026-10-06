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

export type GpuHint = "discrete" | "integrated" | "software" | "none" | "unknown";
let gpu: GpuHint | null = null;

/**
 * What the GPU can do, probed once per session (cached in sessionStorage).
 * Only code that is about to render WebGL calls this (the home globe): on a
 * machine without WebGL, Firefox logs a warning for any failed context, so
 * other pages never probe.
 *  - A plain context is requested (no failIfMajorPerformanceCaveat: Firefox
 *    warns when it refuses a software context). Software rendering is read
 *    from the renderer name instead.
 *  - The renderer name comes from gl.RENDERER first (Firefox already reports
 *    it there); only engines that mask it (Chromium, Safari) are asked via
 *    WEBGL_debug_renderer_info, which Firefox deprecates.
 *  - No loseContext(): the probe context is simply dropped (Firefox logs a
 *    warning for every context lost on purpose).
 */
export function gpuHint(): GpuHint {
  if (gpu) return gpu;
  if (typeof window === "undefined") return "unknown";
  const known = cachedGpuHint();
  if (known) return (gpu = known);
  gpu = (() => {
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (!gl) return "none";
      let r = String(gl.getParameter(gl.RENDERER));
      if (/^(webkit|mozilla) webgl$/i.test(r)) {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        if (ext) r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      }
      r = r.toLowerCase();
      if (/swiftshader|llvmpipe|softpipe|swrast|software|basic render|warp/.test(r)) return "software";
      if (/rtx|gtx|radeon rx|rx \d{4}|arc a|quadro|geforce|apple m\d (pro|max|ultra)/.test(r)) return "discrete";
      if (/intel|uhd|iris|adreno|mali|apple/.test(r)) return "integrated";
      return "unknown";
    } catch {
      return "unknown";
    }
  })();
  try {
    sessionStorage.setItem("gpu-hint", gpu);
  } catch {
    /* ignore */
  }
  return gpu;
}

/** The probe's answer if this session already ran it (never probes). */
function cachedGpuHint(): GpuHint | null {
  if (gpu) return gpu;
  try {
    return sessionStorage.getItem("gpu-hint") as GpuHint | null;
  } catch {
    return null;
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
  // Uses the GPU probe only if something that renders WebGL already ran it.
  const gpu = cachedGpuHint();
  if (nav.connection?.saveData || gpu === "software" || gpu === "none" || (cores <= 4 && mem <= 4)) cached = "low";
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

