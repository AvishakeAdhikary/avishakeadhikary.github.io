"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Opt {
  id: string;
  label: string;
  count: number;
}

function parse(q: string) {
  const task = q.match(/--task\s+(\S+)/)?.[1];
  const at = q.match(/--built-at\s+(\S+)/)?.[1];
  const text = q
    .replace(/--task\s+\S+/, "")
    .replace(/--built-at\s+\S+/, "")
    .trim()
    .toLowerCase();
  return { task, at, text };
}

/**
 * Filter the zoo like a CLI (`--task cv --built-at minion llm`) or by
 * clicking chips, which just edit the same query. Hides server-rendered
 * cards in place; nothing re-renders.
 */
export function ZooFilter({ targetId, tasks, places, total }: { targetId: string; tasks: Opt[]; places: Opt[]; total: number }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(total);
  const { task, at } = parse(q);

  const update = (next: string) => {
    setQ(next);
    const { task, at, text } = parse(next);
    let n = 0;
    document
      .getElementById(targetId)
      ?.querySelectorAll<HTMLElement>("[data-model]")
      .forEach((card) => {
        const ok =
          (!task || (card.dataset.task ?? "").split(" ").includes(task)) &&
          (!at || card.dataset.at === at) &&
          (!text || text.split(/\s+/).every((w) => (card.dataset.search ?? "").includes(w)));
        (card.parentElement ?? card).hidden = !ok;
        if (ok) n++;
      });
    setShown(n);
  };

  const toggle = (flag: "--task" | "--built-at", id: string) => {
    const current = flag === "--task" ? task : at;
    const re = new RegExp(`${flag}\\s+\\S+\\s*`);
    const base = q.replace(re, "").trim();
    update(current === id ? base : `${flag} ${id} ${base}`.trim());
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 rounded-md border border-border-strong bg-background-elevated px-4 py-3 font-hud text-sm focus-within:border-signal">
        <Search className="size-4 text-signal" />
        <span className="text-signal">$ zoo search</span>
        <input
          value={q}
          onChange={(e) => update(e.target.value)}
          placeholder="llm  --task cv  --built-at minion"
          aria-label="Filter projects. Type words, or flags like --task cv"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-subtle-foreground"
        />
        <span className="shrink-0 text-subtle-foreground" aria-live="polite">
          {shown}/{total}
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="hud mr-1">task</span>
        {tasks.map((t) => (
          <Chip key={t.id} active={task === t.id} onClick={() => toggle("--task", t.id)} label={t.label} count={t.count} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="hud mr-1">built at</span>
        {places.map((t) => (
          <Chip key={t.id} active={at === t.id} onClick={() => toggle("--built-at", t.id)} label={t.label} count={t.count} />
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 font-mono text-xs transition-colors",
        active ? "border-signal bg-signal/15 text-foreground" : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {label}
      <span className="font-hud text-[0.62rem] text-subtle-foreground">{count}</span>
    </button>
  );
}
