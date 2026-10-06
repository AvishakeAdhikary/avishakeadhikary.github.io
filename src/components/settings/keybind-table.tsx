import { Fragment } from "react";
import { KEYBINDS, type KeyGroup } from "@/lib/keybinds";
import { cn } from "@/lib/utils";

const GROUPS: { id: KeyGroup; note?: string }[] = [
  { id: "General" },
  { id: "Audio" },
  { id: "Display" },
  { id: "Go to", note: "press G, then the letter" },
  { id: "In context", note: "work where they make sense" },
];

/** The keybind list, grouped. Used by Settings → Controls and the `?` overlay. */
export function KeybindTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("grid gap-x-8 gap-y-6", !compact && "md:grid-cols-2")}>
      {GROUPS.map((g) => (
        <section key={g.id} aria-label={`${g.id} keybinds`}>
          <p className="hud mb-2">
            {g.id}
            {g.note ? <span className="normal-case text-subtle-foreground">{` // ${g.note}`}</span> : null}
          </p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {KEYBINDS.filter((k) => k.group === g.id).map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 basis-40 text-muted-foreground">{k.label}</span>
                <span className={cn("flex min-w-0 flex-wrap justify-end", k.keys.length > 4 ? "gap-0.5" : "gap-1")}>
                  {k.keys.map((key, i) => (
                    <Fragment key={i}>
                      {g.id === "Go to" && i === 1 ? <span className="self-center font-hud text-[0.6rem] text-subtle-foreground">then</span> : null}
                      <kbd className="min-w-6 rounded border border-border-strong bg-white/[0.04] px-1.5 py-0.5 text-center font-hud text-[0.68rem] text-signal-pale shadow-[inset_0_-2px_0_rgb(0_0_0/0.35)]">
                        {key}
                      </kbd>
                    </Fragment>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-subtle-foreground md:col-span-2">
        Shortcuts pause while you type (the terminal, the contact form, search boxes), while a control has keyboard focus, and while a menu, viewer or the
        crash screen is open.
      </p>
    </div>
  );
}
