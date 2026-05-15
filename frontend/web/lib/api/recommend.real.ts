/**
 * Phase 13 (INTG-RECO-01) — live recommendation fetch with typed live response.
 *
 * Owns the kebab→camel boundary for the recommendation surface. The live
 * Lambda payload (see `functions/recommend/recommend.py` `handler()`) returns
 * the kebab-case key `streaming-services`; this module is the SOLE place in
 * the frontend that touches that wire form. Downstream consumers — including
 * the recommendation screen wired in plan 13-02 — see only the camelCase
 * `streamingServices` exposed on `RecommendedMovie`.
 *
 * Type strategy (per 13-CONTEXT §"Type strategy in recommend.real.ts" —
 * graceful degradation, Option C):
 *
 *   - `RecommendationResponse` is the literal wire shape returned by the
 *     Lambda today: `title`, `genre`, `streaming-services`. Three required
 *     fields, nothing more. Treat as immutable source of truth — the backend
 *     is read-only this milestone.
 *
 *   - `RecommendedMovie` is the camelCase, screen-friendly shape. Required
 *     fields mirror the wire; all the Phase 7 metadata fields the live
 *     Lambda does NOT return — `year`, `runtime`, `rating`, `match`,
 *     `director`, `cast`, `synopsis`, `mood` — are kept here as optional
 *     for forward-compat with issue #70 (OMDb + Streaming Availability API
 *     enrichment). The adapter never invents values for missing fields;
 *     they come out as `undefined` and the screen renders gracefully.
 *
 *   - `posterSeed` / `backdropSeed` are intentionally absent — they were
 *     Picsum-stand-in-only artifacts of the Phase 7 placeholder surface
 *     and have no meaning against live data. Plan 13-02 picks a different
 *     backdrop strategy at the screen.
 *
 * Per-service `kind` ("included" | "rent" | "buy") from the Phase 7
 * placeholder shape is NOT carried here either — the Lambda does not
 * return availability tier. Plan 13-02 handles the kind absence at the
 * badge render site.
 *
 * Endpoint: GET /api/v1/recommend (defined in __main__.py:321, JWT-authed).
 * A 2xx with empty body resolves to `data: null` per `client.ts:262`; the
 * screen layer (plan 13-02) is responsible for rendering the empty state.
 */

import { apiGet, type ApiError, type Result } from "@/lib/api/client";

// -----------------------------------------------------------------------------
// Wire types — literal shape returned by functions/recommend/recommend.py
// -----------------------------------------------------------------------------

export type RecommendationServiceWire = {
  readonly name: string;
  readonly image: string;
  readonly url: string;
};

export type RecommendationResponse = {
  readonly title: string;
  readonly genre: string;
  readonly "streaming-services": ReadonlyArray<RecommendationServiceWire>;
};

// -----------------------------------------------------------------------------
// Screen-facing types — camelCase, with all Phase 7 metadata fields optional
// -----------------------------------------------------------------------------

export type RecommendedService = {
  readonly name: string;
  readonly image: string;
  readonly url: string;
};

export type RecommendedMovie = {
  readonly title: string;
  readonly genre: string;
  readonly streamingServices: ReadonlyArray<RecommendedService>;
  // Optional fields — not returned by the current Lambda. Kept for
  // forward-compat with issue #70 (OMDb + Streaming Availability enrichment).
  readonly year?: number;
  readonly runtime?: string;
  readonly rating?: string;
  readonly match?: number;
  readonly director?: string;
  readonly cast?: ReadonlyArray<string>;
  readonly synopsis?: string;
  readonly mood?: ReadonlyArray<string>;
};

// -----------------------------------------------------------------------------
// Adapter — sole kebab→camel boundary in the frontend
// -----------------------------------------------------------------------------

function adaptResponse(wire: RecommendationResponse): RecommendedMovie {
  // The bracket-string access below is the ONE place in the frontend that
  // touches the kebab-case wire key. That's why the adapter exists.
  const wireServices = wire["streaming-services"] ?? [];
  const streamingServices: ReadonlyArray<RecommendedService> = wireServices.map((s) => ({
    name: s.name,
    image: s.image,
    url: s.url,
  }));
  return {
    title: wire.title,
    genre: wire.genre,
    streamingServices,
  };
}

// -----------------------------------------------------------------------------
// Public fetch surface
// -----------------------------------------------------------------------------

export async function getRecommendationReal(): Promise<Result<RecommendedMovie | null, ApiError>> {
  const result = await apiGet<RecommendationResponse | null>("/api/v1/recommend");
  if (!result.ok) return result;
  if (result.data === null) return { ok: true, data: null };
  return { ok: true, data: adaptResponse(result.data) };
}
