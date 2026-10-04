import type { Metadata } from "next";
import { InlineTerminal } from "@/components/lab/inline-terminal";
import { Sampler } from "@/components/lab/sampler";
import { PageHeader } from "@/components/page-header";
import { roles } from "@/content/experience";
import { profile } from "@/content/profile";

export const metadata: Metadata = {
  title: "Lab",
  description: "A playground: a terminal that knows Avishake's CV, a toy language model, and some easter eggs.",
  alternates: { canonical: "/lab/" },
};

const EGGS = [
  { k: "~", v: "opens the terminal on any page" },
  { k: "ask …", v: "the terminal answers from my real CV, citing the page it used" },
  { k: "↑ ↑ ↓ ↓ ← → ← → B A", v: "jailbreak mode (try it)" },
  { k: "sudo hire-me", v: "does exactly what you think" },
  { k: "contact", v: "…you'll see" },
  { k: "switch tabs", v: "then look at the tab title" },
  { k: "open the console", v: "there's a note for developers" },
  { k: "settings crt off", v: "the terminal can change any setting; see /settings for all of them" },
];

export default function LabPage() {
  const corpus = [profile.tagline, profile.summary, ...roles.map((r) => r.summary), ...roles.flatMap((r) => r.highlights)].join(" ");
  return (
    <>
      <PageHeader
        title="Lab"
        sub="playground"
        intro="The fun corner. A real terminal that knows my CV, a tiny language model to play with, and a list of easter eggs. None of it is required. All of it is real."
      />
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6">
        <section aria-labelledby="term" className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div>
            <h2 id="term" className="mb-4 font-mono text-2xl font-bold">
              Terminal<span className="text-signal">.</span>
            </h2>
            <InlineTerminal />
          </div>
          <aside>
            <h2 className="mb-4 font-mono text-2xl font-bold">
              Easter eggs<span className="text-signal">.</span>
            </h2>
            <ul className="space-y-3">
              {EGGS.map((e) => (
                <li key={e.k} className="panel p-3">
                  <kbd className="font-hud text-sm text-signal-pale">{e.k}</kbd>
                  <p className="mt-1 text-sm text-muted-foreground">{e.v}</p>
                </li>
              ))}
            </ul>
          </aside>
        </section>
        <section aria-labelledby="toy">
          <h2 id="toy" className="mb-2 font-mono text-2xl font-bold">
            Sampling, explained with a toy<span className="text-signal">.</span>
          </h2>
          <p className="mb-6 max-w-2xl text-muted-foreground">
            Large language models pick each next word from a probability distribution. Temperature reshapes it; top-p trims the unlikely tail. This toy
            does the same with a two-word memory, trained only on my own bio.
          </p>
          <Sampler corpus={corpus} />
        </section>
      </div>
    </>
  );
}
