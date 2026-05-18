# Phase 16: Watch-Later Lambda Integration — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning (decisions locked 2026-05-14)
**Milestone:** v2.0 — Backend Integration
**Umbrella issue:** #127
**Sub-issue:** #135

<domain>
## Phase Boundary

Phase 16 ships the integration of the watch-later screen + add-from-recommendation flow against the real backend. It is also the phase where we **discover the backend doesn't support the full add/remove/read trio** that issue #135 assumes — only GET + POST are wired. Remove (via PUT or DELETE) is **NOT implemented** in the Lambda or the API Gateway routes.

**In scope this phase:**
- Rewrite `frontend/web/lib/api/watch-later.ts`: replace localStorage-backed sync API with wrapper-backed async functions `getWatchLater()` + `addWatchLater(movieId)`. Returns `Result<T, ApiError>`.
- Rewrite `frontend/web/app/(app)/(protected)/watch-later/page.tsx`: mount-fetch via `getWatchLater()`; render minimal title + added-at row list (matching Phase 15's shape decision); loading skeleton; reused `<EmptyState />`; `useApiErrorUx` toast. **Hide the remove button** until backend has PUT/DELETE.
- Update `frontend/web/app/(app)/recommendation/page.tsx`: switch the Save toggle to use the new async `addWatchLater()`. Convert to **add-only**: once saved this session, the button stays saved with no un-save action (no DELETE on backend). The pre-existing membership check (`isInWatchLater`) is dropped because the GET response doesn't return movieIds.
- Same smoke-harness side-fix as Phase 14/15 (1-line `eslint-disable`).
- Document the backend gap (no PUT/DELETE) — open v2.1 follow-up to add `_put()` or `_delete()` handlers + matching route.

**Out of scope this phase:**
- Remove (DELETE / PUT-as-replace) — verified absent from Lambda + API Gateway; backend change required (read-only milestone).
- Reordering — Phase 10 had a `reorderWatchLater()` seam that was never UI-exposed; the backend has no reorder verb either. Dropped entirely.
- Membership pre-check from /recommendation Save toggle — wire shape gap (no movieId in response). Local-session-only "saved" flag instead.
- Rich movie cards on /watch-later — wire shape returns only title + added-at; UI degrades like Phase 15.
- Backend changes — only documented, not applied.
- Phase 13 (Recommendation Lambda integration) — being handled by a parallel teammate. Phase 16's recommendation-page edits are minimal (only the Save toggle); the rest of the page is left for Phase 13 to refactor.

</domain>

<resolved>
## Resolved decisions (locked 2026-05-14 by user)

### 1. UI shape → **minimal: title + added-at** (Option A)
Mirrors Phase 15. Drops the MovieCard grid. Renders simple rows. Backend enrichment deferred to v2.1.

### 2. Remove/delete via PUT → **NOT IMPLEMENTED in current backend** (verified)
User clarified: "delete será feito através do put. verifique a possibilidade se está implementada e documente." Verification result: **PUT is not implemented**.
- `functions/watch_later/watch_later.py` handler dispatches only on `GET` and `POST`; PUT falls through to `bad_request("Method not allowed")`.
- `__main__.py` route table contains `create_route("/api/v1/watch-later", "GET", ...)` and `create_route("/api/v1/watch-later", "POST", ...)`. **No PUT route.**

**Implication for Phase 16:** ship read + add only. Remove is hidden in /watch-later (no button) and the Save toggle in /recommendation becomes add-only (no un-save). The full toggle/remove UX is restored in a future PR after backend adds PUT (or DELETE) — opened as a v2.1 follow-up issue. Documented in commit body and SUMMARY.

</resolved>

<decisions>
## Implementation Decisions (locked unless flagged)

### Wrapper consumption — mirror `preferences.ts` (P14) + `history.ts` (P15)
**Locked:** New `lib/api/watch-later.ts` shape:

```ts
import { apiGet, apiPost, type ApiError, type Result } from "@/lib/api/client";

export type WatchLaterItem = {
  title: string;
  "added-at": string; // ISO 8601
};

export async function getWatchLater(): Promise<Result<readonly WatchLaterItem[], ApiError>> {
  return apiGet<readonly WatchLaterItem[]>("/api/v1/watch-later");
}

export async function addWatchLater(movieId: string): Promise<Result<null, ApiError>> {
  return apiPost<null>("/api/v1/watch-later", { movieId });
}
```

**Removed from the seam (compared to Phase 10):** `isInWatchLater`, `removeFromWatchLater`, `reorderWatchLater`, `watchLaterCount`, `WATCH_LATER_KEY` const, all localStorage plumbing.

### `/watch-later` page — minimal row + hide remove
**Locked:** Same row pattern as Phase 15:
- Mount-fetch via `getWatchLater()` with cancellation flag.
- Loading skeleton (~6 rows, `h-12 rounded-md bg-surface`).
- Empty state: `<EmptyState />` reused.
- Each row: `flex items-center justify-between` with title (truncate left) and relative-time (right). No poster, no metadata, no remove button.
- The "Surprise me from this list" CTA stays — links to `/recommendation`. Disabled when count is 0.

### `/recommendation` Save toggle — add-only
**Locked:** The Save button:
- Was a toggle that called `addToWatchLater` or `removeFromWatchLater` based on `isInWatchLater(movie.id)`.
- Becomes an add-only action that calls `addWatchLater(movie.id)`. Once clicked, `setSaved(true)` and the button stays in saved state for the rest of the session (or until a different movie is picked, when it resets).
- The mount-time membership check (`setSaved(isInWatchLater(movie.id))`) is **removed** — wire doesn't return movieIds, so we can't know. `saved` defaults to `false` per movie shown.
- On `addWatchLater` failure, `useApiErrorUx` toasts and the button reverts to unsaved state (rollback).

### Add update strategy — per-action optimistic with single-shot in-flight guard
**Locked:** Mirrors Phase 14's strategy (per issue #135 explicit requirement that Phase 16 mirror Phase 14 unless plan justifies divergence).
- Click Save → optimistic `setSaved(true)` → `addWatchLater(movie.id)` fires.
- If in-flight, the second click is dropped (single-shot guard via `useRef<boolean>`). User can't double-add on rapid clicks.
- On `!ok`, rollback to `setSaved(false)` and `useApiErrorUx` toasts.

**Divergence from P14:** no replay queue. P14's queue handled multi-field rapid toggling; here there's only one button per recommendation, and the wire is idempotent on the same movieId (the Lambda's `list_append` will add a duplicate entry though — Lambda quirk noted below).

### Lambda quirks documented (not patched)
**Locked:**
1. **No PUT/DELETE** — read+add only. Remove deferred.
2. **No idempotency check on POST** — sending the same `movieId` twice produces two rows in DynamoDB (per `list_append` semantics in `watch_later.py:60`). Frontend single-shot guard mitigates same-session duplicates; cross-session double-adds remain possible. Logged for v2.1 backend cleanup.
3. **GET response strips movieId** — only `{title, "added-at"}` per row (docs/inconsistencias.md §4). Frontend can't determine "is this saved?" without a title match (lossy and per-render only).

### Smoke deferred (mirror Phase 12 / 14 / 15)
**Locked:** Live-AWS round-trip SKIPPED-AWS-DEFERRED. Run-when-home checklist in 16-02-SUMMARY.md.

### Smoke harness lint side-fix
**Locked:** Re-apply the Phase 14/15 `eslint-disable-next-line react-hooks/purity` on `app/(app)/(protected)/smoke/page.tsx:66`. Branch off `backend-integration` (pre-Phase-14), so the fix isn't here yet.

### Orphaned MovieCard / WatchLaterPage components
**Locked:** No new orphans expected. The Phase 10 page imported `<MovieCard />` for the rich grid; the new minimal row inlines the markup. `<MovieCard />` stays on disk — still used by `/recommendation` for the recommendation card. No deletion in Phase 16.

</decisions>

<canonical_refs>
## Canonical References

### Phase 12 wrapper (consumed)
- `frontend/web/lib/api/client.ts`
- `frontend/web/lib/api/useApiErrorUx.ts`

### Phase 14/15 templates
- `frontend/web/lib/api/preferences.ts` — typed seam template
- `frontend/web/lib/api/history.ts` — minimal-shape, GET-only template
- `frontend/web/app/(app)/(protected)/preferences/page.tsx` — optimistic-with-rollback `commit()` (simplify to single-shot for Phase 16)
- `frontend/web/app/(app)/(protected)/history/page.tsx` — mount-fetch + minimal row + relative-time + bucketing

### Current UI being modified
- `frontend/web/app/(app)/(protected)/watch-later/page.tsx` — Phase 10 client; full rewrite.
- `frontend/web/app/(app)/recommendation/page.tsx` — Save toggle adapter (minimal change).
- `frontend/web/lib/api/watch-later.ts` — full replace.

### Lambda contract (read-only)
- `functions/watch_later/watch_later.py` — verb dispatch + GET/POST handlers.
- `__main__.py:343-344` — route table (GET + POST only).
- `docs/inconsistencias.md §3-4` — wire format notes.

### Phase 14/15 docs (templates)
- `.planning/phases/14-preferences-integration/14-CONTEXT.md`
- `.planning/phases/15-history-integration/15-CONTEXT.md`

</canonical_refs>

<code_context>
## Code Context

### Reusable
- `apiGet<T>` / `apiPost<T>` / `Result<T, ApiError>`.
- `useApiErrorUx`.
- `<EmptyState />`.
- Mount-effect-with-cancellation pattern (Phase 14/15).
- Relative-time formatter from `history/page.tsx` — could extract to `lib/utils.ts` (planner picks).

### Deleted / no longer used
- `WATCH_LATER_KEY` localStorage const.
- `isInWatchLater`, `removeFromWatchLater`, `reorderWatchLater`, `watchLaterCount` functions.
- Phase 10 grid layout with `<MovieCard />` on /watch-later (page uses minimal rows now).

### NOT modified
- `<MovieCard />` — still consumed by /recommendation. Untouched.

### Open question for planner
- **Extract relativeTime / bucketOf to a util?** Phase 15 inlined them in `history/page.tsx`. Phase 16 needs `relativeTime` for `added-at` rendering — exactly the same logic. Three options:
  - (a) Copy-paste inline (same as Phase 15, ~25 LOC).
  - (b) Extract to `frontend/web/lib/utils.ts` (or new `lib/time.ts`) and import in both pages.
  - (c) Defer extraction until a third consumer arrives (YAGNI).
  Recommend **(b)** now — two consumers + Phase 15 SUMMARY explicitly flagged this as a likely extraction point. ~30 LOC moves; both pages shrink.

</code_context>

<assumptions>
## Assumptions to Verify in Planning

- **`/watch-later` GET returns 200 + `[]` for users with no saves.** Per `functions/watch_later/watch_later.py:_get` — `user.get("watchLater") or []` yields `[]` when missing. ✅
- **POST returns 201 with empty body.** `created()` likely returns `{statusCode: 201, body: ""}`. The wrapper's `text === ""` branch yields `null as T`. ✅ Phase 14's `Result<null, ApiError>` shape works.
- **The cross-package import bug from CONCERNS.md / inconsistencias.md is already fixed in main per user (2026-05-14).** This branch is off `backend-integration` which may not have that fix; live-AWS smoke (deferred) would expose it if not. Documented as run-when-home checklist item.
- **The Lambda accepts `movieId` even if the id doesn't match any catalog movie.** Per `_resolve_movie(movie_id)` returning None → falls back to `title = movieId`. ✅ No crash.

</assumptions>

<deferred>
## Noted for Later
- **v2.1 backend**: add `_put()` or `_delete()` handler to support remove. Route `PUT /api/v1/watch-later` or `DELETE /api/v1/watch-later/{id}`. Unblocks the remove UX.
- **v2.1 backend**: dedupe on POST (skip if movieId already in watchLater). Otherwise frontend has to over-engineer.
- **v2.1 backend**: include `movieId` in GET response so frontend can do membership checks.
- **v2.1 frontend**: re-instate rich MovieCard grid when backend response gains poster URL.
- **v2.1 frontend**: re-instate remove button when DELETE/PUT lands.
- **v2.1 frontend**: re-instate the membership pre-check in /recommendation Save toggle when movieId lands in GET response.
</deferred>

---

*Phase: 16-watch-later-integration*
*Context gathered: 2026-05-14*
