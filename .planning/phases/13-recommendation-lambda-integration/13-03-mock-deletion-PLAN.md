---
phase: 13-recommendation-lambda-integration
plan: 03
type: execute
wave: 3
depends_on:
  - 13-02
files_modified:
  - frontend/web/lib/api/recommend.ts
autonomous: true
requirements:
  - INTG-RECO-02
user_setup: []
must_haves:
  truths:
    - "The MOVIES mock dataset (12 hand-written movies) is deleted from lib/api/recommend.ts."
    - "getRecommendation() and getSimilar() are deleted from lib/api/recommend.ts — no mock function remains in the recommendation code path."
    - "git grep -ni 'mock' frontend/web/lib/api/recommend.ts returns 0 hits (CONTEXT and ROADMAP grep gate)."
    - "The Movie type, Service type, RATINGS / STREAMING_SERVICES / MOODS constants, and posterUrl / backdropUrl helpers are KEPT — the 6 consumer files (preferences, watch-later, history, MovieCard, HistoryRow, ServiceBadge) still compile against them."
    - "The recommendation/page.tsx file (post plan 13-02) is the ONLY file in the codebase that no longer imports from @/lib/api/recommend — every other consumer in CONTEXT's keep-list still imports successfully."
  artifacts:
    - path: "frontend/web/lib/api/recommend.ts"
      provides: "Trimmed shared types + helpers module: Movie, Service, Rating, RATINGS, STREAMING_SERVICES, MOODS, posterUrl, backdropUrl. No mock dataset. No recommendation fetch helper. No 'mock' wording in header."
      contains: "type Movie, type Service, posterUrl, backdropUrl"
  key_links:
    - from: "frontend/web/components/MovieCard.tsx"
      to: "frontend/web/lib/api/recommend.ts (posterUrl + type Movie)"
      via: "import { posterUrl, type Movie } from '@/lib/api/recommend'"
      pattern: "from \"@/lib/api/recommend\""
    - from: "frontend/web/app/(app)/(protected)/preferences/page.tsx"
      to: "frontend/web/lib/api/recommend.ts (MOODS, RATINGS, STREAMING_SERVICES, Rating)"
      via: "import block (line 26-30)"
      pattern: "MOODS|RATINGS|STREAMING_SERVICES"
    - from: "frontend/web/components/ServiceBadge.tsx"
      to: "frontend/web/lib/api/recommend.ts (type Service)"
      via: "import type { Service } from '@/lib/api/recommend'"
      pattern: "type Service"
---

<objective>
Delete the mock recommendation surface from `frontend/web/lib/api/recommend.ts` — the 12-entry `MOVIES` dataset, the `getRecommendation()` mock fetcher, the `getSimilar()` mock filter, the `PICK_LATENCY_MS` constant if it becomes orphaned, and every "mock" word in the module header. KEEP the `Movie` type, `Service` type, `RATINGS` / `STREAMING_SERVICES` / `MOODS` constants + `Rating` type, and the `posterUrl` / `backdropUrl` helpers — those are the keep-list documented in CONTEXT §"Mock-deletion scope" because 6 files outside the recommendation screen still consume them.

Purpose: Phase 13 success criterion #2 — `git grep -n 'mock' frontend/web/lib/api/recommend*` returns 0 hits AND no fallback mock dataset remains in the recommendation code path. This plan is the closing move on that criterion. Plan 13-02 already removed the screen's imports of the deleted symbols; this plan deletes the symbols themselves and verifies that the keep-list still compiles via `pnpm tsc --noEmit && pnpm lint && pnpm build`.

Output: A drastically shorter `recommend.ts` (~70-90 lines down from 302) containing only the shared types + constants + URL helpers, with a header rewritten to describe its new purpose: "Shared movie types + helpers consumed by 6 screens/components. The recommendation surface itself is live in `recommend.real.ts` — this module no longer holds a recommendation fetch path."
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/13-recommendation-lambda-integration/13-CONTEXT.md
@.planning/phases/13-recommendation-lambda-integration/13-01-type-narrowing-and-adapter-PLAN.md
@.planning/phases/13-recommendation-lambda-integration/13-02-screen-swap-and-states-PLAN.md
@frontend/web/lib/api/recommend.ts
@frontend/web/components/MovieCard.tsx
@frontend/web/components/HistoryRow.tsx
@frontend/web/components/ServiceBadge.tsx
@frontend/web/app/(app)/(protected)/preferences/page.tsx
@frontend/web/app/(app)/(protected)/watch-later/page.tsx

