# AGENTS.md

Guide for any AI coding agent (Claude Code, Codex, Cursor, Copilot…) and human
maintainer working on **avishakeadhikary.github.io**, the professional portfolio of
Avishake Adhikary (Machine Learning Engineer, Kolkata). `CLAUDE.md` imports this file.

## Concept: `avishake.run`

The site behaves like a model you're running: the visitor is the prompt, the site is
the inference runtime. Headings **stream in token by token**, images **denoise like a
diffusion model**, there's a **working terminal**, the career page is a **training run**,
skills are an **embedding space**, research is a **citation graph**, and clicking
Contact **"crashes" the site** into a kernel-panic screen whose stack trace is the list
of ways to reach Avishake.

Two rules keep it from being gimmicky:

1. **Human first, playful second.** Navigation and copy use plain words (Work, Projects,
   Skills, Research, About, Contact). Model metaphors are small mono subtitles only.
   Everything is reachable by normal clicks; the terminal is optional.
2. **Every playful frame wraps verified facts.** No invented metrics, dates or claims.

## Stack

Next.js 16 App Router, **static export** (`output: "export"`) to GitHub Pages. React 19,
TypeScript 6, Tailwind CSS 4 (CSS-first tokens in `src/app/globals.css`), shadcn/ui
primitives (`src/components/ui`), lucide + simple-icons (server-rendered inline SVG),
cobe (globe), self-hosted fonts via `next/font/local` + `@fontsource-variable`
(JetBrains Mono = display/UI, Inter = body, Geist Mono = HUD/terminal).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Static export to `out/` (+ Windows segment-file workaround, no-op elsewhere) |
| `npm start` | Serve `out/` locally (port 3000) |
| `npm run lint` / `npm run typecheck` | ESLint (zero warnings) / `tsc --noEmit` |
| `npm run check` | lint → typecheck → build |
| `npm run verify` | Playwright checks against a served `out/` (Chromium, Firefox, WebKit). `VERIFY_URL` overrides the default `http://localhost:3000` |
| `npm run sync` | Refresh GitHub + Google Scholar data into `src/content/generated/` |
| `npm run media:optimize` | Rebuild optimized images/videos from `media/originals/` |
| `npm run icons` | Regenerate favicon/app icons from `media/brand/mark.svg` |

## Where the truth lives

| Data | File | Notes |
|---|---|---|
| Name, headline, location, socials, languages, claims | `src/content/profile.ts` | `claims` (e.g. "50+" certifications) are owner-confirmed and exceed public listings. Don't "correct" them. |
| Roles, degrees, honors | `src/content/experience.ts` | Dates follow LinkedIn. PTS covers Aug 2023 – Jan 2024 (the internal "DIGITYS" rename is **not** a separate role). |
| Projects | `src/content/projects.ts` | `roleId` = where it was built (omit = independent); `repo` links live GitHub stats. `repoOverrides` curates synced repos. |
| Skills | `src/content/skills.ts` | `production` = used professionally; `verified` = passed LinkedIn assessment. |
| Publications | `src/content/publications.ts` | Verified against Google Scholar; `selfIndex` = owner's author position. |
| Certifications, testimonials, gallery, audio, globe places | `src/content/*.ts` | Testimonial quotes are **verbatim**. |
| Generated | `src/content/generated/*.json` | Written by scripts; never hand-edit. |

Fact sources: the owner's `cv.md`, LinkedIn, Google Scholar. **Never invent** metrics,
dates, employers, skills, issuers, feelings or descriptions; ask instead.

**Privacy:** never publish document scans (enrolment numbers, family names); only the
award *plate* photo is used. Never commit `.playwright-mcp/`.

## Architecture map

