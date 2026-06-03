"use client";

/**
 * Issue #221 — `/movie?id=<movieId>` movie detail screen.
 *
 * Renders a single catalogue movie using the SAME `<MovieDetail>` hero the
 * recommendation screen uses. Reached from the watch-later "Surpreenda-me desta
 * lista" button (random pick) and from any similar-movie card.
 *
 * Why a single query-param page instead of `/movie/[movieId]` static pages:
 * under `output: "export"` a dynamic route pre-renders one HTML page per id
 * (~1000 movies → ~10k files). The prod deploy uploads every file as its own
 * Pulumi `BucketObjectv2` resource (see __main__.py), so 10k files blew the
 * deploy out from ~3-4 min to 24+ min. That pipeline is read-only this
 * milestone, so the fix lives here: ONE static page that reads `?id=` on the
 * client and looks the movie up in the bundled catalogue. The CloudFront
 * subdir-rewrite (__main__.py:800) maps `/movie` → `/movie/index.html` and
 * preserves the query string, so links keep working on direct load / refresh.
 *
 * Data comes from the `lib/api/movie.ts` mock seam; `getMovieById` is async +
 * Result-shaped, so when v2 adds a real `GET /movie/{id}` Lambda the loading
 * state here already covers it and only that module changes.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MovieDetail } from "@/components/MovieDetail";
import { MoviePageActions } from "@/components/MoviePageActions";
import { getMovieById } from "@/lib/api/movie";
import type { RecommendedMovie } from "@/lib/api/recommend.real";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

function MovieView() {
  const movieId = useSearchParams().get("id");
  // Holds the lookup result tagged with the id it belongs to. State is only ever
  // set inside the async callback (never synchronously in the effect), so a new
  // `?id=` renders the skeleton — via the `resolved.id !== movieId` guard below —
  // until its own lookup resolves, without a cascading-render setState.
  const [resolved, setResolved] = useState<{
    id: string;
    movie: RecommendedMovie | null;
  } | null>(null);

  useEffect(() => {
    if (!movieId) return;
    let cancelled = false;
    getMovieById(movieId).then((res) => {
      if (cancelled) return;
      setResolved({ id: movieId, movie: res.ok ? res.data : null });
    });
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  if (movieId && resolved?.id === movieId && resolved.movie) {
    return (
      <MovieDetail
        movie={resolved.movie}
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

  // No id, or the lookup resolved to nothing → not found.
  if (!movieId || (resolved?.id === movieId && resolved.movie === null)) {
    return (
      <section className="relative isolate w-full min-h-screen overflow-hidden bg-bg">
        <div className="relative z-10">
          {/* non-tokenized: pt-[220px] mobile / pt-[280px] md+ — backdrop clearance primitives */}
          {/* non-tokenized: max-w-[880px] — header column width primitive */}
          <div className="pt-[220px] md:pt-[280px] px-6 md:px-14 max-w-[880px] animate-fade-up [animation-delay:60ms]">
            <p className={`${EYEBROW} mb-3`}>Filme não encontrado</p>
            {/* non-tokenized: leading-[0.98] tracking-[-0.03em] match the reference .display recipe */}
            <h1 className="font-display text-28 md:text-40 font-extrabold tracking-[-0.03em] leading-[0.98] text-text-primary">
              Não encontramos esse filme
            </h1>
            <p className="mt-6 mb-7 text-14 text-text-secondary max-w-[640px]">
              O link pode estar incorreto ou o filme não está no catálogo.
            </p>
            <div className="flex flex-wrap gap-2.5 mb-8">
              <Link
                href="/watch-later"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <ArrowLeft size={16} aria-hidden />
                Voltar para a lista
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <MovieDetailSkeleton />;
}

export default function MoviePage() {
  // useSearchParams requires a Suspense boundary under static export.
  return (
    <Suspense fallback={<MovieDetailSkeleton />}>
      <MovieView />
    </Suspense>
  );
}

/**
 * Loading skeleton — mirrors the poster-led <MovieDetail> layout (text column +
 * poster column inside the max-w-300 shell) so the skeleton→content swap doesn't
 * shift. Tokens-only; reuses the same shell / grid / poster primitives.
 */
function MovieDetailSkeleton() {
  return (
    <section
      className="relative isolate w-full min-h-screen overflow-hidden bg-bg"
      aria-busy="true"
    >
      {/* non-tokenized: max-w-300 shell + md:pt-22 / pt-12 match the live hero */}
      <div className="relative z-10 mx-auto max-w-300 px-6 md:px-10">
        <div className="grid grid-cols-1 gap-7 pt-12 md:grid-cols-[1fr_minmax(300px,360px)] md:gap-12 md:pt-22 md:items-start">
          {/* LEFT: text skeleton */}
          <div className="order-2 md:order-1">
            <div className="h-4 w-56 rounded-sm bg-surface-2 animate-pulse mb-4" />
            <div className="h-10 md:h-12 w-3/4 rounded-md bg-surface-2 animate-pulse mb-3" />
            <div className="h-10 md:h-12 w-1/2 rounded-md bg-surface-2 animate-pulse mb-5" />
            <div className="flex gap-3 mb-6">
              <div className="h-5 w-24 rounded-sm bg-surface-2 animate-pulse" />
              <div className="h-5 w-12 rounded-sm bg-surface-2 animate-pulse" />
              <div className="h-5 w-16 rounded-sm bg-surface-2 animate-pulse" />
            </div>
            {/* non-tokenized: max-w-150 body width matches live synopsis */}
            <div className="space-y-2.5 mb-6 max-w-150">
              <div className="h-4 w-full rounded-sm bg-surface-2 animate-pulse" />
              <div className="h-4 w-11/12 rounded-sm bg-surface-2 animate-pulse" />
              <div className="h-4 w-3/4 rounded-sm bg-surface-2 animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <div className="h-12 w-44 rounded-md bg-surface-2 animate-pulse" />
              <div className="h-12 w-56 rounded-md bg-surface-2 animate-pulse" />
            </div>
          </div>

          {/* RIGHT: poster skeleton — same dimensions as the live poster */}
          <div className="order-1 md:order-2">
            {/* non-tokenized: max-w-[320px] aspect-2/3 poster primitives */}
            <div className="mx-auto w-full max-w-[320px] aspect-2/3 rounded-lg bg-surface-2 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
