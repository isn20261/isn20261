"use client";

/**
 * Phase 16 (INTG-WTCL-01..03, issue #135) — watch-later screen, real backend.
 *
 * Phase 10 used a localStorage-backed MOVIES-decorated grid with a remove
 * button. The real /watch-later Lambda returns only { title, "added-at" }
 * per row and has no PUT/DELETE verb (verified 2026-05-14). Phase 16
 * degrades the UI to a minimal title + relative-time row list, drops the
 * remove button (no backend support), and ships read + add only.
 *
 * v2.1 follow-ups: backend PUT/DELETE for remove; richer GET response
 * (poster URL, mood, etc.) to restore the Phase 10 grid; idempotency on
 * POST to prevent duplicate adds.
 *
 * DSGN-06 escape hatches (each marked // non-tokenized inline):
 *   - max-w-[920px]              : column width primitive (matches Phase 15 history)
 *   - text-[36px]                : page title — between Phase 2 steps (28/40)
 *   - tracking-[0.18em]          : eyebrow letter-spacing (already documented)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  getWatchLater,
  type WatchLaterItem,
} from "@/lib/api/watch-later";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
import type { ApiError } from "@/lib/api/client";
import { relativeTime } from "@/lib/time";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

export default function WatchLaterPage() {
  const [items, setItems] = useState<readonly WatchLaterItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  useApiErrorUx(error);

  useEffect(() => {
    let cancelled = false;
    getWatchLater().then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setIsLoading(false);
        return;
      }
      setItems(res.data);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = items?.length ?? 0;
  const now = new Date();

  return (
    <div className="max-w-[920px] mx-auto px-6 md:px-10 py-10 md:py-14">
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

      {isLoading || items === null ? (
        <div
          className="flex flex-col gap-2 animate-pulse"
          aria-busy="true"
          aria-label="Loading watch-later"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Your queue is empty."
          body="Get a recommendation and save what catches your eye. Everything you save lives here."
          ctaLabel="Pick a movie for me"
          ctaHref="/"
        />
      ) : (
        <div className="flex flex-col gap-2 animate-fade-up [animation-delay:60ms]">
          {items.map((item, idx) => (
            <div
              key={`${item["added-at"]}-${idx}`}
              className="flex items-center justify-between px-4 py-3 rounded-md bg-surface border border-border"
            >
              <span className="text-14 font-medium text-text-primary truncate pr-4">
                {item.title}
              </span>
              <span className="text-12 text-text-muted shrink-0">
                {relativeTime(item["added-at"], now)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
