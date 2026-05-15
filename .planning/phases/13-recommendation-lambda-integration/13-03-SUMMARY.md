---
phase: 13-recommendation-lambda-integration
plan: 03
subsystem: lib/api/recommend (shared types + seam files)
tags: [intg-reco-02, mock-deletion, grep-gate, context-correction]
requires:
  - 13-02: /recommendation screen no longer imports MOVIES/getRecommendation/getSimilar
  - 13-01: recommend.real.ts already owns the live fetch surface
provides:
  - Trimmed recommend.ts (types + constants + URL helpers only)
  - Local non-exported MOVIES_SEED in lib/api/history.ts (10 entries)
  - Local non-exported MOVIES_SEED in lib/api/watch-later.ts (12 entries)
  - ROADMAP success criterion #2 grep gate satisfied (zero `mock` hits in `frontend/web/lib/api/recommend*`)
affects:
  - frontend/web/lib/api/recommend.ts (302 -> 76 lines, mock dataset + fetchers deleted)
  - frontend/web/lib/api/history.ts (78 -> 275 lines, MOVIES_SEED inlined)
  - frontend/web/lib/api/watch-later.ts (72 -> 302 lines, MOVIES_SEED inlined)
tech-stack:
  added: []
  patterns:
    - "Local-seed-on-deletion — when retiring a shared mock dataset that two transitional seam files still consume, inline a NON-exported copy (only the entries the consumer actually uses) into each seam rather than re-exporting from the trimmed module. The duplication is acceptable because both seam files are scheduled for live-Lambda swap in subsequent phases; the seeds die naturally with the swap."
    - "Keep-list discipline — `type Movie` stays imported from `@/lib/api/recommend` in both seam files. Only the *dataset* is local; the *shape* remains the shared canonical type. A future Movie field rename in `recommend.ts` propagates to both seed constants via TypeScript."
key-files:
  created: []
  modified:
    - frontend/web/lib/api/recommend.ts
    - frontend/web/lib/api/history.ts
    - frontend/web/lib/api/watch-later.ts
decisions:
  - "Option 1 (inline MOVIES_SEED into each seam file) over Option 2 (keep MOVIES in recommend.ts behind a different export name). Option 1 preserves the ROADMAP grep gate semantics: the recommendation code path holds no mock dataset. A renamed export in recommend.ts would still violate the spirit of success criterion #2 — any future contributor adding a recommendation feature could re-import the dataset. Option 1 makes mis-use structurally impossible because the seeds are non-exported `const`s in unrelated files."
  - "Granular per-file commit topology (13-03-1 / 13-03-2 / 13-03-3) over a single squashed commit. The orchestrator authorized either approach. Granular gives a cleaner git-blame: a future reader bisecting a `MOVIES_SEED` reference lands directly on the commit that introduced it, with a commit message that explains the CONTEXT.md correction and the Phase 15/16 hand-off."
  - "Both seeds carry the same 12-entry shape (verbatim from the original MOVIES, except history.ts trims to the 10 entries it actually references). The duplication is intentional and temporary; documenting Phase 15/16 as the disposal points in each file's docstring removes the ambiguity for the next executor."
  - "Header rewrite is opinionated: it names the seven import sites of `recommend.ts` (preferences, watch-later, MovieCard, HistoryRow, ServiceBadge, history.ts seam, watch-later.ts seam). Future readers see exactly which exports are load-bearing for which screen, so the keep-list is self-evident."
metrics:
  duration_minutes: ~4
  tasks_completed: 1
  files_modified: 3
  files_created: 0
  completed: 2026-05-15
---

# Phase 13 Plan 03: Mock Deletion Summary

`frontend/web/lib/api/recommend.ts` is now a 76-line types-and-helpers module — the 12-entry `MOVIES` dataset, `getRecommendation()`, `getSimilar()`, and `PICK_LATENCY_MS` are gone. The recommendation code path retains no fallback mock dataset, satisfying ROADMAP success criterion #2's grep gate. Two seam files outside the recommendation surface (`history.ts`, `watch-later.ts`) that previously depended on `MOVIES` now own a local non-exported `MOVIES_SEED` constant; they're scheduled for live-Lambda swap in Phase 15 and Phase 16 respectively, at which point those local seeds die naturally.

## CONTEXT.md importer-list correction (6 -> 7)

CONTEXT.md §"Mock-deletion scope" and this plan's `<action>` block both enumerated **six** consumers of `@/lib/api/recommend`:

