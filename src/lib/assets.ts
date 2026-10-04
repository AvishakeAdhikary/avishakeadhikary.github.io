import manifest from "@/content/generated/media-manifest.json";
import { mediaUrl } from "./media";

export interface ImageAsset {
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
}

export interface VideoAsset {
  mp4: string;
  webm: string | null;
  poster: string;
  width: number;
  height: number;
}

const images = manifest.images as Record<string, ImageAsset>;
const svgs = manifest.svgs as Record<string, { src: string }>;
const videos = manifest.videos as Record<string, VideoAsset>;

/** Optimized image by original key, e.g. "gallery/PTSGroup.jpg". Remote URLs pass through. */
export function image(key: string | undefined): ImageAsset | undefined {
  if (!key) return undefined;
  if (/^https?:\/\//.test(key)) return { src: key, width: 1280, height: 640 };
  return images[key];
}

export function svg(key: string): string | undefined {
  const s = svgs[key];
  return s ? mediaUrl(s.src) : undefined;
}

export function video(key: string | undefined): VideoAsset | undefined {
  if (!key) return undefined;
  const v = videos[key];
  if (!v) return undefined;
  return {
    ...v,
    mp4: mediaUrl(v.mp4),
    webm: v.webm ? mediaUrl(v.webm) : null,
    poster: mediaUrl(v.poster),
  };
}
