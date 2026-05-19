"use client";

/**
 * Phase 13 (INTG-RECO-01/02, issue #132) + Phase 16 (INTG-WTCL-02, issue #135).
 *
 * Phase 13: fetches a real movie recommendation from `/api/v1/recommend`
 * (`getRecommendationReal()` → `Result<RecommendedMovie | null, ApiError>`),
 * 4-state machine (loading / ready / empty / error), `useApiErrorUx` for
 * toast UX, kebab→camel adapter inside `recommend.real.ts`. Phase 13 fields
 * the live Lambda doesn't return — year / runtime / rating / match /
 * director / cast / synopsis / mood — render conditionally.
 *
 * Phase 16 (this rebase): rewire the Save button to consume the real
 * `/watch-later` Lambda via async `addWatchLater(movieId)`. The Lambda
 * has no PUT/DELETE (verified 2026-05-14) so the toggle becomes ADD-ONLY
 * — once clicked it stays in "Saved" state with no un-save. The previous
 * `isInWatchLater(localId)` membership pre-check is dropped because the
 * GET response strips movieIds (docs/inconsistencias.md §4). `localId =
 * live:${title}` is preserved as the per-recommendation save handle since
 * the live Lambda has no id.
 *
 * Layout: full-bleed backdrop region with two-axis legibility gradient + content
 * column padded to clear the rail. Responsive at 3 breakpoints — backdrop
 * height steps up (360→560), padding scales (px-6→px-14), metadata strip
 * wraps on narrow widths.
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

import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Play, RefreshCw } from "lucide-react";
import { ServiceBadge } from "@/components/ServiceBadge";
import {
  getRecommendationReal,
  type RecommendedMovie,
} from "@/lib/api/recommend.real";
import { addWatchLater } from "@/lib/api/watch-later";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
import type { ApiError } from "@/lib/api/client";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

export default function RecommendationPage() {
  const [movie, setMovie] = useState<RecommendedMovie | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading",
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const inFlight = useRef(false);
  // React 18 Strict Mode runs effects setup→cleanup→setup in dev. The
  // `cancelled` flag below only suppresses state updates from the first run;
  // it does NOT cancel the in-flight network call, so /recommend would fire
  // twice and the Lambda would record both in history. This ref persists
  // across the simulated remount and short-circuits the second invocation.
  const initialFetchFired = useRef(false);

  // Wires error-class-aware UX for both the recommendation fetch and the
  // watch-later save call (toast for network/server/forbidden, no-op for
  // unauthorized/validation). Hooks no-op while their error is null.
  useApiErrorUx(error);
  useApiErrorUx(saveError);

  useEffect(() => {
    if (initialFetchFired.current) return;
    initialFetchFired.current = true;
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      setError(null);
      const res = await getRecommendationReal();
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setStatus("error");
        return;
      }
      if (res.data === null) {
        setMovie(null);
        setStatus("empty");
        return;
      }
      setMovie(res.data);
      // Phase 16: wire response from /watch-later does not include movieIds,
      // so a membership pre-check is not possible. Default to unsaved per
      // recommendation; user can still save (add-only this milestone).
      setSaved(false);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAnother() {
    setStatus("loading");
    setError(null);
    const res = await getRecommendationReal();
    if (!res.ok) {
      setError(res.error);
      setStatus("error");
      return;
    }
    if (res.data === null) {
      setMovie(null);
      setStatus("empty");
      return;
    }
    setMovie(res.data);
    setSaved(false);
    setStatus("ready");
  }

  async function handleSave() {
    if (movie === null || saved || inFlight.current) return;
    inFlight.current = true;
    setSaved(true); // optimistic
    // non-tokenized: live recommendation has no id; derive a stable per-title
    // local id. Phase 16 watch-later Lambda accepts arbitrary movieId strings.
    const localId = `live:${movie.title}`;
    const res = await addWatchLater(localId);
    inFlight.current = false;
    if (!res.ok) {
      setSaved(false); // rollback
      setSaveError(res.error);
    }
  }

  // ---------------------------------------------------------------------------
  // Render: 4 discriminated branches on status
  // ---------------------------------------------------------------------------

  if (status === "loading") {
    return (
      <div
        className="w-full min-h-screen bg-bg animate-pulse"
        aria-busy="true"
      />
    );
  }

  if (status === "error") {
    return (
      <section className="relative isolate w-full min-h-screen overflow-hidden bg-bg">
        <div className="relative z-10">
          {/* non-tokenized: pt-[220px] mobile / pt-[280px] md+ — backdrop clearance primitives */}
          {/* non-tokenized: max-w-[880px] — header column width primitive */}
          <div className="pt-[220px] md:pt-[280px] px-6 md:px-14 max-w-[880px] animate-fade-up [animation-delay:60ms]">
            <p className={`${EYEBROW} mb-3`}>Something went wrong</p>
            {/* non-tokenized: leading-[0.98] tracking-[-0.03em] match the reference .display recipe */}
            <h1 className="font-display text-28 md:text-40 font-extrabold tracking-[-0.03em] leading-[0.98] text-text-primary">
              We couldn&apos;t load a recommendation
            </h1>
            <p className="mt-6 mb-7 text-14 text-text-secondary max-w-[640px]">
              We couldn&apos;t load a recommendation right now.
            </p>
            <div className="flex flex-wrap gap-2.5 mb-8">
              <button
                type="button"
                onClick={handleAnother}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <RefreshCw size={16} aria-hidden />
                Try again
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (status === "empty" || movie === null) {
    return (
      <section className="relative isolate w-full min-h-screen overflow-hidden bg-bg">
        <div className="relative z-10">
          {/* non-tokenized: pt-[220px] mobile / pt-[280px] md+ — backdrop clearance primitives */}
          {/* non-tokenized: max-w-[880px] — header column width primitive */}
          <div className="pt-[220px] md:pt-[280px] px-6 md:px-14 max-w-[880px] animate-fade-up [animation-delay:60ms]">
            <p className={`${EYEBROW} mb-3`}>No recommendation right now</p>
            {/* non-tokenized: leading-[0.98] tracking-[-0.03em] match the reference .display recipe */}
            <h1 className="font-display text-28 md:text-40 font-extrabold tracking-[-0.03em] leading-[0.98] text-text-primary">
              We&apos;ve got nothing for you yet
            </h1>
            <p className="mt-6 mb-7 text-14 text-text-secondary max-w-[640px]">
              Try again — we&apos;ll roll a new one.
            </p>
            <div className="flex flex-wrap gap-2.5 mb-8">
              <button
                type="button"
                onClick={handleAnother}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <RefreshCw size={16} aria-hidden />
                Try again
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // status === "ready" && movie !== null
  const primaryService = movie.streamingServices[0];
  const showMetaStrip =
    movie.match !== undefined ||
    movie.year !== undefined ||
    movie.rating !== undefined ||
    movie.runtime !== undefined ||
    (movie.genre && movie.genre.length > 0);

  return (
    <section
      key={movie.title}
      className="relative isolate w-full min-h-screen overflow-hidden bg-bg"
    >
      {/* Backdrop — fades in on its own */}
      {/* non-tokenized: backdrop image suppressed until issue #70 adds backdrop URL — gradient scrims provide tonal hierarchy on their own. */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[360px] md:h-[560px] overflow-hidden animate-fade-in"
      >
        {/* non-tokenized: stacked top-down + left-right legibility scrims */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,11,0.30)_0%,rgba(10,10,11,0.10)_30%,rgba(10,10,11,0.70)_70%,var(--color-bg)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(10,10,11,0.85)_0%,rgba(10,10,11,0.20)_60%)]" />
      </div>

      {/* Content column */}
      <div className="relative z-10">
        {/* Header */}
        {/* non-tokenized: pt-[220px] mobile / pt-[280px] md+ — backdrop clearance primitives */}
        {/* non-tokenized: max-w-[880px] — header column width primitive */}
        <div className="pt-[220px] md:pt-[280px] px-6 md:px-14 max-w-[880px] animate-fade-up [animation-delay:60ms]">
          <p className={`${EYEBROW} text-accent flex items-center gap-2 mb-3`}>
            <span aria-hidden>✦</span>
            <span>We think you&apos;ll like this one</span>
          </p>
          {/* non-tokenized: leading-[0.98] tracking-[-0.03em] match the reference .display recipe */}
          <h1 className="font-display text-40 md:text-64 font-extrabold tracking-[-0.03em] leading-[0.98] text-text-primary">
            {movie.title}
          </h1>

          {showMetaStrip && (
            <div className="flex items-center flex-wrap gap-x-3.5 gap-y-2 mt-4 text-13 text-text-secondary">
              {movie.match !== undefined && (
                <span className="text-accent text-14 font-semibold">
                  {movie.match}% match
                </span>
              )}
              {movie.year !== undefined && <span>{movie.year}</span>}
              {movie.rating !== undefined && (
                /* non-tokenized: rating chip primitive — text-11 + px-1.5 py-0.5 below Phase 2 scale */
                <span className="border border-border-strong rounded-sm px-1.5 py-0.5 text-11 font-semibold text-text-primary">
                  {movie.rating}
                </span>
              )}
              {movie.runtime !== undefined && <span>{movie.runtime}</span>}
              {movie.genre && movie.genre.length > 0 && (
                <span className="text-text-muted capitalize">{movie.genre}</span>
              )}
            </div>
          )}

          {movie.synopsis && (
            /* non-tokenized: text-[15px] / md:text-[17px] body size between Phase 2 steps; max-w-[640px] body width primitive */
            <p className="mt-6 mb-7 text-text-primary text-[15px] md:text-[17px] leading-[1.55] max-w-[640px]">
              {movie.synopsis}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2.5 mb-8">
            {primaryService && (
              <a
                href={primaryService.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <Play size={16} aria-hidden />
                Watch on {primaryService.name}
              </a>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saved}
              aria-pressed={saved}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-surface-2 border border-border hover:border-border-strong text-text-primary text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-70 disabled:cursor-default disabled:hover:border-border"
            >
              {saved ? (
                <BookmarkCheck size={16} aria-hidden />
              ) : (
                <Bookmark size={16} aria-hidden />
              )}
              {saved ? "Saved" : "Save to watch later"}
            </button>
            {/* Note: no disabled/aria-busy here — entering "loading" replaces the entire screen with the skeleton in the branch above, so the button is unmounted while a fetch is in flight. */}
            <button
              type="button"
              onClick={handleAnother}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-md text-text-secondary hover:text-text-primary text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <RefreshCw size={16} aria-hidden />
              Recommend another
            </button>
          </div>

          {/* Where to watch */}
          {movie.streamingServices.length > 0 && (
            <div className="mb-8">
              <p className={`${EYEBROW} mb-2.5`}>Where to watch</p>
              <div className="flex flex-wrap gap-2.5">
                {movie.streamingServices.map((s) => (
                  // non-tokenized: live data has no kind tier — default to "included" until issue #70 enriches with rent/buy info.
                  <ServiceBadge
                    key={s.name}
                    service={{ name: s.name, kind: "included" }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cast / Director — entire grid is omitted if neither field is present */}
        {(movie.director || (movie.cast && movie.cast.length > 0)) && (
          /* non-tokenized: 160px Director column primitive at md+ */
          <div className="px-6 md:px-14 mb-9 max-w-[880px] grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 animate-fade-up [animation-delay:220ms]">
            {movie.director && (
              <div>
                <p className={`${EYEBROW} mb-1.5`}>Director</p>
                <p className="text-14 font-semibold text-text-primary">
                  {movie.director}
                </p>
              </div>
            )}
            {movie.cast && movie.cast.length > 0 && (
              <div>
                <p className={`${EYEBROW} mb-1.5`}>Cast</p>
                <p className="text-14 text-text-secondary leading-[1.6]">
                  {movie.cast.join(" · ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TODO Phase 13+ (issue #70 enrichment OR dedicated /similar endpoint): similar-films rail hidden — live /recommend payload has no similar films, and the prior Phase 7 helper iterated the now-deleted MOCK dataset. */}
        {/* <SimilarFilmsRail /> */}
      </div>
    </section>
  );
}
