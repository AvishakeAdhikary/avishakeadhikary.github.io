import { FileLock2, FileSearch2, Filter, Fingerprint, ScanText, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";

const STAGES = [
  { icon: FileSearch2, title: "Ingest", body: "Reads hospital archives in place, sniffing only file headers (~20× faster)." },
  { icon: ScanText, title: "Read", body: "A vision-language model reads every page: cloud API or fully self-hosted." },
  { icon: Filter, title: "Sort", body: "Keeps clinical pages, sets the rest aside." },
  { icon: Fingerprint, title: "Redact", body: "Removes names and IDs from text and from the scanned images." },
  { icon: ShieldCheck, title: "Verify", body: "A leak scan double-checks nothing personal survived." },
  { icon: FileLock2, title: "Package", body: "Encrypts each batch (AES-256) with a tamper-evident manifest." },
];

/**
 * "Now training" banner for /projects: the clinical de-identification
 * pipeline with packets flowing through its stages (CSS transforms in container units; runs
 * on the compositor, pauses offscreen).
 */
export function Pipeline() {
  return (
    <div data-observe className="panel relative overflow-hidden p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="hud flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-success" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            now training · minion technologies
          </p>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Turning hospital archives into safe training data</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Part of ZoyeMed. Patient records go in, and anonymised, encrypted data comes out to train MedGemma, without anything personal leaving the building.
          </p>
        </div>
        <p className="font-mono text-sm text-signal-pale">0 identifiers leaked in validation</p>
      </div>

      <div className="relative mt-8">
        <div aria-hidden className="absolute top-[46px] right-0 left-0 hidden h-px bg-border-strong lg:block" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-[92px] overflow-hidden [container-type:inline-size] lg:block">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="pause-offscreen absolute top-[42px] left-0 block h-2 w-5 rounded-sm bg-signal shadow-[0_0_12px_var(--signal-glow)]"
              style={{ animation: "travel-x 7s linear infinite", animationDelay: String(-i * 1.4) + "s" } as CSSProperties}
            />
          ))}
        </div>
        <ol className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {STAGES.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="rounded-md border border-border bg-background/70 p-4 backdrop-blur-sm">
              <span className="flex size-[60px] items-center justify-center rounded-md border border-border-strong bg-background text-signal lg:mx-0">
                <Icon className="size-6" />
              </span>
              <p className="mt-3 font-mono text-sm font-bold">
                <span className="text-subtle-foreground">0{i + 1} </span>
                {title}
              </p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
