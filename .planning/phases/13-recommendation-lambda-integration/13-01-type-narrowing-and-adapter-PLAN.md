---
phase: 13-recommendation-lambda-integration
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/web/lib/api/recommend.real.ts
autonomous: true
requirements:
  - INTG-RECO-01
user_setup: []
must_haves:
  truths:
    - "recommend.real.ts exports a Phase-13-specific live response type (not Movie from recommend.ts) that mirrors the actual Lambda payload (title, genre, streaming-services)."
    - "The adapter at the screen boundary converts kebab-case `streaming-services` to camelCase `streamingServices` so the screen never uses bracket-string property access."
    - "The adapter never throws on missing optional fields — fields not returned by the current Lambda (year, runtime, rating, match, director, cast, synopsis, posterSeed, backdropSeed, mood) come out as `undefined` rather than crashing."
  artifacts:
    - path: "frontend/web/lib/api/recommend.real.ts"
      provides: "Typed live recommendation surface: `RecommendationResponse` (wire shape), `RecommendedMovie` (camelCase shape consumed by the screen), and `getRecommendationReal()` returning `Result<RecommendedMovie | null, ApiError>`."
      contains: "RecommendationResponse, RecommendedMovie, getRecommendationReal"
  key_links:
    - from: "frontend/web/lib/api/recommend.real.ts"
      to: "frontend/web/lib/api/client.ts"
      via: "apiGet<RecommendationResponse>('/api/v1/recommend')"
      pattern: "apiGet<.*>\\(\"/api/v1/recommend\"\\)"
    - from: "frontend/web/lib/api/recommend.real.ts (adapter)"
      to: "RecommendedMovie (camelCase)"
      via: "kebab→camel transform for streaming-services; safe-defaults for optional fields"
      pattern: "streaming-services|streamingServices"
---

<objective>
Narrow the Phase 12 demonstrator's return type from the loose `Movie` placeholder to a Phase-13-specific type that mirrors the live `/api/v1/recommend` Lambda response shape, and introduce an adapter that converts the kebab-case wire field `streaming-services` to camelCase `streamingServices` while tolerating every Phase-7 field the Lambda does NOT return (graceful degradation per CONTEXT §"Architecture / Strategy" — Option C).

Purpose: Phase 13 success criterion #1 requires the screen to render data sourced from the Lambda. Today `recommend.real.ts` claims to return `Movie` from the mock, which silently lies to the type system because the live shape lacks 10+ Movie fields. Without narrowing, the screen swap in plan 13-02 either crashes at render or compiles by accident with `any`-shaped data. This plan establishes the typed contract the screen consumes.

Output: A `recommend.real.ts` that exports two types (`RecommendationResponse` for the wire payload, `RecommendedMovie` for the post-adapter camelCase shape) and a `getRecommendationReal()` whose return type is `Promise<Result<RecommendedMovie | null, ApiError>>`. The mock module (`recommend.ts`) is untouched in this plan.
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
@frontend/web/AGENTS.md
@functions/recommend/recommend.py
@frontend/web/lib/api/client.ts
@frontend/web/lib/api/recommend.real.ts
@frontend/web/lib/api/recommend.ts

<interfaces>
<!-- Locked contracts from upstream / live backend. The executor consumes these as-is. -->

From `functions/recommend/recommend.py` `handler()` return (live wire payload — kebab-case key):
```
{
  "title": string,
  "genre": string,
  "streaming-services": Array<{ "name": string, "image": string (URL), "url": string (URL) }>
}
```
All three top-level keys are always returned by the current Lambda. The list may be empty in theory; in practice the mock catalogue always populates it with at least one entry. Treat empty as a render-time concern, not a parse-time error.

From `frontend/web/lib/api/client.ts`:
```
export type Result<T, E> = { ok: true; data: T } | { ok: false; error: E };
export type ApiError = /* 5-kind discriminated union */;
export function apiGet<T>(path: string, opts?: RequestOptions): Promise<Result<T, ApiError>>;
```
A 2xx with empty body parses to `null as T` per `client.ts:262`. Phase 13 must surface this case as "empty payload" rather than letting `null` flow into the screen as a `RecommendedMovie`.

