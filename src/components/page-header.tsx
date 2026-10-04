import type { ReactNode } from "react";
import { Stream } from "@/components/fx/stream";

/** Page intro: plain title first, the playful "mode" name as a small subtitle. */
export function PageHeader({ title, sub, intro, children }: { title: string; sub: string; intro?: string; children?: ReactNode }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-border pt-32 pb-14 md:pt-40 md:pb-20">
      <div aria-hidden className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_80%_70%_at_30%_0%,#000_30%,transparent_100%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="hud">
          <span className="text-signal">~/</span>
          {title.toLowerCase()} <span className="normal-case">{"// "}{sub}</span>
        </p>
        <h1 className="mt-5 text-6xl leading-none font-extrabold sm:text-8xl">
          <Stream as="span" text={title} unit="char" speed={65} />
          <span className="text-signal glow">.</span>
        </h1>
        {intro ? <Stream as="p" text={intro} speed={12} offset={350} className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl" /> : null}
        {children}
      </div>
    </header>
  );
}
