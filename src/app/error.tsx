"use client";

import { CrashPanel } from "@/components/error-boundary";

/** Route-level error boundary: a themed recovery screen instead of a blank page. */
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="flex min-h-[70dvh] items-center px-4 pt-24">
      <CrashPanel title="This page hit an error" detail="Nothing you did. Try again, or reload to fetch the latest version of the site." onRetry={reset} />
    </section>
  );
}
