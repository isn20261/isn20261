"use client";

/**
 * Phase 13 (INTG-RECO-01/02, issue #132) + Phase 16 (INTG-WTCL-02, issue #135)
 * + recommend-rich-fields: poster-led layout fed by the enriched Lambda payload.
 *
 * Fetches a real movie recommendation from `/api/v1/recommend` (auth) or
 * `/api/v1/recommend_anon` (guest) via `getRecommendationReal/Anon()` →
 * `Result<RecommendedMovie | null, ApiError>`. 4-state machine (loading /
 * ready / empty / error), `useApiErrorUx` for toast UX, kebab→camel adapter in
 * `recommend.real.ts`.
 *
 * recommend-rich-fields: the Lambda now returns year / rated / director /
 * runtime / imdbRating / synopsis / cast plus a lightweight `similar[]` array
 * (genre-superset matches — see functions/recommend/recommend.py). Every field
 * is still rendered conditionally so the screen degrades gracefully if any are
 * absent. `match`/`mood` are no longer produced and were dropped from the UI.
 *
 * Phase 16: the Save button consumes the real `/watch-later` Lambda via async
 * `addWatchLater(movieId)`. The Lambda has no PUT/DELETE (verified 2026-05-14)
 * so the toggle is ADD-ONLY — once clicked it stays "Saved". `localId =
 * live:${title}` is the per-recommendation save handle (live Lambda has no id).
 *
 * Layout (Mock B): the poster is portrait, so instead of a cropped backdrop the
 * sharp full poster sits in a right column (object-contain, sticky on md+) and
 * a heavily blurred/darkened copy fills an ambient region behind the hero for
 * mood. Below the hero, a horizontal "Filmes parecidos" rail. Responsive: hero
 * is single-column on mobile (poster first via order-*), two-column on md+.
 *
 * DSGN-06 escape hatches (each marked with // non-tokenized inline):
 *   - ambient: h-170 region, blur-[48px]/brightness-[.45]/scale-110, bg gradient
 *   - hero: max-w-300 shell, md:grid-cols-[1fr_minmax(300px,360px)], md:pt-22
 *   - poster: max-w-[320px] aspect-2/3 object-contain, md:top-22 sticky
 *   - rail cards: w-37.5 aspect-2/3 poster primitives
 *   - h-[360px] / h-[560px] (skeleton only), pt-[220px]/pt-[280px] (other states)
 *   - leading-[0.98]/[1.55]/[1.6], tracking-[-0.03em], text-[15px]/[17px]
 *   - rating chip: text-11 px-1.5 py-0.5 compact pill primitive
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bookmark, BookmarkCheck, Play, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ServiceBadge } from "@/components/ServiceBadge";
import { PosterImage } from "@/components/PosterImage";
import { posterAt } from "@/lib/posters";
import { SnackRecipeModal } from "@/components/SnackRecipeModal";
import {
  getRecommendationReal,
  getRecommendationAnon,
  type RecommendedMovie,
  type SimilarMovie,
} from "@/lib/api/recommend.real";
import { addWatchLater } from "@/lib/api/watch-later";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
import type { ApiError } from "@/lib/api/client";
import { SNACK_RECIPES } from "@/lib/data/snack-recipes";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

export default function RecommendationPage() {
  const { isAuthenticated } = useAuth();
  const [movie, setMovie] = useState<RecommendedMovie | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading",
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  // Lazy init picks a random recipe on first mount; handleAnother picks a
  // new index different from the current one so consecutive fetches don't
  // repeat the same recipe.
  const [recipeIndex, setRecipeIndex] = useState(() =>
    Math.floor(Math.random() * SNACK_RECIPES.length),
  );
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
    void (async () => {
      setStatus("loading");
      setError(null);
      const res = await (isAuthenticated ? getRecommendationReal() : getRecommendationAnon());
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
  }, [isAuthenticated]);

  async function handleAnother() {
    setStatus("loading");
    setError(null);
    setRecipeIndex((current) => {
      if (SNACK_RECIPES.length <= 1) return current;
      let next = current;
      while (next === current) {
        next = Math.floor(Math.random() * SNACK_RECIPES.length);
      }
      return next;
    });
    const res = await (isAuthenticated ? getRecommendationReal() : getRecommendationAnon());
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

  // SNACK_RECIPES is non-empty (literal array of 25 entries); recipeIndex is
  // always Math.floor(random * length) or 0, so the modulo access is in range.
  // The `!` satisfies tsconfig `noUncheckedIndexedAccess`.
  const recipe = SNACK_RECIPES[recipeIndex % SNACK_RECIPES.length]!;

  // Compute the body once; the snack modal is rendered as a sibling after
  // it so that React keeps the same SnackRecipeModal instance mounted across
  // status transitions — required for the open→mini CSS animation to fire.
  let body: ReactNode = null;

  if (status === "loading") {
    body = <SkeletonHero />;
  } else if (status === "error") {
    body = (
      <section className="relative isolate w-full min-h-screen overflow-hidden bg-bg">
        <div className="relative z-10">
          {/* non-tokenized: pt-[220px] mobile / pt-[280px] md+ — backdrop clearance primitives */}
          {/* non-tokenized: max-w-[880px] — header column width primitive */}
          <div className="pt-[220px] md:pt-[280px] px-6 md:px-14 max-w-[880px] animate-fade-up [animation-delay:60ms]">
            <p className={`${EYEBROW} mb-3`}>Algo deu errado</p>
            {/* non-tokenized: leading-[0.98] tracking-[-0.03em] match the reference .display recipe */}
            <h1 className="font-display text-28 md:text-40 font-extrabold tracking-[-0.03em] leading-[0.98] text-text-primary">
              Não foi possível carregar uma recomendação
            </h1>
            <p className="mt-6 mb-7 text-14 text-text-secondary max-w-[640px]">
              Não conseguimos carregar uma recomendação agora.
            </p>
            <div className="flex flex-wrap gap-2.5 mb-8">
              <button
                type="button"
                onClick={handleAnother}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <RefreshCw size={16} aria-hidden />
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  } else if (status === "empty" || movie === null) {
    body = (
      <section className="relative isolate w-full min-h-screen overflow-hidden bg-bg">
        <div className="relative z-10">
          {/* non-tokenized: pt-[220px] mobile / pt-[280px] md+ — backdrop clearance primitives */}
          {/* non-tokenized: max-w-[880px] — header column width primitive */}
          <div className="pt-[220px] md:pt-[280px] px-6 md:px-14 max-w-[880px] animate-fade-up [animation-delay:60ms]">
            <p className={`${EYEBROW} mb-3`}>Sem recomendações no momento</p>
            {/* non-tokenized: leading-[0.98] tracking-[-0.03em] match the reference .display recipe */}
            <h1 className="font-display text-28 md:text-40 font-extrabold tracking-[-0.03em] leading-[0.98] text-text-primary">
              Ainda não temos nada pra você
            </h1>
            <p className="mt-6 mb-7 text-14 text-text-secondary max-w-[640px]">
              Tente de novo — vamos sortear outra.
            </p>
            <div className="flex flex-wrap gap-2.5 mb-8">
              <button
                type="button"
                onClick={handleAnother}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <RefreshCw size={16} aria-hidden />
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  } else {
    // status === "ready" && movie !== null
    const primaryService = movie.streamingServices[0];
    const showMetaStrip =
      movie.imdbRating !== undefined ||
      movie.year !== undefined ||
      movie.rating !== undefined ||
      movie.runtime !== undefined ||
      (movie.genre && movie.genre.length > 0);

    body = (
    <section
      key={movie.title}
      className="relative isolate w-full min-h-screen overflow-hidden bg-bg"
    >
      {/* Ambient backdrop — the poster, heavily blurred + darkened, for mood
          only. Posters are portrait, so this never crops meaningfully; the
          sharp full poster lives in the right column below. */}
      {movie.poster && (
        <div
          aria-hidden
          /* non-tokenized: h-170 ambient region height primitive */
          className="absolute top-0 left-0 right-0 h-170 overflow-hidden animate-fade-in"
        >
          {/* non-tokenized: blur-[48px] + brightness-[.45] + scale-110 ambient recipe (no token).
              Uses the tiny (~1KB) variant — it's blurred to oblivion anyway, no point
              downloading the full poster twice. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterAt(movie.poster, "tiny")}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-[48px] brightness-[.45] scale-110"
          />
          {/* non-tokenized: top-down fade from the ambient image into the page bg */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,11,0.55)_0%,rgba(10,10,11,0.35)_40%,var(--color-bg)_92%)]" />
        </div>
      )}

      {/* Content — centered max-width shell */}
      {/* non-tokenized: max-w-300 page shell width primitive */}
      <div className="relative z-10 mx-auto max-w-300 px-6 md:px-10">
        {/* Hero: text column + full poster column */}
        {/* non-tokenized: pt-[88px] md+ / pt-12 hero top offset; poster col fixed 300–360px track */}
        <div className="grid grid-cols-1 gap-7 pt-12 md:grid-cols-[1fr_minmax(300px,360px)] md:gap-12 md:pt-22 md:items-start">
          {/* LEFT: text — order-2 on mobile so the poster leads, natural on md+ */}
          <div className="order-2 md:order-1 animate-fade-up [animation-delay:60ms]">
            <p className={`${EYEBROW} text-accent flex items-center gap-2 mb-3`}>
              <span aria-hidden>✦</span>
              <span>Achamos que você vai gostar deste</span>
            </p>
            {/* non-tokenized: leading-none tracking-[-0.03em] display heading recipe */}
            <h1 className="font-display text-40 md:text-56 font-extrabold tracking-[-0.03em] leading-none text-text-primary">
              {movie.title}
            </h1>

            {showMetaStrip && (
              <div className="flex items-center flex-wrap gap-x-3.5 gap-y-2 mt-4 text-13 text-text-secondary">
                {movie.imdbRating !== undefined && (
                  <span className="text-accent text-14 font-semibold">
                    ★ {movie.imdbRating} IMDb
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
              /* non-tokenized: text-[15px] / md:text-[17px] body size between Phase 2 steps; max-w-150 body width primitive */
              <p className="mt-5 mb-6 text-text-primary text-[15px] md:text-[17px] leading-[1.55] max-w-150">
                {movie.synopsis}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 mb-7">
              {primaryService && (
                <a
                  href={primaryService.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <Play size={16} aria-hidden />
                  Assistir em {primaryService.name}
                </a>
              )}
              {isAuthenticated && (
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
                  {saved ? "Salvo" : "Salvar para assistir depois"}
                </button>
              )}
              {/* Note: no disabled/aria-busy here — entering "loading" replaces the entire screen with the skeleton in the branch above, so the button is unmounted while a fetch is in flight. */}
              <button
                type="button"
                onClick={handleAnother}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md text-text-secondary hover:text-text-primary text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <RefreshCw size={16} aria-hidden />
                Recomendar outro
              </button>
            </div>

            {/* Where to watch */}
            {movie.streamingServices.length > 0 && (
              <div className="mb-7">
                <p className={`${EYEBROW} mb-2.5`}>Onde assistir</p>
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

            {/* Cast / Director — omitted if neither field is present */}
            {(movie.director || (movie.cast && movie.cast.length > 0)) && (
              /* non-tokenized: 150px Director column primitive at sm+ */
              <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-5">
                {movie.director && (
                  <div>
                    <p className={`${EYEBROW} mb-1.5`}>Diretor</p>
                    <p className="text-14 font-semibold text-text-primary">
                      {movie.director}
                    </p>
                  </div>
                )}
                {movie.cast && movie.cast.length > 0 && (
                  <div>
                    <p className={`${EYEBROW} mb-1.5`}>Elenco</p>
                    {/* non-tokenized: leading-[1.6] cast list line-height */}
                    <p className="text-14 text-text-secondary leading-[1.6]">
                      {movie.cast.join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: full poster — never cropped (object-contain). Sticky on md+.
              PosterImage blur-ups from a 1KB placeholder and falls back to a film
              icon if the (sometimes-404) poster fails. */}
          <div className="order-1 md:order-2 md:sticky md:top-22 animate-fade-up [animation-delay:120ms]">
            {/* non-tokenized: max-w-[320px] poster width + aspect-2/3 portrait ratio primitives */}
            <PosterImage
              src={movie.poster}
              alt={`Pôster: ${movie.title}`}
              width="hero"
              fit="contain"
              className="mx-auto w-full max-w-[320px] aspect-2/3 rounded-lg border border-border-strong shadow-lg"
            />
          </div>
        </div>

        {/* Similar films rail */}
        {movie.similar && movie.similar.length > 0 && (
          <SimilarRail items={movie.similar} />
        )}
      </div>
    </section>
    );
  }

  return (
    <>
      {body}
      <SnackRecipeModal recipe={recipe} isLoading={status === "loading"} />
    </>
  );
}

/**
 * "Filmes parecidos" rail — horizontal-scrolling row of lightweight similar
 * movie cards (poster + title + ★rating · year). Driven by the live Lambda's
 * `similar` array (genre-superset matches, see recommend.py:_pick_similar).
 * Uses the real IMDb poster URL per card (not the Picsum MovieCard seam, which
 * is bound to the legacy mock Movie type).
 */
function SimilarRail({ items }: { items: ReadonlyArray<SimilarMovie> }) {
  return (
    <div className="mt-12 mb-14 animate-fade-up [animation-delay:260ms]">
      <h2 className="font-display text-20 font-bold text-text-primary mb-3.5">
        Filmes parecidos
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {items.map((m) => (
          <article key={m.movieId} className="shrink-0 w-37.5">
            {/* non-tokenized: aspect-2/3 portrait poster ratio primitive */}
            <PosterImage
              src={m.poster}
              alt={`Pôster: ${m.title}`}
              width="card"
              fit="cover"
              className="w-37.5 aspect-2/3 rounded-md border border-border"
            />
            <p className="mt-2 text-13 font-semibold text-text-primary line-clamp-2 leading-tight">
              {m.title}
            </p>
            <p className="mt-0.5 text-12 text-text-muted flex items-center gap-1.5">
              {m.imdbRating !== undefined && (
                <span className="text-accent">★ {m.imdbRating}</span>
              )}
              {m.imdbRating !== undefined && m.year !== undefined && <span>·</span>}
              {m.year !== undefined && <span>{m.year}</span>}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton — mirrors the live poster-led layout (text column + poster
 * column inside the max-w-300 shell) so the skeleton→content swap doesn't shift.
 * Tokens-only; reuses the same shell / grid / poster primitives as the hero.
 */
function SkeletonHero() {
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
