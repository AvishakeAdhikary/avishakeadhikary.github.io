import { DiffusionImage } from "@/components/fx/diffusion-image";
import { image } from "@/lib/assets";
import { mediaUrl } from "@/lib/media";
import type { ResolvedProject } from "@/lib/projects";
import { cn } from "@/lib/utils";

/**
 * Project artwork: the optimized screenshot when one exists, otherwise the
 * build-time "attention map" cover (/covers/<slug>.svg). Both denoise in.
 */
export function ProjectCover({
  project,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority,
}: {
  project: ResolvedProject;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const img = (project.image ? image(project.image) : undefined) ?? {
    src: mediaUrl(`/covers/${project.slug}.svg`),
    width: 1280,
    height: 720,
  };
  return (
    <DiffusionImage
      img={img}
      alt={`${project.title} cover`}
      sizes={sizes}
      priority={priority}
      className={cn("relative", className)}
      imgClassName="object-top transition-transform duration-700 group-hover:scale-[1.03]"
    />
  );
}
