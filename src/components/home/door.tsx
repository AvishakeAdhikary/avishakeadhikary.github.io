import { ArrowRight } from "lucide-react";
import Link from "@/components/link";
import type { ReactNode } from "react";
import { Stream } from "@/components/fx/stream";
import { cn } from "@/lib/utils";

/**
 * A home-page "door": one idea per screen, plain-language pitch on one
 * side, a live micro-preview on the other, leading into its own page.
 */
export function Door({
  id,
  index,
  total,
  title,
  sub,
  pitch,
  href,
  cta,
  preview,
  flip,
}: {
  id: string;
  index: number;
  total: number;
  title: string;
  sub: string;
  pitch: string;
  href: string;
  cta: string;
  preview: ReactNode;
  flip?: boolean;
}) {
  return (
    <section
      id={id}
      data-observe
      aria-labelledby={`${id}-title`}
      className="snap-start-section relative flex min-h-[100svh] items-center border-t border-border py-24"
    >
      <div className={cn("mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20", flip && "lg:[&>*:first-child]:order-2")}>
        <div>
          <p data-reveal className="hud flex items-center gap-3">
            <span className="text-signal">{String(index).padStart(2, "0")}</span>
            <span className="h-px w-10 bg-border-strong" />
            <span>{String(total).padStart(2, "0")}</span>
            <span className="ml-2 normal-case">{"// "}{sub}</span>
          </p>
          <h2 id={`${id}-title`} className="mt-5 text-6xl leading-none font-extrabold sm:text-8xl">
            <Stream text={title} as="span" unit="char" speed={70} />
            <span className="text-signal glow">.</span>
          </h2>
          <Stream as="p" text={pitch} speed={12} offset={300} className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl" />
          <div data-reveal style={{ ["--i" as string]: 3 }} className="mt-8">
            <Link
              href={href}
              className="group inline-flex h-12 items-center gap-3 rounded-md border border-signal/70 px-6 font-mono text-sm transition-colors hover:bg-signal-solid hover:text-on-signal"
            >
              {cta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
        <div data-reveal style={{ ["--i" as string]: 2 }} className="relative">
          {preview}
        </div>
      </div>
    </section>
  );
}
