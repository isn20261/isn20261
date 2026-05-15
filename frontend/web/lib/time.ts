/**
 * Shared time helpers for ISO-timestamp rendering.
 *
 * Introduced by Phase 16 (watch-later) for use alongside Phase 15 (history).
 * Phase 15's history page inlined equivalent helpers ahead of this extraction;
 * once Phase 15 + Phase 16 PRs both merge, a follow-up commit can re-point
 * history/page.tsx to import from here.
 *
 * Callers pass `now` so tests can inject a frozen Date.
 */

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function relativeTime(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const ms = now.getTime() - date.getTime();
  const min = Math.floor(ms / 60_000);
  const hr = Math.floor(ms / 3_600_000);
  const day = 24 * 60 * 60 * 1000;
  if (sameDay(date, now)) {
    if (min < 60) return min <= 0 ? "Just now" : `${min}m ago`;
    return `${hr}h ago`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";
  if (ms < 7 * day) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
