import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { ScholarIcon } from "@/components/icons/brand";
import { PageHeader } from "@/components/page-header";
import { CertSearch } from "@/components/research/cert-search";
import { CitationGraph } from "@/components/research/citation-graph";
import { certifications } from "@/content/certifications";
import { profile } from "@/content/profile";
import { publications } from "@/content/publications";
import { formatDate, formatMonth } from "@/lib/format";
import { citationsFor, stats } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Research",
  description: "Publications by Avishake Adhikary with Wiley, Springer, CRC Press and Apple Academic Press, plus 50+ certifications.",
  alternates: { canonical: "/research/" },
};

export default function ResearchPage() {
  return (
    <>
      <PageHeader
        title="Research"
        sub="citation graph"
        intro={`${publications.length} peer-reviewed book chapters and conference papers on deep learning, IoT healthcare, blockchain security and quantum cryptography. ${stats.citations} citations so far, synced from Google Scholar.`}
      >
        <div className="mt-8 flex flex-wrap items-center gap-8">
          {[
            { k: "citations", v: stats.citations },
            { k: "h-index", v: stats.hIndex },
            { k: "publications", v: stats.publications },
            { k: "first-author", v: publications.filter((p) => p.selfIndex === 0).length },
          ].map((m) => (
            <div key={m.k}>
              <p className="font-mono text-4xl font-bold">{m.v}</p>
              <p className="hud">{m.k}</p>
            </div>
          ))}
          <a href={profile.socials.scholar} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-4 font-mono text-sm hover:border-signal">
            <ScholarIcon className="size-4" /> Google Scholar <ArrowUpRight className="size-4" />
          </a>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-14 sm:px-6">
        <div data-reveal>
          <CitationGraph />
        </div>

        <section aria-labelledby="papers">
          <h2 id="papers" className="text-3xl font-bold sm:text-4xl">
            Publications<span className="text-signal">.</span>
          </h2>
          <ol className="mt-8 divide-y divide-border border-y border-border">
            {publications.map((p, i) => {
              const cites = citationsFor(p.scholarTitle);
              return (
                <li key={p.title} data-reveal>
                  <a href={p.url} target="_blank" rel="noopener" className="group grid gap-3 py-6 sm:grid-cols-[3rem_1fr_auto]">
                    <span className="font-mono text-lg text-signal">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block font-hud text-[0.7rem] tracking-wider text-subtle-foreground uppercase">
                        {p.kind} · {formatDate(p.date)}
                        {cites ? ` · ${cites} citation${cites > 1 ? "s" : ""}` : ""}
                      </span>
                      <span className="mt-1.5 block text-lg leading-snug font-semibold group-hover:text-signal-pale">{p.title}</span>
                      <span className="mt-1.5 block text-sm text-muted-foreground">
                        {p.authors.map((a, j) => (
                          <span key={a}>
                            {j ? ", " : ""}
                            {j === p.selfIndex ? <strong className="text-foreground">{a}</strong> : a}
                          </span>
                        ))}
                      </span>
                      <span className="mt-1 block text-sm text-subtle-foreground italic">
                        {p.venue} · {p.publisher}
                        {p.pages ? `, pp. ${p.pages}` : ""}
                      </span>
                      <span className="mt-1 block font-hud text-[0.7rem] text-subtle-foreground">{p.doi ? `doi:${p.doi}` : `ISBN ${p.isbn}`}</span>
                    </span>
                    <ArrowUpRight className="hidden size-5 text-subtle-foreground group-hover:text-foreground sm:block" />
                  </a>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="certifications" aria-labelledby="certs" className="scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="certs" className="text-3xl font-bold sm:text-4xl">
                {stats.certifications} certifications<span className="text-signal">.</span>
              </h2>
              <p className="mt-2 text-muted-foreground">The {certifications.length} listed on LinkedIn, searchable. Highlights first.</p>
            </div>
            <div className="w-full max-w-md">
              <CertSearch targetId="cert-list" total={certifications.length} />
            </div>
          </div>
          <ul id="cert-list" className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...certifications]
              .sort((a, b) => Number(!!b.highlight) - Number(!!a.highlight))
              .map((c) => (
                <li
                  key={`${c.name}-${c.issuer}`}
                  data-cert={`${c.name} ${c.issuer} ${c.date} ${(c.tags ?? []).join(" ")}`.toLowerCase()}
                  className={c.highlight ? "rounded-md border border-signal/30 bg-signal/[0.04] px-4 py-3" : "rounded-md border border-border px-4 py-3"}
                >
                  <p className="text-sm leading-snug">{c.name}</p>
                  <p className="mt-1 flex justify-between gap-2 font-hud text-[0.68rem] text-subtle-foreground">
                    <span>{c.issuer}</span>
                    <span>
                      {formatMonth(c.date)}
                      {c.expired ? " · expired" : ""}
                    </span>
                  </p>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </>
  );
}
