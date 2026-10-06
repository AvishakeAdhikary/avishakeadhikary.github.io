#!/usr/bin/env node
/**
 * Serves the static export (out/) like GitHub Pages does: directory
 * index.html, trailing-slash routes, 404.html with a real 404 status.
 * Files are read per request, so a rebuild never takes the server down.
 *
 *   node scripts/serve-out.mjs [port=3000]
 */
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "out");
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 3000);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".m4a": "audio/mp4",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
  ".vtt": "text/vtt",
};

async function file(p) {
  try {
    const st = await fs.stat(p);
    return st.isDirectory() ? file(path.join(p, "index.html")) : p;
  } catch {
    return null;
  }
}

http
  .createServer(async (req, res) => {
    let url;
    try {
      url = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    } catch {
      return res.writeHead(400).end();
    }
    const target = path.join(ROOT, url);
    if (!target.startsWith(ROOT)) return res.writeHead(403).end();
    let found = (await file(target)) ?? (await file(`${target}.html`));
    let status = 200;
    if (!found) {
      found = await file(path.join(ROOT, "404.html"));
      status = 404;
    }
    if (!found) return res.writeHead(503, { "content-type": "text/plain" }).end("out/ is being rebuilt");
    try {
      const body = await fs.readFile(found);
      res.writeHead(status, { "content-type": TYPES[path.extname(found)] ?? "application/octet-stream", "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(503).end();
    }
  })
  .listen(PORT, () => console.log(`serving out/ on http://localhost:${PORT}`));
