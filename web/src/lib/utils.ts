import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format American odds with an explicit sign. */
export function fmtOdds(odds: number | null | undefined): string {
  if (odds === null || odds === undefined) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export function fmtPct(p: number): string {
  return `${(p * 100).toFixed(0)}%`;
}

/** "2026-06-18" -> "Thu Jun 18" (parsed at noon to avoid TZ off-by-one). */
export function fmtGameDate(d: string): string {
  if (!d) return "";
  const date = new Date(`${d}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