<interfaces>
<!-- Symbol-level keep-list and delete-list. The executor MUST preserve every keep-listed export. -->

KEEP exports (per CONTEXT §"Mock-deletion scope"):
- `export type Service = { name: string; kind: "included" | "rent" | "buy" };` (consumed by ServiceBadge and — indirectly — by recommendation/page.tsx via the literal-object pattern from plan 13-02)
- `export type Movie = { ... 13 fields ... };` (consumed by MovieCard, watch-later/page.tsx, MovieCard prop type)
- `export const STREAMING_SERVICES = [...] as const;` (consumed by preferences/page.tsx)
- `export const MOODS = [...] as const;` (consumed by preferences/page.tsx)
- `export const RATINGS = ["G", "PG", "PG-13", "R", "NC-17"] as const;` (consumed by preferences/page.tsx)
- `export type Rating = (typeof RATINGS)[number];` (consumed by preferences/page.tsx)
- `export const posterUrl = (m: Movie, w = 360, h = 540): string => ...;` (consumed by MovieCard, HistoryRow)
- `export const backdropUrl = (m: Movie, w = 1600, h = 900): string => ...;` (NOT currently consumed after plan 13-02 — but Phase 14/15/16 may consume; keep per CONTEXT keep-list)

DELETE (per CONTEXT §"Mock-deletion scope"):
- `export const MOVIES: readonly Movie[] = [ ... 12 entries ... ] as const;` — the 12-entry mock dataset.
- `export async function getRecommendation(): Promise<Movie> { ... }` — the random-mock fetcher.
- `export function getSimilar(movie: Movie, limit = 6): readonly Movie[] { ... }` — the mock-dataset filter.
- `const PICK_LATENCY_MS = 250;` — the simulated-latency constant. Only `getRecommendation` references it; once that function is gone, this becomes dead code. Delete.

DELETE from the module-level docstring header:
- The phrase "typed mock recommend seam" → rewrite as a shared-types module description.
- The mention of "v2 (INTG-02) replaces `getRecommendation()` with a real fetch" → no longer relevant; that swap was Phase 13 plan 13-02.
- Any other occurrence of the substring "mock" (case-insensitive). The grep gate is on the file, not just on identifiers — comments count.

Verification consumer list (these files MUST continue to import successfully after the deletion):
1. `frontend/web/app/(app)/(protected)/preferences/page.tsx:26-30` — `MOODS, RATINGS, STREAMING_SERVICES, type Rating`. All KEEP-listed. ✓
2. `frontend/web/app/(app)/(protected)/watch-later/page.tsx:29` — `type Movie`. KEEP-listed. ✓
3. `frontend/web/components/HistoryRow.tsx:16` — `posterUrl`. KEEP-listed. ✓
4. `frontend/web/components/MovieCard.tsx:21` — `posterUrl, type Movie`. KEEP-listed. ✓
5. `frontend/web/components/ServiceBadge.tsx:9` — `type Service`. KEEP-listed. ✓
6. `frontend/web/app/(app)/recommendation/page.tsx` — NO LONGER IMPORTS FROM recommend.ts post plan 13-02 (verified by grep). ✓

