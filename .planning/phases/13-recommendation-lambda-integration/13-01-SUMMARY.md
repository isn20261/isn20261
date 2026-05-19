---
phase: 13-recommendation-lambda-integration
plan: 01
subsystem: lib/api
tags: [intg-reco-01, types, adapter, lambda-integration]
requires:
  - 12-* (FETCH-01..07): apiGet, Result<T, ApiError>, client.ts:262 empty-body branch
  - functions/recommend/recommend.py: handler() wire shape (read-only, immutable)
provides:
  - RecommendationResponse (wire-shape type)
  - RecommendedMovie (post-adapter screen-facing type)
  - RecommendationServiceWire, RecommendedService (per-service types)
  - getRecommendationReal(): Promise<Result<RecommendedMovie | null, ApiError>>
affects:
  - frontend/web/lib/api/recommend.real.ts (type-narrowed)
  - frontend/web/app/(app)/(protected)/smoke/page.tsx (still compiles — JSON.stringify-shaped consumption is shape-agnostic)
tech-stack:
  added: []
  patterns:
    - "Kebab→camel adapter at the typed-fetch boundary (single point of access for wire-only keys)"
    - "Graceful-degradation type design: all fields the live Lambda does not return modeled as optional"
key-files:
  created:
    - .planning/phases/13-recommendation-lambda-integration/deferred-items.md
  modified:
    - frontend/web/lib/api/recommend.real.ts
decisions:
  - "Symbol naming: `RecommendationResponse` (wire) + `RecommendedMovie` (camelCase). Picked over `LiveMovie` because the type travels through the screen layer in plan 13-02 and reads naturally there."
  - "Adapter inlined in recommend.real.ts (not extracted to a separate `recommend.adapter.ts`). The transform is 8 lines; extraction adds an import without splitting any reusable concept."
  - "`readonly` markers on every type field. Costs nothing; signals that the Lambda response is treated as immutable downstream and prevents accidental mutation by the screen."
  - "Optional field ordering: `year, runtime, rating, match, director, cast, synopsis, mood` — matches the order they appear on the `Movie` type in recommend.ts, so a future reviewer can diff the two shapes mentally without re-sorting. `posterSeed`/`backdropSeed` are intentionally absent (Picsum-only artifacts)."
  - "`adaptResponse` defensively coerces a missing `streaming-services` to `[]` via `??`, even though the wire contract promises an array. Costs nothing and aligns with the no-throw rule."
metrics:
  duration_minutes: ~12
  tasks_completed: 1
  files_modified: 1
  files_created: 1
  completed: 2026-05-14
---

# Phase 13 Plan 01: Type Narrowing and Adapter Summary

Phase 13's typed live-recommendation surface is in place: `recommend.real.ts` now mirrors the actual `/api/v1/recommend` Lambda payload (`title`, `genre`, `streaming-services`) at the type level and converts the kebab-case wire key to camelCase `streamingServices` through an adapter that's the sole boundary in the frontend touching the kebab form.

## Final type signatures

The full file is committed at `b2d9699:frontend/web/lib/api/recommend.real.ts`. Headline exports:

```ts
// Wire shape — literal payload from functions/recommend/recommend.py handler()
export type RecommendationServiceWire = {
  readonly name: string;
  readonly image: string;
  readonly url: string;
};

export type RecommendationResponse = {
  readonly title: string;
  readonly genre: string;
  readonly "streaming-services": ReadonlyArray<RecommendationServiceWire>;
};

// Post-adapter, screen-facing shape (camelCase, optional metadata fields)
export type RecommendedService = {
  readonly name: string;
  readonly image: string;
  readonly url: string;
};

export type RecommendedMovie = {
  readonly title: string;
  readonly genre: string;
  readonly streamingServices: ReadonlyArray<RecommendedService>;
  readonly year?: number;
  readonly runtime?: string;
  readonly rating?: string;
  readonly match?: number;
  readonly director?: string;
  readonly cast?: ReadonlyArray<string>;
  readonly synopsis?: string;
  readonly mood?: ReadonlyArray<string>;
};

// Public fetch surface
export async function getRecommendationReal(): Promise<Result<RecommendedMovie | null, ApiError>>;
```

