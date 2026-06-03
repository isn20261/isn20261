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

import { apiGet, apiGetNoAuth, type ApiError, type Result } from "@/lib/api/client";

// -----------------------------------------------------------------------------
// Wire types — literal shape returned by functions/recommend/recommend.py
// -----------------------------------------------------------------------------

export type RecommendationServiceWire = {
  readonly name: string;
  readonly image: string;
  readonly url: string;
};

// Lightweight similar-movie card returned in the `similar` array (rail).
export type SimilarMovieWire = {
  readonly movieId: string;
  readonly title: string;
  readonly year?: number | null;
  readonly genre: string;
  readonly poster?: string | null;
  readonly imdbRating?: number | null;
};

export type RecommendationResponse = {
  readonly title: string;
  readonly genre: string;
  readonly "streaming-services": ReadonlyArray<RecommendationServiceWire> | null;
  readonly poster?: string | null;
  // Enriched fields the Lambda returns as of the recommend-rich-fields change.
  // All optional/nullable — the adapter coerces absent values to `undefined`.
  readonly year?: number | null;
  readonly rated?: string | null;
  readonly director?: string | null;
  readonly runtime?: number | null;
  readonly imdbRating?: number | null;
  readonly synopsis?: string | null;
  readonly cast?: ReadonlyArray<string> | null;
  readonly similar?: ReadonlyArray<SimilarMovieWire> | null;
};

// -----------------------------------------------------------------------------
// Screen-facing types — camelCase, with all Phase 7 metadata fields optional
// -----------------------------------------------------------------------------

export type RecommendedService = {
  readonly name: string;
  readonly image: string;
  readonly url: string;
};

// Screen-facing similar-movie card (camelCase, the rail consumes this).
export type SimilarMovie = {
  readonly movieId: string;
  readonly title: string;
  readonly genre: string;
  readonly year?: number;
  readonly poster?: string;
  readonly imdbRating?: number;
};

export type RecommendedMovie = {
  readonly title: string;
  readonly genre: string;
  readonly streamingServices: ReadonlyArray<RecommendedService>;
  readonly poster?: string;
  // Enriched fields. As of the recommend-rich-fields change the live Lambda
  // returns year / rated / director / runtime / imdbRating / synopsis / cast /
  // similar. Still optional so the screen degrades gracefully if any are absent
  // (older Lambda, partial data).
  readonly year?: number;
  readonly runtime?: string;
  readonly rating?: string;
  readonly imdbRating?: number;
  readonly match?: number;
  readonly director?: string;
  readonly cast?: ReadonlyArray<string>;
  readonly synopsis?: string;
  readonly mood?: ReadonlyArray<string>;
  readonly similar?: ReadonlyArray<SimilarMovie>;
};

// -----------------------------------------------------------------------------
// Adapter — sole kebab→camel boundary in the frontend
// -----------------------------------------------------------------------------

// Coerce nullable wire values to `undefined` so optional screen fields stay off
// when the backend omits them (null) rather than rendering empty UI.
function opt<T>(v: T | null | undefined): T | undefined {
  return v ?? undefined;
}

function adaptSimilar(wire: SimilarMovieWire): SimilarMovie {
  return {
    movieId: wire.movieId,
    title: wire.title,
    genre: wire.genre,
    ...(wire.year != null ? { year: wire.year } : {}),
    ...(wire.poster ? { poster: wire.poster } : {}),
    ...(wire.imdbRating != null ? { imdbRating: wire.imdbRating } : {}),
  };
}

function adaptResponse(wire: RecommendationResponse): RecommendedMovie {
  // The bracket-string access below is the ONE place in the frontend that
  // touches the kebab-case wire key. That's why the adapter exists.
  const wireServices = wire["streaming-services"] ?? [];
  const streamingServices: ReadonlyArray<RecommendedService> = wireServices.map((s) => ({
    name: s.name,
    image: s.image,
    url: s.url,
  }));
  // runtime arrives as a number of minutes (e.g. 175); the screen renders a
  // human string. rated (cert, e.g. "A") maps to the screen's `rating` slot.
  const runtime =
    wire.runtime != null ? `${wire.runtime} min` : undefined;
  const cast =
    wire.cast && wire.cast.length > 0 ? [...wire.cast] : undefined;
  const similar =
    wire.similar && wire.similar.length > 0
      ? wire.similar.map(adaptSimilar)
      : undefined;
  return {
    title: wire.title,
    genre: wire.genre,
    streamingServices,
    ...(wire.poster ? { poster: wire.poster } : {}),
    ...(opt(wire.year) !== undefined ? { year: wire.year as number } : {}),
    ...(runtime !== undefined ? { runtime } : {}),
    ...(opt(wire.rated) !== undefined ? { rating: wire.rated as string } : {}),
    ...(opt(wire.imdbRating) !== undefined ? { imdbRating: wire.imdbRating as number } : {}),
    ...(opt(wire.director) !== undefined ? { director: wire.director as string } : {}),
    ...(opt(wire.synopsis) !== undefined ? { synopsis: wire.synopsis as string } : {}),
    ...(cast !== undefined ? { cast } : {}),
    ...(similar !== undefined ? { similar } : {}),
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

export async function getRecommendationAnon(): Promise<Result<RecommendedMovie | null, ApiError>> {
  const result = await apiGetNoAuth<RecommendationResponse | null>("/api/v1/recommend_anon");
  if (!result.ok) return result;
  if (result.data === null) return { ok: true, data: null };
  return { ok: true, data: adaptResponse(result.data) };
}
