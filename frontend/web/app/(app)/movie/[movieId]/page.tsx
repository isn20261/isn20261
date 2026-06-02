/**
 * Issue #221 — `/movie/[movieId]` movie detail screen.
 *
 * Renders a single catalogue movie using the SAME `<MovieDetail>` hero the
 * recommendation screen uses (poster, meta strip, synopsis, cast/director,
 * "Filmes parecidos" rail). Reached from the watch-later "Surpreenda-me desta
 * lista" button (random pick) and from any similar-movie card.
 *
 * This is a server component: under `output: "export"` it is pre-rendered to a
 * static HTML page per catalogue id (`generateStaticParams`), so the 647KB
 * catalogue never reaches the client here — only this movie's data is embedded.
 * `dynamicParams = false` makes unknown ids a build/CDN 404 rather than an
 * (impossible-under-export) on-demand render. The interactive Save / back-link
 * row is the small `<MoviePageActions>` client island.
 *
 * Data comes from the `lib/api/movie.ts` mock seam; when v2 adds a real
 * `GET /movie/{id}` Lambda only that module changes.
 */

import { notFound } from "next/navigation";
import { MovieDetail } from "@/components/MovieDetail";
import { MoviePageActions } from "@/components/MoviePageActions";
import { getAllMovieIds, getMovieById } from "@/lib/api/movie";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllMovieIds().map((movieId) => ({ movieId }));
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ movieId: string }>;
}) {
  const { movieId } = await params;
  const res = await getMovieById(movieId);
  if (!res.ok || res.data === null) notFound();

  const movie = res.data;

  return (
    <MovieDetail
      movie={movie}
      eyebrow={
        <p className={`${EYEBROW} text-accent flex items-center gap-2 mb-3`}>
          <span aria-hidden>✦</span>
          <span>Da sua lista</span>
        </p>
      }
      actions={<MoviePageActions movieId={movieId} />}
    />
  );
}
