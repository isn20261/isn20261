# Phase 15: History Lambda Integration — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning (decisions locked 2026-05-14)
**Milestone:** v2.0 — Backend Integration
**Umbrella issue:** #127
**Sub-issue:** #134

<domain>
## Phase Boundary

Phase 15 ships the **first read-only-list screen** integrated against the real backend, and the first place we have to confront a **major wire/UI schema gap**: the `/history` Lambda returns only `{title, "recommended-at"}` per row, while the Phase 9 UI was designed around rich `Movie` objects (poster, mood, runtime, genre, etc.).

**In scope this phase:**
- Rewrite `frontend/web/lib/api/history.ts` to consume the Phase 12 wrapper. New typed function `getHistory()` returns `Promise<Result<HistoryItem[], ApiError>>` where `HistoryItem = { title: string; "recommended-at": string }` (wire-faithful).
- Replace the Phase 9 mock dataset entirely — no `Movie`-decorated rows.
- Rewrite `frontend/web/app/(app)/(protected)/history/page.tsx`: mount-fetch with cancellation; compute grouping locally from ISO timestamps; render a minimal title + relative-time row UI; loading skeleton; empty state (reuse existing `<EmptyState />`); `useApiErrorUx` toast.
- Document the schema gap as a v2.1 backend follow-up (poster URL, mood, id) — `docs/inconsistencias.md §2` already notes the missing `genre` field.

**Out of scope this phase:**
- Phase 13/14/16 — independent at the `lib/api/*` boundary.
- Pagination — Lambda doesn't paginate; if history grows large, render-all is the v2.0 behavior. Logged for v2.1.
- Filters by date / genre / mood — explicitly out per issue #134.
- Delete-entry — local-only delete was a Phase 9 feature; removed in this phase because there's no DELETE endpoint and the issue is read-only.
- Backend changes — read-only milestone. Schema-gap is documented, not patched.
- Live-AWS smoke — DEFERRED, mirroring Phase 12 / Phase 14 patterns.

</domain>

<resolved>
## Resolved decisions (locked 2026-05-14 by user)

### 1. UI shape → **minimal: title + relative-time** (Option A)
The UI degrades to render only what the Lambda returns. No poster, no mood, no metadata. The Phase 9 visual richness is lost; this is the cost of the Lambda's current shape. Logged for v2.1 backend enrichment.

### 2. Grouping → **compute locally from timestamps** (Option A)
The page bucketizes entries by computed relative date: Today / Yesterday / Last week / Earlier (matching the Phase 9 group labels). Algorithm:
- `today` = sample date matches `Date()` calendar day
- `yesterday` = matches Date() minus one calendar day
- `lastWeek` = within last 7 days but not today/yesterday
- `earlier` = older
Entries within a group remain newest-first (the Lambda already sorts).

This keeps the Phase 9 visual structure intact even though row content is degraded.
</resolved>

<decisions>
## Implementation Decisions (locked unless flagged)

### Wrapper consumption — mirror `lib/api/preferences.ts` (Phase 14)
**Locked:** New `lib/api/history.ts` shape:

```ts
import { apiGet, type ApiError, type Result } from "@/lib/api/client";

export type HistoryItem = {
  title: string;
  "recommended-at": string; // ISO 8601 timestamp
};

export async function getHistory(): Promise<Result<readonly HistoryItem[], ApiError>> {
  return apiGet<readonly HistoryItem[]>("/api/v1/history");
}
```

### Existing component re-use vs replacement
**Locked:**
- `<EmptyState />` (`components/EmptyState.tsx`) — **reuse** for empty case. Already token-clean; copy stays the same.
- `<HistoryRow />` (`components/HistoryRow.tsx`) — **DO NOT reuse**. It accepts a rich `HistoryEntry` with a Movie inside; our minimal shape can't satisfy it. We inline the new minimal row inside `history/page.tsx` rather than refactor `HistoryRow` (Phase 9 design is dead-lettered with the rich mock removal).
- The page-level skeleton (3 × `h-[118px] rounded-xl bg-surface`) — **keep** if it visually approximates the new minimal row, OR replace with a new lighter skeleton.

### Type co-location
**Locked:** `HistoryItem` is exported from `lib/api/history.ts`. `HistoryEntry` / `HistoryGroup` (the old Phase 9 types) are **deleted** — no consumer outside `history.ts` and `history/page.tsx`.

### Relative-time formatter
**Locked:** Inline minimal formatter inside `history/page.tsx` (no new util file). Algorithm:
- < 1 hour ago → `"Nm ago"` (minutes)
- < 24 hours and same calendar day → `"Nh ago"` (hours)
- yesterday → `"Yesterday"`
- < 7 days → weekday name (`"Mon"`, `"Tue"`, …)
- otherwise → `"MMM D"` (e.g. `"Apr 2"`)

This is per-row label, distinct from the group label. Avoids `date-fns` dep (not in package.json).

### Error UX — `useApiErrorUx(error)` on mount-fetch
**Locked:** Same pattern as Phase 14. Mount-fetch error feeds `error` state; hook toasts network/server/forbidden; silent for unauthorized (wrapper already logs out); silent for validation (no inline form here, but the endpoint is unlikely to validate a GET).

