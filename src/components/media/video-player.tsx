"use client";

import { Captions, Maximize2, Minimize2, Pause, PictureInPicture2, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface VideoSource {
  mp4: string;
  webm: string | null;
  poster: string;
  width: number;
  height: number;
}

const SPEEDS = [0.5, 1, 1.5, 2];
const BARS = 64;

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

/** Mutates a DOM TextTrack (outside React state) and returns the new visibility. */
function setTrackVisible(track: TextTrack, on: boolean) {
  track.mode = on ? "showing" : "hidden";
  return on;
}

/** Deterministic pseudo-waveform so the scrubber reads like a token stream. */
const bars = (seed: string) => {
  let h = [...seed].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
  return Array.from({ length: BARS }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 0.25 + ((h >>> 16) % 1000) / 1333;
  });
};

/**
 * Custom player on a native <video> (works in every browser, hardware
 * decoding, PiP). Nothing downloads until play (preload="none"); it pauses
 * itself when scrolled away. Keyboard: Space/K play, J/L ±10s, ←/→ ±5s,
 * M mute, F fullscreen, C captions, P picture-in-picture.
 */
export function VideoPlayer({
  src,
  title,
  captions,
  className,
}: {
  src: VideoSource;
  title: string;
  captions?: string;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [hover, setHover] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [ccOn, setCcOn] = useState(false);
  const [idle, setIdle] = useState(false);
  const [wave] = useState(() => bars(title));
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      setStarted(true);
      void v.play().catch(() => undefined);
    } else v.pause();
  }, []);

  const seek = useCallback((t: number) => {
    const v = video.current;
    if (v && Number.isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, t));
  }, []);

  const toggleFs = useCallback(() => {
    const el = wrap.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el?.requestFullscreen) void el.requestFullscreen();
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.(); // iOS Safari
  }, []);

  const togglePip = useCallback(async () => {
    const v = video.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* unsupported */
    }
  }, []);

  const toggleCc = useCallback(() => {
    const track = video.current?.textTracks[0];
    if (!track) return;
    setCcOn(setTrackVisible(track, track.mode !== "showing"));
  }, []);

  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2200);
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const on = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      timeupdate: () => setTime(v.currentTime),
      durationchange: () => setDur(v.duration),
      loadedmetadata: () => setDur(v.duration),
      progress: () => v.buffered.length && setBuffered(v.buffered.end(v.buffered.length - 1)),
      volumechange: () => setMuted(v.muted),
      ratechange: () => setSpeed(v.playbackRate),
    } as const;
    (Object.keys(on) as (keyof typeof on)[]).forEach((k) => v.addEventListener(k, on[k]));
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    // Pause when scrolled out of view to save CPU, battery and memory bandwidth.
    const io = new IntersectionObserver(([e]) => !e.isIntersecting && !v.paused && v.pause(), { threshold: 0.15 });
    io.observe(v);
    return () => {
      (Object.keys(on) as (keyof typeof on)[]).forEach((k) => v.removeEventListener(k, on[k]));
      document.removeEventListener("fullscreenchange", onFs);
      io.disconnect();
      clearTimeout(idleTimer.current);
    };
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const v = video.current;
    if (!v) return;
    const k = e.key.toLowerCase();
    const map: Record<string, () => void> = {
      " ": toggle,
      k: toggle,
      j: () => seek(v.currentTime - 10),
      l: () => seek(v.currentTime + 10),
      arrowleft: () => seek(v.currentTime - 5),
      arrowright: () => seek(v.currentTime + 5),
      m: () => (v.muted = !v.muted),
      f: toggleFs,
      c: toggleCc,
      p: () => void togglePip(),
    };
    if (map[k]) {
      e.preventDefault();
      map[k]();
      wake();
    }
  };

  const pct = dur ? time / dur : 0;
  const scrubFrom = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };
  const showChrome = !playing || !idle || hover !== null;

  return (
    <div
      ref={wrap}
      tabIndex={0}
      role="region"
      aria-label={`${title} video player`}
      data-keys-local
      onKeyDown={onKey}
      onPointerMove={wake}
      className={cn(
        "group/vp relative isolate overflow-hidden rounded-lg border border-border-strong bg-black outline-none focus-visible:ring-2 focus-visible:ring-ring",
        fullscreen && "rounded-none",
        playing && idle && "cursor-none",
        className,
      )}
      style={{ aspectRatio: `${src.width} / ${src.height}` }}
    >
      <video
        ref={video}
        className="absolute inset-0 size-full object-contain"
        poster={src.poster}
        preload="none"
        playsInline
        muted
        loop
        onClick={toggle}
      >
        {src.webm ? <source src={src.webm} type="video/webm" /> : null}
        <source src={src.mp4} type="video/mp4" />
        {captions ? <track kind="captions" src={captions} srcLang="en" label="English" /> : null}
      </video>

      {/* AI HUD overlays */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_2px,rgb(0_0_0/0.12)_2px_3px)] opacity-40 mix-blend-multiply" />
      <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgb(0_0_0/0.6)]" />
      <div
        className={cn(
          "pointer-events-none absolute top-3 right-3 left-3 flex items-center justify-between font-mono text-[0.62rem] tracking-[0.18em] text-white/70 uppercase transition-opacity duration-300",
          showChrome ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="flex items-center gap-2">
          <span className={cn("size-1.5 rounded-full", playing ? "animate-pulse bg-brand-500" : "bg-white/40")} />
          {playing ? "stream · live" : "stream · ready"}
        </span>
        <span className="truncate pl-4">{title}</span>
      </div>

      {!started ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Play ${title}`}
          className="absolute inset-0 m-auto flex size-20 cursor-lock items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-transform hover:scale-105"
        >
          <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full border border-brand-500/60" />
          <Play className="ml-1 size-8 fill-current" />
        </button>
      ) : null}

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pt-10 pb-3 transition-opacity duration-300 sm:px-4",
          showChrome ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          role="slider"
          tabIndex={-1}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${fmt(time)} of ${fmt(dur)}`}
          className="relative flex h-8 cursor-lock items-end gap-[2px]"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seek(scrubFrom(e) * dur);
          }}
          onPointerMove={(e) => {
            setHover(scrubFrom(e));
            if (e.buttons === 1) seek(scrubFrom(e) * dur);
          }}
          onPointerLeave={() => setHover(null)}
        >
          {wave.map((h, i) => {
            const at = (i + 0.5) / BARS;
            const state = at <= pct ? "played" : dur && at <= buffered / dur ? "buffered" : "rest";
            return (
              <span
                key={i}
                className={cn(
                  "flex-1 rounded-[1px] transition-[background-color,height] duration-150",
                  state === "played" ? "bg-brand-500" : state === "buffered" ? "bg-white/35" : "bg-white/15",
                  hover !== null && Math.abs(at - hover) < 0.6 / BARS && "bg-white",
                )}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
          {hover !== null && dur ? (
            <span
              className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-black/80 px-1.5 py-0.5 font-mono text-[0.65rem] text-white"
              style={{ left: `${hover * 100}%` }}
            >
              {fmt(hover * dur)}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-1 text-white">
          <CtlButton label={playing ? "Pause (k)" : "Play (k)"} onClick={toggle}>
            {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </CtlButton>
          <CtlButton
            label={muted ? "Unmute (m)" : "Mute (m)"}
            onClick={() => {
              if (video.current) video.current.muted = !video.current.muted;
            }}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </CtlButton>
          <span className="ml-1 font-mono text-[0.7rem] text-white/80 tabular-nums">
            {fmt(time)} <span className="text-white/40">/ {fmt(dur)}</span>
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => {
              const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
              if (video.current) video.current.playbackRate = next;
            }}
            className="h-8 cursor-lock rounded-md px-2 font-mono text-[0.7rem] text-white/80 hover:bg-white/10 hover:text-white"
            aria-label={`Playback speed ${speed}x`}
          >
            {speed}×
          </button>
          {captions ? (
            <CtlButton label="Captions (c)" onClick={toggleCc} active={ccOn}>
              <Captions className="size-4" />
            </CtlButton>
          ) : null}
          <CtlButton label="Picture in picture (p)" onClick={() => void togglePip()} className="hidden sm:flex">
            <PictureInPicture2 className="size-4" />
          </CtlButton>
          <CtlButton label={fullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"} onClick={toggleFs}>
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </CtlButton>
        </div>
      </div>
    </div>
  );
}

function CtlButton({
  label,
  onClick,
  children,
  active,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 cursor-lock items-center justify-center rounded-md text-white/85 transition-colors hover:bg-white/10 hover:text-white",
        active && "text-brand-400",
        className,
      )}
    >
      {children}
    </button>
  );
}
