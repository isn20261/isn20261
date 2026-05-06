"use client";

/**
 * Phase 7 (RECO-01..04, issue #96) — recommendation result screen.
 *
 * Client Component: rolls a random movie via the mock recommend seam on
 * mount and on "Recommend another"; locally toggles a Saved state (Phase
 * 10 owns the persisted watch-later list).
 *
 * Layout: full-bleed backdrop with two-axis legibility gradient + content
 * column padded to clear the rail. Responsive at 3 breakpoints — backdrop
 * height steps up (360→560), padding scales (px-6→px-14), metadata strip
 * wraps on narrow widths, similar-films rail horizontal-scrolls.
 *
 * DSGN-06 escape hatches (each marked with // non-tokenized inline):
 *   - h-[360px] / md:h-[560px]                : backdrop height primitives
 *   - pt-[220px] / md:pt-[280px]              : header padding-top primitives
 *   - max-w-[880px] / max-w-[640px]           : column width primitives
 *   - leading-[0.98]                          : display heading line-height
 *   - tracking-[-0.03em]                      : display heading letter-spacing
 *   - tracking-[0.18em] / tracking-[0.06em]   : eyebrow + small-label spacing
 *   - text-[17px], text-[15px]                : body sizes between Phase 2 steps
 *   - bg-[linear-gradient(...)] x2            : backdrop legibility scrims
 *   - rating chip: text-11 px-1.5 py-0.5      : compact pill primitive
 */

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Play, RefreshCw } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";
import { ServiceBadge } from "@/components/ServiceBadge";
import {
  backdropUrl,
  getRecommendation,
  getSimilar,
  type Movie,
} from "@/lib/api/recommend";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

export default function RecommendationPage() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [picking, setPicking] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await getRecommendation();
      if (!cancelled) {
        setMovie(next);
        setPicking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAnother() {
    setPicking(true);
    setSaved(false);
    const next = await getRecommendation();
    setMovie(next);
    setPicking(false);
  }

  if (!movie) {
    return (
      <div
        className="w-full min-h-screen bg-bg animate-pulse"
        aria-busy="true"
      />
    );
  }

  const similar = getSimilar(movie);
  const primaryService = movie.services[0];

  return (
    <section className="relative isolate w-full min-h-screen overflow-hidden bg-bg">
      {/* Backdrop */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[360px] md:h-[560px] overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backdropUrl(movie, 1800, 1000)}
          alt=""
          className="w-full h-full object-cover"
        />
        {/* non-tokenized: stacked top-down + left-right legibility scrims */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,11,0.30)_0%,rgba(10,10,11,0.10)_30%,rgba(10,10,11,0.70)_70%,var(--color-bg)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(10,10,11,0.85)_0%,rgba(10,10,11,0.20)_60%)]" />
      </div>

      {/* Content column */}
      <div className="relative z-10">
        {/* Header */}
        {/* non-tokenized: pt-[220px] mobile / pt-[280px] md+ — backdrop clearance primitives */}
        {/* non-tokenized: max-w-[880px] — header column width primitive */}
        <div className="pt-[220px] md:pt-[280px] px-6 md:px-14 max-w-[880px]">
          <p className={`${EYEBROW} text-accent flex items-center gap-2 mb-3`}>
            <span aria-hidden>✦</span>
            <span>We think you&apos;ll like this one</span>
          </p>
          {/* non-tokenized: leading-[0.98] tracking-[-0.03em] match the reference .display recipe */}
          <h1 className="font-display text-40 md:text-64 font-extrabold tracking-[-0.03em] leading-[0.98] text-text-primary">
            {movie.title}
          </h1>

          <div className="flex items-center flex-wrap gap-x-3.5 gap-y-2 mt-4 text-13 text-text-secondary">
            <span className="text-accent text-14 font-semibold">
              {movie.match}% match
            </span>
            <span>{movie.year}</span>
            {/* non-tokenized: rating chip primitive — text-11 + px-1.5 py-0.5 below Phase 2 scale */}
            <span className="border border-border-strong rounded-sm px-1.5 py-0.5 text-11 font-semibold text-text-primary">
              {movie.rating}
            </span>
            <span>{movie.runtime}</span>
            <span className="text-text-muted">{movie.genres.join(" · ")}</span>
          </div>

          {/* non-tokenized: text-[15px] / md:text-[17px] body size between Phase 2 steps; max-w-[640px] body width primitive */}
          <p className="mt-6 mb-7 text-text-primary text-[15px] md:text-[17px] leading-[1.55] max-w-[640px]">
            {movie.synopsis}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2.5 mb-8">
            {primaryService && (
              <button
                type="button"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <Play size={16} aria-hidden />
                Watch on {primaryService.name}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSaved((s) => !s)}
              aria-pressed={saved}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-surface-2 border border-border hover:border-border-strong text-text-primary text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              {saved ? (
                <BookmarkCheck size={16} aria-hidden />
              ) : (
                <Bookmark size={16} aria-hidden />
              )}
              {saved ? "Saved" : "Save to watch later"}
            </button>
            <button
              type="button"
              onClick={handleAnother}
              disabled={picking}
              aria-busy={picking || undefined}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-md text-text-secondary hover:text-text-primary text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {picking ? (
                <span
                  className="w-4 h-4 rounded-full border-2 border-text-secondary border-t-transparent animate-spin"
                  aria-hidden
                />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
              Recommend another
            </button>
          </div>

          {/* Where to watch */}
          <div className="mb-8">
            <p className={`${EYEBROW} mb-2.5`}>Where to watch</p>
            <div className="flex flex-wrap gap-2.5">
              {movie.services.map((s) => (
                <ServiceBadge key={s.name} service={s} />
              ))}
            </div>
          </div>
        </div>

        {/* Cast / Director */}
        {/* non-tokenized: 160px Director column primitive at md+ */}
        <div className="px-6 md:px-14 mb-9 max-w-[880px] grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6">
          <div>
            <p className={`${EYEBROW} mb-1.5`}>Director</p>
            <p className="text-14 font-semibold text-text-primary">
              {movie.director}
            </p>
          </div>
          <div>
            <p className={`${EYEBROW} mb-1.5`}>Cast</p>
            <p className="text-14 text-text-secondary leading-[1.6]">
              {movie.cast.join(" · ")}
            </p>
          </div>
        </div>

        {/* Similar films */}
        <div className="px-6 md:px-14 pb-14">
          <h2 className="font-display text-20 font-bold text-text-primary mb-3.5">
            Similar films
          </h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {similar.map((m) => (
              <MovieCard key={m.id} movie={m} width={150} height={224} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
