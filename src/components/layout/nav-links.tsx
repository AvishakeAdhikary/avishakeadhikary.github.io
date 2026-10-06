"use client";

import Link from "@/components/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href.replace(/\/$/, "")) || (item.href === "/contact/" && pathname.startsWith("/contact"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative px-2.5 py-1.5 font-mono text-[0.8rem] transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("mr-0.5 text-signal transition-opacity", active ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>›</span>
            {item.label}
            <span className="pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 font-hud text-[0.58rem] tracking-[0.15em] whitespace-nowrap text-subtle-foreground uppercase opacity-0 transition-opacity group-hover:opacity-100">
              {item.sub}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
