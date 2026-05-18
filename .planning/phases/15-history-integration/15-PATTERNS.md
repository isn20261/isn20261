# Phase 15: History Lambda Integration — Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 3 (1 modified-as-replace, 1 modified-as-rewrite, 1 side-fix)
**Analogs found:** 3 / 3 — all in-repo from Phase 12 / 14

## File Classification

| File | Change | Closest Analog | Match |
|---|---|---|---|
| `frontend/web/lib/api/history.ts` | REPLACE (mock → wrapper-backed) | `frontend/web/lib/api/preferences.ts` | **exact** |
| `frontend/web/app/(app)/(protected)/history/page.tsx` | MOD (full rewrite — degraded UI shape) | `frontend/web/app/(app)/(protected)/preferences/page.tsx` (mount-fetch pattern) | partial (no write path; no chip toggles; row-list rendering instead) |
| `frontend/web/app/(app)/(protected)/smoke/page.tsx` | MOD (1-line eslint-disable, side-fix) | Phase 14 commit `752bae9` | **exact** (re-apply same patch) |

---

## Pattern Assignments

### `frontend/web/lib/api/history.ts` (service / api-seam)

**Analog:** `frontend/web/lib/api/preferences.ts` (Phase 14).

**Full target shape:**

```ts
/**
 * Phase 15 (INTG-HIST-01..02, issue #134) — Real history Lambda calls.
 *
 * Wrapper-backed read-only seam. Returns Result<T, ApiError> so callers
 * branch on res.ok and feed res.error to useApiErrorUx.
 *
 * Wire format (functions/history/history.py): newest-first array of
 * { title, "recommended-at" }. Kebab-case key is the wire format.
 *
 * Schema gap noted: poster URL, mood, genre, etc. are not returned.
 * Phase 15 renders the minimal shape; v2.1 backend enrichment is a
 * follow-up. See docs/inconsistencias.md §2 + 15-CONTEXT.md.
 */

import { apiGet, type ApiError, type Result } from "@/lib/api/client";

export type HistoryItem = {
  title: string;
  "recommended-at": string; // ISO 8601
};

export async function getHistory(): Promise<Result<readonly HistoryItem[], ApiError>> {
  return apiGet<readonly HistoryItem[]>("/api/v1/history");
}
```

Pre-existing exports (`HistoryEntry`, `HistoryGroup`, `entry()`, `GROUPS`, `getHistory()` mock) are **removed entirely**. No legacy aliases.

---

### `frontend/web/app/(app)/(protected)/history/page.tsx` (route / client-page)

**Analog:** `frontend/web/app/(app)/(protected)/preferences/page.tsx` (mount-effect with cancellation flag + `useApiErrorUx`).

**Match:** partial — preferences has a write path + optimistic commits; history is mount-only-read. Strip the commit/replay/rollback machinery; keep the mount-effect shape.

**Mount-effect (copy verbatim from preferences):**

```tsx
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
```

**Grouping helper (new, ~25 LOC, inline at top of file):**

```ts
type Bucket = "today" | "yesterday" | "lastWeek" | "earlier";

function bucketOf(iso: string, now = new Date()): Bucket {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "earlier"; // malformed → bucket as old
  const ms = now.getTime() - date.getTime();
  const day = 24 * 60 * 60 * 1000;

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, now)) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "yesterday";
  if (ms < 7 * day) return "lastWeek";
  return "earlier";
}

const BUCKET_LABELS: Record<Bucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  lastWeek: "Last week",
  earlier: "Earlier",
};
```

**Relative-time formatter (new, ~20 LOC, inline):**

```ts
function relativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const ms = now.getTime() - date.getTime();
  const min = Math.floor(ms / 60_000);
  const hr = Math.floor(ms / 3_600_000);
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  const day = 24 * 60 * 60 * 1000;

  if (min < 60 && sameDay) return min <= 0 ? "Just now" : `${min}m ago`;
  if (sameDay) return `${hr}h ago`;
  if (sameYesterday) return "Yesterday";
  if (ms < 7 * day) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
```

**Minimal row render:**

```tsx
<div className="flex items-center justify-between px-4 py-3 rounded-md bg-surface border border-border">
  <span className="text-14 font-medium text-text-primary truncate pr-4">
    {item.title}
  </span>
  <span className="text-12 text-text-muted shrink-0">
    {relativeTime(item["recommended-at"])}
  </span>
</div>
```

This is intentionally Phase-9-design-degraded. Tokens-only, DSGN-06 compliant.

**Loading skeleton (inline, ~10 LOC):**

```tsx
<div className="flex flex-col gap-2 animate-pulse" aria-busy="true">
  {Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="h-12 rounded-md bg-surface" />
  ))}
</div>
```

Different shape than Phase 14's `ChipsSkeleton` (those were chip-shaped; these are row-shaped). Inline; don't extract because no expected reuse.

**Empty state:** keep the existing `<EmptyState />` invocation verbatim from Phase 9.

**Imports cleanup:**
- Drop: `useMemo` (removed-id local-delete is gone); `HistoryRow` (orphan); `getHistory` from old types (replaced); `HistoryGroup` (replaced).
- Add: `useApiErrorUx`, `ApiError`, `HistoryItem` (new from `history.ts`).

---

### `frontend/web/app/(app)/(protected)/smoke/page.tsx` (side-fix)

**Analog:** Phase 14's same patch (commit `752bae9`).

**Diff:**
```diff
   function fireSynthetic(kind: ApiError["kind"]) {
+    // eslint-disable-next-line react-hooks/purity -- event-handler, not render-time; harness is scheduled for deletion in Phase 17 (STATE.md "Pending Todos")
     const stamp = Date.now();
```

Same justification as 14-01-SUMMARY §"Deviation 2". When Phase 14 PR merges into `backend-integration`, this branch will need a rebase; the eslint-disable line will be a no-conflict identical line. Benign.

---

## Shared Patterns

### Wrapper-backed typed function (Phase 14 template)
Same shape as `preferences.ts`. One file per Lambda; thin functions over `apiGet` / `apiPost`; return `Promise<Result<T, ApiError>>`.

### Mount-effect with cancellation
Same as `AuthContext.tsx:53-65` and `preferences/page.tsx`.

### `useApiErrorUx` consumption
Same as Phase 14. Single `error` state; hook fires toasts.

### Inline date formatters (new this phase)
Two helpers (`bucketOf`, `relativeTime`) inlined in the page. No new util file because the formatters are page-specific (no expected reuse). If Phase 16 needs relative-time, extract then.

---

## No Analog Found

| File / Concern | Reason | Planner Guidance |
|---|---|---|
| Row skeleton for list of items | No existing row-skeleton in repo. ChipsSkeleton is chip-shaped, wrong primitive. | Inline ~10 LOC; tokens-only. No new file. |
| ISO timestamp parsing in render path | No prior fetch returned timestamps in this codebase (Phase 12 wrapper is generic; Phase 14 had string values not dates). | Use native `Date` constructor. Guard with `Number.isNaN(date.getTime())` defensive check. |

---

## Metadata

**Files scanned:** 6 (history.ts, history/page.tsx, preferences.ts, preferences/page.tsx, history.py, EmptyState.tsx)
**Pattern extraction date:** 2026-05-14
