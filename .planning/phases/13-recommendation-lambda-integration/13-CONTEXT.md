# Phase 13: Recommendation Lambda Integration — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning
**Source:** Locked in conversation 2026-05-14 (Phase 12 closure session); decisions captured in `.claude/projects/.../memory/phase-13-strategy.md` and `cors-narrow-exception.md`. No discuss-phase run — locked decisions sufficient.

<domain>
## Phase Boundary

**What this phase delivers (per ROADMAP §"Phase 13: Recommendation Lambda Integration"):**
- The `/recommendation` screen renders a real movie recommendation fetched from the live `/api/v1/recommend` Lambda through the Phase 12 fetch wrapper (`lib/api/client.ts`).
- Explicit loading, error, and empty states wired via `useApiErrorUx`.
- Zero recommendation mock dataset remains in the code path — `MOVIES`, `getRecommendation()`, `getSimilar()` deleted from `lib/api/recommend.ts`.
- The `Movie` type and helpers `posterUrl` / `backdropUrl` / `Service` type are **kept** because Phases 14/15/16 screens (preferences, history, watch-later) still consume them.

**What this phase does NOT deliver (deferred):**
- Lambda response enrichment (year, rating, runtime, director, cast, synopsis, match%, mood) — tracked separately as **issue #70** (OMDb + movieofthenight.com Streaming Availability API integration). Frontend degrades gracefully on missing fields this phase.
- "Similar films" rail — backend has no `/similar` endpoint, no equivalent in current Lambda payload. **Temporarily hidden** in Phase 13; revisit when issue #70 lands or a dedicated `/similar` endpoint exists.
- Backend modifications to `functions/recommend/recommend.py` — read-only backend this milestone (v2.0 ROADMAP §Context).

**Phase requirement IDs (MUST be addressed):** INTG-RECO-01, INTG-RECO-02

**Goal restated:** Visiting `/recommendation` while authenticated triggers a real `GET /api/v1/recommend`, renders the response shape currently returned by the Lambda, handles loading/error/empty states via the wrapper's error-class taxonomy, and leaves zero mock fallback in the recommendation code path.

</domain>

<decisions>
## Implementation Decisions

### Architecture / Strategy