1. `app/(app)/(protected)/preferences/page.tsx` — `MOODS, RATINGS, STREAMING_SERVICES, type Rating`
2. `app/(app)/(protected)/watch-later/page.tsx` — `type Movie`
3. `components/HistoryRow.tsx` — `posterUrl`
4. `components/MovieCard.tsx` — `posterUrl, type Movie`
5. `components/ServiceBadge.tsx` — `type Service`
6. `app/(app)/recommendation/page.tsx` — (post 13-02: zero imports — no longer in the list)

The authoritative grep at execution time is:

```bash
$ git grep -nE 'from "@/lib/api/recommend"' frontend/web/
frontend/web/app/(app)/(protected)/preferences/page.tsx:30:} from "@/lib/api/recommend";
frontend/web/app/(app)/(protected)/watch-later/page.tsx:29:import type { Movie } from "@/lib/api/recommend";
frontend/web/components/HistoryRow.tsx:16:import { posterUrl } from "@/lib/api/recommend";
frontend/web/components/MovieCard.tsx:21:import { posterUrl, type Movie } from "@/lib/api/recommend";
frontend/web/components/ServiceBadge.tsx:9:import type { Service } from "@/lib/api/recommend";
frontend/web/lib/api/history.ts:13:import { MOVIES, type Movie } from "@/lib/api/recommend";
frontend/web/lib/api/watch-later.ts:17:import { MOVIES, type Movie } from "@/lib/api/recommend";
```

That's **seven** importers — CONTEXT.md's screen-and-component scan missed the two `lib/api/` seam files. Per the orchestrator's authorization, this is documented here so future readers (Phase 14/15/16 planners, the verifier in Phase 13-04, a post-milestone code archaeologist) don't re-discover the discrepancy. *(The orchestrator prompt referenced "8" importers — the actual grep count is 7. The substantive correction — that two seam files were missed — stands regardless of the exact total.)*

## Architectural decision — Option 1 (inline MOVIES_SEED)

A naive interpretation of this plan ("delete MOVIES from recommend.ts") would have broken `tsc --noEmit` with `Cannot find name 'MOVIES'` in both `history.ts` and `watch-later.ts`. Two options were on the table:

- **Option 1 (chosen):** Inline a non-exported local `MOVIES_SEED: readonly Movie[]` into each seam file. Only the entries the consumer actually references are included (history.ts uses indices 0..9 of the original 12-entry array; watch-later.ts uses `.map()` over the whole array so it seeds all 12). Replace `MOVIES` references in each file with `MOVIES_SEED`. Keep `import { type Movie } from "@/lib/api/recommend"` — `Movie` stays on the keep-list.
- **Option 2 (rejected):** Keep the 12-entry `MOVIES` array in `recommend.ts` behind a different exported name (e.g. `_LEGACY_MOVIES`).

