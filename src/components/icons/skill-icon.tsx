import "server-only";
import * as Lucide from "lucide-react";
import * as SimpleIcons from "simple-icons";
import type { SkillIcon as SkillIconSpec } from "@/content/types";
import { svg } from "@/lib/assets";
import { cn } from "@/lib/utils";

type SimpleIcon = { path: string; hex: string; title: string };
const simple = SimpleIcons as unknown as Record<string, SimpleIcon>;
const lucide = Lucide as unknown as Record<string, Lucide.LucideIcon>;

const siKey = (slug: string) => `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;

/**
 * Server-only: resolves a skill icon to inline SVG at build time, so the
 * browser receives markup, not an icon library. Brand color is exposed as
 * --brand for hover tinting.
 */
export function SkillIcon({ icon, className }: { icon?: SkillIconSpec; className?: string }) {
  const cls = cn("size-5 shrink-0", className);
  if (icon && "si" in icon) {
    const s = simple[siKey(icon.si)];
    if (s)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className={cls}
          style={{ ["--brand" as string]: `#${s.hex}` }}
          data-brand
        >
          <path d={s.path} />
        </svg>
      );
  }
  if (icon && "svg" in icon) {
    const src = svg(icon.svg);
    if (src)
      // Multi-color vendor logos: rendered as an image, desaturated until hover.
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt="" aria-hidden className={cn(cls, "object-contain")} loading="lazy" decoding="async" data-logo />;
  }
  const Glyph = (icon && "glyph" in icon && lucide[icon.glyph]) || Lucide.Hexagon;
  return <Glyph aria-hidden className={cls} strokeWidth={1.6} />;
}
