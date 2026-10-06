#!/usr/bin/env node
/**
 * Media pipeline: originals in, web-optimized variants out.
 *
 *   media/originals/images/**  ->  public/media/img/**   (WebP at IMAGE_WIDTHS + blur placeholder)
 *                                  (.heic/.heif are decoded with heic-decode: sharp's prebuilt libheif has no HEVC)
 *   media/originals/images/**.svg -> public/media/svg/** (svgo)
 *   media/originals/videos/**  ->  public/media/video/** (H.264 MP4 + VP9 WebM, <=1280px, 30fps, poster)
 *   media/originals/audio/**   ->  public/media/audio/** (AAC 96 kbps .m4a, plays everywhere)
 *
 * Writes src/content/generated/media-manifest.json, which components read
 * (via src/lib/assets.ts) for intrinsic size + blurDataURL.
 *
 * Incremental: a hash of (size, mtime, settings) per input is kept in
 * .media-cache/state.json; unchanged inputs are skipped.
 *
 * Originals are never modified. Until they are moved into media/originals,
 * the legacy public/images and public/videos folders are read as well.
 */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { optimize as svgo } from "svgo";
import ffmpegPath from "ffmpeg-static";
import decodeHeic from "heic-decode";

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "media");
const MANIFEST = path.join(ROOT, "src", "content", "generated", "media-manifest.json");
const CACHE = path.join(ROOT, ".media-cache", "state.json");

/** Keep in sync with next.config.mjs (imageSizes + deviceSizes). */
const IMAGE_WIDTHS = [128, 256, 480, 960, 1600, 2400];
const WEBP_QUALITY = 78;
const SETTINGS_VERSION = "v2";

const SOURCE_ROOTS = [
  { images: "media/originals/images", videos: "media/originals/videos", audio: "media/originals/audio" },
  { images: "public/images", videos: "public/videos" }, // legacy location
];

const HEIF = new Set([".heic", ".heif"]);
const RASTER = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".tif", ".tiff", ...HEIF]);
const VIDEO = new Set([".mp4", ".mov", ".webm", ".mkv"]);
const AUDIO = new Set([".mp3", ".ogg", ".wav", ".flac", ".m4a"]);

/** Kebab-case each path segment so URLs are predictable and case-safe. */
const slug = (p) =>
  p
    .split("/")
    .map((s) =>
      s
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/[^a-zA-Z0-9.]+/g, "-")
        .toLowerCase()
        .replace(/^-+|-+$/g, ""),
    )
    .join("/");

