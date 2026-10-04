/**
 * One shared requestAnimationFrame loop for every canvas/HUD on the page.
 *
 * - Runs at the display's native refresh (60 Hz laptop, 200 Hz desktop…),
 *   never capped; callbacks receive delta time in seconds so motion speed
 *   is identical at any frame rate.
 * - Sleeps when nothing is subscribed or the tab is hidden.
 * - Tracks a rolling frame-time average used by the HUD and quality tiers.
 */
type Tick = (dt: number, now: number) => void;

const subs = new Set<Tick>();
let raf = 0;
let last = 0;
let avgMs = 16.7;

function frame(now: number) {
  const dtMs = last ? Math.min(now - last, 100) : 16.7;
  last = now;
  avgMs += (dtMs - avgMs) * 0.05;
  const dt = dtMs / 1000;
  subs.forEach((fn) => fn(dt, now));
  raf = subs.size && !document.hidden ? requestAnimationFrame(frame) : 0;
  if (!raf) last = 0;
}

function wake() {
  if (!raf && subs.size && typeof document !== "undefined" && !document.hidden) raf = requestAnimationFrame(frame);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", wake);
}

export function subscribe(fn: Tick): () => void {
  subs.add(fn);
  wake();
  return () => {
    subs.delete(fn);
  };
}

/** Smoothed frames per second over the last ~20 frames (while the loop runs). */
export const fps = () => Math.round(1000 / avgMs);
export const frameMs = () => avgMs;
