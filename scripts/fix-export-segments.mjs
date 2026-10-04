#!/usr/bin/env node
/**
 * Workaround for a Next.js 16 static-export bug on Windows only.
 *
 * export/index.js names segment-prefetch files with
 * convertSegmentPathToStaticExportFilename(), which only replaces "/" in
 * the segment path. On Windows the path arrives with "\" separators, so
 * files land at  out/work/__next.work/__PAGE__.txt  instead of
 * out/work/__next.work.__PAGE__.txt, and client prefetches 404.
 * Linux/macOS builds (including CI) are unaffected; this is a no-op there.
 */
import fs from "node:fs/promises";
import path from "node:path";

if (process.platform !== "win32") process.exit(0);

const OUT = path.resolve(import.meta.dirname, "..", "out");
let moved = 0;

async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (!e.isDirectory()) continue;
    if (e.name.startsWith("__next.")) await flatten(full, dir, e.name);
    else await walk(full);
  }
}

/** out/x/__next.a/b/c.txt  →  out/x/__next.a.b.c.txt */
async function flatten(nested, parent, prefix) {
  for (const e of await fs.readdir(nested, { withFileTypes: true })) {
    const full = path.join(nested, e.name);
    if (e.isDirectory()) await flatten(full, parent, `${prefix}.${e.name}`);
    else {
      await fs.rename(full, path.join(parent, `${prefix}.${e.name}`));
      moved++;
    }
  }
  await fs.rm(nested, { recursive: true, force: true });
}

await walk(OUT);
console.log(`fix-export-segments: flattened ${moved} segment files (Windows workaround)`);
