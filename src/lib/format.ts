import type { Month } from "@/content/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(m: Month | string): string {
  const [y, mo] = m.split("-").map(Number);
  return `${MONTHS[(mo || 1) - 1]} ${y}`;
}

export function formatRange(start: Month | string, end?: Month | string | null): string {
  if (end === null || end === undefined) return `${formatMonth(start)} – Present`;
  if (end === start) return formatMonth(start);
  return `${formatMonth(start)} – ${formatMonth(end)}`;
}

/** "1 yr 4 mos" style duration, inclusive of both months. */
export function duration(start: Month | string, end?: Month | string | null, now = new Date()): string {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end ? end.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const total = (ey - sy) * 12 + (em - sm) + 1;
  const y = Math.floor(total / 12);
  const m = total % 12;
  return [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo${m > 1 ? "s" : ""}`].filter(Boolean).join(" ") || "1 mo";
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
