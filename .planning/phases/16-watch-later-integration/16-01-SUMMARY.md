# Phase 16 · Plan 16-01 — SUMMARY

**Completed:** 2026-05-14
**Commit:** `31fe591` (feat(watch-later): real GET + add integration (16-01))
**Branch:** `feature/issue-135-watch-later-integration`
**Status:** ✅ Complete — Block A green

## What shipped

| File | Change | LOC |
|---|---|---|
| `frontend/web/lib/api/watch-later.ts` | REPLACE | -72 / +33 |
| `frontend/web/lib/time.ts` | NEW | +28 |
| `frontend/web/app/(app)/(protected)/watch-later/page.tsx` | MOD (full rewrite) | -73 / +95 |
| `frontend/web/app/(app)/recommendation/page.tsx` | MOD (Save toggle → add-only async) | +12 / -10 |
| `frontend/web/app/(app)/(protected)/smoke/page.tsx` | MOD (1-line eslint-disable) | +1 |

## Gates run

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | ✅ clean |
| `pnpm lint` | ✅ clean |
| `pnpm build` | ✅ 14/14 pages prerendered |
| `git grep -n 'localStorage' lib/api/watch-later.ts` | ✅ 0 hits |
| `git grep -nE 'isInWatchLater\|removeFromWatchLater\|reorderWatchLater\|watchLaterCount\|WATCH_LATER_KEY' frontend/web` | ✅ 0 hits |
| `git grep -nE '\bfetch\(' lib/api/watch-later.ts 'app/(app)/(protected)/watch-later/'` | ✅ 0 hits |

## Deviations from PLAN

### Deviation 1 — history/page.tsx NOT updated this phase

PLAN proposed extracting `sameDay` + `relativeTime` to `lib/time.ts` and re-pointing `history/page.tsx` to import from it.

**Reality:** this branch was cut from `backend-integration` (pre-Phase-15). On this branch, `history/page.tsx` is still the Phase 9 mock-backed file — it has no inline `sameDay` / `relativeTime` to extract. Phase 15's history rewrite (PR #154) introduced those inline helpers on its own branch.

**Resolution:** ship `lib/time.ts` here as a NEW file with the same content the Phase 15 page inlined. After Phase 15 (#154) and Phase 16 (this) both merge into `backend-integration`, a follow-up commit can re-point `history/page.tsx` to import from `@/lib/time` and delete its inline duplicates.

Cleaner than the alternative (modifying a file that doesn't exist in the expected state on this branch).

### Deviation 2 — Smoke harness lint side-fix (re-application)

Same as Phase 14/15. Branch was off `backend-integration` (pre-Phase-14); the 1-line `eslint-disable-next-line react-hooks/purity` re-applied. Will merge cleanly when Phase 14/15 PRs land (identical line).

### Deviation 3 — Issue #135 AC divergence: remove not shipped

Backend gap verified (no PUT, no DELETE wired). Issue #135 explicitly requires the remove path. Phase 16 ships read + add only; remove deferred to v2.1. **This is a documented AC miss.** PR description calls it out so the reviewer is not surprised.

## Lambda quirks documented (v2.1 backend follow-ups)

1. **No remove verb** — PUT and DELETE both absent from handler dispatch and API Gateway routes.
2. **POST has no idempotency** — duplicate `movieId` adds a 2nd entry to the user's `watchLater` array (`list_append` semantics in `_post()`).
3. **GET strips movieId** — response is `[{title, "added-at"}]`. Frontend can't determine membership without a title-match heuristic (lossy).

## Race-safety: single-shot in-flight guard

`/recommendation` Save toggle uses `useRef<boolean>` to prevent double-add on rapid clicks (~5 LOC). Simpler than Phase 14's replay queue because:
- Only one button per recommendation (no multi-field race).
- No un-save action (no flip-flop possible).
- Idempotency would need backend support; out of scope this phase.

## Next

→ Plan 16-02 (verification gate + phase close + open PR).

---

*Plan: 16-01-SUMMARY.md*
