"use client";

import Link from "@/components/link";
import { KeybindTable } from "@/components/settings/keybind-table";
import { Modal } from "@/components/ui/modal";

/** The `?` cheat sheet (loaded the first time it opens). */
export function KeybindOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Modal open={open} onClose={() => onOpenChange(false)} labelledBy="keybinds-title" className="p-6 [--modal-w:48rem]">
      <h2 id="keybinds-title" className="font-mono text-xl font-bold">
        Keybinds<span className="text-signal">.</span>
      </h2>
      <p className="mt-1 mb-5 pr-8 text-sm text-muted-foreground">
        Everything is also reachable by clicking. Find this list any time in{" "}
        <Link href="/settings/#controls" className="link-mono" onClick={() => onOpenChange(false)}>
          settings → controls
        </Link>
        .
      </p>
      <KeybindTable />
    </Modal>
  );
}
