import Image from "next/image";
import type { ImageAsset } from "@/lib/assets";
import { cn } from "@/lib/utils";

const seedOf = (s: string) =>
  `0x${([...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) & 0xffff).toString(16).padStart(4, "0")}`;

/**
 * An optimized image that "denoises" into view like a diffusion model:
 * 12 discrete steps of noise → clean, with a step counter. CSS only;
 * <Effects> sets data-play when it enters the viewport. Hover re-samples.
 */
export function DiffusionImage({
  img,
  alt,
  sizes,
  className,
  imgClassName,
  priority,
  caption = true,
  seed,
}: {
  img: ImageAsset;
  alt: string;
  sizes: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  caption?: boolean;
  seed?: string;
}) {
  return (
    <figure data-diffuse className={cn("diffuse bg-muted", className)}>
      <Image
        src={img.src}
        alt={alt}
        width={img.width}
        height={img.height}
        sizes={sizes}
        priority={priority}
        className={cn("size-full object-cover", imgClassName)}
      />
      {caption ? (
        <figcaption
          aria-hidden
          className="diffuse-step pointer-events-none absolute right-2 bottom-2 z-10 rounded bg-black/55 px-1.5 py-0.5 font-hud text-[0.6rem] tracking-wider text-white/75 uppercase backdrop-blur-sm"
        >
          {" "}
          · seed {seed ?? seedOf(img.src)}
        </figcaption>
      ) : null}
    </figure>
  );
}
