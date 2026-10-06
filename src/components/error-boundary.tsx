"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Contains a failure to the island that caused it: the rest of the page
 * keeps working. `fallback` is what to show instead (null for optional
 * extras such as overlays).
 */
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode | ((reset: () => void) => ReactNode); name?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it for developers (and for the e2e console guard); visitors see the fallback.
    console.error(`[${this.props.name ?? "island"}]`, error, info.componentStack);
  }

  reset = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === "function" ? fallback(this.reset) : (fallback ?? null);
  }
}

/** The themed "something broke" panel used by pages and games. */
export function CrashPanel({ title, detail, onRetry }: { title: string; detail?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="panel mx-auto max-w-xl p-6 text-center">
      <p className="font-hud text-xs tracking-[0.18em] text-signal uppercase">inference error</p>
      <h2 className="mt-2 font-mono text-xl font-bold">
        {title}
        <span className="text-signal">.</span>
      </h2>
      {detail ? <p className="mt-2 text-sm text-muted-foreground">{detail}</p> : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <button type="button" onClick={onRetry} className="inline-flex h-10 items-center rounded-md bg-signal-solid px-4 font-mono text-xs font-semibold text-on-signal">
            Try again
          </button>
        ) : null}
        <button type="button" onClick={() => window.location.reload()} className="inline-flex h-10 items-center rounded-md border border-border-strong px-4 font-mono text-xs">
          Reload the page
        </button>
      </div>
    </div>
  );
}
