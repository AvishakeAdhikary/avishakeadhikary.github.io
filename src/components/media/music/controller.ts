"use client";

import { useSyncExternalStore } from "react";
import { audioTracks } from "@/content/gallery";
import type { AudioTrack } from "@/content/types";
import { mediaUrl } from "@/lib/media";
import { readSettings, subscribeSettings, updateSettings, type MusicSource } from "@/lib/settings";
import { subscribe as onFrame } from "@/lib/ticker";
import { getMixer, onDuck, resumeMixer, suspendMixer } from "../audio/mixer";
import type { MusicEngine } from "./engine";

export interface MusicState {
  playing: boolean;
  busy: boolean;
  source: MusicSource;
  track: AudioTrack | null;
}

/**
 * The one place music is controlled from (header toggle, /settings, the
 * terminal, keybinds and ⌘K all talk to this). Nothing is created until
 * the first play: the synth engine is code-split and plays into the shared
 * mixer's music bus; the playlist uses a single <audio> element.
 *
 * Music is on by default (settings.musicOn), but browsers only allow audio
 * after the visitor interacts, so it starts on the first click or key of a
 * visit. Turning it off is remembered.
 */
let state: MusicState = { playing: false, busy: false, source: "lofi", track: null };
const listeners = new Set<() => void>();
let engine: MusicEngine | null = null;
let audio: HTMLAudioElement | null = null;
let trackIndex = 0;
let wired = false;
/** Playlist ducking (the synth is ducked inside the mixer). */
let duckLevel = 1;

const emit = (patch: Partial<MusicState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const effectiveSource = (s: MusicSource): MusicSource => (s === "playlist" && !audioTracks.length ? "lofi" : s);
const volume = () => Math.max(0, Math.min(1, readSettings().volume / 100));
const applyAudioVolume = () => {
  if (audio) audio.volume = volume() * duckLevel;
};

function duckPlaylist(depth: number, release: number) {
  if (!audio || audio.paused) return;
  duckLevel = depth;
  applyAudioVolume();
  const unsub = onFrame((dt) => {
    duckLevel = Math.min(1, duckLevel + (dt / release) * (1 - depth));
    applyAudioVolume();
    if (duckLevel >= 1) unsub();
  });
}

/** Elements that control music themselves; the autoplay gesture leaves them alone. */
const MUSIC_CONTROL = "[data-music-control]";

function armAutoplay() {
  const fire = (e: Event) => {
    if (e instanceof KeyboardEvent && (e.key === "m" || e.key === "M" || e.repeat)) return;
    if ((e.target as Element | null)?.closest?.(MUSIC_CONTROL)) return;
    window.removeEventListener("pointerdown", fire, true);
    window.removeEventListener("keydown", fire, true);
    if (readSettings().musicOn && !state.playing) void music.play();
  };
  window.addEventListener("pointerdown", fire, true);
  window.addEventListener("keydown", fire, true);
}

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  state = { ...state, source: effectiveSource(readSettings().musicSource) };
  subscribeSettings(() => {
    const s = readSettings();
    const src = effectiveSource(s.musicSource);
    applyAudioVolume();
    engine?.setVolume(volume());
    if (src !== state.source) void switchSource(src);
  });
  document.addEventListener("visibilitychange", () => {
    if (!state.playing || !readSettings().pauseHidden) return;
    if (document.hidden) {
      void suspendMixer();
      audio?.pause();
    } else {
      void resumeMixer();
      void audio?.play().catch(() => undefined);
    }
  });
  window.addEventListener("ambient:toggle", () => void music.toggle());
  onDuck(duckPlaylist);
  if (readSettings().musicOn) armAutoplay();
}

async function startPlaylist() {
  audio ??= new Audio();
  audio.preload = "none";
  applyAudioVolume();
  audio.onended = () => {
    trackIndex = (trackIndex + 1) % audioTracks.length;
    void startPlaylist();
  };
  const track = audioTracks[trackIndex];
  audio.src = mediaUrl(track.src);
  await audio.play();
  emit({ track });
}

async function switchSource(src: MusicSource) {
  const wasPlaying = state.playing;
  if (!wasPlaying) return emit({ source: src });
  if (src !== "playlist" && engine && state.source !== "playlist") {
    engine.setStyle(src);
    return emit({ source: src, track: null });
  }
  await music.stop();
  emit({ source: src });
  await music.play();
}

export const music = {
  get: () => state,
  subscribe(fn: () => void) {
    wire();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async play() {
    wire();
    if (state.playing || state.busy) return;
    emit({ busy: true });
    // Create/resume the shared context synchronously, inside the gesture
    // (Safari only unlocks audio there, not after the engine import).
    void getMixer().ctx.resume();
    try {
      const src = effectiveSource(readSettings().musicSource);
      if (src === "playlist") await startPlaylist();
      else {
        const { MusicEngine } = await import("./engine");
        const { ctx, music: bus } = getMixer();
        engine = new MusicEngine(ctx, bus);
        await engine.start(src, volume());
      }
      emit({ playing: true, source: src });
    } catch {
      emit({ playing: false });
    } finally {
      emit({ busy: false });
    }
  },
  async stop() {
    emit({ busy: true });
    audio?.pause();
    if (engine) {
      const e = engine;
      engine = null;
      await e.stop();
    }
    emit({ playing: false, busy: false, track: null });
  },
  /** A visitor's on/off choice: also remembered for future visits. */
  toggle() {
    const on = !state.playing;
    updateSettings({ musicOn: on });
    return on ? music.play() : music.stop();
  },
  /** Next style (lo-fi → synthwave → ambient → playlist), or the next track while the playlist plays. */
  next(): MusicSource | string {
    const s = readSettings();
    if (state.playing && state.source === "playlist" && audioTracks.length) {
      trackIndex = (trackIndex + 1) % audioTracks.length;
      void startPlaylist();
      return audioTracks[trackIndex].title;
    }
    const order: MusicSource[] = audioTracks.length ? ["lofi", "synthwave", "ambient", "playlist"] : ["lofi", "synthwave", "ambient"];
    const next = order[(order.indexOf(s.musicSource) + 1) % order.length];
    updateSettings({ musicSource: next });
    return next;
  },
  /** Live level 0..1 for visualizers (synth only). */
  level() {
    if (!engine) return 0;
    const a = engine.analyser;
    const data = new Uint8Array(a.frequencyBinCount);
    a.getByteFrequencyData(data);
    return data.reduce((s, v) => s + v, 0) / (data.length * 255);
  },
};

const SERVER: MusicState = { playing: false, busy: false, source: "lofi", track: null };

export function useMusic(): MusicState {
  return useSyncExternalStore(music.subscribe, music.get, () => SERVER);
}
