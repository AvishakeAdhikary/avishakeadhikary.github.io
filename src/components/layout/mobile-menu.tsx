"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS } from "./nav-items";

export function MobileMenu({ resume }: { resume: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="flex size-9 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[80vw] max-w-xs border-border bg-background p-6">
        <SheetTitle className="hud mb-6">Navigate</SheetTitle>
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
          <Link href="/settings/" onClick={() => setOpen(false)} className="mt-4 px-2 font-mono text-sm text-muted-foreground">
            Settings
          </Link>
          <a href={resume} target="_blank" rel="noopener" className="px-2 font-mono text-sm text-brand-400">
            Download résumé ↗
          </a>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
