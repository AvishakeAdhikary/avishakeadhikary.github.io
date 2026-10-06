"use client";

import { Check, Copy, Send } from "lucide-react";
import { useEffect, useState } from "react";

function useKolkataTime() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock must read the client's time after mount
    setNow(fmt());
    const iv = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(iv);
  }, []);
  return now;
}

/** Composes a mailto (no backend, no tracking) + copy + live Kolkata clock. */
export function ContactPanel({ email }: { email: string }) {
  const time = useKolkataTime();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const hour = time ? Number(time.slice(0, 2)) : 12;
  const awake = hour >= 8 && hour < 24;

  const mailto = `mailto:${email}?subject=${encodeURIComponent(name ? `Hello from ${name}` : "Hello from your portfolio")}&body=${encodeURIComponent(msg)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <form
        className="panel p-6"
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = mailto;
        }}
      >
        <p className="hud">compose · opens your email app, nothing is stored</p>
        <label className="mt-5 block">
          <span className="font-hud text-xs text-muted-foreground">your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border-strong bg-background px-3 py-2.5 outline-none focus:border-signal"
            placeholder="Ada Lovelace"
          />
        </label>
        <label className="mt-4 block">
          <span className="font-hud text-xs text-muted-foreground">message</span>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={6}
            className="mt-1.5 w-full resize-y rounded-md border border-border-strong bg-background px-3 py-2.5 outline-none focus:border-signal"
            placeholder="We're hiring for… / I'd love to collaborate on… / Just saying hi."
          />
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" data-track="contact" className="inline-flex h-12 items-center gap-2 rounded-md bg-signal-solid px-6 font-mono text-sm font-semibold text-on-signal">
            <Send className="size-4" /> Send
          </button>
          <button
            type="button"
            data-track="contact"
            onClick={async () => {
              await navigator.clipboard?.writeText(email).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="inline-flex h-12 items-center gap-2 rounded-md border border-border-strong px-5 font-mono text-sm hover:border-signal"
            aria-live="polite"
          >
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            {copied ? "Copied" : email}
          </button>
        </div>
      </form>

      <aside className="panel h-fit p-6">
        <p className="hud">local time in kolkata</p>
        <p className="mt-2 font-mono text-4xl font-bold tabular-nums" suppressHydrationWarning>
          {time ?? "--:--:--"}
        </p>
        <p className="mt-1 font-hud text-xs text-subtle-foreground">IST · UTC+05:30</p>
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span className={awake ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-warning"} />
          {awake ? "Probably awake right now." : "Probably asleep right now, but email anyway."}
        </p>
      </aside>
    </div>
  );
}
