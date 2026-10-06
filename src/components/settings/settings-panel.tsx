"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { music, useMusic } from "@/components/media/music/controller";
import { audioTracks } from "@/content/gallery";
import {
  resetSettings,
  subscribeSettings,
  systemReducesMotion,
  updateSettings,
  useSettings,
  type MusicSource,
  type Settings,
} from "@/lib/settings";
import { cn } from "@/lib/utils";

function Group({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="panel overflow-hidden" aria-labelledby={`set-${sub}`}>
      <header className="border-b border-border px-5 py-4">
        <h2 id={`set-${sub}`} className="font-mono text-lg font-bold">
          {title}
        </h2>
        <p className="hud mt-0.5 normal-case">{`// ${sub}`}</p>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-medium">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-14 shrink-0 items-center rounded-md border font-hud text-[0.6rem] transition-colors",
        checked ? "border-signal bg-signal/20" : "border-border-strong bg-white/[0.03]",
      )}
    >
      <span className={cn("absolute top-0.5 size-[1.375rem] rounded-sm transition-transform", checked ? "translate-x-[1.85rem] bg-signal" : "translate-x-0.5 bg-muted-foreground")} />
      <span className={cn("w-full px-2 uppercase", checked ? "text-left text-signal-pale" : "text-right text-subtle-foreground")}>{checked ? "on" : "off"}</span>
    </button>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-md border border-border-strong p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded px-3 py-1.5 font-mono text-xs transition-colors",
            value === o.id ? "bg-signal text-white" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const SOURCES: { id: MusicSource; label: string; hint: string }[] = [
  { id: "lofi", label: "Lo-fi", hint: "78 BPM · mellow keys, dusty drums, vinyl crackle" },
  { id: "synthwave", label: "Synthwave", hint: "104 BPM · retro arps, punchy drums, bright lead" },
  { id: "ambient", label: "Ambient", hint: "64 BPM · wide pads, glassy plucks, soft pulse" },
  { id: "playlist", label: "CC0 playlist", hint: `${audioTracks.length} real tracks, public domain (CC0)` },
];

/** All visitor preferences. Changes apply instantly and are saved in this browser. */
export function SettingsPanel() {
  const s = useSettings();
  const systemReduced = useSyncExternalStore(subscribeSettings, systemReducesMotion, () => false);
  const m = useMusic();
  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);
  const current = SOURCES.find((x) => x.id === s.musicSource);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Group title="Music" sub="sound">
          <div className="px-5 py-5">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void music.toggle()}
                disabled={m.busy}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-signal px-5 font-mono text-sm font-semibold text-white disabled:opacity-60"
              >
                {m.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                {m.playing ? "Pause" : "Play"}
              </button>
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-foreground">{m.playing ? "Now playing" : "Ready"}</p>
                <p className="truncate font-hud text-xs text-subtle-foreground">
                  {s.musicSource === "playlist" && m.track ? (
                    <>
                      {m.track.title} · {m.track.artist} ·{" "}
                      <a href={m.track.sourceUrl} target="_blank" rel="noopener" className="link-mono">
                        {m.track.license}
                      </a>
                    </>
                  ) : (
                    current?.hint
                  )}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The three styles are composed live in your browser (no audio files, never the same twice). The playlist streams real public-domain tracks. Music
              never starts on its own.
            </p>
          </div>
          <Row label="Style" hint="Switch any time; it crossfades if music is playing.">
            <Segmented label="Music style" value={s.musicSource} options={SOURCES.map(({ id, label }) => ({ id, label }))} onChange={set("musicSource")} />
          </Row>
          <Row label="Volume" hint={`${s.volume}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={s.volume}
              aria-label="Music volume"
              onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
              className="w-48 accent-[var(--signal)]"
            />
          </Row>
          <Row label="Pause when I switch tabs" hint="Saves battery and stays polite.">
            <Switch label="Pause music when the tab is hidden" checked={s.pauseHidden} onChange={set("pauseHidden")} />
          </Row>
          {s.musicSource === "playlist" ? (
            <div className="px-5 py-4">
              <p className="hud mb-2">playlist credits</p>
              <ul className="space-y-1 text-sm">
                {audioTracks.map((t) => (
                  <li key={t.src} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {t.title} <span className="text-subtle-foreground">· {t.artist}</span>
                    </span>
                    <a href={t.sourceUrl} target="_blank" rel="noopener" className="link-mono text-xs">
                      {t.license} · source
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Group>

        <Group title="Appearance" sub="look">
          <Row label="Color theme" hint="Signal red, or the green phosphor of an old terminal.">
            <Segmented
              label="Color theme"
              value={s.theme}
              options={[
                { id: "red", label: "Red" },
                { id: "phosphor", label: "Phosphor" },
              ]}
              onChange={set("theme")}
            />
          </Row>
          <Row label="Scanlines" hint="The subtle CRT-monitor lines over the page.">
            <Switch label="Scanlines" checked={s.crt} onChange={set("crt")} />
          </Row>
          <Row label="Crosshair cursor" hint="Use your normal mouse pointer instead.">
            <Switch label="Crosshair cursor" checked={s.cursor} onChange={set("cursor")} />
          </Row>
        </Group>
      </div>

      <div className="space-y-6">
        <Group title="Motion & effects" sub="animation">
          <Row
            label="Motion"
            hint={`Reduced turns off streaming text, image reveals and moving backgrounds. System follows your device${systemReduced ? ", which currently asks for reduced motion" : ""}.`}
          >
            <Segmented
              label="Motion"
              value={s.motion}
              options={[
                { id: "full", label: "Full" },
                { id: "system", label: "System" },
                { id: "reduced", label: "Reduced" },
              ]}
              onChange={set("motion")}
            />
          </Row>
          <Row label="Boot screen" hint="The short start-up log on your first visit to the home page.">
            <Switch label="Boot screen" checked={s.boot} onChange={set("boot")} />
          </Row>
          <Row label="The contact page “crash”" hint="Turn off the fake crash and go straight to the contact page.">
            <Switch label="Contact page crash" checked={s.crash} onChange={set("crash")} />
          </Row>
          <Row label="Moving background" hint="The field of points behind the home-page intro.">
            <Switch label="Moving background" checked={s.field} onChange={set("field")} />
          </Row>
        </Group>

        <Group title="Interface" sub="chrome">
          <Row label="Runtime readout" hint="The small live stats box (desktop only).">
            <Switch label="Runtime readout" checked={s.hud} onChange={set("hud")} />
          </Row>
          <Row label="Terminal button" hint="Hide the button; the ~ key still opens the terminal.">
            <Switch label="Terminal button" checked={s.dock} onChange={set("dock")} />
          </Row>
        </Group>

        <Group title="Performance" sub="graphics">
          <Row label="Graphics quality" hint="Auto adapts to your device. High uses full resolution and denser effects.">
            <Segmented
              label="Graphics quality"
              value={s.quality}
              options={[
                { id: "auto", label: "Auto" },
                { id: "low", label: "Low" },
                { id: "high", label: "High" },
              ]}
              onChange={set("quality")}
            />
          </Row>
        </Group>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-border-strong px-5 py-4">
          <p className="text-sm text-muted-foreground">Settings are saved only in this browser. Nothing is sent anywhere.</p>
          <button
            type="button"
            onClick={() => {
              void music.stop();
              resetSettings();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border-strong px-4 font-mono text-xs hover:border-signal"
          >
            <RotateCcw className="size-3.5" /> Reset everything
          </button>
        </div>
      </div>
    </div>
  );
}
