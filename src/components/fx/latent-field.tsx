"use client";

import { useEffect, useRef } from "react";
import { downgrade, getTier, renderDpr } from "@/lib/quality";
import { motionReduced, useSettings } from "@/lib/settings";
import { subscribe } from "@/lib/ticker";

interface Pt {
  x: number;
  y: number;
  bx: number;
  by: number;
  phase: number;
  heat: number;
}

const DENSITY = { low: 0.00008, mid: 0.00016, high: 0.00034 } as const;
const LINKS = { low: 4, mid: 7, high: 12 } as const;

/**
 * "Latent space" background: a field of points drifting on a slow flow;
 * the cursor acts like an attention query: nearby points heat up and link
 * to it. One 2D canvas, driven by the shared ticker (native refresh rate,
 * delta-time motion), density and DPR scaled by device tier, paused when
 * offscreen. Reduced motion renders a single static frame.
 */
export function LatentField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { field, quality, theme } = useSettings();

  useEffect(() => {
    if (!field) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let tier = getTier();
    const reduced = motionReduced();
    let w = 0;
    let h = 0;
    let dpr = 1;
    let pts: Pt[] = [];
    let visible = true;
    const mouse = { x: -9999, y: -9999, on: false };
    const style = getComputedStyle(document.documentElement);
    const signal = style.getPropertyValue("--signal").trim() || "oklch(0.637 0.237 25.3)";

    const seed = () => {
      const n = Math.max(40, Math.round(w * h * DENSITY[tier]));
      pts = Array.from({ length: n }, () => {
        const x = Math.random() * w;
        const y = Math.random() * h;
        return { x, y, bx: x, by: y, phase: Math.random() * Math.PI * 2, heat: 0 };
      });
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = renderDpr(tier);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      draw(0, 0);
    };

    let t = 0;
    let slowFrames = 0;
    let frames = 0;
    const draw = (dt: number, nowMs: number) => {
      t += dt;
      ctx.clearRect(0, 0, w, h);
      const links: [Pt, number][] = [];
      const radius = Math.min(260, w * 0.22);

      for (const p of pts) {
        // Slow curl-ish drift around the base position.
        const k = 0.35;
        p.x = p.bx + Math.sin(t * k + p.phase + p.by * 0.004) * 14;
        p.y = p.by + Math.cos(t * k * 0.8 + p.phase + p.bx * 0.003) * 10;
        let target = 0;
        if (mouse.on) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < radius) {
            target = 1 - d / radius;
            // Lean toward the query, like attention pulling values.
            p.x += dx * target * 0.18;
            p.y += dy * target * 0.18;
            links.push([p, d]);
          }
        }
        p.heat += (target - p.heat) * Math.min(1, dt * 6);
        const a = 0.16 + p.heat * 0.8;
        const s = 1.2 + p.heat * 2.4;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.heat > 0.05 ? signal : "#d6cccc";
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }

      if (links.length) {
        links.sort((a, b) => a[1] - b[1]);
        ctx.strokeStyle = signal;
        ctx.lineWidth = 1;
        for (const [p] of links.slice(0, LINKS[tier])) {
          ctx.globalAlpha = 0.12 + p.heat * 0.5;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Runtime probe: if this device can't keep up, step quality down once.
      if (nowMs && ++frames > 90 && frames < 400) {
        if (dt > 1 / 40) slowFrames++;
        if (slowFrames > 60 && tier !== "low") {
          downgrade();
          tier = getTier();
          resize();
          slowFrames = -1e9;
        }
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let unsub: (() => void) | null = null;
    const start = () => {
      if (!unsub && !reduced) unsub = subscribe(draw);
    };
    const stop = () => {
      unsub?.();
      unsub = null;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.on = mouse.y > 0 && mouse.y < r.height;
    };
    const onLeave = () => (mouse.on = false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener("change", resize);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      mq.removeEventListener("change", resize);
    };
  }, [field, quality, theme]);

  return field ? <canvas ref={ref} aria-hidden className={className} /> : null;
}
