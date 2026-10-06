#!/usr/bin/env node
/**
 * Gives out/404.html the same font preloads as every other page.
 *
 * Next's static export writes the not-found page without the <link
 * rel="preload" as="font"> tags it puts in every other page's <head>. React
 * then adds them during hydration, after the stylesheet has already fetched
 * the fonts, so each font downloads twice and Chromium warns that the
 * preload was "not used". Copying the (build-wide, hashed) tags from
 * index.html restores the normal order: React sees them and adds nothing.
 */
import fs from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "..", "out");
const index = await fs.readFile(path.join(OUT, "index.html"), "utf8");
const page = path.join(OUT, "404.html");
let html = await fs.readFile(page, "utf8");

const fonts = index.match(/<link rel="preload"[^>]*as="font"[^>]*\/>/g) ?? [];
const missing = fonts.filter((tag) => !html.includes(tag));
if (missing.length) {
  html = html.replace("<head>", `<head>${missing.join("")}`);
  await fs.writeFile(page, html);
}
console.log(`fix-404-preloads: added ${missing.length} font preload(s) to 404.html`);
