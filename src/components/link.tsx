import NextLink from "next/link";
import type { ComponentProps } from "react";
import { NAV_TYPES } from "@/lib/nav";

/** next/link, tagged as a navigation so the page crossfade plays (see lib/nav). */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink transitionTypes={NAV_TYPES} {...props} />;
}
