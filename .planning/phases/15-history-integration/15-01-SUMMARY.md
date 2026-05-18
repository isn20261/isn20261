# Phase 15 · Plan 15-01 — SUMMARY

**Completed:** 2026-05-14
**Commit:** `b218d08` (feat(history): real GET integration with degraded shape (15-01))
**Branch:** `feature/issue-134-history-integration`
**Status:** ✅ Complete — Block A gates green

## What shipped

| File | Change | LOC |
|---|---|---|
| `frontend/web/lib/api/history.ts` | REPLACE (mock → wrapper-backed) | -78 / +28 |
| `frontend/web/app/(app)/(protected)/history/page.tsx` | MOD (full rewrite, degraded shape) | -65 / +120 |
| `frontend/web/app/(app)/(protected)/smoke/page.tsx` | MOD (1-line eslint-disable side-fix) | +1 |
| `frontend/web/components/HistoryRow.tsx` | DELETED | -69 |

## Gates run

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | ✅ clean (after deleting HistoryRow.tsx) |
| `pnpm lint` | ✅ clean |
| `pnpm build` | ✅ 14/14 pages prerendered, /history static |
| `git grep -n 'mock' lib/api/history*` | ✅ 0 hits |
| `git grep -nE '\bfetch\(' lib/api/history.ts 'app/(app)/(protected)/history/'` | ✅ 0 hits |

## Deviations from PLAN

### Deviation 1 — `HistoryRow.tsx` deleted (Phase 17 cleanup pulled forward)
Plan flagged `HistoryRow.tsx` as orphaned-but-kept-on-disk for Phase 17 cleanup. However, it imports the removed `HistoryEntry` type from `history.ts`, which broke `tsc --noEmit` immediately.

**Resolution:** deleted the file. Verified zero consumers via `git grep -r HistoryRow` after deletion (1 hit was the file itself, now removed). Documented in commit body and SUMMARY. Lower-friction than keeping a placeholder type alias.

### Deviation 2 — Smoke harness lint side-fix (re-application from Phase 14)
Branch was cut from `backend-integration` (pre-Phase-14), so the smoke harness still had the `react-hooks/purity` violation. Re-applied the same 1-line `eslint-disable-next-line` patch. When Phase 14 PR (#153) merges, the lines will merge cleanly (identical content). Documented in 15-PATTERNS.md §"side-fix".

No other deviations.

## Notes

- The relative-time formatter and bucket logic are inlined per the plan. ~50 LOC of helpers at the top of `history/page.tsx`. If Phase 16 needs them, extract — but Phase 16 (watch-later) deals with `added-at` similarly only if the Lambda returns ISO timestamps; verify in P16 CONTEXT.
- Skeleton uses `h-12` rows (matching the new minimal row footprint) instead of Phase 9's `h-[118px]` (which mirrored the rich rows).
- Empty array handling: when `items.length === 0`, the bucket-loop is skipped (all buckets empty → `.filter(b => buckets[b].length > 0)` returns empty array → falls through to the `items.length === 0` branch). Empty state renders.

## Next

→ Begin Plan 15-02 (verification gate + transition + PR).

---

*Plan: 15-01-SUMMARY.md*
