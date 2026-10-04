"use client";

export function OpenTerminalButton({ label = "Open the terminal", className }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("terminal:open"))}
      className={
        className ??
        "mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-signal px-4 font-mono text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
      }
    >
      <span aria-hidden>$_</span> {label}
    </button>
  );
}
