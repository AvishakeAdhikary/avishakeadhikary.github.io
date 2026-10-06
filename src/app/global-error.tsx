"use client";

/** Last-resort boundary (the root layout itself failed): self-contained, no site CSS required. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0d0a0a", color: "#eee", fontFamily: "ui-monospace, monospace" }}>
        <main role="alert" style={{ textAlign: "center", padding: 24 }}>
          <p style={{ color: "#f87171", letterSpacing: "0.18em", fontSize: 12 }}>KERNEL PANIC (A REAL ONE)</p>
          <h1 style={{ fontSize: 22 }}>The site failed to start.</h1>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "10px 16px", background: "#ef4444", color: "#fff", border: 0, borderRadius: 6, fontFamily: "inherit" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
