"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useLowPower } from "@/lib/use-low-power";

const COLORS = [
  "#fee2e2",
  "#fecaca",
  "#fca5a5",
  "#f87171",
  "#ef4444",
  "#dc2626",
  "#b91c1c",
  "#ffffff",
  "#e5e5e5",
];

// Approximate pixel sizes of one cell (Tailwind h-8 = 32, w-16 = 64) AFTER the
// scale(0.675) transform is applied to the wrapper.
const CELL_W = 64 * 0.675;
const CELL_H = 32 * 0.675;

// We over-provision so the skewed grid always overflows the viewport diagonal.
const COVERAGE_MULTIPLIER = 2.4;

const computeGrid = (
  width: number,
  height: number,
): { rows: number; cols: number } => {
  const diag = Math.hypot(width, height) * COVERAGE_MULTIPLIER;
  // Aspect-aware: more cols on wide screens, more rows on tall screens.
  const cols = Math.ceil(diag / CELL_W);
  const rows = Math.ceil(diag / CELL_H);
  // Cap counts to keep DOM cost bounded on low-powered devices.
  return {
    cols: Math.min(cols, width < 640 ? 32 : width < 1024 ? 56 : 90),
    rows: Math.min(rows, width < 640 ? 48 : width < 1024 ? 80 : 130),
  };
};

export const BoxesCore = ({ className, ...rest }: { className?: string }) => {
  const [grid, setGrid] = useState({ rows: 60, cols: 40 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const lowPower = useLowPower();

  useEffect(() => {
    const update = () => {
      const { rows, cols } = computeGrid(
        window.innerWidth,
        window.innerHeight,
      );
      setGrid(
        lowPower
          ? { rows: Math.ceil(rows * 0.55), cols: Math.ceil(cols * 0.55) }
          : { rows, cols },
      );
    };
    update();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onMQ = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    window.addEventListener("resize", onResize, { passive: true });
    mq.addEventListener("change", onMQ);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onMQ);
    };
  }, [lowPower]);

  const rows = useMemo(() => new Array(grid.rows).fill(1), [grid.rows]);
  const cols = useMemo(() => new Array(grid.cols).fill(1), [grid.cols]);

  const getRandomColor = () =>
    COLORS[Math.floor(Math.random() * COLORS.length)];

  return (
    <div
      style={{
        transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,
      }}
      className={cn(
        "pointer-events-none absolute -top-1/4 left-1/4 z-0 flex h-full w-full -translate-x-1/2 -translate-y-1/2 p-4 will-change-transform",
        className,
      )}
      {...rest}
    >
      {rows.map((_, i) => (
        <div
          key={`row-${i}`}
          className="relative h-8 w-16 shrink-0 border-l border-neutral-800"
        >
          {cols.map((_, j) => (
            <motion.div
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : {
                      backgroundColor: getRandomColor(),
                      transition: { duration: 0 },
                    }
              }
              key={`col-${j}`}
              className="pointer-events-auto relative h-8 w-16 border-t border-r border-neutral-800"
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-[14px] -left-[22px] h-6 w-10 stroke-[1px] text-neutral-800"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m6-6H6"
                  />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);
