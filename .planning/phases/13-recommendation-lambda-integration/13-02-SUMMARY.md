---
phase: 13-recommendation-lambda-integration
plan: 02
subsystem: app/(app)/recommendation
tags: [intg-reco-01, intg-reco-02, screen-swap, lambda-integration, dsgn-06]
requires:
  - 13-01: RecommendedMovie type + getRecommendationReal() fetch surface
  - 12-* (FETCH-01..07): apiGet, Result<T, ApiError>, useApiErrorUx hook
provides:
  - Live /recommendation screen wired to the real /api/v1/recommend Lambda
  - Discriminated state machine (loading / ready / empty / error) on the screen
  - Documented similar-films-rail comment marker for future restoration
affects:
  - frontend/web/app/(app)/recommendation/page.tsx (mock → live swap, conditional metadata, 4-state machine)
tech-stack:
  added: []
  patterns:
    - "Discriminated status state on the screen — `status: \"loading\" | \"ready\" | \"empty\" | \"error\"` paired with `movie | null` rather than overloading nullability with semantics"
    - "Error decoupling — `useApiErrorUx(error)` handles user-facing toasts; the rendered error pane shows a generic copy + retry, so the user-safe message is not duplicated between toast and pane"
    - "Conditional structural omission for unknown live fields — Phase 7's metadata strip / synopsis / director / cast are wrapped in presence checks; absent fields drop the wrapping element entirely (no em-dash placeholders)"
    - "Stable per-title local watch-later id (`live:${title}`) — interim until Phase 16 swaps to the real /watch-later Lambda"
key-files:
  created: []
  modified:
    - frontend/web/app/(app)/recommendation/page.tsx
decisions:
  - "ServiceBadge `kind` placeholder: `\"included\"` — the green/success availability framing matches the design reference's neutral default state and is the least visually surprising choice given the live Lambda returns no tier info. Documented inline at the construction site; issue #70 replaces with real tier data."
  - "Backdrop strategy: Path B (no `<img>` — gradient scrims only) per CONTEXT graceful degradation. The two `bg-[linear-gradient(...)]` scrim layers already render against `bg-bg` and produce a clean tonal header without a backdrop image, so `backdropUrl()` and the `<img>` element were both removed. The container `<div aria-hidden className=\"absolute top-0 left-0 right-0 h-[360px] md:h-[560px] overflow-hidden animate-fade-in\">` stays so the spacing below is unchanged."
  - "Watch-later interim id: `live:${movie.title}` — `addToWatchLater`/`removeFromWatchLater`/`isInWatchLater` accept any string id, so a per-title prefix keeps the Phase 7 watch-later UX functional without colliding with the mock dataset's `m1..m12` ids. Phase 16 owns the real swap."
  - "Watch-on CTA is now an `<a target=\"_blank\" rel=\"noopener noreferrer\">` rather than a `<button type=\"button\">` — the Lambda gives a real deep link (per CONTEXT §Specifics) which is an improvement over Phase 7's mock that had no link, and the rel=noopener noreferrer pair protects against window.opener leakage on the external navigation."
  - "Recommend-another button does NOT carry `disabled={status === \"loading\"}` in the ready branch — TypeScript narrows `status` to `\"ready\"` inside the branch, making the comparison unreachable; the loading state already replaces the whole screen with the skeleton, so the button is unmounted while a fetch is in flight. Inline comment explains the structural reason."
metrics:
  duration_minutes: ~3
  tasks_completed: 1
  files_modified: 1
  files_created: 0
  completed: 2026-05-15
---

# Phase 13 Plan 02: Screen Swap and States Summary

`/recommendation` now consumes the live Lambda end-to-end. The screen imports zero symbols from `@/lib/api/recommend`, branches on `Result<RecommendedMovie | null, ApiError>`, and renders four discriminated states (loading / ready / empty / error). The Similar-films rail is hidden via a documented JSX comment marker pending issue #70 enrichment or a dedicated `/similar` endpoint.

## Final import block at the top of `recommendation/page.tsx`

```ts
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Play, RefreshCw } from "lucide-react";
import { ServiceBadge } from "@/components/ServiceBadge";
import {
  getRecommendationReal,
  type RecommendedMovie,
} from "@/lib/api/recommend.real";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
import type { ApiError } from "@/lib/api/client";
import {
  addToWatchLater,
  isInWatchLater,
  removeFromWatchLater,
} from "@/lib/api/watch-later";
```

Notably absent (deleted in this plan):
- `MovieCard` from `@/components/MovieCard` — similar-films rail is hidden.
- `backdropUrl, getRecommendation, getSimilar, type Movie` from `@/lib/api/recommend` — the entire mock surface is gone from this file.

