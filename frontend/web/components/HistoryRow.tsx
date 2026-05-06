"use client";

/**
 * Phase 9 (HIST-01, issue #98) — single history-list row.
 *
 * Poster thumb + title + meta strip (when / mood / match%) + 3 actions
 * (View, Bookmark, Delete). Hover deepens the border.
 *
 * DSGN-06 escape hatches:
 *   - h-[60px] / h-[90px]   : 60×90 poster thumb (below spacing scale)
 *   - w-0.5 h-0.5           : 2×2 dot separator (already on the spacing scale)
 *   - text-[15px]           : title body — between Phase 2 steps (14/16)
 */

import { Bookmark, Clock, Eye, Trash2 } from "lucide-react";
import { posterUrl } from "@/lib/api/recommend";
import type { HistoryEntry } from "@/lib/api/history";

type HistoryRowProps = {
  entry: HistoryEntry;
  onView?: () => void;
  onDelete?: (id: string) => void;
};

export function HistoryRow({ entry, onView, onDelete }: HistoryRowProps) {
  const { movie, when, mood } = entry;

  return (
    <div className="flex items-center gap-4 p-3.5 rounded-xl bg-surface border border-border hover:border-border-strong transition-colors duration-150">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl(movie, 120, 180)}
        alt=""
        loading="lazy"
        onClick={onView}
        /* non-tokenized: 60×90 poster thumb is below Phase 2 spacing scale */
        className="w-[60px] h-[90px] rounded-md object-cover shrink-0 cursor-pointer bg-surface-2"
      />

      <div className="flex-1 min-w-0">
        {/* non-tokenized: text-[15px] body — between Phase 2 steps (14/16) */}
        <p className="text-[15px] font-semibold text-text-primary mb-1 truncate">
          {movie.title}
        </p>
        <div className="text-12 text-text-muted flex flex-wrap gap-x-2.5 gap-y-1 items-center">
          <span className="inline-flex items-center gap-1">
            <Clock size={11} aria-hidden />
            {when}
          </span>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-current" />
          <span>Mood: {mood}</span>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-current" />
          <span className="text-accent">{movie.match}% match</span>
        </div>
      </div>

      <div className="flex gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-13 font-semibold text-text-secondary hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <Eye size={14} aria-hidden />
          View
        </button>
        <button
          type="button"
          aria-label={`Save ${movie.title} to watch later`}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-surface-2 border border-border hover:border-border-strong text-text-secondary hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <Bookmark size={14} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(entry.id)}
          aria-label={`Remove ${movie.title} from history`}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
