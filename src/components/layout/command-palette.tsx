"use client";

import { ArrowUpRight, AtSign, Compass, FolderGit2, Music } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Modal } from "@/components/ui/modal";
import { NAV } from "@/lib/nav";
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
    else router.push(e.href, NAV);
  };

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} label="Command menu" closeButton={false} className="overflow-hidden [--modal-w:40rem]">
      <Command className="bg-transparent **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
      <CommandInput autoFocus placeholder="Search projects, sections, links…" aria-label="Search the site" />
      {/* Groups are divided by a border, not <CommandSeparator>: a listbox may only own groups and options. */}
      <CommandList className="max-h-[60vh] [&_[cmdk-group]:not([hidden])~[cmdk-group]:not([hidden])]:border-t [&_[cmdk-group]:not([hidden])~[cmdk-group]:not([hidden])]:border-border">
        <CommandEmpty>No results.</CommandEmpty>
        {groups.map(({ g, items }) => {
          const Icon = GROUP_ICON[g];
          return items.length ? (
            <CommandGroup key={g} heading={g}>
              {items.map((e) => (
                <CommandItem key={`${g}-${e.label}`} value={`${e.label} ${e.keywords ?? ""}`} onSelect={() => void run(e)}>
                  {e.action === "toggle-audio" ? <Music /> : <Icon />}
                  <span className="truncate">{e.action === "copy-email" && copied ? "Copied to clipboard" : e.label}</span>
                  {e.hint ? <CommandShortcut className="font-mono">{e.hint}</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null;
        })}
      </CommandList>
      </Command>
    </Modal>
  );
}
