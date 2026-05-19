---
phase: 13-recommendation-lambda-integration
plan: 02
type: execute
wave: 2
depends_on:
  - 13-01
files_modified:
  - frontend/web/app/(app)/recommendation/page.tsx
autonomous: true
requirements:
  - INTG-RECO-01
  - INTG-RECO-02
user_setup: []
must_haves:
  truths:
    - "Visiting /recommendation while authenticated triggers a real GET /api/v1/recommend through the Phase 12 wrapper (visible in the Network panel)."
    - "The rendered title, genre, and 'Watch on {service}' CTA href are sourced from the Lambda response — no mock data is in the rendered path."
    - "Network failure renders error-class-aware UX (toast via useApiErrorUx) with a retry affordance — not a blank page and not an unhandled exception."
    - "A null/empty Lambda response renders an explicit empty state with retry — not a perpetual loading spinner and not a crash."
    - "Fields the Lambda does NOT return (year, runtime, rating, match, director, cast, synopsis, mood) are omitted from the rendered output rather than rendered as 'undefined' or em-dashes."
    - "The 'Similar films' rail is hidden this phase — the JSX block is commented out with a marker referencing future restoration; layout structure is preserved."
  artifacts:
    - path: "frontend/web/app/(app)/recommendation/page.tsx"
      provides: "Live recommendation screen consuming getRecommendationReal() via Result<RecommendedMovie | null, ApiError>; loading / error / empty / data states; primary 'Watch on {service}' CTA wired to streamingServices[0].url."
      contains: "getRecommendationReal, useApiErrorUx, RecommendedMovie, streamingServices"
  key_links:
    - from: "frontend/web/app/(app)/recommendation/page.tsx"
      to: "frontend/web/lib/api/recommend.real.ts"
      via: "import { getRecommendationReal, type RecommendedMovie } from '@/lib/api/recommend.real'"
      pattern: "from \"@/lib/api/recommend.real\""
    - from: "frontend/web/app/(app)/recommendation/page.tsx"
      to: "frontend/web/lib/api/useApiErrorUx.ts"
      via: "import { useApiErrorUx } from '@/lib/api/useApiErrorUx'"
      pattern: "useApiErrorUx"
    - from: "'Watch on {service}' button href"
      to: "movie.streamingServices[0]?.url"
      via: "anchor href (real deep link from Lambda response)"
      pattern: "streamingServices\\[0\\]"
---

<objective>
Swap `/recommendation` from the Phase 7 mock-backed `getRecommendation()` / `getSimilar()` flow to the Phase 13 live-fetch flow built in plan 13-01. The screen consumes `getRecommendationReal(): Promise<Result<RecommendedMovie | null, ApiError>>`, branches on `result.ok`, and renders four distinct surface states (loading / data / error / empty). The "Similar films" rail is hidden per CONTEXT §"Similar films rail". Fields the live Lambda doesn't return are conditionally omitted per CONTEXT §"Architecture / Strategy — Option C".

Purpose: Phase 13 success criteria #1, #3, and #4 (live data rendered, network-cut renders error UX, empty payload renders empty state) all land on this screen file. Plan 13-01 made the types correct; plan 13-02 makes the rendered DOM correct. Plan 13-03 then cleans up the unused mock surface.

Output: A `recommendation/page.tsx` that imports only from `@/lib/api/recommend.real`, `@/lib/api/client`, `@/lib/api/useApiErrorUx`, `@/lib/api/watch-later`, `@/components/ServiceBadge`, and the existing icon / React surface. No import from `@/lib/api/recommend` remains in this file.
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
@frontend/web/AGENTS.md
@frontend/web/CLAUDE.md
@frontend/web/lib/api/recommend.real.ts
@frontend/web/lib/api/client.ts
@frontend/web/lib/api/useApiErrorUx.ts
@frontend/web/app/(app)/recommendation/page.tsx
@frontend/web/components/ServiceBadge.tsx
@frontend/web/lib/api/watch-later.ts
@frontend/_design-reference/detail.jsx

<interfaces>
<!-- Contracts the screen consumes. Plan 13-01 produces RecommendedMovie / getRecommendationReal; this plan reads them. -->

