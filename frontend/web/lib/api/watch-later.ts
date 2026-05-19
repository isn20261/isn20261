/**
 * Phase 16 (INTG-WTCL-01..03, issue #135) — Real watch-later Lambda calls.
 *
 * Wrapper-backed read + add seam. Returns Result<T, ApiError>.
 *
 * Wire format (functions/watch_later/watch_later.py):
 *   GET  /api/v1/watch-later → [{ title, "added-at" }] (newest items first)
 *   POST /api/v1/watch-later { movieId } → 201 created, empty body
 *
 * Backend gap (verified 2026-05-14): no PUT / DELETE wired. Remove deferred
 * to v2.1 — see 16-CONTEXT.md §"Resolved decisions" + docs/inconsistencias.md
 * §3-4. The Phase 10 localStorage-backed remove path is dropped here; the
 * UI hides the remove control until backend gains a remove verb.
 *
 * Phase 13 had inlined a `MOVIES_SEED` local constant here as a stopgap
 * after retiring the shared MOVIES dataset from `lib/api/recommend.ts`.
 * That seed is no longer needed — the live Lambda is the source of truth —
 * and is removed by this commit.
 */

import { apiGet, apiPost, type ApiError, type Result } from "@/lib/api/client";

export type WatchLaterItem = {
  title: string;
  "added-at": string; // ISO 8601 timestamp
};

export async function getWatchLater(): Promise<
  Result<readonly WatchLaterItem[], ApiError>
> {
  return apiGet<readonly WatchLaterItem[]>("/api/v1/watch-later");
}

export async function addWatchLater(
  movieId: string,
): Promise<Result<null, ApiError>> {
  return apiPost<null>("/api/v1/watch-later", { movieId });
}
