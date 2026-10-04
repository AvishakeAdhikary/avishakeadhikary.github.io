"use client";

import { useEffect, useRef, useState } from "react";
import { getTier, renderDpr } from "@/lib/quality";
import { motionReduced } from "@/lib/settings";
import { subscribe } from "@/lib/ticker";

export interface GlobePoint {
  id: string;
  label: string;
  location: [number, number];
}

const RED: [number, number, number] = [0.94, 0.27, 0.27];

/**
 * cobe (~5 KB WebGL) globe centred on Kolkata. Created only when near the
 * viewport, renders only while visible and the tab is active, DPR capped at
 * 2, drag to spin. Falls back to a static CSS globe without WebGL, on
 * low-power devices or with reduced motion.
 */
export function Globe({ home, points }: { home: GlobePoint; points: GlobePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower =
      !!nav.connection?.saveData ||
      ((nav.hardwareConcurrency ?? 8) <= 2 && (nav.deviceMemory ?? 8) <= 2);
    const reduced = motionReduced();
    const gl = (() => {
      try {
        return !!document.createElement("canvas").getContext("webgl");
      } catch {
        return false;
      }
    })();
    if (!gl || lowPower) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- capability probe can only run on the client
      setFallback(true);
      return;
    }

    // Start facing Kolkata (cobe: phi rotates longitude, theta tilts).
    const homePhi = Math.PI - ((home.location[1] * Math.PI) / 180 - Math.PI / 2);
    let phi = homePhi;
    let globe: { update: (s: Record<string, unknown>) => void; destroy: () => void } | null = null;
    let unsub: (() => void) | null = null;
    let visible = false;
    let dragX: number | null = null;
    let dragDelta = 0;
    let velocity = 0;
    let t = 0;

    // Shared native-refresh ticker; speeds are per-second so 60 Hz and 200 Hz look identical.
    const loop = (dt: number) => {
      if (!globe || !visible) return;
      t += dt;
      if (dragX === null) {
        velocity *= Math.pow(0.02, dt);
        phi += reduced ? 0 : 0.13 * dt + velocity * dt * 60;
      }
      const pulse = 0.07 + Math.sin(t * 2.7) * 0.015;
      globe.update({
        phi: phi + dragDelta,
        markers: [
          { location: home.location, size: pulse, id: home.id },
          ...points.map((p) => ({ location: p.location, size: 0.035, id: p.id })),
        ],
      });
    };
    const kick = () => {
      if (visible && globe && !unsub) unsub = subscribe(loop);
      if (!visible && unsub) {
        unsub();
        unsub = null;
      }
    };

    let disposed = false;
    const init = async () => {
      const { default: createGlobe } = await import("cobe");
      if (disposed) return;
      const size = wrap.clientWidth;
      const tier = getTier();
      const dpr = renderDpr(tier);
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: size * dpr,
        height: size * dpr,
        phi,
        theta: 0.28,
        dark: 1,
        diffuse: 1.15,
        mapSamples: tier === "high" ? 24000 : tier === "mid" ? 14000 : 8000,
        mapBrightness: 5.5,
        mapBaseBrightness: 0.02,
        baseColor: [0.16, 0.12, 0.12],
        markerColor: RED,
        glowColor: [0.42, 0.1, 0.1],
        arcColor: [0.98, 0.45, 0.42],
        arcWidth: 0.6,
        arcHeight: 0.28,
        markerElevation: 0.015,
        markers: [{ location: home.location, size: 0.07, id: home.id }],
        arcs: points.map((p) => ({ from: home.location, to: p.location, id: p.id })),
        opacity: 0.95,
      }) as unknown as typeof globe;
      setReady(true);
      kick();
      if (reduced) globe?.update({ phi });
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !globe) void init();
        kick();
      },
      { rootMargin: "200px" },
    );
    io.observe(wrap);

    const onVis = () => kick();
    document.addEventListener("visibilitychange", onVis);

    const onDown = (e: PointerEvent) => {
      dragX = e.clientX - dragDelta * 220;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (dragX === null) return;
      const next = (e.clientX - dragX) / 220;
      velocity = (next - dragDelta) * 0.12;
      dragDelta = next;
      kick();
    };
    const onUp = () => {
      dragX = null;
      canvas.style.cursor = "grab";
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      disposed = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      unsub?.();
      globe?.destroy();
    };
  }, [home, points]);

  return (
    <div ref={wrapRef} className="relative aspect-square w-full">
      <div
        aria-hidden
        className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_35%_30%,oklch(0.3_0.08_25/0.55),oklch(0.14_0.01_20)_62%)] shadow-[0_0_120px_-20px_var(--brand-glow)]"
      >
        {fallback ? (
          <>
            <div className="bg-dots absolute inset-0 rounded-full opacity-60 [mask-image:radial-gradient(circle,#000_60%,transparent_72%)]" />
            <span className="absolute top-[44%] left-[66%] flex size-3">
              <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-brand-500" />
              <span className="relative inline-flex size-3 rounded-full bg-brand-500" />
            </span>
          </>
        ) : null}
      </div>
      {!fallback ? (
        <canvas
          ref={canvasRef}
          aria-label={`Globe centred on ${home.label}, with arcs to ${points.map((p) => p.label).join(", ")}`}
          role="img"
          className={`relative size-full cursor-grab touch-pan-y transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </div>
  );
}
