# avishakeadhikary.github.io

The portfolio of **Avishake Adhikary**, Machine Learning Engineer (agentic AI, LLM
fine-tuning & quantization, healthcare AI, computer vision) in Kolkata, India.
Live at **https://avishakeadhikary.github.io**.

## Highlights

- **A portfolio that behaves like a model you're running.** Headings stream in token by
  token, photos denoise like a diffusion model, the career page is a training run, skills
  form an embedding space, research is a citation graph, and Contact… crashes. On purpose.
- **A real terminal** (press `~`) that knows the CV: `ask what did you build at PTS?`,
  `open zoyemed`, `sudo hire-me`. Offline retrieval, no API keys.
- **Music that is actually music.** Lo-fi, synthwave and ambient tracks composed live in the
  browser (drums, bass, chords, melody, real song structure; no audio files), or a playlist
  of public-domain CC0 tracks. Never autoplays.
- **A settings page** to turn the music, motion, scanlines, boot screen, the contact-page
  crash, the HUD and more on or off, saved per browser and applied before first paint.
- **Self-updating.** A monthly GitHub Actions run syncs repositories, stars and Google
  Scholar citations, rebuilds, checks every page in a real browser and deploys.
- **Light on memory, fast on big screens.** ~10 MB JS heap on the home page (the previous
  version used ~143 MB). One shared animation loop with delta-time motion runs at the
  display's native refresh rate, from 60 Hz laptops to 200 Hz monitors.
- **Web-optimized media.** Originals stay in `media/originals/`; sharp + ffmpeg produce
  responsive WebP and compact video. One env var can move all media to a CDN.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix, cmdk) ·
lucide + simple-icons · cobe · sharp · ffmpeg · Playwright · GitHub Pages

## Develop

```bash
npm install
npm run dev            # http://localhost:3000
npm run check          # lint + typecheck + static build (out/)
npm run sync           # refresh GitHub + Scholar data
npm run media:optimize # rebuild optimized media from media/originals/
npm start && npm run verify   # serve out/ and check it in Chromium, Firefox and WebKit
```

Content lives in `src/content/*.ts`. See [AGENTS.md](AGENTS.md) for the content model,
automation, media pipeline and performance rules.

## License

Code is [MIT](LICENSE). Personal content (text, photos, résumé) © Avishake Adhikary.
