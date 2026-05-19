"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Props = {
  children: React.ReactNode;
  /** Minimum time the screen stays visible, in ms, so it doesn't flash. */
  minDurationMs?: number;
};

/**
 * Overlays a full-screen loader until:
 *  - the document hits the `load` event (all images / scripts in the DOM are ready), AND
 *  - web fonts have settled (`document.fonts.ready`), AND
 *  - the optional minimum display time has elapsed.
 *
 * The wrapped children render to the DOM immediately but stay visually hidden
 * underneath, so they get a chance to mount and warm up before being revealed.
 */
export default function LoadingScreen({
  children,
  minDurationMs = 600,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = performance.now();

    const finish = () => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, minDurationMs - elapsed);
      window.setTimeout(() => setReady(true), remaining);
    };

    const docReady = new Promise<void>((resolve) => {
      if (document.readyState === "complete") {
        resolve();
        return;
      }
      const onLoad = () => {
        window.removeEventListener("load", onLoad);
        resolve();
      };
      window.addEventListener("load", onLoad);
    });

    const fontsReady: Promise<unknown> =
      typeof document !== "undefined" && "fonts" in document
        ? document.fonts.ready
        : Promise.resolve();

    // Hard ceiling so we never get stuck (e.g. a hung resource).
    const ceiling = new Promise<void>((resolve) =>
      window.setTimeout(resolve, 6000),
    );

    Promise.race([Promise.all([docReady, fontsReady]), ceiling]).then(finish);
  }, [minDurationMs]);

  return (
    <>
      <div
        aria-hidden={!ready}
        style={{
          visibility: ready ? "visible" : "hidden",
        }}
      >
        {children}
      </div>

      <AnimatePresence>
        {!ready && (
          <motion.div
            key="loading-screen"
            role="status"
            aria-live="polite"
            aria-label="Loading"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black text-white"
          >
            <div className="relative flex h-20 w-20 items-center justify-center">
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-red-600 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <motion.span
                className="absolute inset-2 rounded-full border-2 border-white/30 border-b-transparent"
                animate={{ rotate: -360 }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.65)]" />
            </div>

            <motion.p
              className="mt-6 text-xs uppercase tracking-[0.4em] text-neutral-400"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              Loading
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
