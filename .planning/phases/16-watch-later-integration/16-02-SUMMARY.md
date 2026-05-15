# Phase 16 · Plan 16-02 — Phase Close SUMMARY

**Completed:** 2026-05-14
**Phase status:** ✅ Complete (live-AWS smoke deferred; remove AC documented as divergent)
**Plans executed:** 16-01 ✅, 16-02 ✅ (this doc)
**Branch:** `feature/issue-135-watch-later-integration` → opens PR into `backend-integration`

---

## Goal restated and verified

Phase 16 wires the watch-later screen + /recommendation Save toggle to the real `/watch-later` Lambda. Because the backend doesn't support a remove verb (PUT and DELETE both absent), Phase 16 ships **read + add only**. The minimal UI shape mirrors Phase 15's degradation strategy.

---

## Block A — Static gates (all green)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ (14/14 pages prerendered, /watch-later static) |
| Mock + raw-fetch greps | ✅ 0 hits |
| Removed-function greps | ✅ 0 hits |

## Block B — UI compliance (deferred-with-smoke for live interaction)

- /watch-later page renders minimal rows newest-first (Lambda order); no remove button.
- /recommendation Save button is one-way (Save → Saved, disabled after save).
- Empty state reuses `<EmptyState />`.
- Three-breakpoint visual check is part of Block C run-when-home checklist.

## Block C — Live-AWS smoke (SKIPPED-AWS-DEFERRED, per user 2026-05-14)

```
[ ] cd frontend/web; pnpm dev
[ ] NEXT_PUBLIC_API_BASE_URL=<pulumi stack output api_internal_url>
[ ] Sign in
[ ] Visit /watch-later

— GET path —
[ ] Network panel: GET /api/v1/watch-later fires; status 200
[ ] Response body matches: [{ title, "added-at" }, ...]
[ ] Rows render newest-first with relative-time labels
[ ] Empty case (fresh account): GET returns 200 with []; <EmptyState /> renders

— Add path —
[ ] Visit /recommendation; click "Save to watch later"
[ ] Network panel: POST /api/v1/watch-later body { movieId: "..." }; status 201
[ ] AWS console: GetItem on recommend-a.users by sub; verify watchLater array contains new entry with title + addedAt
[ ] Return to /watch-later; new entry visible

— Error UX —
[ ] DevTools offline; click Save → useApiErrorUx toast; button rolls back to "Save to watch later"
[ ] DevTools offline; reload /watch-later → toast; no crash

— Unauthorized —
[ ] Invalidate IdToken; reload /watch-later → wrapper detects 401 → signOut → /login redirect

— Same-session duplicate guard —
[ ] Click Save → wait for response → button shows "Saved" (disabled)
[ ] Cannot click again (disabled). Network: only 1 POST fires.

— Cross-session duplicate (Lambda quirk) —
[ ] Sign out + sign back in; visit /recommendation (same movie if possible); click Save
[ ] POST fires; succeeds
[ ] /watch-later shows the same title TWICE (no idempotency on Lambda; documented quirk)
```

## Block D — Acceptance criteria mapping (issue #135)

| AC | Coverage |
|---|---|
| `GET /watch-later` real popula a lista (Network panel) | ✅ Code path; ⏳ smoke |
| Add dispara request real; item aparece no próximo read | ✅ Code path; ⏳ smoke |
| Remove dispara DELETE real; item some | ⚠️ **NOT SHIPPED — backend gap (no PUT/DELETE wired)**. v2.1 follow-up. Documented in CONTEXT §"Resolved decisions". |
| Conta nova sem saves → empty state per o design do Phase 10 | ✅ Code path (`<EmptyState />` reused); ⏳ smoke |
| Cair a rede durante add/remove → error UX + estado consistente per a estratégia documentada | ✅ Add path (optimistic + rollback + toast). Remove N/A. |
| `git grep -n 'mock' frontend/web/lib/api/watch*later*` → 0 hits | ✅ Block A |

## Deferred items

1. **Live-AWS smoke** — run-when-home.
2. **v2.1 backend: add PUT or DELETE for /watch-later** — unblocks remove UX. Highest priority of the 4 backend follow-ups.
3. **v2.1 backend**: POST idempotency on `movieId`.
4. **v2.1 backend**: include `movieId` in GET response.
5. **v2.1 frontend**: re-instate rich MovieCard grid + remove button + membership pre-check when backend grows the surface.
6. **Follow-up commit (post-merge)**: re-point `history/page.tsx` to import `sameDay`/`relativeTime` from `@/lib/time`; delete its inline duplicates.

## Hand-off

- Phase 16 is the last v2.0 integration phase. Phase 17 (Onboarding Guide + Cold-Run) is next, and includes the end-to-end smoke test that exercises all 4 screens against a teammate's fresh AWS infra.
- Coordination: this branch ships parallel to PR #153 (Phase 14) and PR #154 (Phase 15). All 3 PRs share the same 1-line smoke harness side-fix; merge order doesn't matter.

---

## Phase 16 — Final state

- ✅ INTG-WTCL-01 (GET integration)
- ✅ INTG-WTCL-02 (POST add integration)
- ⚠️ INTG-WTCL-03 (loading/error/empty + remove update strategy) — partially: loading/error/empty ✅; remove strategy N/A (backend gap)
- ⏳ Live-AWS smoke: DEFERRED with checklist preserved
- ⚠️ Issue #135 remove AC: NOT SHIPPED (backend gap documented)

Phase 16 is **complete-pending-smoke-and-remove-backend**. PR opens against `backend-integration`.

---

*Plan: 16-02-SUMMARY.md*
*Phase closed by Claude (Haiku 4.5)*
