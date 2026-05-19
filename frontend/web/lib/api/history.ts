/**
 * Phase 15 (INTG-HIST-01..02, issue #134) — Real history Lambda calls.
 *
 * Wrapper-backed read-only seam. Returns Result<T, ApiError> so callers
 * branch on res.ok and feed res.error to useApiErrorUx.
 *
 * Wire format (functions/history/history.py): newest-first array of
 *   { title, "recommended-at" }
 * Kebab-case "recommended-at" is the wire format. The Lambda sorts via
 * ScanIndexForward=False; consumers don't re-sort.
 *
 * Schema gap noted: poster URL, mood, genre, runtime, id are NOT returned
 * by the current Lambda. Phase 15 renders the minimal shape; v2.1 backend
 * enrichment is logged as a follow-up. See 15-CONTEXT.md + docs/inconsistencias.md §2.
 *
 * Phase 13 retired the shared MOVIES dataset from `lib/api/recommend.ts`
 * and inlined a `MOVIES_SEED` local constant here as a stopgap. That seed
 * is no longer needed — the live Lambda is the source of truth — and is
 * removed by this commit.
 */

import { apiGet, type ApiError, type Result } from "@/lib/api/client";

export type HistoryItem = {
  title: string;
  "recommended-at": string; // ISO 8601 timestamp
};

export async function getHistory(): Promise<
  Result<readonly HistoryItem[], ApiError>
> {
  return apiGet<readonly HistoryItem[]>("/api/v1/history");
}