`RecommendedService` from `recommend.real` is also not imported here — the screen reads `s.name` and `s.url` directly off `streamingServices[0]` and the map iteration without naming the per-service type. The wider `ApiError` is imported for the `useState<ApiError | null>` slot.

## Conditional vs unconditional render decisions per field

The live Lambda returns only `title`, `genre`, `streamingServices`. Everything else from the Phase 7 `Movie` shape is optional. Each render site:

| Field        | Source           | Render rule on the screen                                                                                       |
|--------------|------------------|------------------------------------------------------------------------------------------------------------------|
| `title`      | Lambda (always)  | **Unconditional** — `<h1>{movie.title}</h1>`                                                                     |
| `genre`      | Lambda (always)  | **Conditional on `length > 0`** — renders the meta-strip cell as `<span className="text-text-muted capitalize">{movie.genre}</span>`. Defensive guard against a future blank-genre Lambda branch. |
| `streamingServices` | Lambda    | **Conditional on `length > 0`** — the Where-to-watch `<div className="mb-8">` wrapper itself is omitted when the list is empty (no orphan heading). |
| `streamingServices[0]` (primary CTA) | Lambda | **Conditional on truthy** — the `<a>` Watch-on button only renders when a primary service exists. |
| `synopsis`   | issue #70 future | **Conditional truthy** — `{movie.synopsis && <p>...</p>}`. No em-dash placeholder.                                |
| `match`      | issue #70 future | **Conditional `!== undefined`** — meta-strip cell omitted when absent.                                           |
| `year`       | issue #70 future | **Conditional `!== undefined`** — meta-strip cell omitted when absent.                                           |
| `rating`     | issue #70 future | **Conditional `!== undefined`** — the chip primitive is omitted entirely when absent.                            |
| `runtime`    | issue #70 future | **Conditional `!== undefined`** — meta-strip cell omitted when absent.                                           |
| `director`   | issue #70 future | **Conditional truthy** — its sub-column is omitted when absent.                                                  |
| `cast`       | issue #70 future | **Conditional `cast && cast.length > 0`** — its sub-column is omitted when absent.                               |
| `mood`       | issue #70 future | **Unrendered this phase** — Phase 7 had no mood UI on the recommendation screen, only in preferences.            |
| `posterSeed` / `backdropSeed` | — (deleted) | **Unconditionally omitted** — the `<img>` element is removed entirely; gradient scrim layers stay (Path B). |

The metadata strip itself is wrapped in a `showMetaStrip` guard so the `<div>` is omitted entirely when no metadata cell would render. The Cast/Director grid is wrapped in `{(movie.director || (movie.cast && movie.cast.length > 0)) && ...}` so the entire grid is omitted when neither sub-column would render.

## Similar-films-rail comment marker

The exact text committed at line 350 of `recommendation/page.tsx`:

```jsx
{/* TODO Phase 13+ (issue #70 enrichment OR dedicated /similar endpoint): similar-films rail hidden — live /recommend payload has no similar films, and the prior Phase 7 helper iterated the now-deleted MOCK dataset. */}
{/* <SimilarFilmsRail /> */}
```

Plan 13-04 can grep for `similar-films rail hidden` to confirm the marker is present and unchanged.

**Note on wording:** the plan's `<action>` block suggested literally referencing `getSimilar()` in the comment, but that would have tripped the plan's own AC gate (`git grep -nE 'getSimilar' returns 0 hits`). Reworded to "the prior Phase 7 helper" to preserve the marker's intent while satisfying the grep gate. Logged below under Deviations.

## ServiceBadge `kind: "included"` placeholder

The live `RecommendedService` shape has `{ name, image, url }` — no `kind`. The Phase 7 `Service` type (from `@/lib/api/recommend`, kept this phase per CONTEXT §Mock-deletion scope) requires `kind: "included" | "rent" | "buy"`. The screen constructs the `Service`-shaped object inline at the map call:

```jsx
<ServiceBadge
  key={s.name}
  service={{ name: s.name, kind: "included" }}
/>
```

Choice rationale (per CONTEXT §"Specifics — pick the path with the least visual surprise"):

- `"included"` renders the green/success "Included" label via `text-success` (`ServiceBadge.tsx:31`). This frames every live service as "available to watch on your subscription" — which is the default, neutral framing.
- `"rent"` or `"buy"` would render a `text-text-muted` "Rent" / "Buy" label, which is **wrong by default** — the Lambda doesn't tell us the service is rental-only.
- A new neutral fourth variant (e.g. `kind: "unknown"`) would require modifying `ServiceBadge.tsx`, which is out of scope for this plan.

Issue #70 (OMDb + Streaming Availability API enrichment) is where real tier data lands; that's where the placeholder gets swapped for `s.kind` derived from the enriched payload.

Documented inline with `// non-tokenized: live data has no kind tier — default to "included" until issue #70 enriches with rent/buy info.`

## Four discriminated render branches