From `frontend/web/lib/api/recommend.ts` (KEPT — do NOT delete in this plan):
- `type Movie` — Phase 7 wide shape with 13 fields. Used elsewhere in the codebase. Phase 13's `RecommendedMovie` is intentionally NOT this type.
- `type Service = { name: string; kind: "included" | "rent" | "buy" }` — KEPT in recommend.ts. The live Lambda's per-service shape lacks `kind`; plan 13-02 handles the kind absence at the badge render site.
- `posterUrl(m, w?, h?)`, `backdropUrl(m, w?, h?)` — both read `m.posterSeed` / `m.backdropSeed`. The live response has neither. Plan 13-02 will pick a different backdrop strategy at the screen; this plan does NOT alter the helpers.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author RecommendationResponse + RecommendedMovie types and adapter in recommend.real.ts</name>
  <files>frontend/web/lib/api/recommend.real.ts</files>
  <read_first>
    - frontend/web/lib/api/recommend.real.ts (current Phase 12 demonstrator — entire file, 22 lines)
    - frontend/web/lib/api/client.ts (lines 39-54, 280-293 — Result, ApiError, apiGet signatures)
    - frontend/web/lib/api/recommend.ts (lines 13-33 — Movie + Service definitions; do NOT modify, just understand the wide-shape contrast)
    - functions/recommend/recommend.py (lines 111-138 — handler return shape; treat as immutable source of truth)
    - .planning/phases/13-recommendation-lambda-integration/13-CONTEXT.md §"Type strategy in `recommend.real.ts`" and §"Implementation Decisions" (kebab→camel rule, no-throw rule, kind-absence rule)
  </read_first>
  <action>
    Rewrite `frontend/web/lib/api/recommend.real.ts` end-to-end.

    Exported types:
    1. `RecommendationResponse` — the literal wire shape. Three required fields: `title: string`, `genre: string`, and the kebab-case key `"streaming-services": ReadonlyArray<RecommendationServiceWire>`. Use a quoted-string property name so the kebab form is preserved at the type level. Add a sibling `RecommendationServiceWire = { name: string; image: string; url: string }`. Keep both types `readonly` where it costs nothing.
    2. `RecommendedMovie` — the camelCase, screen-friendly shape. Required: `title: string`, `genre: string`, `streamingServices: ReadonlyArray<RecommendedService>`. Optional (all explicitly `?:` — per CONTEXT §"Type strategy" graceful degradation): `year?: number`, `runtime?: string`, `rating?: string`, `match?: number`, `director?: string`, `cast?: ReadonlyArray<string>`, `synopsis?: string`, `mood?: ReadonlyArray<string>`. Do NOT include `posterSeed` / `backdropSeed` — those are Picsum-stand-in-only and have no meaning against live data; plan 13-02 picks a different backdrop strategy. Sibling: `RecommendedService = { name: string; image: string; url: string }`. (No `kind` field — that's the Phase 7 mock's `Service` shape; the live data does not carry availability tier.)
    3. Internal helper (NOT exported): `adaptResponse(wire: RecommendationResponse): RecommendedMovie`. Implementation contract: read `wire.title` and `wire.genre` straight through; read `wire["streaming-services"]` with the bracket-string form (this is the ONE place in the codebase that touches the kebab key — that's exactly why the adapter exists); for each entry produce a `RecommendedService` by copying `name`, `image`, `url`; coerce `undefined`/null `streaming-services` to `[]` defensively even though the wire contract promises an array.

    Refactor `getRecommendationReal()`:
    - Signature: `export async function getRecommendationReal(): Promise<Result<RecommendedMovie | null, ApiError>>`.
    - Body: call `apiGet<RecommendationResponse | null>("/api/v1/recommend")`. (The `| null` accommodates the 204/empty-body branch in `client.ts:262`.)
    - On `result.ok === false`, return `result` unchanged.
    - On `result.ok === true` AND `result.data === null`, return `{ ok: true, data: null }` — the screen layer (plan 13-02) is responsible for rendering the empty state. The adapter does NOT invent a `RecommendedMovie` here.
    - On `result.ok === true` AND `result.data` is a non-null object, return `{ ok: true, data: adaptResponse(result.data) }`.

    Remove the existing `import type { Movie } from "@/lib/api/recommend";` line — Phase 13 deliberately does not reuse `Movie` for the live return.

    Update the module's docstring header to describe the new contract:
    - Phase 13 (INTG-RECO-01) — live recommendation fetch with typed live response.
    - Mention that the live Lambda payload uses kebab-case `streaming-services` and that this module is the sole kebab→camel boundary.
    - Mention that optional fields (year/runtime/rating/match/director/cast/synopsis/mood) are not returned by the current Lambda — `recommend.py` returns only title/genre/streaming-services — and are kept as Optional for forward-compat with issue #70 (OMDb + Streaming Availability enrichment).
    - Remove the Phase 12 wording about "narrow/widen later" — Phase 13 IS the narrow.
    - Header MUST NOT use the word "mock" — that token is grep-gated in plan 13-03.

    DSGN-06 / authorship constraints:
    - No fenced code blocks need adding to the file.
    - No `style={{}}` (not applicable — not a component file).
    - No hex literals (not applicable — not a component file).
    - File stays a server-safe module (no `"use client"` directive needed).
  </action>
  <verify>
    <automated>cd frontend/web &amp;&amp; pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -nE 'export (type|interface) RecommendationResponse' frontend/web/lib/api/recommend.real.ts` returns at least one hit.
    - `grep -nE 'export (type|interface) RecommendedMovie' frontend/web/lib/api/recommend.real.ts` returns at least one hit.
    - `grep -n '"streaming-services"' frontend/web/lib/api/recommend.real.ts` returns at least one hit (the kebab key is the documented wire shape — must be preserved at the type level and accessed once via bracket-string in the adapter).
    - `grep -nE 'streamingServices' frontend/web/lib/api/recommend.real.ts` returns at least one hit (camelCase produced by the adapter).
    - `grep -nE 'from "@/lib/api/recommend"' frontend/web/lib/api/recommend.real.ts` exits with no output (the `Movie` import was removed; recommend.real.ts no longer depends on recommend.ts).
    - `grep -niE '\bmock\b' frontend/web/lib/api/recommend.real.ts` exits with no output (header was rewritten to drop Phase 12 wording).
    - `grep -nE 'getRecommendationReal\(\): Promise<Result<RecommendedMovie \| null, ApiError>>' frontend/web/lib/api/recommend.real.ts` returns one hit, OR the equivalent multi-line signature (executor may format across lines — the type union must be present).
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
    - `git grep -nE 'from "@/lib/api/recommend.real"' frontend/web` shows only the existing two import sites (`smoke/page.tsx` and — once plan 13-02 lands — `recommendation/page.tsx`); no new accidental coupling.
  </acceptance_criteria>
  <done>
    `recommend.real.ts` exports `RecommendationResponse` (wire), `RecommendedMovie` (post-adapter), and `getRecommendationReal(): Promise<Result<RecommendedMovie | null, ApiError>>`. The adapter is the sole kebab→camel boundary. `pnpm tsc --noEmit` and `pnpm lint` both pass. The smoke page (`/smoke`) continues to compile against the new return shape — verified by `tsc` since the smoke page imports `getRecommendationReal` and uses it via `JSON.stringify`, which tolerates the new shape.
  </done>
</task>

</tasks>

<verification>
- `cd frontend/web && pnpm tsc --noEmit` exits 0.
- `cd frontend/web && pnpm lint` exits 0.
- `git grep -n 'streaming-services' frontend/web` shows hits ONLY in `lib/api/recommend.real.ts` (type definition + adapter). No screen or component touches the kebab form directly.
- `git grep -nE 'streamingServices' frontend/web` shows the camelCase token reaches only `lib/api/recommend.real.ts` at this point (plan 13-02 will add screen consumption).
- DSGN-06: no new hex / px / `style={{}}` introduced (this is a non-component module — N/A but explicitly confirmed by `git grep -nE 'style=\{' frontend/web/lib/` returning no output).
</verification>

<success_criteria>
- Plan 13-02 can import `RecommendedMovie` and `getRecommendationReal` from `@/lib/api/recommend.real` without further changes to this file.
- The smoke page at `/smoke` still calls `getRecommendationReal()` and renders the JSON.stringify result — compilation proves the return type widened (gained `| null`) but the smoke harness's `JSON.stringify` consumption is shape-agnostic.
- The recommend.ts mock surface remains unchanged (no symbols added or removed). Plan 13-03 is the dedicated mock-deletion plan.
</success_criteria>

<output>
After completion, create `.planning/phases/13-recommendation-lambda-integration/13-01-SUMMARY.md` capturing:
- The exact final type signatures of `RecommendationResponse`, `RecommendedMovie`, `getRecommendationReal`.
- Confirmation that the adapter is the sole call site of `"streaming-services"` (kebab form) in the frontend.
- Any decisions made within the executor's discretion (e.g. exact docstring wording, ordering of optional fields).
</output>
</content>
</invoke>