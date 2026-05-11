/**
 * Phase 10 (WTCL-01..05, issue #99) — typed mock watch-later seam.
 *
 * localStorage-backed (key: `recommend-a.watch-later`) so the Save button
 * on /recommendation persists across navigations and the /watch-later
 * screen reads the same state.
 *
 * Stores a denormalized list of movie IDs only. `getWatchLater()` joins
 * with MOVIES at read time. Per ARCHITECTURE.md the real backend nests
 * `title` inside the array entry — the seam translates between shapes
 * when v2 (INTG-02) wires the real Lambda.
 *
 * Defensive guards on every read/write — typeof window check (SSR-safe),
 * try/catch around JSON.parse, reject non-array shapes.
 */

import { MOVIES, type Movie } from "@/lib/api/recommend";

export const WATCH_LATER_KEY = "recommend-a.watch-later" as const;

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(WATCH_LATER_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeIds(ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(ids));
}

export function getWatchLater(): readonly Movie[] {
  const ids = readIds();
  const lookup = new Map(MOVIES.map((m) => [m.id, m] as const));
  return ids
    .map((id) => lookup.get(id))
    .filter((m): m is Movie => m !== undefined);
}

export function isInWatchLater(movieId: string): boolean {
  return readIds().includes(movieId);
}

export function addToWatchLater(movieId: string): void {
  const ids = readIds();
  if (ids.includes(movieId)) return; // idempotent
  writeIds([...ids, movieId]);
}

export function removeFromWatchLater(movieId: string): void {
  const ids = readIds();
  if (!ids.includes(movieId)) return;
  writeIds(ids.filter((id) => id !== movieId));
}

export function reorderWatchLater(nextIds: readonly string[]): void {
  // Phase 10 ships without drag-to-reorder UI; seam stays available for v2.
  const valid = new Set(MOVIES.map((m) => m.id));
  writeIds(nextIds.filter((id) => valid.has(id)));
}

export function watchLaterCount(): number {
  return readIds().length;
}
