"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { closest } from "@/components/terminal/retrieval";

const ROUTES = ["work", "projects", "skills", "research", "about", "lab", "contact", "gallery"];

/** Reads the URL that 404'd and guesses where you meant to go. */
export function Suggestions() {
  const [path, setPath] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the missing URL is only known in the browser
    setPath(location.pathname);
  }, []);
  const seg = path.split("/").filter(Boolean)[0] ?? "";
  const guess = seg ? closest(seg, ROUTES) : null;
  const confidence = (0.07 + ((path.length * 7) % 23) / 100).toFixed(2);
  return (
    <div className="mt-8 space-y-2 font-hud text-sm">
      <p className="text-subtle-foreground">
        requested: <span className="text-foreground">{path || "…"}</span> · model confidence that this page exists:{" "}
        <span className="text-signal-pale">{confidence}</span>
      </p>
      {guess ? (
        <p>
          did you mean{" "}
          <Link href={`/${guess}/`} className="link-mono text-signal-pale">
            /{guess}
          </Link>
          ?
        </p>
      ) : null}
    </div>
  );
}
