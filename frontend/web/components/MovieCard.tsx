"use client";

/**
 * Phase 7 (RECO-01, issue #96) — reusable movie card.
 *
 * Used by `/recommendation` Similar-films rail and (future) home rails.
 * Static card with hover lift; the reference's hover-action overlay
 * (shared.jsx:190-200) is deferred to post-milestone polish.
 *
 * DSGN-06 escape hatches:
 *   - bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,transparent_50%)]
 *     : bottom-half legibility scrim — rgba black at varying opacities,
 *       no Phase 2 token; promote if reused.
 *   - shadow-[0_2px_8px_rgba(0,0,0,0.3)] / shadow-[0_12px_28px_rgba(0,0,0,0.5)]
 *     : depth recipe (rest / hover) — composed shadows above Phase 2's
 *       rounded shadow-md/lg.
 *   - hover:-translate-y-[3px]  : 3px lift primitive (below the spacing scale)
 */

import { useState } from "react";
import { posterUrl, type Movie } from "@/lib/api/recommend";

type MovieCardProps = {
  movie: Movie;
  width?: number;
  height?: number;
  onClick?: () => void;
};

export function MovieCard({
  movie,
  width = 168,
  height = 252,
  onClick,
}: MovieCardProps) {
  const [hover, setHover] = useState(false);
  const isInteractive = typeof onClick === "function";

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={`shrink-0 ${isInteractive ? "cursor-pointer" : ""}`}
      /* non-tokenized: width is a runtime prop primitive — set via CSS var rather than inline style to keep DSGN-06 clean */
      style={
        {
          ["--ra-card-w" as string]: `${width}px`,
          ["--ra-card-h" as string]: `${height}px`,
        } as React.CSSProperties
      }
    >
      <div
        className={`
          relative overflow-hidden rounded-lg bg-surface-2
          w-[var(--ra-card-w)] h-[var(--ra-card-h)]
          transition-[transform,box-shadow] duration-200
          ${hover ? "-translate-y-[3px] shadow-[0_12px_28px_rgba(0,0,0,0.5)]" : "shadow-[0_2px_8px_rgba(0,0,0,0.3)]"}
        `}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl(movie, width * 2, height * 2)}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover block"
        />
        {/* non-tokenized: bottom-half legibility scrim — rgba black, no Phase 2 token */}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,transparent_50%)]" />
      </div>
      <div className="mt-2 flex flex-col gap-0.5 w-[var(--ra-card-w)]">
        <span className="text-14 font-medium text-text-primary truncate">
          {movie.title}
        </span>
        <span className="text-12 text-text-muted">
          {movie.year} · {movie.match}% compatível
        </span>
      </div>
    </div>
  );
}
