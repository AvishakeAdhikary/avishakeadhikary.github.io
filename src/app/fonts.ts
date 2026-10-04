import localFont from "next/font/local";

/*
 * Self-hosted variable fonts (@fontsource-variable, bundled at build time):
 * no Google request at build or runtime, works offline and in CI.
 *
 * Latin subsets only: next/font/local emits no unicode-range, so mixing
 * subset files would make them compete; Latin-1 covers every glyph used.
 *
 * Mono-first identity: JetBrains Mono carries headings and UI, Inter keeps
 * long-form body copy readable, Geist Mono is the small HUD/terminal voice.
 */
export const mono = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", weight: "100 800", style: "normal" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

export const inter = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
});

export const hud = localFont({
  src: [{ path: "../../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
});
