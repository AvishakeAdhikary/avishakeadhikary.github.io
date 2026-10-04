import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface HotToken {
  /** Exact word in the text to decorate. */
  word: string;
  /** Playful "top-k" alternatives shown on hover (clearly a joke, not a claim). */
  alts: [string, number][];
}

interface StreamProps {
  text: string;
  as?: ElementType;
  className?: string;
  /** ms between tokens */
  speed?: number;
  /** ms before the first token */
  offset?: number;
  hot?: HotToken[];
  /** "word" (LLM-like tokens) or "char" (typed). */
  unit?: "word" | "char";
  children?: ReactNode;
}

/**
 * Text that "generates" token by token, like an LLM response.
 * Every token is server-rendered (SEO / screen readers read the whole
 * string; the visual spans are aria-hidden), and the stagger is pure CSS
 * keyed on --t. <Effects> sets data-play when it scrolls into view.
 */
export function Stream({ text, as: Tag = "p", className, speed = 38, offset = 0, hot = [], unit = "word" }: StreamProps) {
  const tokens = unit === "char" ? [...text] : (text.match(/\S+\s*/g) ?? [text]);
  const hotMap = new Map(hot.map((h) => [h.word, h]));
  return (
    <Tag
      data-stream
      className={className}
      style={{ "--tok-speed": `${speed}ms`, "--tok-offset": `${offset}ms` } as CSSProperties}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {tokens.map((tok, i) => {
          const h = hotMap.get(tok.trim().replace(/[.,!?]$/, ""));
          return (
            <span key={i} className={cn("tok", h && "tok-hot group/tok")} style={{ "--t": i } as CSSProperties}>
              {h ? (
                <>
                  {tok}
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute top-full left-0 z-30 mt-2 hidden min-w-44 rounded-md border border-border-strong bg-popover px-3 py-2 font-hud text-[0.68rem] leading-relaxed tracking-normal normal-case group-hover/tok:block"
                  >
                    <span className="mb-1 block text-subtle-foreground">top-k · next token</span>
                    {h.alts.map(([w, p]) => (
                      <span key={w} className="flex justify-between gap-4">
                        <span className={p > 0.5 ? "text-signal-pale" : "text-muted-foreground"}>{w}</span>
                        <span className="tabular-nums text-subtle-foreground">{p.toFixed(2)}</span>
                      </span>
                    ))}
                  </span>
                </>
              ) : (
                tok
              )}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