- **Option C — graceful degradation now, backend enrichment deferred to issue #70.** No Lambda edits. Frontend renders whatever fields the Lambda returns (`title`, `genre`, `streaming-services`); all other Phase 7 fields (`year`, `runtime`, `rating`, `match`, `director`, `cast`, `synopsis`, `posterSeed`, `backdropSeed`, `mood`) are treated as optional at the screen boundary.
- **Live Lambda response shape (verified 2026-05-14 against `dev-test-combined`):**
  ```json
  {
    "title": "string",
    "genre": "string",
    "streaming-services": [
      { "name": "string", "image": "url", "url": "url" }
    ]
  }
  ```
  Note the kebab-case key `streaming-services` and the different per-service shape (`{name, image, url}` vs the Phase 7 mock's `{name, kind}`).
- **Branch:** `feature/issue-132-reco-integration` off `backend-integration`. 1 PR back into `backend-integration` (per v2.0 project rule).
- **Do not merge `main` into `backend-integration` yet** — `origin/main` carries PR #137 which strips the JWT authorizer from dev routes; that would mask Phase 12's `Authorization: Bearer` enforcement during Phase 13 verification. Merging `main` is a post-Phase-13 decision.

### Type strategy in `recommend.real.ts`

- The current demonstrator types the return as `Movie` from `recommend.ts`. **Narrow it to a Phase 13–specific live type** (e.g. `RecommendationResponse` or `LiveMovie`) that matches the actual Lambda shape. Add a thin adapter at the screen boundary that maps it onto whatever shape the screen consumes for rendering.
- **Convert the kebab-case `streaming-services` to camelCase `streamingServices`** at the adapter boundary — TypeScript JSON access with kebab keys requires bracket notation which is awkward and ESLint-hostile. Keep the wire format as-is (don't ask the backend to change); convert in the frontend.
- The adapter MUST NOT throw on missing fields. Optional fields render only when present (e.g. metadata strip shows `year · runtime · rating` only if those fields are non-null).
- Per-service `kind: "included" | "rent" | "buy"` doesn't exist on the Lambda response. Phase 13 surfaces services as flat name/link badges with no kind labelling. If the design reference depends on `kind`, the affected UI gracefully omits the label.

### Loading / Error / Empty states

- **Loading:** the current screen already has a `picking` boolean + skeleton/spinner. Reuse it. The first paint before the wrapper resolves shows the same skeleton.
- **Error:** wire `useApiErrorUx` (already exists from Phase 12). On `Result.ok === false`, surface error-class-appropriate UX:
  - `kind: "network"` → toast + a "Try again" affordance on the screen
  - `kind: "server"` → toast + same retry
  - `kind: "unauthorized"` → already handled by the wrapper's `onUnauthorized` callback (auto-signOut + redirect); no in-screen UX needed
  - `kind: "forbidden"` / `kind: "validation"` → inline message on the screen (rare for recommend; defensive)
- **Empty:** if the Lambda returns a 2xx with a null/empty payload (defensively handled even though current `recommend.py` always returns a movie), render a "No recommendations available" empty state instead of crashing or hanging on the skeleton.
- **Retry:** the existing "Recommend another" button re-calls `getRecommendationReal()`. Keep that pattern.

### Mock-deletion scope

The success criterion `git grep -n 'mock' frontend/web/lib/api/recommend* = 0 hits` resolves to:
- **DELETE** from `lib/api/recommend.ts`: the `MOVIES` array (12 entries), `getRecommendation()`, `getSimilar()`, and any "mock" references in the module header.
- **KEEP** in `lib/api/recommend.ts`: the `Movie` type, `Service` type, `Rating` / `STREAMING_SERVICES` / `MOODS` / `RATINGS` constants, `posterUrl()`, `backdropUrl()`, and the `PICK_LATENCY_MS` if still referenced.

Reason for keep-list: 6 files outside the recommendation screen still import from `@/lib/api/recommend` (verified `git grep -nE 'lib/api/recommend' frontend/web/{app,components}`):
- `app/(app)/(protected)/preferences/page.tsx` (types only — Phase 14 will swap)
- `app/(app)/(protected)/watch-later/page.tsx` (`Movie` type — Phase 16 will swap)
- `components/MovieCard.tsx` (`posterUrl` + `Movie` — used by Phases 9/10 screens)
- `components/HistoryRow.tsx` (`posterUrl` — Phase 15 will keep using it)
- `components/ServiceBadge.tsx` (`Service` type — used by recommendation screen)
- `app/(app)/(protected)/smoke/page.tsx` (Phase 12 harness — slated for Phase 17 deletion)

Deleting the helpers breaks 5 screens. They get cleaned phase-by-phase as their integrations land (14/15/16) and at Phase 17 final cleanup.

### "Similar films" rail

- Lambda response has no equivalent. The rail used `getSimilar(movie)` which iterated the local mock dataset.
- **Hide the rail in Phase 13.** Wrap it in a feature flag or just remove the JSX block, leaving a clean comment marker (`// TODO Phase 13+: similar-films rail hidden pending /similar endpoint or issue #70 enrichment`).
- Keep the spacing/section heading available for re-introduction. Don't restructure the layout.

### Screen swap mechanics

- The recommendation screen (`app/(app)/recommendation/page.tsx`) currently imports `getRecommendation`, `getSimilar`, `backdropUrl`, `type Movie` from `@/lib/api/recommend`.
- Post-swap: imports `getRecommendationReal` from `@/lib/api/recommend.real` (or a renamed/adapted module — see below), `backdropUrl` from `@/lib/api/recommend` (still there), `type Movie` from wherever it ends up after the type narrowing.
- The `useEffect` + `useState<Movie | null>` pattern stays. The success path branches on `result.ok` and unpacks `result.data`. The `picking` state covers loading. The error UX is fed by passing the `error` to `useApiErrorUx` and rendering a retry hint.

### Phase 12 cleanup

- The `/smoke` page (`app/(app)/(protected)/smoke/page.tsx`) is **kept through Phase 16** — useful manual harness for the real-Lambda integrations. Already documented in STATE.md as a Phase 17 cleanup todo. Phase 13 does NOT delete it.

### Claude's Discretion

- Filename + symbol naming for the narrowed type (e.g. `RecommendationResponse` vs `LiveMovie` vs `RecommendedMovie`). Pick one and use it consistently.
- Whether `recommend.real.ts` becomes the canonical module (renamed to `recommend.ts` after deletion) OR stays as a separate file alongside the trimmed-down `recommend.ts` keeping the helpers. **Recommendation: keep them separate this phase to minimize churn — `recommend.ts` holds types + helpers, `recommend.real.ts` holds the live fetch. Phase 17 (or a later cleanup) can consolidate.**
- Whether to extract an `RecommendationAdapter` module for the kebab→camel transform or inline it in `recommend.real.ts`. Either is fine.
- Animation/skeleton choices for loading state — match Phase 7's existing skeleton aesthetic, don't introduce new motion patterns.
- Retry strategy on transient errors — explicit user retry via existing "Recommend another" button is sufficient; no auto-retry beyond the wrapper's Phase 12 refresh-once-on-401 budget (which is already 0 for non-401 errors).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Live Lambda + infrastructure
- `functions/recommend/recommend.py` — source of truth for the live response shape. Phase 13 frontend type narrows to match `handler()`'s returned dict (`title` / `genre` / `streaming-services`).
- `__main__.py:321` — `create_route("/api/v1/recommend", "GET", recommend_lambda, auth_id=authorizer.id)`. JWT-authed route; the wrapper's `Authorization: Bearer <IdToken>` is required.

### Phase 12 fetch wrapper (consumed, not modified)
- `frontend/web/lib/api/client.ts` — typed `apiGet`/`apiPost`, `Result<T, ApiError>` discriminated union, `setOnUnauthorized` callback registry. Phase 13 consumers branch on `result.ok` and exhaustively switch on `result.error.kind`.
- `frontend/web/lib/api/useApiErrorUx.ts` — error-class-aware UX hook. Phase 13 wires this on the recommendation screen.
- `frontend/web/lib/api/recommend.real.ts` — current demonstrator. Phase 13 narrows the return type and ships the screen swap.

### Recommendation surface (current mock — being swapped/trimmed)
- `frontend/web/lib/api/recommend.ts` — current mock. Phase 13 deletes `MOVIES`, `getRecommendation()`, `getSimilar()`; keeps types and `posterUrl`/`backdropUrl`.
- `frontend/web/app/(app)/recommendation/page.tsx` — Phase 7 screen. Phase 13 swaps import to `recommend.real`, adds Result-shape handling, hides similar-films rail.

### Phase 7 reference (preserve visual fidelity where data allows)
- `frontend/_design-reference/detail.jsx` — the visual reference for `/recommendation`. Fields the Lambda doesn't return (year/rating/cast/director/synopsis) are simply not rendered; the structural layout stays.

### Phase 12 closure context (smoke harness)
- `frontend/web/app/(app)/(protected)/smoke/page.tsx` — Phase 12 manual smoke page. Useful for Phase 13 manual verification (DevTools network panel, IdToken header check, payload inspection). Kept through Phase 16; deleted at Phase 17.

### Project rules
- `CLAUDE.md` (project root) — hard rules for this milestone, including "backend read-only" and "1 phase = 1 sub-issue = 1 feature branch = 1 PR."
- `frontend/web/AGENTS.md` — DSGN-06 token rule (no hex/rgba/px in `app/` or `components/`).

</canonical_refs>

<specifics>
## Specific Ideas

- Sample live payload received during Phase 12 verification (2026-05-14, AWS `dev-test-combined`):
  ```json
  {
    "title": "Pulp Fiction",
    "genre": "crime",
    "streaming-services": [
      { "name": "Amazon Prime",
        "image": "https://www.amazon.com/favicon.ico",
        "url": "https://www.amazon.com/dp/B001CWSITY" }
    ]
  }
  ```
  Use this as the canonical example for tests and the type definition.

- The "Where to watch" section in the existing screen iterates `movie.services` and renders `<ServiceBadge>`. The badge needs `service.name` (visible) and `service.kind` (used for badge variant). With Lambda data, `kind` is undefined — `ServiceBadge` either defaults to a neutral variant OR Phase 13 passes a placeholder kind. Pick the path with the least visual surprise.

- The primary "Watch on {service}" button uses `movie.services[0]`. With live data, the first service from `streaming-services` is the natural primary. Wire the button's `href` to `streaming-services[0].url` if available (the Lambda gives us a direct deep link, which is an improvement over Phase 7's mock that had no link).

</specifics>

<deferred>
## Deferred Ideas

- Backend enrichment (year, rating, runtime, director, cast, synopsis, match%, mood, posterSeed, backdropSeed) → **issue #70** (OMDb + Streaming Availability API integration; free tier 1000 req/month — caching needed).
- Dedicated `/similar` endpoint or in-payload "similar films" array → blocked on issue #70 or a separate backend enhancement; **out of scope this phase.**
- Auto-retry on transient errors beyond the wrapper's Phase 12 budget → defer to v2.1 production hardening.
- Restructuring `lib/api/recommend.ts` to remove the now-mock-free file entirely (e.g. consolidate into `recommend.real.ts` and rename) → **Phase 17 cleanup**, not Phase 13.
- Deleting `/smoke` page → **Phase 17 cleanup** per existing STATE.md todo.

</deferred>

---

*Phase: 13-recommendation-lambda-integration*
*Context gathered: 2026-05-14 (locked decisions from Phase 12 closure conversation, no discuss-phase run)*