`frontend/web/app/(app)/(protected)/smoke/page.tsx` imports `getRecommendationReal` from `recommend.real`, NOT from `recommend.ts` — unaffected.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Delete MOVIES / getRecommendation / getSimilar / PICK_LATENCY_MS from recommend.ts and rewrite the header</name>
  <files>frontend/web/lib/api/recommend.ts</files>
  <read_first>
    - frontend/web/lib/api/recommend.ts (entire current file, 302 lines)
    - .planning/phases/13-recommendation-lambda-integration/13-CONTEXT.md §"Mock-deletion scope" (authoritative keep-list and delete-list)
    - frontend/web/components/MovieCard.tsx (lines 1-30 — confirms posterUrl + Movie import shape stays valid)
    - frontend/web/components/HistoryRow.tsx (lines 1-40 — confirms posterUrl signature compatibility)
    - frontend/web/components/ServiceBadge.tsx (lines 1-40 — confirms Service type still has `kind` field)
    - frontend/web/app/(app)/(protected)/preferences/page.tsx (lines 20-40 — confirms MOODS/RATINGS/STREAMING_SERVICES + type Rating import shape)
    - frontend/web/app/(app)/(protected)/watch-later/page.tsx (lines 25-35 — confirms type Movie import shape)
    - frontend/web/app/(app)/recommendation/page.tsx (post plan 13-02 — confirms it no longer imports from @/lib/api/recommend)
  </read_first>
  <action>
    Edit `frontend/web/lib/api/recommend.ts` in place. The final file MUST contain, in this order:

    1. A rewritten module-level docstring header (`/** ... */`). Description: "Shared movie types and URL helpers consumed by Phases 6–10 screens and components. The recommendation fetch surface itself lives in `recommend.real.ts` (Phase 13, INTG-RECO-01/02) — this module no longer holds a recommendation fetch path or a hand-written movie dataset." Mention the keep-list consumers by name (preferences, watch-later, MovieCard, HistoryRow, ServiceBadge) so a future reader knows why these exports exist. The header MUST NOT contain the substring "mock" (case-insensitive) anywhere. The header MUST NOT mention `MOVIES`, `getRecommendation`, `getSimilar`, `PICK_LATENCY_MS`, or `INTG-02` (the deferred id is no longer relevant).

    2. `export type Service = { name: string; kind: "included" | "rent" | "buy" };` — preserved verbatim from the current file (lines 13-16).

    3. `export type Movie = { ... 13 fields ... };` — preserved verbatim from the current file (lines 18-33). All 13 fields stay (id, title, year, runtime, rating, match, genres, director, cast, synopsis, services, posterSeed, backdropSeed, mood). The shape is consumed by MovieCard / watch-later — preserving it costs nothing and avoids cascading breakage.

    4. `export const STREAMING_SERVICES = [ ... 10 entries ... ] as const;` — preserved verbatim from the current file (lines 257-268).

    5. `export const MOODS = [ ... 8 entries ... ] as const;` — preserved verbatim from the current file (lines 270-279).

    6. `export const RATINGS = ["G", "PG", "PG-13", "R", "NC-17"] as const;` — preserved verbatim (line 281).

    7. `export type Rating = (typeof RATINGS)[number];` — preserved verbatim (line 282).

    8. `export const posterUrl = (m: Movie, w = 360, h = 540): string => \`https://picsum.photos/seed/ra-p-${m.posterSeed}/${w}/${h}\`;` — preserved verbatim (lines 286-287).

    9. `export const backdropUrl = (m: Movie, w = 1600, h = 900): string => \`https://picsum.photos/seed/ra-b-${m.backdropSeed}/${w}/${h}\`;` — preserved verbatim (lines 289-290).

    DELETE (do not preserve, do not relocate, do not leave commented-out):
    - The 12-entry `MOVIES` array constant (lines 35-255 in the current file). Includes every "The Long Quiet", "Neon Hours", "Cold Iron", "Soft Landing", "Halfway House", "Where the Field Ends", "Saturday at the Marina", "Glass Republic", "Drift", "Anywhere But Here", "Last Light at Pyrite", "Honey, Slowly" entry.
    - `const PICK_LATENCY_MS = 250;` (line 284) — orphan after deleting `getRecommendation`.
    - `export async function getRecommendation(): Promise<Movie> { ... }` (lines 292-297).
    - `export function getSimilar(movie: Movie, limit = 6): readonly Movie[] { ... }` (lines 299-301).

    Do NOT introduce any new exports. Do NOT alter the shape of any KEEP-listed export. Do NOT add a `// @deprecated` block or a re-export shim — deletion is clean.

    DSGN-06: this is a `lib/api/` module, not under `app/` or `components/` — DSGN-06's hex/px ban doesn't apply here. The picsum URLs in `posterUrl` / `backdropUrl` are fine; the AGENTS.md rule explicitly permits literal values in `lib/`.
  </action>
  <verify>
    <automated>cd frontend/web &amp;&amp; pnpm tsc --noEmit &amp;&amp; pnpm lint &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `git grep -ni 'mock' frontend/web/lib/api/recommend.ts` exits with no output (the case-insensitive grep gate from CONTEXT and the ROADMAP success criterion #2 must pass — the file contains zero occurrences of "mock" in any casing).
    - `git grep -niE '\bmock\b' frontend/web/lib/api/recommend.real.ts` exits with no output (plan 13-01 already removed "mock" from recommend.real.ts; this re-asserts it after plan 13-03 lands).
    - `git grep -n 'MOVIES' frontend/web/lib/api/recommend.ts` exits with no output (delete-list item gone).
    - `git grep -n 'getRecommendation\b' frontend/web/lib/api/recommend.ts` exits with no output (the bare `getRecommendation` name is gone — `getRecommendationReal` in recommend.real.ts has a different name and is in a different file, so the bounded-word grep is unambiguous).
    - `git grep -n 'getSimilar' frontend/web/lib/api/recommend.ts` exits with no output.
    - `git grep -n 'PICK_LATENCY_MS' frontend/web/lib/api/recommend.ts` exits with no output.
    - `git grep -n 'export type Movie' frontend/web/lib/api/recommend.ts` returns exactly one hit (Movie KEPT).
    - `git grep -n 'export type Service' frontend/web/lib/api/recommend.ts` returns exactly one hit (Service KEPT).
    - `git grep -nE 'export const (STREAMING_SERVICES|MOODS|RATINGS)' frontend/web/lib/api/recommend.ts` returns three hits (all constants KEPT).
    - `git grep -nE 'export const (posterUrl|backdropUrl)' frontend/web/lib/api/recommend.ts` returns two hits (both helpers KEPT).
    - `git grep -n 'export type Rating' frontend/web/lib/api/recommend.ts` returns exactly one hit (Rating KEPT).
    - The 6 consumer files still resolve their imports — verified transitively by `pnpm tsc --noEmit` exiting 0.
    - Aggregate grep gate from ROADMAP success criterion #2: `git grep -nE 'lib/api/recommend' frontend/web/app frontend/web/components` shows that the recommendation screen does NOT appear in the output. Specifically: the recommendation screen file `frontend/web/app/(app)/recommendation/page.tsx` produces zero hits for `lib/api/recommend` (without the `.real` suffix). Verified via: `git grep -nE 'from "@/lib/api/recommend"' frontend/web/app/\(app\)/recommendation/page.tsx` exits with no output.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
    - `cd frontend/web && pnpm build` exits 0.
  </acceptance_criteria>
  <done>
    `recommend.ts` is reduced to types + constants + URL helpers (~70-90 lines, down from 302). The 12-entry MOVIES dataset, `getRecommendation`, `getSimilar`, and `PICK_LATENCY_MS` are gone. The module header is rewritten with zero "mock" references. The 6 consumer files (preferences, watch-later, MovieCard, HistoryRow, ServiceBadge, AND the recommendation screen which no longer imports from this file) all compile under `pnpm tsc --noEmit`. The ROADMAP success criterion #2 grep gates pass on this file.
  </done>
</task>

</tasks>

<verification>
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` all exit 0.
- All ROADMAP success criterion #2 grep gates pass: zero "mock" hits in `recommend*` files, recommendation screen imports route through `recommend.real` only.
- The Phase 12 `/smoke` page continues to compile (its `getRecommendationReal` import points at `recommend.real`, unaffected by this plan).
- The five non-recommendation screens that still consume `recommend.ts` (preferences, watch-later, MovieCard, HistoryRow, ServiceBadge) continue to render their existing Phase 6–10 visuals — they were never relying on `MOVIES` / `getRecommendation` / `getSimilar`.
</verification>

<success_criteria>
- The recommendation code path is mock-free: there is no fallback mock dataset that the recommendation screen could accidentally re-import.
- The keep-list is intact: every export documented in CONTEXT §"Mock-deletion scope" as KEEP is still present.
- Plan 13-04 can run its visual + behavioral verification knowing that the codebase is in its final Phase 13 shape.
</success_criteria>

<output>
After completion, create `.planning/phases/13-recommendation-lambda-integration/13-03-SUMMARY.md` capturing:
- The exact final export list of `recommend.ts` (8 exports — verifiable by re-grepping).
- The line-count delta (before / after).
- Confirmation that the 6 consumer files still resolve their imports.
- The exact text of the rewritten module header (so plan 13-04's verification can reference it if visual smoke turns up anything).
</output>
</content>
</invoke>