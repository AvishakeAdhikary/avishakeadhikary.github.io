"use client";
import { useEffect, useState } from "react";

type NavigatorWithConn = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

/**
 * Detects low-powered or constrained user environments so heavy effects
 * (WebGL, particle systems, dense animated DOM grids) can be skipped or
 * downgraded. Always returns false during SSR.
 */
export const useLowPower = (): boolean => {
  const [low, setLow] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      const nav = navigator as NavigatorWithConn;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const lowCores =
        typeof nav.hardwareConcurrency === "number" &&
        nav.hardwareConcurrency > 0 &&
        nav.hardwareConcurrency <= 4;

      const lowMemory =
        typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;

      const saveData = !!nav.connection?.saveData;
      const slowNet =
        nav.connection?.effectiveType === "slow-2g" ||
        nav.connection?.effectiveType === "2g" ||
        nav.connection?.effectiveType === "3g";

      setLow(reduceMotion || saveData || slowNet || (lowCores && lowMemory));
    };

    evaluate();

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", evaluate);
    return () => mq.removeEventListener("change", evaluate);
  }, []);

  return low;
};
