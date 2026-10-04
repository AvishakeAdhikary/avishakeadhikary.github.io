import type { Metadata } from "next";
import { GalleryGrid, type GalleryPhoto } from "@/components/gallery/gallery-grid";
import { PageHeader } from "@/components/page-header";
import { gallery } from "@/content/gallery";
import { image } from "@/lib/assets";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Moments from Avishake Adhikary's journey: Amity University Kolkata, convocation, awards and teams.",
  alternates: { canonical: "/gallery/" },
};

export default function GalleryPage() {
  const photos: GalleryPhoto[] = gallery.flatMap((g) => {
    const img = image(g.image);
    return img ? [{ ...img, alt: g.alt, caption: g.caption }] : [];
  });
  return (
    <>
      <PageHeader title="Gallery" sub="training data" intro="Convocations, an award, teams, and the people who made the journey." />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <GalleryGrid photos={photos} />
      </div>
    </>
  );
}
