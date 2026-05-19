# Phase 15 · Plan 15-02 — Phase Close SUMMARY

**Completed:** 2026-05-14
**Phase status:** ✅ Complete (live-AWS smoke SKIPPED-AWS-DEFERRED)
**Plans executed:** 15-01 ✅, 15-02 ✅ (this doc + transition)
**Branch:** `feature/issue-134-history-integration` → opens PR into `backend-integration`

---

## Goal restated and verified

Phase 15 ships the **first read-only-list integration** against the real backend. Confronts the schema gap (Lambda returns only `{title, "recommended-at"}` vs Phase 9's rich `Movie`-backed rows) by degrading the UI to the wire faithfully. Local-computed time-bucket grouping preserves the Phase 9 visual structure.

---

## Block A — Static gates (all green)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ (14/14 pages prerendered) |
| `git grep -n 'mock' frontend/web/lib/api/history*` | ✅ 0 hits |
| `git grep -nE '\bfetch\(' lib/api/history.ts 'app/(app)/(protected)/history/'` | ✅ 0 hits |
| No new DSGN-06 violations | ✅ |

## Block B — UI compliance (deferred-with-smoke for live interaction; layout pass green)

- Page structure preserved from Phase 9 (column max-w-[920px], eyebrow, title, subtitle).
- Section order: Today → Yesterday → Last week → Earlier — bucket order const verified.
- Empty state: `<EmptyState />` reused as-is from Phase 9 components.
- Three-breakpoint visual check is part of the run-when-home Block C checklist.

## Block C — Live-AWS smoke (SKIPPED-AWS-DEFERRED, per user 2026-05-14)

```
[ ] cd frontend/web; pnpm dev
[ ] NEXT_PUBLIC_API_BASE_URL=<pulumi stack output api_internal_url>
[ ] Sign in as a teammate account that has some recommendation history
[ ] Visit /history

— Network panel —
[ ] GET /api/v1/history fires on mount; status 200
[ ] Response body matches: [{ title, "recommended-at" }, ...]
[ ] Response is sorted newest-first

— Rendering —
[ ] Rows appear in order; titles match the Lambda response
[ ] Relative-time labels render reasonably (Today / Yesterday / weekdays / dates)
[ ] Bucket headers appear only when their bucket has entries
[ ] No horizontal scroll at 375px

— Empty path —
[ ] Use a freshly-signed-up account with no history
[ ] GET /api/v1/history returns 200 with body []
[ ] <EmptyState /> renders with "Pick a movie for me" CTA pointing to /

— Error UX —
[ ] DevTools → Network → Offline; reload /history
[ ] useApiErrorUx fires the network-kind toast
[ ] No rows visible; no crash

— Unauthorized —
[ ] Force-expire / invalidate the Cognito IdToken in DevTools Application
[ ] Reload /history
[ ] Wrapper detects 401 → onUnauthorized → signOut → RequireAuth redirects to /login
```

## Block D — Acceptance criteria mapping (issue #134)

| AC | Coverage |
|---|---|
| Visitar /history autenticado dispara `GET /history` real; lista reflete a resposta do Lambda | ✅ Code path; ⏳ smoke |
| Conta nova sem histórico → empty state per o design do Phase 9 | ✅ Code path (`<EmptyState />` reused); ⏳ smoke |
| Devtools offline → error UX do wrapper, não lista em branco | ✅ Code path (`useApiErrorUx` toast); ⏳ smoke |
| `git grep -n 'mock' frontend/web/lib/api/history*` → 0 hits | ✅ Block A |

## Deferred items (logged in STATE.md transition)

1. **Live-AWS smoke** — run-when-home.
2. **v2.1 backend enrichment** — `/history` response shape: add poster URL, mood, genre, runtime, id. Re-instates Phase 9 rich rows when shipped.
3. **v2.1 pagination** — Lambda doesn't paginate; if any teammate's history grows past a few hundred items, render-all becomes a perf issue.

## Hand-off to Phase 16 (Watch-Later)

- **Update strategy:** mirror Phase 14's per-toggle optimistic + replay-queue + rollback. Use `preferences/page.tsx`'s `commit()` as the canonical reference.
- **Lambda contract**: read `functions/watch_later/watch_later.py` in P16 CONTEXT. If the response has rich movie data already (watch-later was the user-curated list, may have title + posterUrl), the UI degradation Phase 15 had to make may not apply.
- **Skeleton primitive**: `<ChipsSkeleton />` exists from Phase 14 if needed; a row-skeleton pattern is inlined in `history/page.tsx`.
- **Relative-time formatter**: lives in `history/page.tsx`. Extract to `lib/utils.ts` if Phase 16 needs identical formatting (likely yes — `added-at` timestamps).

---

## Phase 15 — Final state

- ✅ INTG-HIST-01 (GET integration)
- ✅ INTG-HIST-02 (loading/error/empty states)
- ⏳ Live-AWS smoke: DEFERRED with checklist preserved
- ✅ Side-effect: `HistoryRow.tsx` deleted (Phase 17 cleanup pulled forward; truly orphaned)

Phase 15 is **complete-pending-smoke**. PR opens against `backend-integration` after this commit + transition.

---

*Plan: 15-02-SUMMARY.md*
*Phase closed by Claude (Haiku 4.5)*
