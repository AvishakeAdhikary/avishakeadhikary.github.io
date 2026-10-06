"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { profile } from "@/content/profile";

type Phase = "glitch" | "off" | "panic";

const GLYPHS = "█▓▒░▚▞▙▟#%&@$";
const noiseLine = (n: number) => Array.from({ length: n }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("");

/**
 * The crash itself. Phases: glitch (RGB split + tearing, ~1.1 s) → CRT
 * switch-off → kernel panic whose "stack trace" is the real list of ways
 * to reach Avishake. Any key / click on "recover" continues to /contact.
 * Esc skips at any time. No strobing (stays under 3 changes per second).
 */
export function CrashOverlay({ email, onRecover }: { email: string; onRecover: () => void }) {
  const [phase, setPhase] = useState<Phase>("glitch");
  const [bands] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({ top: 6 + i * 13 + Math.random() * 6, h: 2 + Math.random() * 7, text: noiseLine(220), delay: i * 70 })),
  );
  const [copied, setCopied] = useState(false);
  const recoverRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("crashing");
    sfx("glitch");
    const t1 = setTimeout(() => setPhase("off"), 1100);
    const t2 = setTimeout(() => {
      html.classList.remove("crashing");
      setPhase("panic");
    }, 1550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      html.classList.remove("crashing");
    };
  }, []);

  useEffect(() => {
    if (phase === "panic") recoverRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (phase === "panic" && !e.metaKey && !e.ctrlKey && e.key !== "Tab" && e.key !== "Shift")) {
        // Enter/Space on a focused button or link should activate *it* (e.g. "Copy email").
        if ((e.key === "Enter" || e.key === " ") && /^(A|BUTTON)$/.test((e.target as HTMLElement)?.tagName ?? "")) return;
        e.preventDefault();
        onRecover();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onRecover]);

  const trace = [
    { fn: "email", label: email, href: `mailto:${email}` },
    { fn: "linkedin", label: "linkedin.com/in/avishakeadhikary", href: profile.socials.linkedin },
    { fn: "github", label: "github.com/AvishakeAdhikary", href: profile.socials.github },
    { fn: "scholar", label: "Google Scholar profile", href: profile.socials.scholar },
    { fn: "resume", label: "resume.pdf", href: profile.resume },
  ];

  return (
    <div className="fixed inset-0 z-[90]" role="alertdialog" aria-modal="true" aria-label="A playful fake crash. Press any key to continue to the contact page.">
      {phase === "glitch" ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {bands.map((b, i) => (
            <div
              key={i}
              className="absolute inset-x-0 overflow-hidden font-mono text-[10px] leading-none break-all text-signal/70"
              style={{
                top: `${b.top}%`,
                height: `${b.h}%`,
                background: i % 2 ? "oklch(0.1 0.01 20 / 0.92)" : "oklch(0.45 0.18 27 / 0.35)",
                animation: `tear 0.9s steps(5, jump-none) ${b.delay}ms both`,
              }}
            >
              {b.text}
            </div>
          ))}
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 font-hud text-xs text-signal">segmentation fault (core dumped)</p>
        </div>
      ) : null}

      {phase === "off" ? (
        <div className="absolute inset-0 bg-black">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white" style={{ animation: "crt-off 0.42s ease-in both" }} />
        </div>
      ) : null}

      {phase === "panic" ? (
        <div
          className="absolute inset-0 overflow-y-auto bg-[oklch(0.14_0.05_25)] text-[oklch(0.95_0.02_25)]"
          style={{ animation: "crt-on 0.5s cubic-bezier(0.2,0.7,0.2,1) both" }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a,button")) return;
            onRecover();
          }}
        >
          <div className="mx-auto max-w-3xl px-5 py-14 font-hud text-[0.82rem] leading-relaxed sm:py-20 sm:text-sm">
            <p className="text-signal-pale">[ 42.000117] Kernel panic: not syncing: NotYetHiredException</p>
            <p className="pl-[7.5ch] text-white/70">at /career/next-role (you.ts:1:1)</p>

            <h1 className="mt-10 font-display text-3xl leading-tight font-bold tracking-tight text-white sm:text-5xl">
              Relax, nothing broke.
            </h1>
            <p className="mt-4 max-w-xl font-sans text-lg text-white/85 sm:text-xl">
              This is just a creative way of saying: <strong className="text-white">let&apos;s talk.</strong>
            </p>

            <div className="mt-8 flex flex-wrap gap-3 font-sans">
              <button
                ref={recoverRef}
                type="button"
                onClick={onRecover}
                className="h-12 rounded-md bg-white px-6 font-semibold text-[oklch(0.25_0.1_25)] transition-transform hover:scale-[1.02]"
              >
                Contact me →
              </button>
              <button
                type="button"
                data-track="contact"
                onClick={async () => {
                  await navigator.clipboard?.writeText(email).catch(() => undefined);
                  setCopied(true);
                }}
                className="h-12 rounded-md border border-white/40 px-5 font-medium text-white hover:bg-white/10"
              >
                {copied ? "Email copied ✓" : "Copy email"}
              </button>
            </div>

            <div className="mt-12 space-y-1">
              <p className="text-white/60">Call Trace:</p>
              {trace.map((f) => (
                <p key={f.fn}>
                  <span className="text-white/50"> &lt;TASK&gt; at </span>
                  <a href={f.href} target={f.href.startsWith("/") ? undefined : "_blank"} rel="noopener" className="text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                    {f.fn}
                  </a>
                  <span className="text-white/60"> ({f.label})</span>
                </p>
              ))}
              <p className="pt-2 text-white/60">---[ end Kernel panic · core dumped → inbox ]---</p>
            </div>

            <p className="mt-12 animate-caret text-white/80">[ press any key to recover ]</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
