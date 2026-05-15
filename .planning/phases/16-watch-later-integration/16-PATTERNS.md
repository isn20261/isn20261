# Phase 16: Watch-Later Lambda Integration — Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 4 (1 replace, 2 modify, 1 side-fix)

## File Classification

| File | Change | Closest Analog | Match |
|---|---|---|---|
| `frontend/web/lib/api/watch-later.ts` | REPLACE (localStorage → wrapper-backed; remove ops dropped) | `frontend/web/lib/api/preferences.ts` + `lib/api/history.ts` | **exact** for the typed-seam shape |
| `frontend/web/app/(app)/(protected)/watch-later/page.tsx` | MOD (full rewrite — minimal rows; no remove) | `frontend/web/app/(app)/(protected)/history/page.tsx` (mount-fetch + minimal row + relative-time + EmptyState) | **near-exact** (no buckets; flat list) |
| `frontend/web/app/(app)/recommendation/page.tsx` | MOD (Save toggle → add-only async) | the Save toggle inside same file (Phase 7 / Phase 10) | partial |
| `frontend/web/app/(app)/(protected)/smoke/page.tsx` | MOD (1-line eslint-disable side-fix) | Phase 14/15 commits | **exact** |

---

## Pattern Assignments

### `frontend/web/lib/api/watch-later.ts`

**Analog:** Phase 15's `history.ts` (read-only function) + Phase 14's `preferences.ts` (`apiPost` write).

**Full file:**

```ts
/**
 * Phase 16 (INTG-WTCL-01..03, issue #135) — Real watch-later Lambda calls.
 *
 * Wrapper-backed read + add seam. Returns Result<T, ApiError>.
 *
 * Wire format (functions/watch_later/watch_later.py):
 *   GET  /api/v1/watch-later → [{ title, "added-at" }] (newest items first)
 *   POST /api/v1/watch-later { movieId } → 201 created, empty body
 *
 * Backend gap (verified 2026-05-14): no PUT / DELETE. Remove deferred to v2.1.
 * See 16-CONTEXT.md §"Resolved decisions" + docs/inconsistencias.md §3-4.
 */

import { apiGet, apiPost, type ApiError, type Result } from "@/lib/api/client";

export type WatchLaterItem = {
  title: string;
  "added-at": string; // ISO 8601
};

export async function getWatchLater(): Promise<
  Result<readonly WatchLaterItem[], ApiError>
> {
  return apiGet<readonly WatchLaterItem[]>("/api/v1/watch-later");
}

export async function addWatchLater(
  movieId: string,
): Promise<Result<null, ApiError>> {
  return apiPost<null>("/api/v1/watch-later", { movieId });
}
```

**Removed:** localStorage plumbing, `WATCH_LATER_KEY`, `isInWatchLater`, `removeFromWatchLater`, `reorderWatchLater`, `watchLaterCount`. MOVIES join. SSR `typeof window` guards (wrapper handles SSR via `getSession()`).

---

### `frontend/web/app/(app)/(protected)/watch-later/page.tsx`

**Analog:** `app/(app)/(protected)/history/page.tsx` (mount-fetch + minimal row + relative-time + EmptyState).

**Differences from history:**
- No bucket grouping — flat newest-first list ordered by Lambda response.
- No remove button (backend gap).
- Page-level "Surprise me from this list" CTA stays — links to `/recommendation`. Disabled when list is empty.
- Wider column (`max-w-[920px]` is fine for both; Phase 10 had `max-w-[1100px]` for the rich grid — drop to 920px for the minimal list to match history).
- Count badge in header: `"{n} movies saved."` — keep, computed locally.

**Key file body:**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { getWatchLater, type WatchLaterItem } from "@/lib/api/watch-later";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
import type { ApiError } from "@/lib/api/client";
import { relativeTime } from "@/lib/time"; // extracted from Phase 15

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
      if (!res.ok) { setError(res.error); setIsLoading(false); return; }
      setItems(res.data);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const count = items?.length ?? 0;
  const now = new Date();

  return (
    <div className="max-w-[920px] mx-auto px-6 md:px-10 py-10 md:py-14">
      <div className="flex items-end justify-between gap-5 mb-7 flex-wrap">
        <div>
          <p className={`${EYEBROW} mb-2`}>Library</p>
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
          className={`inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${count === 0 ? "pointer-events-none opacity-50" : ""}`}
        >
          <Sparkles size={16} aria-hidden />
          Surprise me from this list
        </Link>
      </div>

      {isLoading || items === null ? (
        <div className="flex flex-col gap-2 animate-pulse" aria-busy="true" aria-label="Loading watch-later">
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
```

---

### `frontend/web/lib/time.ts` (NEW — extracted from Phase 15's history page)

**Analog:** the inline helpers in `history/page.tsx`.

**Full file:**

```ts
/**
 * Shared time helpers consumed by Phase 15 (history) and Phase 16 (watch-later).
 * Frozen-`Date`-friendly: all callers pass `now`, so tests can inject.
 */

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function relativeTime(iso: string, now: Date): string {
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
```

Phase 15's `history/page.tsx` imports from `@/lib/time` instead of inlining (small refactor inside Phase 16's commit boundary; documented in 16-01 SUMMARY as a side-touch). The `bucketOf` helper stays inlined in history because it's history-specific (not needed by watch-later).

---

### `frontend/web/app/(app)/recommendation/page.tsx` — Save toggle adapter

**Minimal change scope:** only the watch-later interactions.

**Diff (illustrative, planner finalizes by file Read):**

```diff
- import {
-   addToWatchLater,
-   isInWatchLater,
-   removeFromWatchLater,
- } from "@/lib/api/watch-later";
+ import { addWatchLater } from "@/lib/api/watch-later";
+ import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
+ import type { ApiError } from "@/lib/api/client";
```

```diff
- setSaved(isInWatchLater(next.id));
+ setSaved(false); // membership pre-check unavailable — wire returns no movieIds
```

```diff
-   function handleToggleSave() {
-     if (!movie) return;
-     if (saved) {
-       removeFromWatchLater(movie.id);
-       setSaved(false);
-     } else {
-       addToWatchLater(movie.id);
-       setSaved(true);
-     }
-   }
+   const inFlight = useRef(false);
+   const [saveError, setSaveError] = useState<ApiError | null>(null);
+   useApiErrorUx(saveError);
+   async function handleSave() {
+     if (!movie || saved || inFlight.current) return;
+     inFlight.current = true;
+     setSaved(true); // optimistic
+     const res = await addWatchLater(movie.id);
+     inFlight.current = false;
+     if (!res.ok) {
+       setSaved(false); // rollback
+       setSaveError(res.error);
+     }
+   }
```

Button text changes from "Saved" / "Save for later" toggle to a one-way "Save for later" → "Saved" (no un-save).

---

### `frontend/web/app/(app)/(protected)/smoke/page.tsx` — same Phase 14/15 side-fix

1-line `eslint-disable` above `Date.now()` on line 66.

---

## No analog

| Concern | Reason | Planner Guidance |
|---|---|---|
| `relativeTime` extraction | First two-consumer point. | Move to `lib/time.ts` cleanly. ~25 LOC. |
| `inFlight` single-shot guard (vs Phase 14 replay queue) | Phase 14 needed replay (multi-field); Phase 16 has 1 button per movie. | `useRef<boolean>` single-shot. ~5 LOC. |

---

## Metadata

**Files scanned:** 7
**Pattern extraction date:** 2026-05-14
