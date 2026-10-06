/**
 * Navigations carry this React transition type. The layout's page crossfade
 * (<ViewTransition> in app/layout.tsx) plays only for it, so other
 * transitions, such as a lazy island's Suspense reveal, never snapshot and
 * animate the whole page.
 */
export const NAV_TYPES = ["nav"];

/** Options for router.push/replace so programmatic navigations crossfade too. */
export const NAV = { transitionTypes: NAV_TYPES };
