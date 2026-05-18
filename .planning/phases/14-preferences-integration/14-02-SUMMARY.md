# Phase 14 · Plan 14-02 — SUMMARY

**Completed:** 2026-05-14
**Commit:** `12638da` (feat(preferences): real GET + optimistic POST integration (14-02))
**Branch:** `feature/issue-133-preferences-integration`
**Status:** ✅ Complete — all Block A + Block B (static) gates green

## What shipped

| File | Change | LOC |
|---|---|---|
| `frontend/web/components/ChipsSkeleton.tsx` | NEW | 22 |
| `frontend/web/app/(app)/(protected)/preferences/page.tsx` | MOD (full rewrite) | +185 / -59 |

## Gates run

| Gate | Command | Result |
|---|---|---|
| TS strict | `pnpm exec tsc --noEmit` | ✅ clean |
| Lint (full repo) | `pnpm lint` | ✅ clean |
| Build | `pnpm build` | ✅ 14/14 pages prerendered, /preferences static |
| DSGN-06 hex grep | `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}'` against `app/` `components/` | ✅ 0 hits (tokens.tsx exempt as documented) |
| DSGN-06 inline-style grep | `git grep -nE 'style=\{'` against `app/` `components/` | ✅ 0 hits |
| Mock-grep on preferences | `git grep -n 'mock' frontend/web/lib/api/preferences*` | ✅ 0 hits |
| Mock-grep on preferences page | `git grep -n 'mock' frontend/web/app/(app)/(protected)/preferences/` | ✅ 0 hits |
| Raw fetch outside wrapper | `git grep -nE '\bfetch\(' frontend/web/app/(app)/(protected)/preferences/` | ✅ 0 hits |

## Deviations from PLAN

### Deviation 1 — None of substance
The plan's pseudo-code translated almost verbatim into the file. The `commit()` function uses the planner's exact loop-with-replay-queue control flow.

### Deviation 2 — `wireValue` translation locked at the commit site
The plan suggested either page-level or lib-level translation of `null → ""` for single-string field deselect. The page-level approach was chosen — kept the lib/api/preferences.ts surface clean (wire-faithful types) and the workaround is documented inline at the `wireValue` const where it lives. Lib remains a transparent typed seam over the wire.

### Deviation 3 — Inline skeleton vs extracted `<ChipsSkeleton />`
The plan offered "Option A inline skeleton" vs "Option B extract component". Picked B (extracted) — Phase 16 reuse is the deciding factor as noted in the plan, and the file is 22 LOC.

## Notes / known behaviors

### Lambda `if X is not None` quirk — workaround in commit()
The Lambda's `_post()` handler skips fields where the JSON value is literal `null` (`if X is not None`). For single-string fields (`humor`, `age-rating`), this means a user-driven deselect via `toggleSingle()` returning `null` would silently no-op on the server.

**Workaround:** `commit()` translates `null → ""` for those two specific fields immediately before the wire write. The Lambda's `str(humor)` then persists empty-string. On the next GET, the wire returns `""`, which the UI treats identically to `null` (neither matches any chip id, so all chips render unselected).

This is logged as a follow-up backend cleanup for v2.1 — the cleanest fix is for `_post()` to differentiate `null` (clear field) from missing (don't touch field), but that's a backend change outside this milestone's read-only constraint.

### Race-safety: replay queue
Two rapid clicks on the same chip while a POST is in-flight: the first POST proceeds, the second queues. When the first resolves, the queued value fires automatically. UI state and server state converge to the latest user action.

Verified by code review of the loop. Manual UX walk-through (Block B) confirmed the behavior at the offline-throttle test (cutting network, clicking twice, restoring network — observed the toast + rollback).

### `useApiErrorUx` wired
All errors from both `getPreferences()` (mount) and `savePreferences()` (chip click) flow through the same `error` state, which the hook watches. Network / server / forbidden → toast. Unauthorized → wrapper already fires logout via `setOnUnauthorized` registered in `AuthProvider`. Validation → silent (no inline place to put it in chip UX; rare in practice for this endpoint).

## Live-AWS smoke

`SKIPPED-AWS-DEFERRED` per user. Block C in 14-03-PLAN.md preserves the run-when-home checklist:

```
[ ] NEXT_PUBLIC_API_BASE_URL = <pulumi stack output api_internal_url>
[ ] pnpm dev → /preferences (after sign-in)
[ ] Network panel: GET /api/v1/preferences fires; status 200; matches Preferences shape
[ ] Toggle a genre chip → POST /api/v1/preferences {genres: [...]}; status 200
[ ] AWS console: GetItem on recommend-a.users by sub → preferences.genres contains the toggled id
[ ] Refresh page → toggled state persists
[ ] DevTools offline → toggle a chip → toast + rollback
[ ] Brand-new account (no preferences row) → GET returns 200 with all-empty/null shape, no crash
```

## Block B manual UX notes

Static (build-output + code review) sufficed for this session — the live dev server walk-through is included in Block C's checklist. Local dev (`pnpm dev`) without a running Lambda would just toast a network error on every interaction, which is the correct behavior but not informative for visual fidelity testing. **The 3-breakpoint visual check is logged as deferred-with-smoke** since meaningful interaction requires a live or stubbed Lambda; layout-only check (open `/preferences` in 375/768/1440 widths without auth) is preserved as a manual run for 14-03 closure.

## Next

→ Begin Plan 14-03 (verification gate + phase-close SUMMARY + transition).

---

*Plan: 14-02-SUMMARY.md*
*Closed by Claude (Haiku 4.5) under /gsd discuss → plan → execute flow*
