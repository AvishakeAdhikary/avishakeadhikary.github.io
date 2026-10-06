"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { sfx } from "@/components/media/audio/play";
import { KEYBINDS } from "@/lib/keybinds";
import type { SearchIndex } from "@/lib/search-index";
import { DEFAULTS, readSettings, updateSettings, type Settings } from "@/lib/settings";
import { subscribe } from "@/lib/ticker";
import { cn } from "@/lib/utils";
import { closest, retrieve } from "./retrieval";

type Kind = "in" | "out" | "ok" | "err" | "dim" | "art";
interface Line {
  id: number;
  kind: Kind;
  text: string;
  stream?: boolean;
}

const PAGES: Record<string, string> = {
  home: "/",
  work: "/work/",
  projects: "/projects/",
  skills: "/skills/",
  research: "/research/",
  about: "/about/",
  gallery: "/gallery/",
  lab: "/lab/",
  settings: "/settings/",
  contact: "/contact/",
};

const COMMANDS = [
  "help",
  "whoami",
  "neofetch",
  "ls",
  "cd",
  "open",
  "cat",
  "ask",
  "projects",
  "skills",
  "exp",
  "papers",
  "contact",
  "resume",
  "music",
  "theme",
  "settings",
  "sudo",
  "keys",
  "history",
  "clear",
  "date",
  "echo",
  "exit",
] as const;

const BANNER = "avishake.run terminal · type `help` to see what I can do, or `ask` me anything about my work.";

const ASK_ENDPOINT = process.env.NEXT_PUBLIC_ASK_ENDPOINT;

let indexPromise: Promise<SearchIndex> | null = null;
const loadIndex = () => (indexPromise ??= fetch("/search-index.json").then((r) => r.json() as Promise<SearchIndex>));

/** Renders [label](url) links inside terminal output. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (!m) return <Fragment key={i}>{p}</Fragment>;
        const external = /^(https?:|mailto:)/.test(m[2]);
        return (
          <a key={i} href={m[2]} target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined} className="link-mono text-signal-pale">
            {m[1]}
          </a>
        );
      })}
    </>
  );
}

/** Streams text token-by-token (delta-time, refresh-rate independent). */
function StreamLine({ text, onDone }: { text: string; onDone?: () => void }) {
  const tokens = text.match(/\S+\s*/g) ?? [text];
  const [n, setN] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    let acc = 0;
    const unsub = subscribe((dt) => {
      acc += dt * 42; // ~42 tokens per second
      const next = Math.min(tokens.length, Math.floor(acc));
      setN(next);
      if (next >= tokens.length && !done.current) {
        done.current = true;
        unsub();
        onDone?.();
      }
    });
    return unsub;
  }, [tokens.length, onDone]);
  return (
    <>
      <Rich text={tokens.slice(0, n).join("")} />
      {n < tokens.length ? <span className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] animate-caret bg-signal" /> : null}
    </>
  );
}

const NEOFETCH_ART = String.raw`
   ▄▀▀▀▀▄
  █  ▄▄  █      avishake@kolkata
  █ █  █ █      ─────────────────
  █ ▀▀▀▀ █▄
   ▀▄▄▄▄▀ ▀▀`;