### Smoke deferred (mirror Phase 12 / 14)
**Locked:** Live-AWS round-trip (`GET /history` + DynamoDB scan of `Historico` table for the user's `sub`) is SKIPPED-AWS-DEFERRED. Run-when-home checklist preserved in `15-02-SUMMARY.md`.

### Smoke harness lint side-fix
**Locked:** This branch is forked off `backend-integration`, which still has the unfixed `Date.now()` lint violation in `app/(app)/(protected)/smoke/page.tsx:66` (Phase 14 fixed it on its own branch). Re-apply the 1-line `eslint-disable-next-line react-hooks/purity` patch on this branch as a side-fix to unblock the lint gate. When Phase 14 PR merges, conflict resolution will keep the single eslint-disable line. Documented in the 15-01 SUMMARY.

</decisions>

<canonical_refs>
## Canonical References

### Phase 12 wrapper (the seam being consumed)
- `frontend/web/lib/api/client.ts` — `apiGet<T>` / `Result<T, ApiError>`.
- `frontend/web/lib/api/useApiErrorUx.ts` — error→UX hook.
- `frontend/web/lib/api/preferences.ts` — Phase 14's template for typed `lib/api/<endpoint>.ts` files.

### Current UI being modified
- `frontend/web/app/(app)/(protected)/history/page.tsx` — Phase 9 client component, currently mock-backed. Full rewrite.
- `frontend/web/lib/api/history.ts` — Phase 9 mock; full replace.
- `frontend/web/components/HistoryRow.tsx` — kept on disk but unused by /history after this phase. Phase 17 cleanup can delete.
- `frontend/web/components/EmptyState.tsx` — reused as-is.

### Lambda contract (read-only)
- `functions/history/history.py` — wire format: `[{title, "recommended-at"}]`, ScanIndexForward=False (newest-first). Returns 401 if no sub; 200 with `[]` for empty.
- `__main__.py` history route: `create_route("/api/v1/history", "GET", history_lambda, auth_id=authorizer.id)` (JWT-authed).
- `docs/inconsistencias.md §2` — documents the absent `genre` field; the broader shape gap (poster, mood, etc.) is similar but not yet ticketed for v2.1.

### Project rules
- `frontend/web/AGENTS.md` — DSGN-06.
- `CLAUDE.md` — milestone hard rules.

### Milestone artifacts
- `.planning/REQUIREMENTS.md` — INTG-HIST-01 (GET integration) + INTG-HIST-02 (loading/error/empty).
- `.planning/ROADMAP.md` §Phase 15.
- Issue #134.

### Phase 14 docs (templates)
- `.planning/phases/14-preferences-integration/14-CONTEXT.md` — convention.
- `.planning/phases/14-preferences-integration/14-01-PLAN.md` — single-screen Lambda swap template.
- `.planning/phases/14-preferences-integration/14-03-SUMMARY.md` — phase-close + deferred-smoke pattern.

</canonical_refs>

<code_context>
## Code Context

### Reusable
- `apiGet<T>` / `Result<T, ApiError>` from `client.ts`.
- `useApiErrorUx` from `useApiErrorUx.ts`.
- `<EmptyState />` from `components/EmptyState.tsx`.
- Mount-effect with cancellation flag pattern (`AuthContext.tsx:53-65`).

### Deleted / unused after Phase 15
- The MOVIES-decorated `HistoryEntry` / `HistoryGroup` types in `lib/api/history.ts` — gone.
- The pre-computed groups + `entry()` helper in `history.ts` — gone.
- `<HistoryRow />` component — orphaned. Logged as Phase 17 cleanup; no consumer touches it.

### NOT reused (intentionally)
- Phase 14's `ChipsSkeleton` — wrong shape for history rows. Page inlines a `h-16 bg-surface rounded-md` skeleton or extracts a new `<RowSkeleton />`.

### Patterns to follow
- Wrapper-backed typed-function shape (Phase 14).
- Mount-effect with cancellation.
- `useApiErrorUx` consumption.

</code_context>

<assumptions>
## Assumptions to Verify in Planning

- **`/history` returns 200 + `[]` for users with no history.** Per `functions/history/history.py` — `historico().query()` returns `{'Items': []}` for empty; the list comprehension yields `[]`; `ok([])` returns `[]`. ✅ Empty case = empty array, not 404.
- **The `Historico` DynamoDB table partition key is `sub`.** Per Lambda's `KeyConditionExpression=Key("sub").eq(sub)`. ✅
- **ISO timestamp format is stable.** Lambda returns whatever `item["timestamp"]` is — assumed ISO 8601. If it's something else (epoch number, date string), the relative-time formatter breaks. Planner: verify by sample or by looking at writer code (likely `recommend` Lambda).
- **No pagination contract.** Lambda returns ALL items for the sub. No `LastEvaluatedKey` handling needed for v2.0. Flag for v2.1 if history grows past a few hundred items per user.

</assumptions>

<deferred>
## Noted for Later
- **v2.1 backend enrichment**: `/history` could return poster URL, mood, runtime, etc. — would unlock the Phase 9 rich design. Open a follow-up issue.
- **v2.1 frontend**: re-instate rich rows when backend grows the response.
- **v2.1 pagination**: if any teammate's history exceeds a few hundred items, render-all becomes a perf issue.
- **HistoryRow component cleanup**: orphaned by this phase. Phase 17 deletion candidate.
- **Local-delete behavior** from Phase 9 is dropped. No DELETE endpoint exists; the UI no longer exposes the action.
</deferred>

---

*Phase: 15-history-integration*
*Context gathered: 2026-05-14*