The internal helper `adaptResponse(wire: RecommendationResponse): RecommendedMovie` (not exported) performs the kebab→camel rewrite by reading `wire["streaming-services"] ?? []` and mapping each entry into a `RecommendedService`. Title and genre pass through unchanged. The optional fields are deliberately not populated by the adapter — they remain `undefined` until issue #70 (OMDb + Streaming Availability enrichment) lands, at which point the adapter is the natural place to wire them in.

`getRecommendationReal` calls `apiGet<RecommendationResponse | null>("/api/v1/recommend")`, returns `result` verbatim on `result.ok === false`, returns `{ ok: true, data: null }` on the 2xx-empty-body branch (where `client.ts:262` already coerces empty text to `null`), and otherwise returns `{ ok: true, data: adaptResponse(result.data) }`.

## Kebab boundary is single-point

`git grep -n 'streaming-services' frontend/web` shows hits only in `lib/api/recommend.real.ts` — 2 hits in code (the type definition on line 56 and the bracket access on line 92) plus 2 hits in the header docstring. No screen, component, or test file touches the kebab form directly. This satisfies the plan's `<verification>` block.

`git grep -nE 'streamingServices' frontend/web` shows hits only in `lib/api/recommend.real.ts` at this point. Plan 13-02 will add screen-side consumption.

## Adapter never throws on missing optional fields

Adapter contract verified in code:
- `wire.title`, `wire.genre` passed through directly (the wire contract guarantees they are present strings; if the Lambda misbehaves the failure surfaces at the JSON-parse step in `client.ts`, not here).
- `wire["streaming-services"]` defensively coerced to `[]` via `??` before `.map` — even if the Lambda regresses to omitting the key, the adapter returns a well-formed `RecommendedMovie` with an empty `streamingServices` and the screen layer renders the empty state.
- All Phase 7 metadata fields (year/runtime/rating/match/director/cast/synopsis/mood) are absent from the wire response by design — they live on `RecommendedMovie` only as `?:` optionals. The adapter does not populate them, so they evaluate as `undefined` downstream. Renderers in plan 13-02 will guard each one with a presence check; nothing here throws.
- `posterSeed`/`backdropSeed` are not on `RecommendedMovie` at all — plan 13-02 picks a different backdrop strategy at the screen.

## Verification gates

All from the plan's `<acceptance_criteria>` block:

| Gate | Result |
|------|--------|
| `grep -nE 'export (type\|interface) RecommendationResponse'` | 1 hit (line 53) |
| `grep -nE 'export (type\|interface) RecommendedMovie'` | 1 hit (line 69) |
| `grep -n '"streaming-services"'` | 2 hits (type def + bracket access) |
| `grep -nE 'streamingServices'` | 4 hits (docstring, type field, local var, return) |
| `grep -nE 'from "@/lib/api/recommend"'` | 0 hits (Movie import removed) |
| `grep -niE '\bmock\b'` | 0 hits (header rewritten) |
| `grep -nE 'getRecommendationReal\(\): Promise<Result<RecommendedMovie \| null, ApiError>>'` | 1 hit (line 109) |
| `pnpm tsc --noEmit` | exit 0 |
| `eslint lib/api/recommend.real.ts` | exit 0 |
| importer surface | only `app/(app)/(protected)/smoke/page.tsx` (expected; plan 13-02 adds the recommendation screen) |
| DSGN-06 `style=\{` in `frontend/web/lib/` | 0 hits (N/A — non-component module) |

## Deviations from Plan

### Auto-fixed Issues

None. The implementation followed the plan's `<action>` block verbatim.

### Out-of-Scope Issues (Deferred)

**1. [SCOPE BOUNDARY — Pre-existing] ESLint `react-hooks/purity` failure in `app/(app)/(protected)/smoke/page.tsx:66`**

