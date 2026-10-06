/**
 * Loads a code-split chunk, resiliently.
 *
 * Every lazy island (terminal, palette, crash overlay, games…) goes through
 * this. A transient network failure gets one retry. If the chunk is gone
 * because a new version was deployed while the tab was open (hashed chunk
 * names change), the page reloads once to pick up the current build instead
 * of failing.
 */
const RELOAD_KEY = "chunk-reload-at";

const isChunkError = (e: unknown) => {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /ChunkLoadError|Loading chunk|Failed to load chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
};

export async function loadChunk<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (first) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      return await load();
    } catch (second) {
      if (typeof window !== "undefined" && isChunkError(second)) {
        let last = 0;
        try {
          last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
        } catch {
          /* storage blocked */
        }
        // At most one automatic reload per minute: never a reload loop.
        if (Date.now() - last > 60_000) {
          try {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          } catch {
            /* ignore */
          }
          window.location.reload();
          return new Promise<T>(() => undefined);
        }
      }
      throw second ?? first;
    }
  }
}
