/**
 * Shared movie hero — the poster-led layout used by BOTH `/recommendation` and
 * `/movie/[movieId]` (issue #221).
 *
 * Extracted verbatim from the recommendation screen's "ready" branch so the two
 * surfaces can't drift. It is purely presentational (no hooks, no fetch, no
 * directive) so it renders fine as a server component on the statically-exported
 * detail page AND inside the client recommendation page. The two page-specific
 * bits — the eyebrow line above the title and the action buttons under the
 * synopsis — are passed in as `eyebrow` / `actions` slots.
 *
 * DSGN-06 escape hatches are carried over unchanged from the recommendation
 * screen (each marked // non-tokenized inline); see that file's header for the
 * full catalogue of primitives.
 */

import type { ReactNode } from "react";
import { ServiceBadge } from "@/components/ServiceBadge";
import { PosterImage } from "@/components/PosterImage";
import { posterAt } from "@/lib/posters";
import type { RecommendedMovie, SimilarMovie } from "@/lib/api/recommend.real";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

type MovieDetailProps = {
  movie: RecommendedMovie;
  /** Small label rendered above the title (e.g. the recommendation pitch). */
  eyebrow: ReactNode;
  /** Action buttons rendered under the synopsis. Omit for a read-only view. */
  actions?: ReactNode;
};

export function MovieDetail({ movie, eyebrow, actions }: MovieDetailProps) {
  const showMetaStrip =
    movie.imdbRating !== undefined ||
    movie.year !== undefined ||
    movie.rating !== undefined ||
    movie.runtime !== undefined ||
    (movie.genre && movie.genre.length > 0);

  return (
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
            {eyebrow}
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
            {actions && <div className="flex flex-wrap gap-2.5 mb-7">{actions}</div>}

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

/**
 * "Filmes parecidos" rail — horizontal-scrolling row of lightweight similar
 * movie cards (poster + title + ★rating · year). Each card links to that
 * movie's own `/movie/[movieId]` detail page (issue #221).
 */
function SimilarRail({ items }: { items: ReadonlyArray<SimilarMovie> }) {
  return (
    <div className="mt-12 mb-14 animate-fade-up [animation-delay:260ms]">
      <h2 className="font-display text-20 font-bold text-text-primary mb-3.5">
        Filmes parecidos
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {items.map((m) => (
          <a
            key={m.movieId}
            href={`/movie?id=${m.movieId}`}
            className="shrink-0 w-37.5 group rounded-md focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <article>
              {/* non-tokenized: aspect-2/3 portrait poster ratio primitive */}
              <PosterImage
                src={m.poster}
                alt={`Pôster: ${m.title}`}
                width="card"
                fit="cover"
                className="w-37.5 aspect-2/3 rounded-md border border-border transition-colors group-hover:border-border-strong"
              />
              <p className="mt-2 text-13 font-semibold text-text-primary line-clamp-2 leading-tight group-hover:text-accent transition-colors">
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
          </a>
        ))}
      </div>
    </div>
  );
}