- **Found during:** Plan 13-01 Task 1 acceptance check (`pnpm lint` / `eslint .`).
- **Issue:** `const stamp = Date.now();` inside `fireSynthetic()` is flagged by `react-hooks/purity` ("Cannot call impure function during render").
- **Why pre-existing:** The file was last modified in commit `6bfb57f` (Phase 12, plan 12-04). Plan 13-01 did not touch it; `git diff HEAD~1 HEAD -- app/(app)/(protected)/smoke/page.tsx` shows no diff against pre-execution baseline (the file is unchanged in `b2d9699`).
- **Why deferred not fixed:** The smoke page is a throwaway harness scheduled for Phase 17 deletion (STATE.md "Pending Todos"). Plan 13-01's scope is `recommend.real.ts`, which lints clean in isolation. Per SCOPE BOUNDARY: pre-existing failures in unrelated files are logged to `deferred-items.md`, not fixed in the current plan.
- **Logged:** `.planning/phases/13-recommendation-lambda-integration/deferred-items.md`.
- **Suggested resolution path:** wait for Phase 17 smoke-page deletion, OR add a scoped `eslint-disable-next-line react-hooks/purity` on smoke/page.tsx:66 if a downstream plan (e.g. 13-04 verification) gates on a globally-clean lint.

### Authentication Gates

None this plan.

## Decisions Made (executor discretion)

Per CONTEXT §"Claude's Discretion":

1. **Naming:** picked `RecommendationResponse` (wire) + `RecommendedMovie` (camelCase) over `LiveMovie`. Reads naturally at both the fetch site and the screen-consumption site (`const movie: RecommendedMovie = ...`). `RecommendationServiceWire` + `RecommendedService` mirror the same pattern at the per-service level.
2. **Module layout:** kept `recommend.real.ts` as a separate file alongside the (untouched) `recommend.ts` placeholder surface. Plan 13-03 will trim `recommend.ts`; Phase 17 may consolidate further.
3. **Adapter location:** inlined in `recommend.real.ts` rather than extracted to a new `recommend.adapter.ts`. The transform is 8 lines, has one call site, and lives in the same conceptual module as the public surface.
4. **`readonly` everywhere:** added `readonly` to every field in both type families. Costs nothing at the type level (the runtime objects are still plain JS), and signals downstream that the response is immutable.
5. **Defensive `?? []`** in the adapter even though the wire contract guarantees `streaming-services` is an array. The wire contract is enforced by a different team's Lambda; the cost of one nullish-coalesce is negligible against the upside of not crashing if the contract regresses.

## Forward Hand-Off

Plan 13-02 (screen-swap-and-states) can now:
- Import `RecommendedMovie` and `getRecommendationReal` from `@/lib/api/recommend.real`.
- Branch on `result.ok`; on success, handle `data === null` (empty payload) and `data: RecommendedMovie` cases separately.
- Render `movie.title`, `movie.genre`, `movie.streamingServices[]` directly.
- Guard each optional metadata field with a presence check (`movie.year && ...`).
- For the `Watch on {service}` primary CTA, the natural source is `movie.streamingServices[0]?.url` (per CONTEXT §"Specifics" — the Lambda gives a direct deep link).
- For the backdrop, pick a Phase-13–specific strategy (CONTEXT §"Specific Ideas") — no `posterSeed`/`backdropSeed` available.
- Hide the similar-films rail with a comment marker.

Plan 13-03 (mock-deletion) is unaffected by this plan — `recommend.ts` was not touched.

## Self-Check: PASSED

Verified:
- FOUND: `frontend/web/lib/api/recommend.real.ts` (modified)
- FOUND: `.planning/phases/13-recommendation-lambda-integration/deferred-items.md` (created)
- FOUND commit: `b2d9699` (`feat(13-01-1): narrow recommend.real.ts to live Lambda shape with kebab→camel adapter`)
- All 11 acceptance-criteria gates in the table above pass.