From `frontend/web/lib/api/recommend.real.ts` (post plan 13-01):
```
export type RecommendedService = { name: string; image: string; url: string };
export type RecommendedMovie = {
  title: string;
  genre: string;
  streamingServices: ReadonlyArray<RecommendedService>;
  year?: number;
  runtime?: string;
  rating?: string;
  match?: number;
  director?: string;
  cast?: ReadonlyArray<string>;
  synopsis?: string;
  mood?: ReadonlyArray<string>;
};
export function getRecommendationReal(): Promise<Result<RecommendedMovie | null, ApiError>>;
```

From `frontend/web/lib/api/client.ts`:
```
export type Result<T, E> = { ok: true; data: T } | { ok: false; error: E };
export type ApiError = { kind: "network" | "unauthorized" | "forbidden" | "validation" | "server"; ... };
```

From `frontend/web/lib/api/useApiErrorUx.ts`:
```
export function useApiErrorUx(error: ApiError | null): void;
// network / server / forbidden  → toast.error
// unauthorized                  → no-op (wrapper already triggered signOut + redirect via setOnUnauthorized)
// validation                    → no-op (caller renders inline)
```

From `frontend/web/components/ServiceBadge.tsx`:
```
export function ServiceBadge({ service }: { service: Service }): JSX.Element;
// service.kind = "included" | "rent" | "buy"  (REQUIRED on the Phase 7 Service type)
```
The live `RecommendedService` lacks `kind`. The screen must NOT pass a `RecommendedService` directly to `ServiceBadge` — it must construct a `Service`-shaped object with an explicit `kind: "included"` placeholder (per CONTEXT §"Specifics" — pick the least visually surprising path; "included" is the green/success variant which is the most neutral framing and matches the design reference's default state). Document that choice inline in the screen with a `// non-tokenized:` style comment.

From `frontend/web/lib/api/watch-later.ts` (existing — KEEP):
```
export function addToWatchLater(movieId: string): void;
export function removeFromWatchLater(movieId: string): void;
export function isInWatchLater(movieId: string): boolean;
```
These take a `movieId`. The live `RecommendedMovie` has NO `id` field. For watch-later interaction within the screen this phase, derive a stable per-render local id from `title` (e.g. `\`live:\${movie.title}\``) so the Phase 7 watch-later UX continues to work without storage collisions. Watch-later real integration is Phase 16; this is a defensible interim per CONTEXT §"Mock-deletion scope" (watch-later import stays through Phase 16).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace mock import block + state machine in recommendation/page.tsx</name>
  <files>frontend/web/app/(app)/recommendation/page.tsx</files>
  <read_first>
    - frontend/web/app/(app)/recommendation/page.tsx (entire current file, 236 lines)
    - frontend/web/lib/api/recommend.real.ts (post plan 13-01 — type contracts + getRecommendationReal signature)
    - frontend/web/lib/api/client.ts (lines 39-54 — Result + ApiError types)
    - frontend/web/lib/api/useApiErrorUx.ts (entire file — error-class routing policy)
    - frontend/web/components/ServiceBadge.tsx (entire file — confirms Service.kind is required)
    - frontend/web/lib/api/watch-later.ts (interface — addToWatchLater / removeFromWatchLater / isInWatchLater signatures)
    - frontend/_design-reference/detail.jsx (Phase 7 visual reference — for understanding which structural elements may be conditionally omitted vs preserved)
    - .planning/phases/13-recommendation-lambda-integration/13-CONTEXT.md §"Loading / Error / Empty states" and §"Screen swap mechanics" and §"`Similar films` rail" and §"Specifics"
    - frontend/web/AGENTS.md (DSGN-06 — no hex / no inline style / no px font-size for design-system properties)
  </read_first>
  <action>
    Modify `frontend/web/app/(app)/recommendation/page.tsx` in place. The file stays a Client Component (`"use client"` at the top is preserved). The output is one cohesive file; the actions below describe the sections that change.

    1. Imports block. DELETE:
       - `MovieCard` import from `@/components/MovieCard` (similar-films rail is hidden — only consumer of MovieCard on this screen).
       - `backdropUrl, getRecommendation, getSimilar, type Movie` from `@/lib/api/recommend`. The screen MUST NOT import from `@/lib/api/recommend` after this plan — that's the grep-gated split with plan 13-03.
       ADD:
       - `import { getRecommendationReal, type RecommendedMovie, type RecommendedService } from "@/lib/api/recommend.real";`
       - `import { useApiErrorUx } from "@/lib/api/useApiErrorUx";`
       - `import type { ApiError } from "@/lib/api/client";`
       KEEP unchanged:
       - React hooks (`useEffect`, `useState`), lucide icons (`Bookmark`, `BookmarkCheck`, `Play`, `RefreshCw`), `ServiceBadge`, watch-later helpers.

    2. State machine. Replace the existing `movie: Movie | null` + `picking: boolean` + `saved: boolean` setup with this exact shape (the names matter — they're referenced in subsequent tasks):
       - `const [movie, setMovie] = useState<RecommendedMovie | null>(null);`
       - `const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");`
       - `const [error, setError] = useState<ApiError | null>(null);`
       - `const [saved, setSaved] = useState(false);`
       - `useApiErrorUx(error);` — wired at component top level per the hook's contract; it's a no-op while `error` is null and fires toast.error when set to a network/server/forbidden error.

    3. Fetch effect + retry handler. Replace the existing `useEffect` + `handleAnother` body. Both call into a shared `fetchOne` helper:
       - `fetchOne` (declared inside the component, OR as an inline arrow): sets `status` to "loading", clears `error` to null (so a previous toast doesn't re-fire on the next render — the hook's effect depends on the error reference), awaits `getRecommendationReal()`, then branches:
         - `if (!res.ok)` → `setError(res.error); setStatus("error");` and return.
         - `if (res.ok && res.data === null)` → `setMovie(null); setStatus("empty");` and return.
         - `if (res.ok && res.data !== null)` → `setMovie(res.data); setSaved(isInWatchLater(\`live:\${res.data.title}\`)); setStatus("ready");`.
       - The mount effect calls `fetchOne()` once with a cancelled-flag pattern matching the current file's idiom: declare `let cancelled = false;`, await inside, only commit setState if `!cancelled`. Cleanup sets `cancelled = true`.
       - `handleAnother` (button onClick) calls `void fetchOne();` — same code path. No special "picking" flag.

    4. Save toggle. Replace the body of `handleToggleSave`:
       - Early-return if `movie === null`.
       - Construct `const localId = \`live:\${movie.title}\`;` (placeholder id strategy per the &lt;interfaces&gt; block above — watch-later real integration is Phase 16).
       - Branch on `saved`: `addToWatchLater(localId)` or `removeFromWatchLater(localId)`, then flip `setSaved(!saved)`.
       - Add an inline `// non-tokenized: live recommendation has no id; derive a stable per-title local id until Phase 16 wires the real /watch-later Lambda.` comment beside the `localId` line.

    5. Render branches. Replace the existing early return (`if (!movie) return ...`) and the main `return (...)` block with four discriminated branches on `status`. All four MUST use the existing Tailwind theme tokens — no new hex, no new px font-sizes for design-system properties, no `style={{}}` props (DSGN-06). The four branches:

       5a. `status === "loading"`. Reuse the existing Phase 7 skeleton: a full-bleed `<div className="w-full min-h-screen bg-bg animate-pulse" aria-busy="true" />`. Identical to the current `if (!movie)` early return.

       5b. `status === "error"`. Render a centered error panel inside the same `<section className="relative isolate w-full min-h-screen overflow-hidden bg-bg">` wrapper used by the data branch (so the chrome alignment is preserved). Content: an eyebrow `<p className={EYEBROW}>Something went wrong</p>` (reusing the existing `EYEBROW` constant), a heading using `font-display text-28 md:text-40 text-text-primary`, a body line at `text-14 text-text-secondary` showing a static copy "We couldn't load a recommendation right now." (do NOT render `error.message` verbatim — `useApiErrorUx` already surfaces it via toast; rendering it twice is noise). A primary button reusing the existing accent button class pattern from the "Watch on {service}" button (`inline-flex items-center gap-2 h-12 px-5 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold ...`) with label "Try again" and `onClick={handleAnother}`.

       5c. `status === "empty"`. Same chrome wrapper. Content: eyebrow "No recommendation right now", display heading "We've got nothing for you yet", body line "Try again — we'll roll a new one.", same accent "Try again" button → `handleAnother`.

       5d. `status === "ready"` AND `movie !== null`. This is the swapped data path. Start from the existing Phase 7 markup and apply these field-by-field changes:
          - BACKDROP: the current code calls `backdropUrl(movie, 1800, 1000)`. The live `RecommendedMovie` has no `backdropSeed`. Two paths — pick path B per CONTEXT §"Architecture / Strategy" graceful degradation:
            - Path A (DO NOT take): synthesize a seed from `movie.title`.
            - Path B (TAKE THIS): remove the `<img>` entirely from the backdrop wrapper; keep the two `<div className="absolute inset-0 bg-[linear-gradient(...)]" />` scrim layers because they already render against `bg-bg` and produce a clean tonal header — verified visually against `_design-reference/detail.jsx` at all three breakpoints by the verification plan 13-04. The `<div aria-hidden className="absolute top-0 left-0 right-0 h-[360px] md:h-[560px] overflow-hidden animate-fade-in">` container stays so the spacing below it is unchanged. Inline a `// non-tokenized: backdrop image suppressed until issue #70 adds backdrop URL — gradient scrims provide tonal hierarchy on their own.` comment.
          - EYEBROW "We think you'll like this one" — unchanged.
          - `<h1>{movie.title}</h1>` — unchanged (title is always present).
          - The metadata strip (the `<div className="flex items-center flex-wrap gap-x-3.5 gap-y-2 mt-4 text-13 text-text-secondary">` block). Convert each child to a conditional render that omits the wrapping element when the field is undefined. Order: `movie.match` (`<span className="text-accent text-14 font-semibold">{movie.match}% match</span>`), `movie.year` (`<span>{movie.year}</span>`), `movie.rating` (`<span className="border border-border-strong rounded-sm px-1.5 py-0.5 text-11 font-semibold text-text-primary">{movie.rating}</span>`), `movie.runtime` (`<span>{movie.runtime}</span>`). Add a NEW genre line that always renders (genre IS returned by the Lambda): `<span className="text-text-muted capitalize">{movie.genre}</span>`. (Use `capitalize` because the Lambda returns lowercase like "crime"; the live payload genre is a single tag, not the Phase 7 multi-genre `genres.join(" · ")`.) The whole `<div>` MUST itself be conditionally rendered: render it only if at least one of `movie.match`, `movie.year`, `movie.rating`, `movie.runtime` is defined OR `movie.genre` is non-empty (genre is always non-empty against the current Lambda, so this is effectively always-render — but the guard avoids an orphan `text-text-muted` strip if a future Lambda branch returns blank genre).
          - SYNOPSIS — conditional. Wrap the existing `<p className="mt-6 mb-7 text-text-primary text-[15px] md:text-[17px] leading-[1.55] max-w-[640px]">{movie.synopsis}</p>` in `{movie.synopsis && (...)}`. If `synopsis` is undefined, omit the paragraph entirely (do NOT render a placeholder `—`).
          - ACTIONS row — primary "Watch on {service}" button. Current code reads `movie.services[0]`; change to `movie.streamingServices[0]`. The button is now a real `<a>` (NOT a `<button type="button">`) so the href is functional. Use `<a href={primaryService.url} target="_blank" rel="noopener noreferrer" className="..."` with the existing accent button classes. The classes stay identical to the Phase 7 button. Label remains `Watch on {primaryService.name}`. Wrap in `{primaryService && (...)}`. The "Save to watch later" button and "Recommend another" button stay structurally identical — "Recommend another" now calls `handleAnother` which delegates to `fetchOne` (no separate `picking` flag — disable on `status === "loading"` via `disabled={status === "loading"}` and `aria-busy={status === "loading" || undefined}`).
          - WHERE-TO-WATCH section — the `<div className="mb-8">` block with the eyebrow and badge grid. Replace `{movie.services.map((s) => <ServiceBadge key={s.name} service={s} />)}` with `{movie.streamingServices.map((s) => <ServiceBadge key={s.name} service={{ name: s.name, kind: "included" }} />)}`. The badge consumes the legacy `Service` shape from `lib/api/recommend.ts` (still exported there post plan 13-03). The hardcoded `kind: "included"` is the documented placeholder (CONTEXT §"Specifics" — least visually surprising; the green/success availability framing matches a generic "available on" semantic). Add a `// non-tokenized: live data has no kind tier — default to "included" until issue #70 enriches with rent/buy info.` comment beside the kind literal.
          - CAST / DIRECTOR grid — wrap the entire `<div className="px-6 md:px-14 mb-9 max-w-[880px] grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 animate-fade-up [animation-delay:220ms]">` block in `{(movie.director || movie.cast) && (...)}`. Inside, render the Director sub-column only if `movie.director` is truthy, and the Cast sub-column only if `movie.cast && movie.cast.length > 0`. Do NOT render a sub-column with em-dash placeholder content. If `movie.cast` is rendered, `{movie.cast.join(" · ")}` stays as-is — `RecommendedMovie.cast` is `ReadonlyArray<string> | undefined`, so the truthiness guard already proves it's defined inside the conditional.
          - SIMILAR FILMS rail — wrap the entire `<div className="px-6 md:px-14 pb-14 animate-fade-up [animation-delay:380ms]">...</div>` block (heading + horizontal-scroll MovieCard list) in a JSX comment marker that disables it. Use the form:
            ```
            {/* TODO Phase 13+ (issue #70 enrichment OR dedicated /similar endpoint): similar-films rail hidden — live /recommend payload has no similar films and getSimilar() iterated the now-deleted MOCK dataset. */}
            {/* <SimilarFilmsRail /> */}
            ```
            The actual JSX is removed (not just commented inline — the imports for `MovieCard` and `getSimilar` were already deleted in step 1). The comment serves as a layout-restore marker per CONTEXT §"Similar films rail" (preserve spacing/section heading availability for re-introduction).

    6. Confirm the screen file has zero references to the deleted symbols. After editing, `grep -nE 'MOVIES|getRecommendation\(|getSimilar|Movie["][^.]|movie\.services|movie\.posterSeed|movie\.backdropSeed|movie\.genres|backdropUrl\(' frontend/web/app/(app)/recommendation/page.tsx` MUST return no hits. (The negative lookahead in the pattern is approximated by listing each forbidden token; the executor verifies by running the grep.)

    DSGN-06 constraints (re-asserted for this file):
    - No NEW `style={{}}` props introduced.
    - No NEW hex/rgba literals in `className` strings.
    - No NEW px font-sizes for design-system properties — the existing `text-[15px]` / `text-[17px]` / `text-[11px]` non-tokenized escape hatches stay (they're load-bearing per the file's existing DSGN-06 comment block) but no new ones are added.
    - The existing `bg-[linear-gradient(to_bottom,...)]` scrim primitives stay — they're per-file DSGN-06 escape hatches already documented in the file header.
  </action>
  <verify>
    <automated>cd frontend/web &amp;&amp; pnpm tsc --noEmit &amp;&amp; pnpm lint &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `git grep -nE 'from "@/lib/api/recommend"' frontend/web/app/(app)/recommendation/page.tsx` exits with no output (the mock import is gone).
    - `git grep -nE 'from "@/lib/api/recommend.real"' frontend/web/app/(app)/recommendation/page.tsx` returns exactly one hit.
    - `git grep -nE 'useApiErrorUx' frontend/web/app/(app)/recommendation/page.tsx` returns at least one hit (import + invocation).
    - `git grep -nE 'getRecommendation\(' frontend/web/app/(app)/recommendation/page.tsx` exits with no output (Phase 7 helper removed).
    - `git grep -nE 'getSimilar' frontend/web/app/(app)/recommendation/page.tsx` exits with no output.
    - `git grep -nE 'getRecommendationReal' frontend/web/app/(app)/recommendation/page.tsx` returns at least one hit.
    - `git grep -nE 'backdropUrl' frontend/web/app/(app)/recommendation/page.tsx` exits with no output (backdrop image suppressed per CONTEXT graceful degradation).
    - `git grep -nE 'MovieCard' frontend/web/app/(app)/recommendation/page.tsx` exits with no output (similar-films rail gone).
    - `git grep -nE 'streamingServices' frontend/web/app/(app)/recommendation/page.tsx` returns at least one hit.
    - `git grep -nE 'movie\.services' frontend/web/app/(app)/recommendation/page.tsx` exits with no output (Phase 7 shape token gone — replaced with `movie.streamingServices`).
    - `git grep -nE 'similar-films rail hidden' frontend/web/app/(app)/recommendation/page.tsx` returns at least one hit (CONTEXT-mandated comment marker present).
    - `git grep -nE '"use client"' frontend/web/app/(app)/recommendation/page.tsx` returns one hit at the top of the file (Client Component preserved).
    - DSGN-06 grep gates: `git grep -nE 'style=\{' frontend/web/app/(app)/recommendation/page.tsx` exits with no output AND `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' frontend/web/app/(app)/recommendation/page.tsx` exits with no output.
    - Status discriminator coverage: the file contains the string literals `"loading"`, `"ready"`, `"empty"`, `"error"` — verifiable via `git grep -nE '"(loading|ready|empty|error)"' frontend/web/app/(app)/recommendation/page.tsx` returning at least four hits.
    - `target="_blank"` and `rel="noopener noreferrer"` are present on the Watch-on CTA anchor — `git grep -nE 'rel="noopener noreferrer"' frontend/web/app/(app)/recommendation/page.tsx` returns at least one hit.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
    - `cd frontend/web && pnpm build` exits 0.
  </acceptance_criteria>
  <done>
    `/recommendation` page imports zero symbols from `@/lib/api/recommend`. The screen consumes `getRecommendationReal()`, branches on Result + null payload, and renders four discriminated states (loading / ready / empty / error). The "Similar films" rail is replaced by a documented JSX comment marker. Phase 7 fields the Lambda doesn't return (synopsis, year, rating, runtime, match, director, cast) are conditionally omitted at each render site. The Watch-on CTA is a real anchor pointing at `movie.streamingServices[0].url`. `tsc`, `lint`, and `build` all pass.
  </done>
</task>

</tasks>

<verification>
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` all exit 0.
- The recommendation screen file contains zero imports from `@/lib/api/recommend` (the mock module) but the mock module itself still exists — plan 13-03 trims it.
- Manual smoke verification belongs to plan 13-04, not this plan. This plan's automated gate is sufficient to prove the swap compiles, the types align, and the grep gates pass.
- The `/smoke` page continues to work (unchanged; verified by `tsc` since it imports `getRecommendationReal`).
- Phase 14/15/16 screens still compile because this plan touches NO file outside `recommendation/page.tsx`.
</verification>

<success_criteria>
- Plan 13-03 can run its mock-deletion grep gates against `recommend.ts` knowing that the recommendation screen no longer imports the deleted symbols.
- Visiting `/recommendation` while signed in triggers a real `GET /api/v1/recommend` (verified via Network panel in plan 13-04's manual smoke).
- The four success branches (loading, ready with live data, empty, error) all render against the existing Phase 2 design tokens with no new DSGN-06 violations.
</success_criteria>

<output>
After completion, create `.planning/phases/13-recommendation-lambda-integration/13-02-SUMMARY.md` capturing:
- The final import list at the top of `recommendation/page.tsx` (exact lines).
- Which Phase 7 fields are conditionally rendered and which are unconditionally omitted.
- The exact text of the "similar films rail hidden" JSX comment marker (so plan 13-04 can reference it during visual verification).
- The placeholder `kind: "included"` decision for ServiceBadge — confirm the choice and note that issue #70 will replace it with real tier data.
</output>
</content>
</invoke>