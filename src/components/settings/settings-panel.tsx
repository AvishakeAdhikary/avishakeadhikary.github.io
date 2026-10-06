"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { sfx } from "@/components/media/audio/play";
import { music, useMusic } from "@/components/media/music/controller";
import { audioTracks } from "@/content/gallery";
import { keyBlocked } from "@/lib/keybinds";
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
import { TrophyRoom } from "@/components/progress/trophy-room";
import { KeybindTable } from "./keybind-table";

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

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={1}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-48 accent-[var(--signal)]"
    />
  );
}

const SOURCES: { id: MusicSource; label: string; hint: string }[] = [
  { id: "lofi", label: "Lo-fi", hint: "78 BPM · mellow keys, dusty drums, vinyl crackle" },
  { id: "synthwave", label: "Synthwave", hint: "104 BPM · retro arps, punchy drums, bright lead" },
  { id: "ambient", label: "Ambient", hint: "64 BPM · wide pads, glassy plucks, soft pulse" },
  { id: "playlist", label: "CC0 playlist", hint: `${audioTracks.length} real tracks, public domain (CC0)` },
];

const TABS = [
  { id: "audio", label: "Audio", sub: "sound" },
  { id: "display", label: "Display", sub: "look" },
  { id: "motion", label: "Motion", sub: "animation" },
  { id: "interface", label: "Interface", sub: "chrome" },
  { id: "controls", label: "Controls", sub: "keybinds" },
  { id: "progress", label: "Progress", sub: "achievements" },
  { id: "system", label: "System", sub: "storage" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const isTab = (h: string): h is TabId => TABS.some((t) => t.id === h);

/**
 * All visitor preferences, laid out like a game's options menu: a rail of
 * tabs (Q / E or the arrow keys switch, the URL hash remembers), one panel
 * at a time. Changes apply instantly and are saved in this browser.
 */
export function SettingsPanel() {
  const s = useSettings();
  const systemReduced = useSyncExternalStore(subscribeSettings, systemReducesMotion, () => false);
  const m = useMusic();
  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);
  const current = SOURCES.find((x) => x.id === s.musicSource);
  const [tab, setTab] = useState<TabId>("audio");
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const select = useCallback((id: TabId, focus = false) => {
    setTab(id);
    history.replaceState(history.state, "", `#${id}`);
    if (focus) tabRefs.current[id]?.focus();
  }, []);

  // Deep links (/settings/#controls) and in-page hash changes pick the tab.
  useEffect(() => {
    const fromHash = () => {
      const h = location.hash.slice(1);
      if (isTab(h)) setTab(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    window.addEventListener("settings:tab", fromHash);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      window.removeEventListener("settings:tab", fromHash);
    };
  }, []);

  // Q / E: previous / next tab, like a controller's shoulder buttons.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || keyBlocked(e) || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k !== "q" && k !== "e") return;
      e.preventDefault();
      const i = TABS.findIndex((t) => t.id === tab);
      sfx("tap");
      select(TABS[(i + (k === "e" ? 1 : TABS.length - 1)) % TABS.length].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, select]);

  const onTabKey = (e: ReactKeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const step: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (e.key in step) {
      e.preventDefault();
      sfx("tap");
      select(TABS[(i + step[e.key] + TABS.length) % TABS.length].id, true);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      select(TABS[e.key === "Home" ? 0 : TABS.length - 1].id, true);
    }
  };

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div
          role="tablist"
          aria-label="Settings sections"
          aria-orientation="vertical"
          onKeyDown={onTabKey}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible"
        >
          {TABS.map((t, i) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={on}
                aria-controls={`panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => select(t.id)}
                className={cn(
                  "menu-tab group relative flex shrink-0 items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors lg:w-full",
                  on ? "border-signal/60 bg-signal/10 text-foreground" : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                <span className={cn("font-hud text-[0.62rem] tabular-nums", on ? "text-signal" : "text-subtle-foreground")}>{String(i + 1).padStart(2, "0")}</span>
                <span className="font-mono text-sm font-semibold tracking-wide uppercase">{t.label}</span>
                <span className="hidden font-hud text-[0.62rem] text-subtle-foreground normal-case lg:ml-auto lg:inline">{`// ${t.sub}`}</span>
                {on ? <span aria-hidden className="absolute top-2 bottom-2 left-0 hidden w-0.5 rounded bg-signal lg:block" /> : null}
              </button>
            );
          })}
        </div>
        <p className="mt-3 hidden font-hud text-[0.62rem] text-subtle-foreground lg:block">
          <kbd className="rounded border border-border px-1">Q</kbd> / <kbd className="rounded border border-border px-1">E</kbd> or arrow keys to switch
        </p>
      </div>

      <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="panel min-w-0 overflow-hidden">
        <header className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-4">
          <h2 className="font-mono text-lg font-bold">
            {active.label}
            <span className="text-signal">.</span>
          </h2>
          <p className="hud normal-case">{`// ${active.sub}`}</p>
        </header>
        <div className="divide-y divide-border">
          {tab === "audio" ? (
            <>
              <div className="px-5 py-5">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => void music.toggle()}
                    data-music-control
                    data-sfx="none"
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
                  The three styles are composed live in your browser (no audio files, never the same twice). The playlist streams real public-domain tracks.
                  Music starts with your first click or key press; pause it and it stays off until you turn it back on.
                </p>
              </div>
              <Row label="Style" hint="Switch any time; it crossfades if music is playing.">
                <Segmented label="Music style" value={s.musicSource} options={SOURCES.map(({ id, label }) => ({ id, label }))} onChange={set("musicSource")} />
              </Row>
              <Row label="Music volume" hint={`${s.volume}%`}>
                <Slider label="Music volume" value={s.volume} onChange={(v) => updateSettings({ volume: v })} />
              </Row>
              <Row label="Music on arrival" hint="Start the music with your first click or key press on each visit.">
                <Switch label="Music on arrival" checked={s.musicOn} onChange={set("musicOn")} />
              </Row>
              <Row label="Sound effects" hint="Synthesized clicks, toggles and chimes. They mix over the music, which dips briefly to make room.">
                <Switch label="Sound effects" checked={s.sfx} onChange={set("sfx")} />
              </Row>
              <Row label="Effects volume" hint={`${s.sfxVolume}%`}>
                <Slider label="Sound effects volume" value={s.sfxVolume} onChange={(v) => updateSettings({ sfxVolume: v })} />
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
            </>
          ) : null}

          {tab === "display" ? (
            <>
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
              <Row label="Crosshair cursor" hint="A reticle that locks onto buttons, recoils on click and charges while held. Off uses your normal pointer.">
                <Switch label="Crosshair cursor" checked={s.cursor} onChange={set("cursor")} />
              </Row>
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
            </>
          ) : null}

          {tab === "motion" ? (
            <>
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
            </>
          ) : null}

          {tab === "interface" ? (
            <>
              <Row label="Runtime readout" hint="The small live stats box (desktop only). Toggle with R.">
                <Switch label="Runtime readout" checked={s.hud} onChange={set("hud")} />
              </Row>
              <Row label="Terminal button" hint="Hide the button; the ~ key still opens the terminal.">
                <Switch label="Terminal button" checked={s.dock} onChange={set("dock")} />
              </Row>
              <Row label="Notifications" hint="Achievement and rank-up pop-ups. Short keybind confirmations always show.">
                <Switch label="Notifications" checked={s.toasts} onChange={set("toasts")} />
              </Row>
            </>
          ) : null}

          {tab === "controls" ? (
            <div className="px-5 py-5">
              <KeybindTable />
            </div>
          ) : null}

          {tab === "progress" ? (
            <div className="px-5 py-5">
              <TrophyRoom compact />
            </div>
          ) : null}

          {tab === "system" ? (
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
              <p className="max-w-md text-sm text-muted-foreground">Settings are saved only in this browser. Nothing is sent anywhere.</p>
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
          ) : null}
        </div>
      </section>
    </div>
  );
}
