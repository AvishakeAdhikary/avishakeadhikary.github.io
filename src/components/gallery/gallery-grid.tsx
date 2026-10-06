"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { DiffusionImage } from "@/components/fx/diffusion-image";
import { sfx } from "@/components/media/audio/play";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export interface GalleryPhoto {
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
  alt: string;
  caption: string;
}

/** Masonry of lazily-loaded responsive images + keyboard-friendly lightbox. */
export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") sfx("tap");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const current = index !== null ? photos[index] : null;

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
        {photos.map((p, i) => (
          <li key={p.src} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block w-full cursor-zoom-in overflow-hidden rounded-md border border-border"
              aria-label={`Open photo: ${p.caption}`}
            >
              <DiffusionImage img={p} alt={p.alt} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" imgClassName="h-auto transition-transform duration-700 group-hover:scale-[1.03]" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-left text-sm text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {p.caption}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent showCloseButton={false} className="max-w-[min(96vw,80rem)] border-none bg-transparent p-0 shadow-none sm:max-w-[min(96vw,80rem)]">
          {current ? (
            <figure className="relative">
              <DialogTitle className="sr-only">{current.caption}</DialogTitle>
              <DialogDescription className="sr-only">{current.alt}</DialogDescription>
              <Image
                src={current.src}
                alt={current.alt}
                width={current.width}
                height={current.height}
                sizes="96vw"
                className="mx-auto max-h-[82vh] w-auto rounded-xl object-contain"
              />
              <figcaption className="mt-3 flex items-center justify-between gap-4 font-mono text-xs text-white/80">
                <span>{current.caption}</span>
                <span>
                  {(index ?? 0) + 1} / {photos.length}
                </span>
              </figcaption>
              <div className="absolute top-3 right-3 flex gap-2">
                {[
                  { label: "Previous photo", onClick: () => step(-1), Icon: ChevronLeft },
                  { label: "Next photo", onClick: () => step(1), Icon: ChevronRight },
                  { label: "Close", onClick: () => setIndex(null), Icon: X },
                ].map(({ label, onClick, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    aria-label={label}
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                  >
                    <Icon className="size-5" />
                  </button>
                ))}
              </div>
            </figure>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
