/**
 * Every keyboard shortcut on the site, in one list. The global handler
 * (components/runtime/keybinds.tsx), the Settings → Controls tab, the `?`
 * overlay and the terminal's `keys` command all read from here.
 */
export type KeyGroup = "General" | "Audio" | "Display" | "Go to" | "In context";

export interface Keybind {
  id: string;
  keys: string[];
  label: string;
  group: KeyGroup;
}

/** `G` then a letter: jump to a page. */
export const GO_TO: Record<string, { href: string; label: string }> = {
  h: { href: "/", label: "Home" },
  w: { href: "/work/", label: "Work" },
  p: { href: "/projects/", label: "Projects" },
  k: { href: "/skills/", label: "Skills" },
  r: { href: "/research/", label: "Research" },
  a: { href: "/about/", label: "About" },
  g: { href: "/gallery/", label: "Gallery" },
  l: { href: "/lab/", label: "Lab" },
  x: { href: "/arcade/", label: "Arcade" },
  c: { href: "/contact/", label: "Contact" },
  ",": { href: "/settings/", label: "Settings" },
};

export const KEYBINDS: Keybind[] = [
  { id: "terminal", keys: ["~"], label: "Open or close the terminal", group: "General" },
  { id: "palette", keys: ["Ctrl", "K"], label: "Command menu (⌘K on a Mac)", group: "General" },
  { id: "help", keys: ["?"], label: "Show all keybinds", group: "General" },
  { id: "trophies", keys: ["Shift", "A"], label: "Trophy room: achievements and your rank", group: "General" },
  { id: "music", keys: ["M"], label: "Music on / off", group: "Audio" },
  { id: "next", keys: ["N"], label: "Next music style or track", group: "Audio" },
  { id: "vol-down", keys: ["["], label: "Music volume down", group: "Audio" },
  { id: "vol-up", keys: ["]"], label: "Music volume up", group: "Audio" },
  { id: "sfx", keys: ["S"], label: "Sound effects on / off", group: "Audio" },
  { id: "hud", keys: ["R"], label: "Runtime readout show / hide", group: "Display" },
  { id: "theme", keys: ["T"], label: "Theme: signal red / phosphor green", group: "Display" },
  { id: "crt", keys: ["C"], label: "Scanlines on / off", group: "Display" },
  ...Object.entries(GO_TO).map(([k, v]) => ({ id: `go-${v.label.toLowerCase()}`, keys: ["G", k === "," ? "," : k.toUpperCase()], label: v.label, group: "Go to" as const })),
  { id: "esc", keys: ["Esc"], label: "Close the terminal, menus and viewers", group: "In context" },
  { id: "gallery", keys: ["←", "→"], label: "Previous / next photo in the gallery viewer", group: "In context" },
  { id: "history", keys: ["↑", "↓"], label: "Command history in the terminal", group: "In context" },
  { id: "tabs", keys: ["Q", "E"], label: "Previous / next tab in settings", group: "In context" },
  { id: "skip", keys: ["any key"], label: "Skip the boot log, or recover from the crash", group: "In context" },
  { id: "konami", keys: ["↑", "↑", "↓", "↓", "←", "→", "←", "→", "B", "A"], label: "Jailbreak mode (toggles the theme)", group: "In context" },
];

const TEXT_ENTRY = /^(INPUT|TEXTAREA|SELECT)$/;
const CONTROL = "button,a[href],summary,[role=button],[role=switch],[role=radio],[role=tab],[role=slider],[role=menuitem],[role=option]";
const OVERLAY = 'dialog[open],[role=alertdialog],[role=dialog][data-state=open],[aria-modal=true],#dropdown-terminal:not([inert]),[data-keys-local]:focus-within';

/**
 * True when a page-level shortcut must NOT fire: the visitor is typing
 * (inputs, the contact form, the terminal), has keyboard-focused a control
 * (Enter/Space/letters belong to it), an overlay owns the keyboard (the
 * crash screen, dialogs, the terminal, the palette, the gallery viewer),
 * or an unrelated modifier is held. Mouse-clicked buttons don't block:
 * otherwise every shortcut would die after any click.
 */
export function keyBlocked(e: KeyboardEvent, { modifiers = false }: { modifiers?: boolean } = {}): boolean {
  if (e.isComposing || e.defaultPrevented) return true;
  if (!modifiers && (e.ctrlKey || e.metaKey || e.altKey)) return true;
  const t = e.target instanceof HTMLElement ? e.target : null;
  if (t && (t.isContentEditable || TEXT_ENTRY.test(t.tagName))) return true;
  if (t?.closest(CONTROL) && t.matches(":focus-visible") && !/^Arrow/.test(e.key)) return true;
  return !!document.querySelector(OVERLAY);
}