Option 1 won because the ROADMAP grep gate (success criterion #2) is on the *recommendation code path*, not on a specific identifier. `git grep -n 'mock' frontend/web/lib/api/recommend*` returning 0 hits is the literal acceptance criterion — and Option 1 satisfies it cleanly while Option 2 keeps a hand-written movie dataset alive in the file most likely to be touched by a future recommendation feature. The Phase 15 (history) and Phase 16 (watch-later) executors will swap each seam to a live Lambda and the duplication evaporates with no further deletion work. The 12-entry data is small (~12 KB across both files) and the seam files are already on the Phase 15/16 chopping block.

## Final export surface of `recommend.ts`

Eight exports — verifiable by `git grep -nE '^export' frontend/web/lib/api/recommend.ts`:

| Order | Export                  | Kind       | Consumed by                                                       |
|-------|-------------------------|------------|-------------------------------------------------------------------|
| 1     | `type Service`          | type alias | `components/ServiceBadge.tsx`                                     |
| 2     | `type Movie`            | type alias | `components/MovieCard.tsx`, `app/.../watch-later/page.tsx`, `lib/api/history.ts`, `lib/api/watch-later.ts` |
| 3     | `STREAMING_SERVICES`    | const      | `app/.../preferences/page.tsx`                                    |
| 4     | `MOODS`                 | const      | `app/.../preferences/page.tsx`                                    |
| 5     | `RATINGS`               | const      | `app/.../preferences/page.tsx`                                    |
| 6     | `type Rating`           | type alias | `app/.../preferences/page.tsx`                                    |
| 7     | `posterUrl`             | helper fn  | `components/MovieCard.tsx`, `components/HistoryRow.tsx`           |
| 8     | `backdropUrl`           | helper fn  | (currently zero consumers post 13-02; kept per CONTEXT keep-list for Phase 14/15/16 reuse) |

No other exports. No re-exports. No `// @deprecated` shims.

## Rewritten module header (verbatim)

```ts
/**
 * Shared movie types and URL helpers consumed by the Phase 6–10 screens
 * and their components. The recommendation fetch surface itself lives in
 * `./recommend.real.ts` (Phase 13, INTG-RECO-01/02) — this module no
 * longer holds a recommendation fetch path or a hand-written movie
 * dataset.
 *
 * Keep-list consumers (these files import the exports below):
 * - app/(app)/(protected)/preferences/page.tsx — MOODS, RATINGS,
 *   STREAMING_SERVICES, type Rating.
 * - app/(app)/(protected)/watch-later/page.tsx — type Movie.
 * - components/MovieCard.tsx — posterUrl, type Movie.
 * - components/HistoryRow.tsx — posterUrl.
 * - components/ServiceBadge.tsx — type Service.
 * - lib/api/history.ts — type Movie (seeds its own local dataset
 *   pending Phase 15 live-Lambda swap).
 * - lib/api/watch-later.ts — type Movie (seeds its own local dataset
 *   pending Phase 16 live-Lambda swap).
 *
 * Decoupled from `@/lib/api/auth` per ARCHITECTURE.md anti-pattern note.
 */
```

The header carries no occurrence of the substring "mock" in any casing, names every load-bearing import site, and explicitly hands off the two seam-file seeds to Phase 15/16 — so the next executor reading the file knows exactly why duplicate seed data exists in `history.ts` and `watch-later.ts`.

## Line-count delta

| File                                  | Before | After | Delta |
|---------------------------------------|--------|-------|-------|
| `frontend/web/lib/api/recommend.ts`   | 302    | 76    | -226  |
| `frontend/web/lib/api/history.ts`     | 78     | 275   | +197  |
| `frontend/web/lib/api/watch-later.ts` | 72     | 302   | +230  |
| **Net**                               | 452    | 653   | +201  |

The net `+201` is the cost of Option 1's temporary duplication. It evaporates in Phase 15/16.

## Acceptance gate verification

| Gate                                                                                                       | Result   |
|------------------------------------------------------------------------------------------------------------|----------|
| `git grep -ni 'mock' frontend/web/lib/api/recommend.ts`                                                    | 0 hits   |
| `git grep -niE '\bmock\b' frontend/web/lib/api/recommend.real.ts`                                          | 0 hits   |
| `git grep -n 'MOVIES' frontend/web/lib/api/recommend.ts`                                                   | 0 hits   |
| `git grep -nE '\bgetRecommendation\b' frontend/web/lib/api/recommend.ts`                                   | 0 hits   |
| `git grep -n 'getSimilar' frontend/web/lib/api/recommend.ts`                                               | 0 hits   |
| `git grep -n 'PICK_LATENCY_MS' frontend/web/lib/api/recommend.ts`                                          | 0 hits   |
| `git grep -n 'MOVIES_SEED' frontend/web/lib/api/`                                                          | hits in history.ts AND watch-later.ts |
| Keep-list exports (`Service`, `Movie`, `STREAMING_SERVICES`, `MOODS`, `RATINGS`, `Rating`, `posterUrl`, `backdropUrl`) | All present, signatures unchanged |
| `cd frontend/web && ./node_modules/.bin/tsc --noEmit`                                                      | exit 0   |
| `cd frontend/web && ./node_modules/.bin/eslint lib/api/`                                                   | exit 0   |
| `cd frontend/web && next build` (Node 22.22.3)                                                             | exit 0; 14 routes generated |
| Recommendation screen does NOT import from `@/lib/api/recommend` (only `recommend.real`)                   | confirmed via grep |

## ROADMAP success criterion #2 confirmation

The criterion: *"git grep -n 'mock' frontend/web/lib/api/recommend* returns 0 hits AND no fallback mock dataset remains in the recommendation code path."*

- The grep gate (literal pattern `frontend/web/lib/api/recommend*`) matches `recommend.ts` and `recommend.real.ts`. Both return 0 `mock` hits. Confirmed.
- The recommendation code path: `app/(app)/recommendation/page.tsx` -> `lib/api/recommend.real.ts` -> `lib/api/client.ts` (Phase 12 typed fetcher) -> live `/api/v1/recommend` Lambda. Zero mock data anywhere on that path. Confirmed.
- The `MOVIES_SEED` constants live in `history.ts` and `watch-later.ts` — NEITHER is on the recommendation code path. They're on the *history* and *watch-later* code paths, scheduled for live-Lambda swap in P15/P16.

## Forward hand-off

- **Phase 14** (`/preferences` lambda integration): no impact on this plan. Still consumes `MOODS`, `RATINGS`, `STREAMING_SERVICES`, `type Rating` from the trimmed `recommend.ts` — all preserved.
- **Phase 15** (`/history` lambda integration): replace `getHistory()` in `lib/api/history.ts` with a live Lambda fetch. The local `MOVIES_SEED` and `GROUPS` constants can be deleted at that point. Header note in `history.ts` flags this hand-off explicitly.
- **Phase 16** (`/watch-later` lambda integration): replace `getWatchLater()` and the supporting localStorage helpers in `lib/api/watch-later.ts` with a live Lambda fetch (or hybrid if the design still wants per-device persistence). The local `MOVIES_SEED` can be deleted at that point. Header note in `watch-later.ts` flags this hand-off explicitly.
- **Phase 13-04** (verification): runs visual + behavioral smoke against the live recommendation screen. This plan leaves the codebase in its final Phase 13 shape — 13-04 should find no surprises in `lib/api/recommend*`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inline MOVIES_SEED into two seam files**
- **Found during:** Pre-edit scan (orchestrator pre-flagged the issue in the upstream correction; verified independently by `git grep -nE 'from "@/lib/api/recommend"' frontend/web/`).
- **Issue:** `frontend/web/lib/api/history.ts` and `frontend/web/lib/api/watch-later.ts` both import `MOVIES` from `@/lib/api/recommend`. CONTEXT.md §"Mock-deletion scope" enumerated 6 consumers but missed these two seam files. Deleting `MOVIES` from `recommend.ts` per the original plan would have broken `tsc --noEmit` with `Cannot find name 'MOVIES'` in both seam files.
- **Fix:** Inlined a non-exported local `MOVIES_SEED: readonly Movie[]` into each seam file with only the entries the consumer references (history.ts: 10 entries m1..m10; watch-later.ts: all 12 entries because `.map()` walks the whole array). Replaced `MOVIES` references with `MOVIES_SEED` in both files. Kept `import { type Movie } from "@/lib/api/recommend"` — Movie is on the keep-list.
- **Files modified:** `frontend/web/lib/api/history.ts`, `frontend/web/lib/api/watch-later.ts`
- **Commits:** `9ce92e3` (history.ts), `e61e0e9` (watch-later.ts)
- **Why this isn't a Rule 4 (architectural) ask:** The orchestrator already evaluated the alternatives in the prompt and authorized Option 1. The decision is documented in this SUMMARY's "Architectural decision" section so the verifier and Phase 15/16 executors have full context. No structural modification to the type system, build, or unrelated subsystems was needed.

## Known Stubs

None. The Phase 13 deferred items list (`deferred-items.md`) is unchanged by this plan — no new stubs introduced. The `MOVIES_SEED` constants are not stubs in the traditional sense (they hold real demo data the seam files actively use to render their respective screens); they're temporary local copies of data that already existed in the codebase before this plan ran.

## Threat Flags

None. The edits in this plan are pure deletions and local-scope refactors inside `lib/api/`. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

## Self-Check: PASSED

All files modified by this plan exist and match the expected shape:
- `frontend/web/lib/api/recommend.ts` — 76 lines, 8 exports, header carries 0 occurrences of "mock".
- `frontend/web/lib/api/history.ts` — 275 lines, `MOVIES_SEED` local non-exported const (10 entries), references `MOVIES_SEED[0..9]`.
- `frontend/web/lib/api/watch-later.ts` — 302 lines, `MOVIES_SEED` local non-exported const (12 entries), references `MOVIES_SEED.map(...)` in two places.

All three commits exist in `git log --oneline -5`:
- `b4efa0f feat(13-03-1): trim recommend.ts to types + URL helpers`
- `9ce92e3 feat(13-03-2): inline MOVIES_SEED into history.ts (Phase 15 swap target)`
- `e61e0e9 feat(13-03-3): inline MOVIES_SEED into watch-later.ts (Phase 16 swap target)`

All acceptance gates pass under Node 22.22.3 (the Node version required by Next.js 16; the system default Node 18 is below Next's minimum and was not used for the build gate).
