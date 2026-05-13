/**
 * Phase 12 (FETCH-05 demonstrator) — Real recommendation Lambda call.
 *
 * Lives alongside the mock at `lib/api/recommend.ts`. Phase 12 ships this
 * function but does NOT swap the recommendation screen — Phase 13 does that
 * atomically, by re-pointing the screen's import from `recommend` to
 * `recommend.real` and deleting the mock dataset.
 *
 * The Movie type is intentionally re-used from `recommend.ts`. If the real
 * Lambda response shape diverges (verified during Phase 13 plan-phase by
 * reading `functions/recommend/`), Phase 13 narrows/widens the type then.
 * Phase 12 keeps the contract loose so the demonstrator compiles today.
 *
 * Endpoint: GET /api/v1/recommend (defined in __main__.py:321, JWT-authed).
 */

import { apiGet, type ApiError, type Result } from "@/lib/api/client";
import type { Movie } from "@/lib/api/recommend";

export async function getRecommendationReal(): Promise<Result<Movie, ApiError>> {
  return apiGet<Movie>("/api/v1/recommend");
}
