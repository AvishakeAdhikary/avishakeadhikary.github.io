"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motionReduced, readSettings } from "@/lib/settings";

const CrashOverlay = dynamic(() => import("./crash-overlay").then((m) => m.CrashOverlay), { ssr: false });

const SEEN = "crash-seen";
const CONTACT = /^\/contact(-me)?\/?$/;

const seen = () => {
  try {
    return sessionStorage.getItem(SEEN) === "1";
  } catch {
    return false;
  }
};

/**
 * "The site crashes when you click Contact": a once-per-session illusion
 * that ends on the real contact page. Intercepts internal links to
 * /contact (and the terminal's `contact` command). Modified clicks,
 * reduced motion and repeat visits navigate normally.
 */
export function CrashController({ email }: { email: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  const start = useCallback(() => {
    if (motionReduced() || !readSettings().crash || seen()) {
      router.push("/contact/");
      return;
    }
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {
      /* ignore */
    }
    setActive(true);
  }, [router]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a) return;
      const url = new URL((a as HTMLAnchorElement).href, location.href);
      if (url.origin !== location.origin || !CONTACT.test(url.pathname)) return;
      if (CONTACT.test(location.pathname)) return;
      e.preventDefault();
      start();
    };
    const onStart = () => start();
    document.addEventListener("click", onClick, true);
    window.addEventListener("crash:start", onStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("crash:start", onStart);
    };
  }, [start]);

  // Landing directly on /contact still gets the show (once).
  useEffect(() => {
    if (CONTACT.test(pathname) && !seen() && readSettings().crash && !motionReduced() && !new URLSearchParams(location.search).has("recovered")) {
      const t = setTimeout(start, 700);
      return () => clearTimeout(t);
    }
  }, [pathname, start]);

  if (!active) return null;
  return (
    <CrashOverlay
      email={email}
      onRecover={() => {
        setActive(false);
        if (!CONTACT.test(location.pathname)) router.push("/contact/?recovered=1");
      }}
    />
  );
}
