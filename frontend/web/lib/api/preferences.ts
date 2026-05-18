/**
 * Phase 14 (INTG-PREF-01..03, issue #133) — Real preferences Lambda calls.
 *
 * Mirrors the `recommend.real.ts` shape: thin typed wrappers over the
 * Phase 12 `apiGet` / `apiPost` seam. Returns `Result<T, ApiError>` so
 * callers branch on `res.ok` and feed `res.error` to `useApiErrorUx`.
 *
 * Wire format (source of truth: functions/preferences/preferences.py):
 *   GET  /api/v1/preferences → { genres, subscriptions, "age-rating", humor }
 *   POST /api/v1/preferences (Partial<Preferences>) → empty 200 on success
 *
 * The kebab-case "age-rating" is intentional — the Lambda's _db_to_api()
 * function (preferences.py:11-17) maps DynamoDB camelCase to the kebab-case
 * wire format. We mirror the wire faithfully; no client-side renaming.
 *
 * POST is the only write verb on this endpoint (no PUT route exists — see
 * __main__.py:340-341 and 14-CONTEXT.md §"Network method"). The TS function
 * is named savePreferences (semantic) so future readers don't conflate it
 * with HTTP PUT.
 *
 * POST accepts any subset of the 4 fields and merges (Phase 14 update
 * strategy is per-toggle optimistic — see 14-CONTEXT.md §"Resolved decisions"),
 * so `savePreferences` takes a Partial.
 */

import { apiGet, apiPost, type ApiError, type Result } from "@/lib/api/client";

export type Preferences = {
  genres: readonly string[];
  subscriptions: readonly string[];
  "age-rating": string | null;
  humor: string | null;
};

export async function getPreferences(): Promise<Result<Preferences, ApiError>> {
  return apiGet<Preferences>("/api/v1/preferences");
}

export async function savePreferences(
  patch: Partial<Preferences>,
): Promise<Result<null, ApiError>> {
  return apiPost<null>("/api/v1/preferences", patch);
}
