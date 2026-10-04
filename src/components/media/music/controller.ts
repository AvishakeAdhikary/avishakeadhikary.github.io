"use client";

import { useSyncExternalStore } from "react";
import { audioTracks } from "@/content/gallery";
import type { AudioTrack } from "@/content/types";
import { mediaUrl } from "@/lib/media";
import { readSettings, subscribeSettings, type MusicSource } from "@/lib/settings";
import type { MusicEngine } from "./engine";

export interface MusicState {
  playing: boolean;
  busy: boolean;
  source: MusicSource;
  track: AudioTrack | null;
}

/**
 * The one place music is controlled from (header toggle, /settings, the
 * terminal and ⌘K all talk to this). Nothing is created until the first
 * play: the synth engine is code-split, the playlist uses a single
 * <audio> element, and stopping releases the AudioContext.
 */
let state: MusicState = { playing: false, busy: false, source: "lofi", track: null };
const listeners = new Set<() => void>();
let engine: MusicEngine | null = null;
let audio: HTMLAudioElement | null = null;
let trackIndex = 0;
let wired = false;

const emit = (patch: Partial<MusicState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const effectiveSource = (s: MusicSource): MusicSource => (s === "playlist" && !audioTracks.length ? "lofi" : s);
const volume = () => Math.max(0, Math.min(1, readSettings().volume / 100));

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  state = { ...state, source: effectiveSource(readSettings().musicSource) };
  subscribeSettings(() => {
    const s = readSettings();
    const src = effectiveSource(s.musicSource);
    if (audio) audio.volume = volume();
    engine?.setVolume(volume());
    if (src !== state.source) void switchSource(src);
  });
  document.addEventListener("visibilitychange", () => {
    if (!state.playing || !readSettings().pauseHidden) return;
    if (document.hidden) {
      void engine?.suspend();
      audio?.pause();
    } else {
      void engine?.resume();
      void audio?.play().catch(() => undefined);
    }
  });
  window.addEventListener("ambient:toggle", () => void music.toggle());
}

async function startPlaylist() {
  audio ??= new Audio();
  audio.preload = "none";
  audio.volume = volume();
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
    try {
      const src = effectiveSource(readSettings().musicSource);
      if (src === "playlist") await startPlaylist();
      else {
        const { MusicEngine } = await import("./engine");
        engine = new MusicEngine();
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
  toggle() {
    return state.playing ? music.stop() : music.play();
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
