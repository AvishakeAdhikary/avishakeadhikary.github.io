"use client";

import { Menu } from "lucide-react";
import Link from "@/components/link";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { NAV_ITEMS } from "./nav-items";

export function MobileMenu({ resume }: { resume: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="flex size-9 cursor-lock items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground md:hidden"
      >
        <Menu className="size-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} variant="sheet" labelledBy="mobile-nav-title" className="p-6">
        <h2 id="mobile-nav-title" className="hud mb-6">
          Navigate
        </h2>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-baseline gap-3 rounded-lg px-2 py-3 font-mono text-xl text-foreground hover:bg-white/[0.04]"
            >
              <span className="font-hud text-xs text-signal">0{i + 1}</span>
              {item.label}
            </Link>
          ))}
          <Link href="/arcade/" onClick={() => setOpen(false)} className="mt-4 px-2 font-mono text-sm text-muted-foreground">
            Arcade
          </Link>
          <Link href="/settings/" onClick={() => setOpen(false)} className="px-2 font-mono text-sm text-muted-foreground">
            Settings
          </Link>
          <a href={resume} target="_blank" rel="noopener" className="px-2 font-mono text-sm text-brand-400">
            Download résumé ↗
          </a>
        </nav>
      </Modal>
    </>
  );
}