- `src/app/*` routes: `/` (boot → prompt hero → six "doors"), `/work`, `/projects`,
  `/projects/[slug]`, `/skills`, `/research`, `/about`, `/gallery`, `/lab`, `/contact`, `/settings`.
  Legacy `/experience`, `/timeline`, `/contact-me` re-export the new pages.
  Static data routes: `/search-index.json` (terminal knowledge), `/covers/<slug>.svg`
  (generated project covers), `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, OG image.
- `src/components/runtime/*`: one-per-site islands: `effects` (reveal/stream/diffuse/draw
  triggers + spotlight), `boot`, `hud`, `delights` (tab title, console note, Konami).
- `src/components/fx/*`: `Stream` (token streaming), `DiffusionImage`, `LatentField` (hero canvas).
- `src/components/terminal/*`: drop-down + `/lab` terminal, command engine, offline
  BM25 retrieval (`ask`) with an optional `NEXT_PUBLIC_ASK_ENDPOINT` for a real LLM proxy.
- `src/components/crash/*`: the Contact "crash" (once per session; Esc / Reduced motion skip).
- `src/lib/ticker.ts` (single shared rAF loop) and `src/lib/quality.ts` (device tiers).

## Settings & music

- `src/lib/settings.ts`: typed visitor preferences in localStorage + `useSettings()`.
  `src/lib/settings-script.ts` (server-safe) is the inline head script that applies visual
  settings as `<html>` data attributes **before paint** (`data-crt`, `data-motion`,
  `data-theme`, `data-cursor`) and decides the boot screen. New visual settings must be
  added in both places. Use `motionReduced()` for any motion gate in JS and
  `html[data-motion="reduced"]` in CSS; never query `prefers-reduced-motion` directly.
- `/settings` page: `src/components/settings/settings-panel.tsx`; the terminal also has
  `settings <key> on|off`.
- Music: `src/components/media/music/`. `controller.ts` is the single entry point (header
  toggle, settings, terminal, ⌘K). `engine.ts` is a lookahead scheduler on the AudioContext
  clock with reverb/echo/tape/compressor; `styles.ts` composes lo-fi, synthwave and ambient
  (song forms, chord progressions, motif melodies); `instruments.ts` synthesizes every voice.
  The CC0 playlist lives in `src/content/gallery.ts → audioTracks` (CC0 only, with source
  URLs); originals in `media/originals/audio/`, encoded to AAC .m4a by `media:optimize`.

## Animation rules (the v1 "invisible page" bug must never return)

- Content is **visible by default**. An inline head script adds `html.js` before first
  paint (skipped when motion is reduced); only then do `[data-stream]`, `[data-diffuse]` and
  `[data-drawable]` start in their "before" state, each with a **4 s CSS failsafe**.
- `<Effects>` arms elements only after scroll settles (two frames), plays what's in view,
  observes the rest, and runs a scroll sweep backstop (WebKit can skip IO entries).
- Never put `content-visibility` on a subtree that animates.
- Motion is **delta-time based** on the shared ticker: no fps caps, runs at the display's
  native refresh (60 Hz laptops, 200 Hz desktops). CSS animations use only
  transform/opacity/filter. Infinite animations pause offscreen (`pause-offscreen`).
- Motion setting: **Full** (default, owner decision: animates even when the OS asks for
  reduced motion, e.g. Windows "Animation effects" off), **System** (follows
  `prefers-reduced-motion`) or **Reduced**. Every motion gate goes through it. The crash
  must stay under 3 flashes/s.

## Performance budget

Home: under ~40 MB JS heap (currently about 10), ~1.1k DOM nodes (v1 main branch: 143 MB / 18.9k).
Server components by default; client islands small and lazy (terminal, palette, crash
overlay and audio engine are code-split and load on demand). At most one WebGL context.
No heavy animation libraries (`motion` is intentionally not installed).

## Automation

- **Deploy** (`nextjs.yml`): push to `main`, manual, and **monthly** cron. Runs `sync`,
  builds, runs `verify` in Chromium (deploy is blocked if any page hides content, errors,
  or overflows), then deploys. Sync failures fall back to the committed snapshot.
- **Dependabot** monthly (grouped). There is deliberately no bot-commit/PR workflow: the
  repo's Actions token is read-only, and the deploy already syncs live data each run.
  Refresh the committed snapshot locally with `npm run sync` when convenient.
- New public repos appear on `/projects` automatically with a generated cover.
- **No secrets are required.** Sync falls back to the built-in `GITHUB_TOKEN` and then to
  the committed snapshot. Optional: `PORTFOLIO_SYNC_TOKEN` (pinned-repo ordering) and
  `NEXT_PUBLIC_ASK_ENDPOINT` (LLM proxy for the terminal's `ask`).

## Media

Originals in `media/originals/` (not deployed). `npm run media:optimize` → WebP variants
(128…2400 px) + blur, svgo'd SVGs, H.264 MP4 (+ smaller WebM) ≤1280 px into
`public/media/` and `media-manifest.json`. Reference media by original key through
`image()` / `video()` / `svg()` in `src/lib/assets.ts`. `NEXT_PUBLIC_MEDIA_BASE_URL`
moves all media to a CDN.

## Dependency notes

- **ESLint pinned to 9.x** (eslint-config-next 16.3's plugins crash on ESLint 10) and
  **TypeScript pinned to 6.x** (typescript-eslint doesn't support TS 7 yet). Dependabot
  ignores those majors.
- `scripts/fix-export-segments.mjs`: Next 16 static export writes segment-prefetch files
  into nested folders **on Windows only** (path separator bug); this flattens them. No-op on CI.
- npm `allowScripts` permits install scripts only for `ffmpeg-static` and `unrs-resolver`.

## Verify before finishing

`npm run check`, serve `out/`, `npm run verify`, then look at the pages yourself
(Playwright screenshots at 390 and 1440 px). Take screenshots **sequentially** after
waiting, since parallel tool calls capture the first frame of a stream.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
