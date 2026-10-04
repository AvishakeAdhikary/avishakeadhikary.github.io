import { coverSvg } from "@/lib/cover-art";
import { getProject, getProjects } from "@/lib/projects";

export const dynamic = "force-static";
export const dynamicParams = false;

/** One static SVG cover per project: /covers/<slug>.svg */
export function generateStaticParams() {
  return getProjects().map((p) => ({ file: `${p.slug}.svg` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const p = getProject(file.replace(/\.svg$/, ""));
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(coverSvg(p), { headers: { "Content-Type": "image/svg+xml" } });
}
