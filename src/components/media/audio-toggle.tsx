"use client";

import { cn } from "@/lib/utils";
import { music, useMusic } from "./music/controller";

const SOURCE_LABEL = { lofi: "Lo-fi beats", synthwave: "Synthwave", ambient: "Ambient", playlist: "CC0 playlist" } as const;

/** Header play/pause for the soundtrack. Style, volume and more live in /settings. */
export function AudioToggle() {
  const { playing, busy, source, track } = useMusic();
  const label = playing ? "Pause music" : "Play music";
  const detail =
    source === "playlist" && track
      ? `${track.title} by ${track.artist} (${track.license})`
      : `${SOURCE_LABEL[source]}: composed live in your browser, royalty-free. Change the style in settings.`;

  return (
    <button
      type="button"
      onClick={() => void music.toggle()}
      disabled={busy}
      aria-pressed={playing}
      aria-label={label}
      title={detail}
      className="group flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-60"
    >
      <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
        {[0.9, 0.5, 1, 0.65].map((h, i) => (
          <span
            key={i}
            className={cn("w-[2.5px] rounded-full bg-current", playing && "animate-[eq_1s_ease-in-out_infinite] text-signal-soft")}
            style={{ height: playing ? `${h * 100}%` : "30%", animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="hidden font-mono text-[0.68rem] tracking-widest uppercase lg:inline">{playing ? "On" : "Music"}</span>
    </button>
  );
}
