import Link from "next/link";
import { Suggestions } from "@/components/not-found/suggestions";

export default function NotFound() {
  return (
    <section data-not-found className="relative isolate flex min-h-[80dvh] items-center px-4 pt-24">
      <div aria-hidden className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000,transparent)]" />
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-hud text-sm text-signal">error 404 · route not found</p>
        <h1 className="mt-4 text-5xl leading-none font-extrabold sm:text-7xl">
          Hallucinated route<span className="text-signal glow">.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          I generated a link to a page that doesn&apos;t exist. Even the best models do it. Here&apos;s the way back.
        </p>
        <Suggestions />
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex h-12 items-center rounded-md bg-signal px-6 font-mono text-sm font-semibold text-white">
            Back home
          </Link>
          <Link href="/projects/" className="inline-flex h-12 items-center rounded-md border border-border-strong px-6 font-mono text-sm hover:border-signal">
            See projects
          </Link>
        </div>
      </div>
    </section>
  );
}
