"use client";

/**
 * Phase 15 (INTG-HIST-01..02, issue #134) — history screen, real backend.
 *
 * Phase 9 used a rich MOVIES-decorated mock with pre-grouped entries; the
 * real /history Lambda returns only { title, "recommended-at" } per row.
 * Phase 15 degrades the UI to render only that shape, plus locally-computed
 * time-bucket grouping (Today / Yesterday / Last week / Earlier) matching
 * the Phase 9 visual structure.
 *
 * v2.1 backend enrichment is logged as a follow-up — see 15-CONTEXT.md.
 *
 * DSGN-06 escape hatches (each with // non-tokenized inline):
 *   - max-w-[920px]              : column width primitive
 *   - text-[36px]                : page title — between Phase 2 steps (28/40)
 *   - tracking-[0.18em]          : eyebrow letter-spacing (already documented)
 *   - tracking-[0.02em]          : group-label letter-spacing recipe
 */

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { getHistory, type HistoryItem } from "@/lib/api/history";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
import type { ApiError } from "@/lib/api/client";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

type Bucket = "today" | "yesterday" | "lastWeek" | "earlier";

const BUCKET_LABELS: Record<Bucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  lastWeek: "Last week",
  earlier: "Earlier",
};

const BUCKET_ORDER: readonly Bucket[] = [
  "today",
  "yesterday",
  "lastWeek",
  "earlier",
];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function bucketOf(iso: string, now: Date): Bucket {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "earlier";
  if (sameDay(date, now)) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "yesterday";
  const day = 24 * 60 * 60 * 1000;
  if (now.getTime() - date.getTime() < 7 * day) return "lastWeek";
  return "earlier";
}

function relativeTime(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const ms = now.getTime() - date.getTime();
  const min = Math.floor(ms / 60_000);
  const hr = Math.floor(ms / 3_600_000);
  const day = 24 * 60 * 60 * 1000;
  if (sameDay(date, now)) {
    if (min < 60) return min <= 0 ? "Just now" : `${min}m ago`;
    return `${hr}h ago`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";
  if (ms < 7 * day) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const [items, setItems] = useState<readonly HistoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  useApiErrorUx(error);

  useEffect(() => {
    let cancelled = false;
    getHistory().then((res) => {
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

  const buckets = useMemo(() => {
    if (!items) return null;
    const now = new Date();
    const grouped: Record<Bucket, HistoryItem[]> = {
      today: [],
      yesterday: [],
      lastWeek: [],
      earlier: [],
    };
    for (const item of items) {
      grouped[bucketOf(item["recommended-at"], now)].push(item);
    }
    return grouped;
  }, [items]);

  return (
    <div className="max-w-[920px] mx-auto px-6 md:px-10 py-10 md:py-14">
      <p className={`${EYEBROW} mb-2`}>Library</p>
      {/* non-tokenized: text-[36px] page title — between Phase 2 steps (28/40) */}
      <h1 className="font-display text-[36px] font-extrabold tracking-[-0.02em] leading-[1.05] text-text-primary">
        History
      </h1>
      <p className="text-text-secondary text-14 mt-2 mb-8">
        Every recommendation we&apos;ve served you, newest first.
      </p>

      {isLoading || !buckets ? (
        <div
          className="flex flex-col gap-2 animate-pulse"
          aria-busy="true"
          aria-label="Loading history"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-surface" />
          ))}
        </div>
      ) : items && items.length === 0 ? (
        <EmptyState
          title="Your history is empty."
          body="Recommendations you've gotten will show up here."
          ctaLabel="Pick a movie for me"
          ctaHref="/"
        />
      ) : (
        <div className="flex flex-col gap-8 animate-fade-up [animation-delay:60ms]">
          {BUCKET_ORDER.filter((b) => buckets[b].length > 0).map((bucket) => {
            const now = new Date();
            return (
              <section key={bucket}>
                {/* non-tokenized: tracking-[0.02em] is the reference group-label recipe */}
                <h2 className="font-display font-bold text-14 text-text-secondary tracking-[0.02em] mb-3.5">
                  {BUCKET_LABELS[bucket]}
                </h2>
                <div className="flex flex-col gap-2">
                  {buckets[bucket].map((item, idx) => (
                    <div
                      key={`${item["recommended-at"]}-${idx}`}
                      className="flex items-center justify-between px-4 py-3 rounded-md bg-surface border border-border"
                    >
                      <span className="text-14 font-medium text-text-primary truncate pr-4">
                        {item.title}
                      </span>
                      <span className="text-12 text-text-muted shrink-0">
                        {relativeTime(item["recommended-at"], now)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