| `status`     | Movie state            | Render                                                                                                       |
|--------------|------------------------|--------------------------------------------------------------------------------------------------------------|
| `"loading"`  | any                    | Full-bleed `<div className="w-full min-h-screen bg-bg animate-pulse" aria-busy="true" />` — identical to the Phase 7 skeleton. |
| `"error"`    | irrelevant             | Section-chrome wrapper, eyebrow "Something went wrong", heading "We couldn't load a recommendation", static body copy, "Try again" accent button → `handleAnother`. Toast already fired by `useApiErrorUx`. |
| `"empty"`    | `null` (or fall-through if `movie === null`)| Section-chrome wrapper, eyebrow "No recommendation right now", heading "We've got nothing for you yet", body "Try again — we'll roll a new one.", "Try again" accent button. |
| `"ready"`    | `RecommendedMovie`     | Full Phase 7-styled layout with all conditional fields above, real Watch-on `<a>` to `streamingServices[0].url`, where-to-watch ServiceBadge grid. |

The `if (status === "empty" || movie === null)` early return is a defense-in-depth belt-and-braces — if `status === "ready"` somehow lands without a movie (it shouldn't given the fetch handlers always set both), the empty branch renders instead of crashing on `movie.title`. TypeScript narrowing inside the data branch then guarantees `movie` is non-null.

## Verification gates (from plan `<acceptance_criteria>`)

| Gate                                                                                       | Result                                                              |
|--------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| `git grep -nE 'from "@/lib/api/recommend"' …/page.tsx`                                     | 0 hits (mock import gone)                                           |
| `git grep -nE 'from "@/lib/api/recommend.real"' …/page.tsx`                                | 1 hit (line 45)                                                     |
| `git grep -nE 'useApiErrorUx' …/page.tsx`                                                  | 3 hits (docstring + import + call)                                  |
| `git grep -nE 'getRecommendation\(' …/page.tsx`                                            | 0 hits (Phase 7 helper gone — `getRecommendationReal` is `Real\\(`)  |
| `git grep -nE 'getSimilar' …/page.tsx`                                                     | 0 hits (after wording fix, see Deviations)                          |
| `git grep -nE 'getRecommendationReal' …/page.tsx`                                          | 4 hits (docstring + import + 2 call sites)                          |
| `git grep -nE 'backdropUrl' …/page.tsx`                                                    | 0 hits (Path B graceful degradation)                                |
| `git grep -nE 'MovieCard' …/page.tsx`                                                      | 0 hits (similar-films rail gone)                                    |
| `git grep -nE 'streamingServices' …/page.tsx`                                              | 4 hits (docstring + primaryService destructure + length check + map)|
| `git grep -nE 'movie\.services' …/page.tsx`                                                | 0 hits (Phase 7 shape gone)                                         |
| `git grep -nE 'similar-films rail hidden' …/page.tsx`                                      | 1 hit (line 350 marker)                                             |
| `git grep -nE '"use client"' …/page.tsx`                                                   | 1 hit (line 1)                                                      |
| DSGN-06 `git grep -nE 'style=\{' …/page.tsx`                                               | 0 hits                                                              |
| DSGN-06 `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' …/page.tsx`                          | 0 hits                                                              |
| status discriminator literals `"(loading\|ready\|empty\|error)"`                           | 15 hits — well over the ≥4 floor                                    |
| `rel="noopener noreferrer"` on Watch-on CTA                                                | 1 hit (line 279)                                                    |
| Action step 6 deleted-symbol negative grep (`MOVIES\|getRecommendation\(\|getSimilar\|movie\.services\|movie\.posterSeed\|movie\.backdropSeed\|movie\.genres\|backdropUrl\(`) | 0 hits |
| `tsc --noEmit`                                                                             | exit 0                                                              |
| `eslint app/(app)/recommendation/page.tsx`                                                 | exit 0                                                              |
| `next build`                                                                               | exit 0 — `/recommendation` static-prerendered alongside the other 13 routes |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Removed unreachable `disabled={status === "loading"}` / `aria-busy` props on the "Recommend another" button in the ready branch.**

- **Found during:** Task 1, final `tsc --noEmit` gate.
- **Issue:** TypeScript flagged `app/(app)/recommendation/page.tsx(302,25): error TS2367: This comparison appears to be unintentional because the types '"ready"' and '"loading"' have no overlap.` The button is rendered only inside the `status === "ready"` branch, where TypeScript narrows `status` to `"ready"` and refuses to compare it with `"loading"`.
- **Fix:** Removed the disabled / aria-busy props (and the inline spinner branch which depended on them) from the ready-branch button. The structural reason this is safe: `setStatus("loading")` is called *before* any await in both `useEffect` and `handleAnother`, which causes React to immediately re-render — at which point the early `if (status === "loading")` branch returns the full-bleed skeleton, unmounting the entire ready tree (including the Recommend-another button). So while a fetch is in flight, the button does not exist, and the disabled prop would never be active. The skeleton is a stronger affordance than disabling a button anyway.
- **Files modified:** `frontend/web/app/(app)/recommendation/page.tsx` (one button block).
- **Tracked in:** task commit `3c27feb`. Inline comment in the file explains the structural reason at the button site.

**2. [Rule 3 — Blocking issue] Reworded the similar-films-rail comment marker to omit the literal `getSimilar()` symbol.**

- **Found during:** Task 1, AC grep gate `git grep -nE 'getSimilar' …/page.tsx` returns 0 hits.
- **Issue:** The plan's `<action>` block step 5 (Similar Films rail) suggested the comment text `similar-films rail hidden — live /recommend payload has no similar films and getSimilar() iterated the now-deleted MOCK dataset.` That literal text contains the `getSimilar` token, which would fail the plan's own AC gate stipulating zero `getSimilar` hits.
- **Fix:** Reworded the explanatory portion of the comment to `"the prior Phase 7 helper iterated the now-deleted MOCK dataset"` — preserves the marker's intent (documents *why* the rail is hidden and points at the issue #70 / `/similar` future) without referencing the now-deleted symbol name.
- **Files modified:** `frontend/web/app/(app)/recommendation/page.tsx` (line 350 comment).
- **Tracked in:** task commit `3c27feb` (the rewording happened before the commit).

### Out-of-Scope Issues (Deferred / Pre-existing)

**1. [SCOPE BOUNDARY — Pre-existing from Phase 12] ESLint `react-hooks/purity` failure in `app/(app)/(protected)/smoke/page.tsx:66`**

- **Found during:** Plan 13-02 acceptance check (full-project `eslint .`).
- **Issue:** `const stamp = Date.now();` inside `fireSynthetic()` is flagged.
- **Why pre-existing:** Plan 13-02 did not touch `smoke/page.tsx`. Already logged in Plan 13-01's `deferred-items.md` and SUMMARY. Scheduled for Phase 17 cleanup (smoke-page deletion) per STATE.md.
- **Action taken:** None. Per SCOPE BOUNDARY: only auto-fix issues directly caused by the current task's changes.

### Authentication Gates

None this plan. The `/recommendation` route is behind the existing `(protected)` layout chain; live fetch verification belongs to Plan 13-04.

## Build Outcome

`next build` (Node 22.22.3, Next.js 16.2.4 Turbopack):

```
✓ Compiled successfully in 2.2s
  Finished TypeScript in 2.7s
✓ Generating static pages using 11 workers (14/14) in 301ms

Route (app)
├ ○ /recommendation
└ ○ … (13 other routes unchanged)
```

`/recommendation` continues to be a static-prerendered route — the live fetch happens at runtime in the client component on mount, so SSR/SSG semantics are preserved.

## Forward Hand-Off

Plan 13-03 (mock-deletion) can now safely:
- Delete `MOVIES`, `getRecommendation()`, `getSimilar()` from `lib/api/recommend.ts` without breaking `/recommendation` — this file no longer imports any of those symbols. Verified by `git grep -nE 'getRecommendation\(|getSimilar|MOVIES' frontend/web/app/(app)/recommendation/page.tsx` returning 0 hits.
- Keep `Movie`, `Service`, `posterUrl`, `backdropUrl`, `STREAMING_SERVICES`, `MOODS`, `RATINGS`, `Rating`, `PICK_LATENCY_MS` (the other 5 importers — `preferences`, `watch-later`, `MovieCard`, `HistoryRow`, `ServiceBadge`, `smoke` — still need them, and the `ServiceBadge` consumer on this very screen still needs `Service["kind"]`).

Plan 13-04 (verification) can:
- Run the manual smoke against `/recommendation` to confirm a real `GET /api/v1/recommend` fires with `Authorization: Bearer <IdToken>` in the Network panel.
- Trigger the empty state by stubbing the wrapper to resolve `{ ok: true, data: null }`.
- Trigger the error state by going offline / stubbing a non-2xx response, and confirm both the toast (via `useApiErrorUx`) and the in-screen "Try again" pane render.
- Grep for the `similar-films rail hidden` marker to confirm the rail is hidden, not deleted.

## Self-Check: PASSED

Verified:
- FOUND: `frontend/web/app/(app)/recommendation/page.tsx` (modified, 222+/102- vs Phase 7 baseline)
- FOUND commit: `3c27feb` (`feat(13-02-1): swap /recommendation to live Lambda via getRecommendationReal`)
- All 19 acceptance-criteria gates pass (see verification table above)
- `tsc --noEmit` exit 0
- `eslint app/(app)/recommendation/page.tsx` exit 0
- `next build` exit 0
