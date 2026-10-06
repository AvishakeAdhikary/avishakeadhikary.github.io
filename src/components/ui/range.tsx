import type { CSSProperties, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * The site's slider: a native range input (keyboard + screen reader support
 * for free), themed in globals.css. `--fill` paints the filled part of the
 * track in WebKit/Blink; Firefox uses ::-moz-range-progress.
 */
export function Range({
  value,
  min = 0,
  max = 100,
  className,
  style,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "min" | "max"> & { value: number; min?: number; max?: number }) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      {...props}
      className={cn("block w-full", className)}
      style={{ ...style, "--fill": `${Math.min(100, Math.max(0, fill))}%` } as CSSProperties}
    />
  );
}
