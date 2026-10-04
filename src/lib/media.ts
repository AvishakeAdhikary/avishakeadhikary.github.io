/**
 * Resolves a site-relative media path against the optional media host.
 *
 * Today everything is served from GitHub Pages (`/media/...`). Setting
 * NEXT_PUBLIC_MEDIA_BASE_URL (e.g. an R2/S3/CDN origin that mirrors
 * `public/media`) moves videos, posters, audio and images in one place.
 */
const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");

export const mediaUrl = (path: string): string =>
  /^(https?:)?\/\//.test(path) ? path : `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
