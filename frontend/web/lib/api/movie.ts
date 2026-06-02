/**
 * Issue #221 — single-movie lookup seam (mock, v1).
 *
 * The "Surpreenda-me desta lista" button (watch-later) and the new
 * `/movie/[movieId]` detail page both need a movie's full data by id. The
 * backend is read-only this milestone and exposes NO `GET /movie/{id}`
 * endpoint (only /recommend, /recommend_anon, /watch-later, /history,
 * /preferences — see __main__.py). So v1 reads the bundled catalogue
 * (`lib/data/movies-catalogue.json`, a copy of the Lambda layer's
 * `functions/shared/movies_catalogue.json`) directly.
 *
 * This module is the typed seam that hides that: it returns the SAME
 * `RecommendedMovie` shape the recommendation screen already renders, so the
 * detail page reuses `<MovieDetail>` verbatim. When v2 adds a real
 * `GET /movie/{id}` Lambda, only `getMovieById` swaps to an `apiGet` call —
 * callers and the screen stay untouched.
 *
 * Bundle note: the full catalogue (~647KB) is imported here. The detail page
 * consumes it at BUILD time (generateStaticParams + server render under
 * `output: "export"`), so it never ships to the client there. The watch-later
 * button pulls `findMovieIdByTitle` via a dynamic `import()` so the catalogue
 * loads as a separate on-click chunk, not in the initial page JS. In v2 the
 * /watch-later response will carry `movieId` and the title→id lookup — the only
 * reason the client touches the catalogue at all — disappears.
 */

import type {
  RecommendedMovie,
  SimilarMovie,
} from "@/lib/api/recommend.real";
import type { ApiError, Result } from "@/lib/api/client";
import rawCatalogue from "@/lib/data/movies-catalogue.json";

// -----------------------------------------------------------------------------
// Catalogue wire shape (functions/shared/movies_catalogue.json)
// -----------------------------------------------------------------------------

type CatalogueMovie = {
  readonly movieId: string;
  readonly title: string;
  readonly genre: string;
  readonly director: string;
  readonly poster: string;
  readonly year: number;
  readonly runtime: number;
  readonly imdbRating: number;
  readonly rated: string;
  readonly synopsis: string;
  readonly cast: ReadonlyArray<string>;
};

const CATALOGUE = rawCatalogue as ReadonlyArray<CatalogueMovie>;

// Indexes built once at module load. `byId` powers the detail page; `idByTitle`
// powers the watch-later "surprise" button (which only knows item titles, since
// the v1 /watch-later GET omits movieId). Title collisions (only "Drishyam" in
// the current catalogue) resolve to the last entry — acceptable for a random
// pick.
const byId = new Map<string, CatalogueMovie>();
const idByTitle = new Map<string, string>();
for (const m of CATALOGUE) {
  byId.set(m.movieId, m);
  idByTitle.set(m.title, m.movieId);
}

const SIMILAR_LIMIT = 12;

// -----------------------------------------------------------------------------
// genre helpers — mirror functions/recommend/recommend.py (_genre_set / superset)
// -----------------------------------------------------------------------------

function genreSet(genre: string): Set<string> {
  return new Set(
    (genre || "")
      .toLowerCase()
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean),
  );
}

function isSuperset(target: Set<string>, candidate: Set<string>): boolean {
  for (const g of target) if (!candidate.has(g)) return false;
  return true;
}

function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const g of a) if (b.has(g)) return true;
  return false;
}

/**
 * Up to SIMILAR_LIMIT peers, mirroring recommend.py `_pick_similar`: prefer a
 * strict genre-superset match, fall back to "shares ≥1 genre". Ordered by IMDb
 * rating (deterministic — the page is statically generated, so no random) and
 * always excluding the target itself.
 */
function pickSimilar(target: CatalogueMovie): SimilarMovie[] {
  const targetGenres = genreSet(target.genre);
  if (targetGenres.size === 0) return [];

  const pool = CATALOGUE.filter((m) => m.movieId !== target.movieId);
  let chosen = pool.filter((m) => isSuperset(targetGenres, genreSet(m.genre)));
  if (chosen.length === 0) {
    chosen = pool.filter((m) => intersects(targetGenres, genreSet(m.genre)));
  }

  return chosen
    .slice()
    .sort((a, b) => b.imdbRating - a.imdbRating)
    .slice(0, SIMILAR_LIMIT)
    .map(
      (m): SimilarMovie => ({
        movieId: m.movieId,
        title: m.title,
        genre: m.genre,
        year: m.year,
        poster: m.poster,
        imdbRating: m.imdbRating,
      }),
    );
}

// -----------------------------------------------------------------------------
// Adapter — catalogue entry → screen-facing RecommendedMovie
// -----------------------------------------------------------------------------

// The catalogue carries no streaming availability (the live /recommend Lambda
// adds it from a separate source). `streamingServices: []` makes the shared
// <MovieDetail> hide the "Onde assistir" block and the "Assistir em …" CTA —
// graceful degradation, same as the recommendation screen already does.
function adapt(m: CatalogueMovie): RecommendedMovie {
  const similar = pickSimilar(m);
  return {
    title: m.title,
    genre: m.genre,
    streamingServices: [],
    poster: m.poster,
    year: m.year,
    runtime: `${m.runtime} min`,
    rating: m.rated,
    imdbRating: m.imdbRating,
    director: m.director,
    cast: [...m.cast],
    synopsis: m.synopsis,
    ...(similar.length > 0 ? { similar } : {}),
  };
}

// -----------------------------------------------------------------------------
// Public surface
// -----------------------------------------------------------------------------

/** Every catalogue movieId — feeds the detail page's `generateStaticParams`. */
export function getAllMovieIds(): string[] {
  return CATALOGUE.map((m) => m.movieId);
}

/**
 * Resolve a watch-later item title to its catalogue movieId, or null if the
 * title isn't in the catalogue (e.g. legacy `live:…` saves). Sync + lightweight
 * so the watch-later button can call it after a dynamic import.
 */
export function findMovieIdByTitle(title: string): string | null {
  return idByTitle.get(title) ?? null;
}

/**
 * Look up a movie by id. Async + Result-shaped to match the recommendation
 * fetch seam, so the v2 swap to a real `GET /movie/{id}` Lambda is a one-line
 * change with no caller churn. Resolves to `data: null` for unknown ids (the
 * detail page renders its not-found branch).
 */
export async function getMovieById(
  movieId: string,
): Promise<Result<RecommendedMovie | null, ApiError>> {
  const found = byId.get(movieId);
  return { ok: true, data: found ? adapt(found) : null };
}
