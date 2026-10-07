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
primitives (`src/components/ui`; modals are one native-`<dialog>` `Modal`), lucide + simple-icons (server-rendered inline SVG),
cobe (globe), self-hosted fonts via `next/font/local` + `@fontsource-variable`
(JetBrains Mono = display/UI, Inter = body, Geist Mono = HUD/terminal).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Static export to `out/` (+ Windows segment-file workaround, no-op elsewhere) |
| `npm start` | Serve `out/` like GitHub Pages (port 3000; real 404s; reads per request, so it survives rebuilds) |
| `npm run lint` / `npm run typecheck` | ESLint (zero warnings) / `tsc --noEmit` |
| `npm run check` | lint → typecheck → unit tests → build |
| `npm run test:unit` | Vitest: content integrity, progress store, keybinds/settings, every ML algorithm and game rule |
| `npm run test:e2e` (= `verify`) | Playwright on the built `out/` in Chromium, Firefox and WebKit (starts its own server on 3124) |
| `npm run test:dev` | The same pages under `next dev` (React's dev-only warnings: keys, update loops, hydration) |
| `npm run test:live` | Smoke test of the deployed site |
| `npm test` | unit + e2e |
| `npm run sync` | Refresh GitHub + Google Scholar data into `src/content/generated/` |
| `npm run media:optimize` | Rebuild optimized images/videos from `media/originals/` |
| `npm run icons` | Regenerate favicon/app icons from `media/brand/mark.svg` |

## Where the truth lives

| Data | File | Notes |
|---|---|---|
| Name, headline, location, socials, languages, claims | `src/content/profile.ts` | `claims` (e.g. "50+" certifications) are owner-confirmed and exceed public listings. Don't "correct" them. |
| Roles, degrees, honors | `src/content/experience.ts` | Dates follow LinkedIn. PTS covers Aug 2023 – Jan 2024 (the internal "DIGITYS" rename is **not** a separate role). |
| Projects | `src/content/projects.ts` | `roleId` = where it was built (omit = independent); `repo` links live GitHub stats. `repoOverrides` curates synced repos. `public: false` unpublishes a project everywhere (no page, link, cover, sitemap or search entry). The four Minion projects are private on purpose, and the Minion role shows `minionPublic` (`MINION_DETAIL_PUBLIC` in `experience.ts`): publish them only when the owner says so. |
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
  `/projects/[slug]`, `/skills`, `/research`, `/about`, `/gallery`, `/lab`, `/arcade`,
  `/arcade/[game]`, `/contact`, `/settings`.
  Legacy `/experience`, `/timeline`, `/contact-me` re-export the new pages.
  Static data routes: `/search-index.json` (terminal knowledge), `/covers/<slug>.svg`
  (generated project covers), `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, OG image.
- `src/components/runtime/*`: one-per-site islands: `effects` (reveal/stream/diffuse/draw
  triggers + spotlight), `boot`, `hud`, `delights` (tab title, console note), `sound`
  (delegated click sounds), `keybinds` (every shortcut, Konami, `G` chords, cursor
  press/hold states, the `?` overlay), `toasts`, `progress-tracker` (achievements).
- `src/components/fx/*`: `Stream` (token streaming), `DiffusionImage`, `LatentField` (hero canvas).
- `src/components/terminal/*`: drop-down + `/lab` terminal, command engine, offline
  BM25 retrieval (`ask`) with an optional `NEXT_PUBLIC_ASK_ENDPOINT` for a real LLM proxy.
- `src/components/crash/*`: the Contact "crash" (once per session; Esc / Reduced motion skip).
- `src/lib/ticker.ts` (single shared rAF loop) and `src/lib/quality.ts` (device tiers;
  `gpuHint()` detects software WebGL, where the globe falls back to CSS).
- Links: import `Link` from `@/components/link` (lint enforces it) and pass `NAV` from
  `@/lib/nav` to `router.push`. Both tag the transition as a navigation, which is the only
  thing the layout's page crossfade (`<ViewTransition>`) animates.
- Robustness: every lazy island goes through `loadChunk()` (`src/lib/lazy.ts`: one retry,
  then one reload for a stale deploy) and sits in an `ErrorBoundary`; `app/error.tsx` and
  `app/global-error.tsx` catch the rest. Modals use `Modal` (`src/components/ui/modal.tsx`,
  native `<dialog>`: top layer, inert background, Esc, focus restore).
- `src/components/arcade/*`: the Arcade. `registry.ts` lists games; `game-loader.tsx`
  code-splits each one; `shell.tsx` has the walkthrough deck + level picker; `ui.tsx` the
  shared controls/palette. Games live in `games/`. ML code is in `src/lib/ml/`
  (descent, k-means, KNN, perceptron, sampling, the hand-built interpretability model, and
  `engine.ts`, the Debugger's trainable transformer with gradient-checked backprop).
- Achievements: `src/content/achievements.ts` (every achievement is a test over the
  progress record), `src/lib/progress.ts` (localStorage record, `track()`, ranks),
  `src/lib/tiers.ts`, trophy room in `src/components/progress/`.

## Settings & music

- `src/lib/settings.ts`: typed visitor preferences in localStorage + `useSettings()`.
  `src/lib/settings-script.ts` (server-safe) is the inline head script that applies visual
  settings as `<html>` data attributes **before paint** (`data-crt`, `data-motion`,
  `data-theme`, `data-cursor`) and decides the boot screen. New visual settings must be
  added in both places. Use `motionReduced()` for any motion gate in JS and
  `html[data-motion="reduced"]` in CSS; never query `prefers-reduced-motion` directly.
- `/settings` page: `src/components/settings/settings-panel.tsx`, a tabbed options menu
  (Audio, Display, Motion, Interface, Controls, Progress, System; Q/E or arrows; URL hash per
  tab). The terminal also has `settings <key> on|off` and `settings motion …`.
- Keybinds: `src/lib/keybinds.ts` is the one registry (handler, Controls tab, `?` overlay and
  the terminal's `keys` all read it). Every global shortcut goes through it and through
  `keyBlocked()`: shortcuts must never fire while typing, on a keyboard-focused control, or
  while the crash, a dialog, the palette or the terminal is open. Don't add raw global
  `keydown` listeners for shortcuts.
- Audio: `src/components/media/audio/`. `mixer.ts` owns the one AudioContext (music bus,
  ducked under SFX, + sfx bus → master → limiter). `sfx.ts` synthesizes every sound effect in
  code (no samples, nothing licensed); call `sfx(name)` from `play.ts`, which loads nothing
  until the first sound and stays silent before the visitor's first interaction. Clickable
  elements get sounds automatically; use `data-sfx="name|none"` to override.
- Music: `src/components/media/music/`. `controller.ts` is the single entry point (header
  toggle, settings, terminal, keybinds, ⌘K). Music is on by default (`musicOn`): it starts
  on the first click/key of a visit (browsers forbid earlier) and "off" is remembered. `engine.ts` is a lookahead scheduler on the AudioContext
  clock with reverb/echo/tape/compressor; `styles.ts` composes lo-fi, synthwave and ambient
  (song forms, chord progressions, motif melodies); `instruments.ts` synthesizes every voice.
  The CC0 playlist lives in `src/content/gallery.ts → audioTracks` (CC0 only, with source
  URLs); originals in `media/originals/audio/`, encoded to AAC .m4a by `media:optimize`.

## Animation rules (the v1 "invisible page" bug must never return)

- Content is **visible by default**. An inline head script adds `html.js` before first
  paint (skipped when motion is reduced); only then do `[data-stream]`, `[data-diffuse]` and
  `[data-drawable]` start in their "before" state, each with a **4 s CSS failsafe**.
- `<Effects>` arms elements only after scroll settles (two frames, or 150 ms if the engine
  is slow to paint: visibility never waits on frame rate), plays what's in view, observes
  the rest, and runs a scroll sweep backstop (WebKit can skip IO entries).
- Never put `content-visibility` on a subtree that animates.
- Motion is **delta-time based** on the shared ticker: no fps caps, runs at the display's
  native refresh (60 Hz laptops, 200 Hz desktops). CSS animations use only
  transform/opacity/filter. Infinite animations pause offscreen (`pause-offscreen`).
- Motion setting: **Full** (default, owner decision: animates even when the OS asks for
  reduced motion, e.g. Windows "Animation effects" off), **System** (follows
  `prefers-reduced-motion`) or **Reduced**. Every motion gate goes through it. The crash
  must stay under 3 flashes/s.

## Gamification rules

- Every new interactive surface should call `track()` (lib/progress) for meaningful moments
  and play a fitting `sfx()`. New achievements go in `content/achievements.ts` as a `test`
  over the progress record; never claim facts about the owner in achievement copy.
- Arcade games: each needs a walkthrough (concept first, mechanics after, skippable) and
  reports results with `recordLevel(game, level, "cleared" | "mastered")` **from event
  handlers**, never from an effect. Clear/mastery per game is derived from `GAME_RULES` in
  `content/achievements.ts` (unit-tested against each game's level count). The progress
  store only saves and notifies when the record actually changes. Game logic and difficulty
  were tuned by headless simulation; `tests/unit` re-checks pars and thresholds.
- The Debugger trains in a real Web Worker (`games/debugger/train.worker.ts`, created with
  `new Worker(new URL("./train.worker.ts", import.meta.url), { type: "module" })`, which
  Turbopack bundles). It falls back to the main thread only if a worker can't start.

## Performance budget

Home: under ~40 MB JS heap (currently about 10), ~1.1k DOM nodes (v1 main branch: 143 MB / 18.9k).
Server components by default; client islands small and lazy (terminal, palette, crash
overlay, audio engine, sound effects, the `?` overlay and every Arcade game are code-split
and load on demand). The e2e suite fails if the home page exceeds 40 MB heap or 1.5k DOM
nodes. At most one WebGL context.
No heavy animation libraries (`motion` is intentionally not installed).

## Automation

- **Deploy** (`nextjs.yml`): push to `main`, manual, and **monthly** cron. `check` (lint,
  types, unit tests, `npm audit` with zero findings) → `build` (sync + export) → `e2e` in
  Chromium, Firefox and WebKit plus `dev` (next dev) → deploy → `live` smoke test of the real
  URL. Any failing gate blocks the deploy. Sync failures fall back to the committed snapshot.
- **Dependabot** monthly (grouped). There is deliberately no bot-commit/PR workflow: the
  repo's Actions token is read-only, and the deploy already syncs live data each run.
  Refresh the committed snapshot locally with `npm run sync` when convenient.
- New public repos appear on `/projects` automatically with a generated cover.
- **No secrets are required.** Sync falls back to the built-in `GITHUB_TOKEN` and then to
  the committed snapshot. Optional: `PORTFOLIO_SYNC_TOKEN` (pinned-repo ordering) and
  `NEXT_PUBLIC_ASK_ENDPOINT` (LLM proxy for the terminal's `ask`).

## Media

Originals in `media/originals/` (not deployed). iPhone `.heic`/`.heif` photos are fine: the
script decodes them with `heic-decode` (sharp's prebuilt libheif has no HEVC) and prefers them
over a same-named converted copy. `npm run media:optimize` → WebP variants
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
- `overrides` swaps `@next/eslint-plugin-next`'s `fast-glob` for `tinyglobby` (same
  `globSync` API for its one call) to drop `braces`, which has an unpatched advisory.
  `npm audit` must stay at zero; CI enforces it.
- `scripts/fix-404-preloads.mjs`: the exported `404.html` lacks the font preloads every
  other page has (fonts then download twice and browsers warn); this copies them in.
- `<Effects>` marks `<html data-ready>` once the runtime islands are hydrated; the e2e
  fixture waits for it after every navigation. A `TimeoutError` from an aborted view
  transition is marked handled there (react-dom leaves `transition.finished` uncaught).

## Tests and the zero-noise rule

The console is part of the product: **no errors, no warnings, in any browser**, and
`npm audit` at zero. Every e2e test runs through `tests/e2e/fixtures.ts`, which fails on
any console error or warning, uncaught exception, HTTP error or failed request, and offers
`layoutProblems()` (nothing spills out of its box, including inside clipped panels; mark
intentional scrollers `data-scroll-x`, intentional clipping `data-clip-ok`). Its only
exemptions, each documented in the file: requests cancelled because the test navigates
away, and Firefox's "preload not used within a few seconds" timing hint. Don't add more
without a reason that holds for real visitors. Chromium runs with `--disable-audio-output`
(a fake real-time sink) so parallel browsers never fight over the sound card.

- **Every bug gets a regression test** that fails before the fix.
- Tests must be deterministic under load (CI runs 3 workers, local 6): wait on state, not
  time. Use `expect.poll`, record transient UI (toasts) instead of racing it, and use
  `page.clock` for timers such as the crash phases or the `G` chord.
- Seed state through the fixture's `site` option (`settings`, `progress`, `boot`,
  `crashSeen`, `allow404`). `MAXED_PROGRESS` loads every game in its finished state.

## Verify before finishing

`npm run check`, then `npm run test:e2e` (all three engines) and `npm run test:dev`, then
look at the pages yourself (Playwright screenshots at 390 and 1440 px). Take screenshots
**sequentially** after waiting, since parallel tool calls capture the first frame of a
stream.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
