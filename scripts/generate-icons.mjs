#!/usr/bin/env node
/**
 * Generates every favicon / app icon from media/brand/mark.svg:
 *   src/app/icon.svg        (modern browsers; caret blinks where SVG favicons animate)
 *   src/app/favicon.ico     (16/32/48 PNG-in-ICO for legacy browsers)
 *   src/app/apple-icon.png  (180×180)
 *   public/icons/icon-192.png, icon-512.png, maskable-512.png (web manifest)
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const svg = await fs.readFile(path.join(ROOT, "media/brand/mark.svg"));
const still = Buffer.from(svg.toString().replace(/<animate[^>]*\/>/g, ""));
const png = (size, src = still) => sharp(src, { density: 384 }).resize(size, size).png().toBuffer();

/** Packs PNGs into a .ico container (PNG payloads are valid since Vista). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.data)]);
}

await fs.writeFile(path.join(ROOT, "src/app/icon.svg"), svg);
await fs.writeFile(
  path.join(ROOT, "src/app/favicon.ico"),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size) })))),
);
await fs.writeFile(path.join(ROOT, "src/app/apple-icon.png"), await png(180));
await fs.mkdir(path.join(ROOT, "public/icons"), { recursive: true });
await fs.writeFile(path.join(ROOT, "public/icons/icon-192.png"), await png(192));
await fs.writeFile(path.join(ROOT, "public/icons/icon-512.png"), await png(512));
// Maskable: mark centred in the safe zone on a full-bleed background.
const inner = await png(384);
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#140c0c" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(path.join(ROOT, "public/icons/maskable-512.png"));
console.log("icons: written");