export function TerminalView({ autoFocus = true, onClose, className }: { autoFocus?: boolean; onClose?: () => void; className?: string }) {
  const router = useRouter();
  // Seeded in state (not an effect) so StrictMode's double effect run in dev can't print it twice.
  const [lines, setLines] = useState<Line[]>(() => [{ id: 0, kind: "dim", text: BANNER }]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const print = useCallback((kind: Kind, text: string, stream = false) => {
    setLines((l) => [...l, { id: ++idRef.current, kind, text, stream }]);
    if (kind === "err") sfx("error");
    else if (kind === "ok") sfx("success");
  }, []);

  useEffect(() => {
    void loadIndex();
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  /** Answers a question: remote endpoint if configured, else offline retrieval over the site. */
  const ask = useCallback(
    async (q: string, idx: SearchIndex | null) => {
      if (!q) return print("err", 'usage: ask "what did you build at PTS?"');
      setBusy(true);
      try {
        if (ASK_ENDPOINT) {
          const r = await fetch(ASK_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) }).catch(() => null);
          if (r?.ok) {
            print("out", await r.text(), true);
            return;
          }
        }
        const ans = idx ? retrieve(q, idx.docs) : null;
        if (!ans) {
          print("out", "I couldn't find that in my notes. Try asking about my work at Minion, PTS, a project name, skills or publications.");
          return;
        }
        print("out", ans.text, true);
        print("dim", `sources: ${ans.sources.map((s) => `[${s.title}](${s.url})`).join(" · ")}`);
      } finally {
        setBusy(false);
      }
    },
    [print],
  );

  const run = useCallback(
    async (raw: string) => {
      const line = raw.trim();
      print("in", line);
      if (!line) return;
      setHistory((h) => [...h.filter((x) => x !== line), line]);
      const [cmdRaw, ...args] = line.split(/\s+/);
      const cmd = cmdRaw.toLowerCase();
      const rest = args.join(" ");
      const idx = await loadIndex().catch(() => null);

      switch (cmd) {
        case "help":
          print(
            "out",
            [
              "navigation   ls · cd <page> · open <project>",
              "about me     whoami · neofetch · exp · skills [area] · papers · cat resume.md",
              "projects     projects [--tag ai|cv|agents|web|mobile|desktop|iot]",
              "talk         ask <anything>  e.g. ask what did you build at PTS?",
              "fun          contact · sudo hire-me · theme phosphor|red · music",
              "settings     settings · settings <crt|boot|crash|hud|dock|field|cursor> on|off · settings motion full|system|reduced",
              "shell        keys · history · clear · date · echo · exit",
            ].join("\n"),
          );
          return;
        case "whoami":
          print("out", "you: a curious visitor (excellent taste).");
          print("out", `me:  ${idx?.profile.name ?? "Avishake Adhikary"}, ${idx?.profile.headline ?? "Machine Learning Engineer"} in ${idx?.profile.location ?? "Kolkata"}.`);
          return;
        case "neofetch": {
          const s = idx?.stats;
          print("art", NEOFETCH_ART);
          print(
            "out",
            [
              `role       ${idx?.profile.headline}`,
              `location   ${idx?.profile.location} (UTC+05:30)`,
              `current    ${idx?.roles[0] ? `${idx.roles[0].title} @ ${idx.roles[0].org}` : ""}`,
              `projects   ${idx?.projects.length ?? "?"} · ${s?.githubStars ?? "?"}★ on GitHub`,
              `research   ${s?.publications ?? "?"} publications · ${s?.citations ?? "?"} citations`,
              `certs      ${s?.certifications ?? "50+"}`,
              `uptime     ${s?.yearsBuilding ?? "6"}+ years shipping software`,
            ].join("\n"),
          );
          return;
        }
        case "ls":
          if (/proj/.test(rest)) print("out", (idx?.projects ?? []).map((p) => p.slug).join("  "));
          else print("out", `${Object.keys(PAGES).join("/  ")}/   resume.md  about.md`);
          return;
        case "cd": {
          const target = rest.replace(/^\/|\/$/g, "").toLowerCase() || "home";
          const page = PAGES[target] ?? PAGES[closest(target, Object.keys(PAGES)) ?? ""];
          if (!page) return print("err", `cd: no such page: ${target}`);
          if (target === "contact") window.dispatchEvent(new Event("crash:start"));
          else router.push(page);
          print("ok", `→ ${page}`);
          onClose?.();
          return;
        }
        case "open": {
          const slugs = (idx?.projects ?? []).map((p) => p.slug);
          const q = rest.toLowerCase().replace(/\s+/g, "-");
          const hit = slugs.find((s) => s === q) ?? slugs.find((s) => s.includes(q)) ?? closest(q, slugs);
          if (!q || !hit) return print("err", `open: no project matching "${rest}". try: ls projects`);
          router.push(`/projects/${hit}/`);
          print("ok", `→ /projects/${hit}/`);
          onClose?.();
          return;
        }
        case "cat":
          if (/resume|cv/.test(rest)) {
            print("out", `${idx?.profile.name} · ${idx?.profile.headline}\n${(idx?.roles ?? []).map((r) => `• ${r.title}, ${r.org} (${r.range})`).join("\n")}`);
            print("out", `full PDF: [${idx?.profile.resume}](${idx?.profile.resume})`);
          } else if (/about/.test(rest)) {
            print("out", idx?.docs.find((d) => d.id === "about")?.text ?? "", true);
          } else print("err", `cat: ${rest || "?"}: no such file. try: cat resume.md`);
          return;
        case "exp":
          print("out", (idx?.roles ?? []).map((r) => `${r.range.padEnd(22)} ${r.title} · ${r.org}`).join("\n"));
          print("dim", "details → [/work](/work/)");
          return;
        case "skills": {
          const cats = idx?.skills ?? [];
          const c = rest ? cats.find((x) => x.id === rest || x.title.toLowerCase().includes(rest.toLowerCase())) : null;
          if (c) print("out", `${c.title}\n  ${c.items.join(" · ")}`);
          else print("out", cats.map((x) => `${x.id.padEnd(10)} ${x.title} (${x.items.length})`).join("\n") + "\n\nskills <area> for details");
          return;
        }
        case "projects": {
          const tag = rest.match(/--tag\s+(\S+)/)?.[1];
          const list = (idx?.projects ?? []).filter((p) => !tag || (p.tags as string[]).includes(tag));
          print("out", list.map((p) => `${p.slug.padEnd(38)} ${p.tagline}`).join("\n") || "no matches");
          print("dim", "open <name> to view one");
          return;
        }
        case "papers":
          print("out", (idx?.papers ?? []).map((p) => `${p.year}  ${p.title}  (${p.venue})`).join("\n"));
          return;
        case "resume":
          window.open(idx?.profile.resume ?? "/data/AvishakeAdhikaryResume.pdf", "_blank", "noopener");
          print("ok", "opening résumé…");
          return;
        case "contact":
          print("err", "warning: this command has… side effects.");
          setTimeout(() => window.dispatchEvent(new Event("crash:start")), 600);
          return;
        case "sudo":
          if (/hire/.test(rest)) {
            print("dim", "[sudo] password for recruiter: ••••••••");
            print("ok", "✓ access granted. drafting an email to Avishake…");
            setTimeout(() => (window.location.href = `mailto:${idx?.profile.email}?subject=Let's%20talk`), 900);
          } else print("err", "nice try. this user is not in the sudoers file. this incident will be reported (to nobody).");
          return;
        case "rm":
          print("err", "rm: refusing. this portfolio is a static export; nothing here can be deleted (I checked).");
          return;
        case "theme": {
          const t = rest === "phosphor" || rest === "green" || rest === "crt" ? "phosphor" : "red";
          updateSettings({ theme: t });
          print("ok", `theme → ${t}`);
          return;
        }
        case "settings": {
          const [key, val] = args;
          const toggles: (keyof Settings)[] = ["crt", "boot", "crash", "hud", "dock", "field", "cursor", "pauseHidden"];
          if (!key) {
            router.push("/settings/");
            print("ok", "→ /settings/");
            onClose?.();
            return;
          }
          if (key === "reset") {
            updateSettings({ ...DEFAULTS });
            return print("ok", "settings reset to defaults");
          }
          if (key.toLowerCase() === "motion") {
            if (!/^(full|system|reduced)$/.test(val ?? "")) return print("err", "usage: settings motion full|system|reduced");
            updateSettings({ motion: val as Settings["motion"] });
            return print("ok", `motion → ${val}`);
          }
          const k = toggles.find((t) => t.toLowerCase() === key.toLowerCase());
          if (!k || !/^(on|off)$/.test(val ?? "")) return print("err", `usage: settings <${toggles.join("|")}> on|off, settings motion full|system|reduced, or settings reset`);
          updateSettings({ [k]: val === "on" } as Partial<Settings>);
          print("ok", `${k} → ${val}${readSettings()[k] === (val === "on") ? "" : " (not saved)"}`);
          return;
        }
        case "music":
          window.dispatchEvent(new Event("ambient:toggle"));
          print("ok", "toggled the music (pick lo-fi, synthwave, ambient or the CC0 playlist in /settings)");
          return;
        case "keys":
          print(
            "out",
            KEYBINDS.filter((k) => k.group !== "In context")
              .map((k) => `${k.keys.join(k.group === "Go to" ? " then " : "+").padEnd(13)}${k.group === "Go to" ? `go to ${k.label}` : k.label}`)
              .join("\n") + "\n\nfull list: press ? (outside the terminal) or [settings → controls](/settings/#controls)",
          );
          return;
        case "history":
          print("out", history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join("\n") || "(empty)");
          return;
        case "clear":
          setLines([]);
          return;
        case "date":
          print("out", `${new Date().toString()}\nKolkata: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
          return;
        case "echo":
          print("out", rest);
          return;
        case "exit":
          onClose?.();
          return;
        case "ask":
        case "?":
          return ask(rest.replace(/^["']|["']$/g, ""), idx);
        default: {
          // Free-form question? Treat it as `ask`.
          if (/\?$/.test(line) || line.split(" ").length > 3) return ask(line, idx);
          const guess = closest(cmd, [...COMMANDS]);
          print("err", `command not found: ${cmd}${guess ? `. did you mean \`${guess}\`?` : ". type `help`."}`);
        }
      }
    },
    [ask, history, onClose, print, router],
  );

  const complete = () => {
    const [c, ...r] = input.split(" ");
    if (!r.length) {
      const m = COMMANDS.filter((x) => x.startsWith(c));
      if (m.length === 1) setInput(`${m[0]} `);
      else if (m.length > 1) print("dim", m.join("  "));
      return;
    }
    const pool = c === "cd" ? Object.keys(PAGES) : c === "open" ? [] : [];
    if (c === "open")
      void loadIndex().then((idx) => {
        const m = idx.projects.map((p) => p.slug).filter((s) => s.startsWith(r.join(" ")));
        if (m.length === 1) setInput(`open ${m[0]}`);
        else if (m.length) print("dim", m.join("  "));
      });
    const m = pool.filter((x) => x.startsWith(r.join(" ")));
    if (m.length === 1) setInput(`${c} ${m[0]}`);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = input;
      setInput("");
      setCursor(-1);
      void run(v);
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = cursor < 0 ? history.length - 1 : Math.max(0, cursor - 1);
      if (history[next] !== undefined) {
        setCursor(next);
        setInput(history[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = cursor + 1;
      if (next >= history.length) {
        setCursor(-1);
        setInput("");
      } else {
        setCursor(next);
        setInput(history[next]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === "Escape") onClose?.();
  };

  return (
    <div className={cn("flex h-full flex-col font-hud text-[0.82rem] leading-relaxed", className)} onClick={() => inputRef.current?.focus()}>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-1" aria-live="polite" role="log">
        {lines.map((l) => (
          <div
            key={l.id}
            className={cn(
              "whitespace-pre-wrap break-words",
              l.kind === "in" && "mt-2 text-foreground",
              l.kind === "out" && "text-muted-foreground",
              l.kind === "ok" && "text-success",
              l.kind === "err" && "text-signal-soft",
              l.kind === "dim" && "text-subtle-foreground",
              l.kind === "art" && "leading-tight text-signal glow",
            )}
          >
            {l.kind === "in" ? <span className="text-signal">guest@avishake:~$ </span> : null}
            {l.stream ? <StreamLine text={l.text} /> : <Rich text={l.text} />}
          </div>
        ))}
        {busy ? <div className="text-subtle-foreground">thinking…</div> : null}
      </div>
      <label className="flex items-center gap-2 border-t border-border px-4 py-2.5">
        <span className="shrink-0 text-signal">guest@avishake:~$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            if (e.target.value.length > input.length) sfx("key");
            setInput(e.target.value);
          }}
          onKeyDown={onKey}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Terminal input. Type help for commands."
          placeholder="type help, or ask a question…"
          className="min-w-0 flex-1 bg-transparent text-foreground caret-signal outline-none placeholder:text-subtle-foreground"
        />
      </label>
    </div>
  );
}
