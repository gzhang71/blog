/** Shared helpers for the click-tracking key scheme. */

/** Keys look like: clicks:<target>:<YYYY-MM-DD> plus a clicks:<target>:total. */
export const dayKey = (target: string, day: string) => `clicks:${target}:${day}`;
export const totalKey = (target: string) => `clicks:${target}:total`;

/** UTC day stamp, so buckets line up regardless of visitor timezone. */
export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The last `days` UTC dates, oldest first, ending today. */
export function recentDays(days: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    out.push(toDay(new Date(now - i * 86_400_000)));
  }
  return out;
}

/** Targets are user-supplied; keep them to a safe, bounded shape. */
export function normalizeTarget(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const target = raw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(target)) return null;
  return target;
}

export type Series = {
  target: string;
  total: number;
  points: { day: string; count: number }[];
};
