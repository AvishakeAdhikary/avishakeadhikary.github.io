"use client";

import { ArrowUpRight, AtSign, Compass, FolderGit2, Music } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { CommandEntry } from "./command-menu";

const GROUP_ICON = { Navigate: Compass, Projects: FolderGit2, Links: ArrowUpRight, Actions: AtSign } as const;

export function CommandPalette({
  open,
  onOpenChange,
  entries,
  email,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entries: CommandEntry[];
  email: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const groups = (["Navigate", "Projects", "Links", "Actions"] as const).map((g) => ({
    g,
    items: entries.filter((e) => e.group === g),
  }));

  const run = async (e: CommandEntry) => {
    if (e.action === "copy-email") {
      await navigator.clipboard?.writeText(email).catch(() => undefined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      return;
    }
    if (e.action === "toggle-audio") window.dispatchEvent(new Event("ambient:toggle"));
    onOpenChange(false);
    if (!e.href) return;
    if (/^https?:|^mailto:|\.pdf$/.test(e.href)) window.open(e.href, "_blank", "noopener");
    else router.push(e.href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command menu" description="Jump anywhere on the site">
      <CommandInput placeholder="Search projects, sections, links…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No results.</CommandEmpty>
        {groups.map(({ g, items }, i) => {
          const Icon = GROUP_ICON[g];
          return items.length ? (
            <div key={g}>
              {i > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={g}>
                {items.map((e) => (
                  <CommandItem key={`${g}-${e.label}`} value={`${e.label} ${e.keywords ?? ""}`} onSelect={() => void run(e)}>
                    {e.action === "toggle-audio" ? <Music /> : <Icon />}
                    <span className="truncate">{e.action === "copy-email" && copied ? "Copied to clipboard" : e.label}</span>
                    {e.hint ? <CommandShortcut className="font-mono">{e.hint}</CommandShortcut> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ) : null;
        })}
      </CommandList>
    </CommandDialog>
  );
}
