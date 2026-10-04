import { buildSearchIndex } from "@/lib/search-index";

export const dynamic = "force-static";

/** Emitted at build time as /search-index.json (static export). */
export function GET() {
  return Response.json(buildSearchIndex());
}
