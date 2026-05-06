"use client";

/**
 * Phase 10 (WTCL-01..05, issue #99) — watch-later screen.
 *
 * Lives inside (app)/(protected)/ so the Phase 5 RequireAuth gate
 * covers WTCL-02. Reads the localStorage-backed seam on mount; updates
 * local state on remove. Drag-to-reorder is deferred (seam exposes
 * reorderWatchLater for v2).
 *
 * DSGN-06 escape hatches (each marked // non-tokenized inline):
 *   - max-w-[1100px]                            : grid container width
 *   - text-[36px]                               : page title — between Phase 2 steps
 *   - tracking-[0.18em]                         : eyebrow letter-spacing
 *   - gap-[18px]                                : grid gap between 16/20 step
 *   - grid-cols-[repeat(auto-fill,minmax(168px,1fr))] : responsive grid recipe
 *   - w-7 h-7 (top-right X), bg-black/60        : delete-btn primitive
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MovieCard } from "@/components/MovieCard";
import {
  getWatchLater,
  removeFromWatchLater,
} from "@/lib/api/watch-later";
import type { Movie } from "@/lib/api/recommend";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

export default function WatchLaterPage() {
  const [items, setItems] = useState<readonly Movie[] | null>(null);

  useEffect(() => {
    // Read browser-only state into React on mount — same documented exception
    // as AuthContext rehydrate. localStorage is unavailable during SSR.
    /* eslint-disable react-hooks/set-state-in-effect */
    setItems(getWatchLater());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function handleRemove(id: string) {
    removeFromWatchLater(id);
    setItems((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
  }

  const count = items?.length ?? 0;

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-10 md:py-14">
      <div className="flex items-end justify-between gap-5 mb-7 flex-wrap">
        <div>
          <p className={`${EYEBROW} mb-2`}>Library</p>
          {/* non-tokenized: text-[36px] page title — between Phase 2 steps (28/40) */}
          <h1 className="font-display text-[36px] font-extrabold tracking-[-0.02em] leading-[1.05] text-text-primary">
            Watch later
          </h1>
          <p className="text-text-secondary text-14 mt-2">
            <span className="text-text-primary font-semibold">
              {count} {count === 1 ? "movie" : "movies"}
            </span>{" "}
            saved.
          </p>
        </div>
        <Link
          href="/recommendation"
          aria-disabled={count === 0}
          className={`
            inline-flex items-center gap-2 h-12 px-5 rounded-md
            bg-accent hover:bg-accent-hover text-on-accent
            text-14 font-semibold
            transition-colors duration-150
            focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
            ${count === 0 ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <Sparkles size={16} aria-hidden />
          Surprise me from this list
        </Link>
      </div>

      {items === null ? (
        <div
          className="grid gap-[18px] grid-cols-[repeat(auto-fill,minmax(168px,1fr))] animate-pulse"
          aria-busy="true"
        >
          <div className="h-[252px] rounded-lg bg-surface-2" />
          <div className="h-[252px] rounded-lg bg-surface-2" />
          <div className="h-[252px] rounded-lg bg-surface-2" />
          <div className="h-[252px] rounded-lg bg-surface-2" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Your queue is empty."
          body="Get a recommendation and save what catches your eye. Everything you save lives here."
          ctaLabel="Pick a movie for me"
          ctaHref="/"
        />
      ) : (
        <div className="grid gap-[18px] grid-cols-[repeat(auto-fill,minmax(168px,1fr))] animate-fade-up [animation-delay:60ms]">
          {items.map((m) => (
            <div key={m.id} className="relative group">
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                aria-label={`Remove ${m.title} from watch later`}
                /* non-tokenized: 28×28 floating delete primitive over poster */
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <X size={12} aria-hidden />
              </button>
              <MovieCard movie={m} width={168} height={252} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