async function walk(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function collect(kind) {
  const seen = new Map();
  for (const root of SOURCE_ROOTS) {
    if (!root[kind]) continue;
    const base = path.join(ROOT, root[kind]);
    for (const file of await walk(base)) {
      const rel = path.relative(base, file).split(path.sep).join("/");
      if (!seen.has(rel)) seen.set(rel, file);
    }
  }
  return [...seen.entries()].map(([rel, file]) => ({ rel, file }));
}

async function fingerprint(file) {
  const st = await fs.stat(file);
  return createHash("sha1")
    .update(`${SETTINGS_VERSION}:${st.size}:${st.mtimeMs}`)
    .digest("hex")
    .slice(0, 16);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function processRaster({ rel, file }) {
  const ext = path.extname(rel);
  const key = slug(rel.slice(0, -ext.length));
  const dir = path.join(OUT, "img", path.dirname(key));
  const name = path.basename(key);
  await fs.mkdir(dir, { recursive: true });

  const animated = ext.toLowerCase() === ".gif";
  const source = HEIF.has(ext.toLowerCase()) ? await heifToRaw(file) : { input: file };
  const input = sharp(source.input, { animated, limitInputPixels: false, raw: source.raw }).rotate();
  const meta = await input.metadata();
  const width = meta.autoOrient?.width ?? meta.width;
  const height = animated ? meta.pageHeight ?? meta.height : meta.autoOrient?.height ?? meta.height;

  for (const w of IMAGE_WIDTHS) {
    await input
      .clone()
      .resize({ width: Math.min(w, width), withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true })
      .toFile(path.join(dir, `${name}-${w}.webp`));
  }
  const blur = await sharp(source.input, { limitInputPixels: false, raw: source.raw })
    .rotate()
    .resize(16)
    .webp({ quality: 40 })
    .toBuffer();

  return {
    src: `/media/img/${key}.webp`,
    width,
    height,
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

/** HEIC/HEIF (iPhone photos) -> raw RGBA that sharp can read. libheif applies the rotation. */
async function heifToRaw(file) {
  const { width, height, data } = await decodeHeic({ buffer: await fs.readFile(file) });
  return { input: Buffer.from(data.buffer, data.byteOffset, data.byteLength), raw: { width, height, channels: 4 } };
}

async function processSvg({ rel, file }) {
  const key = slug(rel);
  const outFile = path.join(OUT, "svg", key);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  const { data } = svgo(await fs.readFile(file, "utf8"), {
    multipass: true,
    plugins: [{ name: "preset-default" }, "removeDimensions"],
  });
  await fs.writeFile(outFile, data);
  return { src: `/media/svg/${key}` };
}

async function processVideo({ rel, file }) {
  const key = slug(rel.slice(0, -path.extname(rel).length));
  const dir = path.join(OUT, "video", path.dirname(key));
  const name = path.basename(key);
  await fs.mkdir(dir, { recursive: true });
  const base = path.join(dir, name);
  // Longest side capped at 1280px, even dimensions, max 30fps.
  const scale =
    "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))',fps=fps='min(30,source_fps)'";

  await run(ffmpegPath, [
    "-y", "-i", file, "-vf", scale,
    "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", `${base}.mp4`,
  ]);
  await run(ffmpegPath, [
    "-y", "-i", file, "-vf", scale,
    "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4",
    "-c:a", "libopus", "-b:a", "80k", `${base}.webm`,
  ]);
  // Only keep the WebM when it actually saves bytes over the MP4.
  const [mp4Size, webmSize] = await Promise.all(
    [`${base}.mp4`, `${base}.webm`].map(async (f) => (await fs.stat(f)).size),
  );
  const keepWebm = webmSize < mp4Size * 0.9;
  if (!keepWebm) await fs.rm(`${base}.webm`);

  const posterPng = `${base}.poster.png`;
  await run(ffmpegPath, ["-y", "-ss", "1", "-i", file, "-frames:v", "1", "-vf", scale, posterPng]);
  const poster = sharp(posterPng);
  const { width, height } = await poster.metadata();
  await poster.webp({ quality: 72 }).toFile(`${base}.poster.webp`);
  await fs.rm(posterPng);

  return {
    mp4: `/media/video/${key}.mp4`,
    webm: keepWebm ? `/media/video/${key}.webm` : null,
    poster: `/media/video/${key}.poster.webp`,
    width,
    height,
  };
}

async function processAudio({ rel, file }) {
  const key = slug(rel.slice(0, -path.extname(rel).length));
  const out = path.join(OUT, "audio", `${key}.m4a`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await run(ffmpegPath, ["-y", "-i", file, "-vn", "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart", out]);
  const { size } = await fs.stat(out);
  return { src: `/media/audio/${key}.m4a`, bytes: size };
}

async function main() {
  const cache = JSON.parse((await fs.readFile(CACHE, "utf8").catch(() => "{}")) || "{}");
  const prev = JSON.parse((await fs.readFile(MANIFEST, "utf8").catch(() => "{}")) || "{}");
  const manifest = { images: {}, svgs: {}, videos: {}, audio: {} };
  const nextCache = {};
  let built = 0;
  let skipped = 0;

  const jobs = [];
  for (const item of await collect("images")) {
    const ext = path.extname(item.rel).toLowerCase();
    if (ext === ".svg") jobs.push(["svgs", item, processSvg]);
    else if (RASTER.has(ext)) jobs.push(["images", item, processRaster]);
    else console.warn(`skip (unsupported format): images/${item.rel}`);
  }
  for (const item of await collect("videos")) {
    if (VIDEO.has(path.extname(item.rel).toLowerCase())) jobs.push(["videos", item, processVideo]);
  }
  for (const item of await collect("audio")) {
    if (AUDIO.has(path.extname(item.rel).toLowerCase())) jobs.push(["audio", item, processAudio]);
  }

  // Two originals that slug to the same output (e.g. photo.HEIC + photo.png)
  // would overwrite each other: keep the camera original (HEIC) and skip the copy.
  const outKey = (rel) => slug(rel.slice(0, -path.extname(rel).length));
  const heifKeys = new Set(
    jobs.filter(([b, it]) => b === "images" && HEIF.has(path.extname(it.rel).toLowerCase())).map(([, it]) => outKey(it.rel)),
  );
  for (let i = jobs.length - 1; i >= 0; i--) {
    const [bucket, item] = jobs[i];
    if (bucket !== "images" || HEIF.has(path.extname(item.rel).toLowerCase()) || !heifKeys.has(outKey(item.rel))) continue;
    console.warn(`skip (duplicate of a HEIC original): images/${item.rel}`);
    jobs.splice(i, 1);
  }

  for (const [bucket, item, fn] of jobs) {
    const id = `${bucket}:${item.rel}`;
    const fp = await fingerprint(item.file);
    const cached = prev[bucket]?.[item.rel];
    const outPath = cached && path.join(ROOT, "public", cached.src ?? cached.mp4 ?? "");
    const firstOut =
      bucket === "images" && cached ? outPath.replace(/\.webp$/, `-${IMAGE_WIDTHS[0]}.webp`) : outPath;
    if (cache[id] === fp && cached && (await exists(firstOut))) {
      manifest[bucket][item.rel] = cached;
      nextCache[id] = fp;
      skipped++;
      continue;
    }
    process.stdout.write(`build ${id} ... `);
    try {
      manifest[bucket][item.rel] = await fn(item);
      nextCache[id] = fp;
      built++;
      console.log("ok");
    } catch (err) {
      console.log("FAILED");
      console.error(err?.stderr?.toString?.().slice(-500) ?? err);
      process.exitCode = 1;
    }
  }

  const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(
    MANIFEST,
    `${JSON.stringify(
      { images: sorted(manifest.images), svgs: sorted(manifest.svgs), videos: sorted(manifest.videos), audio: sorted(manifest.audio) },
      null,
      2,
    )}\n`,
  );
  await fs.mkdir(path.dirname(CACHE), { recursive: true });
  await fs.writeFile(CACHE, JSON.stringify(nextCache, null, 2));
  console.log(`media: ${built} built, ${skipped} unchanged`);
}

await main();
