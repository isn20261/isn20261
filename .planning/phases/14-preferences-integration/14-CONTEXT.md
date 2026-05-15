# Phase 14: Preferences Lambda Integration — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning (decisions locked 2026-05-14 — see §"Resolved decisions")
**Milestone:** v2.0 — Backend Integration
**Umbrella issue:** #127
**Sub-issue:** #133

<domain>
## Phase Boundary

Phase 14 ships the **first read+write screen** integrated against the real backend. The preferences screen (currently a Phase 8 local-state mock) becomes the canonical exercise of the Phase 12 fetch wrapper for both GET and POST paths. It is also the phase that **locks the update-strategy convention** that Phase 16 (watch-later, also read+write) mirrors.

**In scope this phase:**
- New `frontend/web/lib/api/preferences.ts` with typed `getPreferences()` + `putPreferences()` consuming the Phase 12 wrapper. Returns `Promise<Result<T, ApiError>>`.
- Real `GET /api/v1/preferences` on screen mount; renders the response from the Lambda.
- Real `POST /api/v1/preferences` on save (per the locked update strategy — see §"Open for planner").
- Loading state on first render; error UX via `useApiErrorUx`; empty-state for brand-new accounts that have never POSTed preferences.
- Resolution of the **wire-format mismatch** between the current UI (`services` / `moods[]` / `rating`) and the Lambda contract (`subscriptions` / `humor` single / `age-rating` / `genres`).

**Out of scope this phase (deferred):**
- Phase 13 (Recommendation) — currently being executed by a different teammate; not part of this PR. The 4 phases (13/14/15/16) are independent per `lib/api/*` boundaries.
- Live-AWS smoke (per user, AWS environment not currently available — mirroring the Phase 12 SKIPPED-AWS-DEFERRED pattern). The phase ships with code-paths verified via type-check + manual UX walk-through + Network panel spoof, but the round-trip-against-DynamoDB acceptance criteria from issue #133 is logged as deferred.
- Changes to `functions/preferences/preferences.py` — backend remains read-only this milestone (any required fix is surfaced first, not done unilaterally).
- Cross-field validation (e.g. "you can't pick humor without subscriptions") — issue #133 explicitly scopes this out.
- Preference-history / change-log UI — out of scope per issue.

</domain>

<decisions>
## Implementation Decisions (locked unless flagged "Open for planner")

### Wrapper consumption — mirror `recommend.real.ts` (Phase 12 demonstrator)

**Locked:** `lib/api/preferences.ts` follows the same shape as `lib/api/recommend.real.ts`:

```ts
import { apiGet, apiPost, type ApiError, type Result } from "@/lib/api/client";

export type Preferences = {
  genres: readonly string[];
  subscriptions: readonly string[];
  "age-rating": string | null;
  humor: string | null;
};

export async function getPreferences(): Promise<Result<Preferences, ApiError>> {
  return apiGet<Preferences>("/api/v1/preferences");
}

export async function putPreferences(
  patch: Partial<Preferences>,
): Promise<Result<null, ApiError>> {
  return apiPost<null>("/api/v1/preferences", patch);
}
```

**Why partial-PATCH on `put`:** the Lambda accepts any subset of the 4 fields and merges (`SET preferences.field = :v` per included field — see `functions/preferences/preferences.py:60-86`). Sending the full object on every save is also fine; the planner picks. Partial is leaner if we go optimistic.

### Wire shape — kebab-case `age-rating` on the wire, camelCase nowhere

**Locked:** API is the source of truth for the wire format. The TypeScript type uses the bracket key `"age-rating"` literally — no field renaming in transit, no client-side camelCase. Mirrors the Lambda's `_db_to_api()` mapping (`functions/preferences/preferences.py:11-17`).

**Implication for the React component:** access via `prefs["age-rating"]`, not `prefs.ageRating`. ESLint may flag this; if so, disable the rule narrowly with a comment.

### Network method — POST (not PUT)

**Locked:** The Lambda is wired as `POST /api/v1/preferences` (`__main__.py:340-341`), not PUT. Issue title says "GET + PUT" but issue body says "PUT ou POST, conforme contrato do Lambda". The contract is POST.

### Naming alignment — UI variable names match the wire format

**Locked:** Rename the React state variables in `preferences/page.tsx`:
- `services` → `subscriptions`
- `moods` → `humor` (and convert from `string[]` to `string | null` per the wire — see §"Open for planner #2")
- `rating` → `ageRating` *as a local JS identifier* (kebab-case isn't a valid identifier), but it serializes to `"age-rating"` on the wire.

**Why:** removing the adapter layer makes the swap obvious to readers and to greppers (the acceptance criterion `git grep -n 'mock' frontend/web/lib/api/preferences*` only catches `lib/api/`, but reviewers will scan the page too). One canonical name per concept.

### Error UX — `useApiErrorUx(error)` for read; inline toast on write failure

**Locked:** Mount-time GET errors render via `useApiErrorUx` (toast for network/server/forbidden; silent unauthorized fires logout via wrapper; validation is silent since GET has no field errors).

POST errors use the same hook so the UX policy is consistent. Validation errors from a POST (e.g. "genres must be an array") surface as a toast — there's no inline place to put them since the UI is chip-toggles, not text fields.

### Loading state — Skeleton, not spinner

**Locked:** Mount-time load shows a skeleton variant of each `SectionCard` (3 chip placeholders per card) until the GET resolves. Spinner-on-blank-screen feels worse on a "settings"-style screen than a layout-stable skeleton. Matches the recommendation-page pattern Phase 13 will adopt (if applicable).

### Empty state — Brand-new account with no preferences row

**Locked:** The Lambda returns `{ genres: [], subscriptions: [], "age-rating": null, humor: null }` for a confirmed user with no preferences populated (`functions/preferences/preferences.py:_get` — even if `user["preferences"]` is missing, `_db_to_api({})` returns the empty/null shape). So "empty state" is just: every chip unselected, no banner needed. Phase 14 verifies this end-to-end but renders nothing special — the chips themselves are the empty state.

### Smoke deferred (parallel to Phase 12)

**Locked:** Issue #133 acceptance criteria require "round-trip contra o DynamoDB do próprio teammate" — that smoke must wait until the user is back at the home AWS environment. Phase 14 ships with:
- Type-check passes (`pnpm tsc --noEmit`).
- Lint passes (`pnpm lint`).
- Build passes (`pnpm build`).
- Manual UX walk-through against the Phase 12 `/smoke` harness OR a `NEXT_PUBLIC_API_BASE_URL` pointed at a mock server with the canned response shapes.
- The Network-panel + DynamoDB-GetItem round-trip is logged in `14-01-SUMMARY.md` as SKIPPED-AWS-DEFERRED with a run-when-home checklist, mirroring `12-04-SUMMARY.md`.

</decisions>

<resolved>
## Resolved decisions (locked 2026-05-14 by user)

### 1. Update strategy → **Option A — per-toggle optimistic** (locked)
Each chip click fires `putPreferences()` immediately. On `!ok`, the chip rolls back and `useApiErrorUx` toasts the error. Copy "Changes save automatically" stays. Dedup by an in-flight `Set<FieldKey>` (or `Map<FieldKey, AbortController>` if we want to cancel-on-supersede) — planner chooses the concrete implementation but the contract is "latest user action wins, earlier in-flight is dropped".

**Mirrors to Phase 16 (watch-later):** add/remove ops are optimistic-per-action with rollback on failure.

### 2. `humor` shape → **Option A — UI becomes single-select** (locked)
Mood chips convert to single-select (`humor: string | null`). The chip click toggles the same id off if already selected (set to `null`) or replaces the current value otherwise. Wire serialization is straight `string | null` — no array.

### 3. `genres` section → **Option A — add "Favorite genres" SectionCard** (locked)
New `<SectionCard title="Favorite genres" helper="...">` populated by chips from a GENRES constant. Lookup source: extract unique genres from `MOVIES.flatMap(m => m.genres)` in `lib/api/recommend.ts`, export as a new const `GENRES` alongside `MOODS`/`STREAMING_SERVICES` (location decision logged in §"Code Context" — option (a)).

</resolved>

<open_questions>
## Open for planner (planner-time checks, not user decisions)

### 1. Update strategy — optimistic vs conservative (REQUIRED by issue #133 AC)

The issue explicitly demands: *"Decidir e documentar no plan-phase: estratégia de update otimista (mostra o novo valor imediatamente, faz rollback se a request falhar) OU conservadora (botão 'save' desabilitado até o servidor confirmar). Implementar a estratégia escolhida."*

Phase 8's current copy says "Changes save automatically" — implies optimistic-on-toggle. Three concrete realizations:

| Option | UX | Implementation | Failure mode |
|---|---|---|---|
| **A. Per-toggle optimistic** | Each chip click fires POST immediately; on error the chip's visual state rolls back and a toast fires. | `onClick` → `setState(next)` → `putPreferences({ field: next })`; on `!ok` → `setState(prev)` + `toast`. | Chatty (1 request per toggle); two rapid toggles can race. Mitigation: keep an in-flight request map per field; drop in-flight on supersede. |
| **B. Debounced optimistic** | UI updates immediately; debounce 500ms, then POST the latest full state. | `useEffect` watches state; debounce-then-POST. Rollback is tricky if multiple fields changed in the debounce window — usually fine, error message just nudges user to retry. | Bounded chattiness; rollback semantics are fuzzy (which field caused the 400?). |
| **C. Conservative (Save button)** | Add explicit "Save" + "Discard" footer to the page; chips toggle local state only until clicked. Save disabled while in-flight. | Local state until "Save"; clear post-save success state. | Simplest; clearest error attribution; **but** breaks the "Changes save automatically" copy and the design-reference doesn't show a save button. |

**Phase 16 (watch-later) mirrors whichever Phase 14 picks** — ROADMAP §16 Notes: "Add/remove update strategy should mirror Phase 14's choice (optimistic vs conservative) unless the plan explicitly justifies divergence."

**Recommendation (mine):** **Option A — per-toggle optimistic**. Matches the current copy, simplest mental model for chip-toggle UX, and the dedup-by-in-flight pattern is ~15 lines. Option C is the most robust but introduces a design element not in `_design-reference/`. Option B's debounce muddies error attribution.

### 2. `humor` shape mismatch — single string on the wire, but UI currently shows multi-select

**The mismatch:** the Lambda stores `humor` as a single string (`functions/preferences/preferences.py:_post` does `str(humor)` and writes a scalar). The current UI lets users select multiple moods (`moods: string[]`). Phase 14 has to reconcile.

| Option | Behavior |
|---|---|
| **A. UI becomes single-select** | Convert mood chips to single-select (only one active at a time). Lossy migration if any teammate already has multi-mood data — but new feature, no real data. **Matches the wire faithfully.** |
| **B. UI sends only the first selected mood** | Keep multi-select UI for flair; on POST, serialize `humor: moods[0] ?? null`. Display-only difference, but data the user sees ≠ data the backend stores. **Cognitive trap for future devs.** |
| **C. Ask backend team to widen to array** | Reasonable but is a backend change — out of scope per milestone hard rule. Could be a follow-up issue for v2.1. |

**Recommendation (mine):** **Option A — single-select**. The data shape should match the wire. Option B is a maintenance booby-trap. Option C is correct long-term but blocks Phase 14.

### 3. `genres` UI section — does not exist in current Phase 8 design

The Lambda contract has `genres: string[]`, but the Phase 8 `preferences/page.tsx` has NO genres chip section. Issue #133 explicitly requires: *"`GET /preferences` na entrada da tela renderiza generos / subscrições / faixa etária / humor reais."*

Two paths:
- **A. Add a "Favorite genres" section** with chips. Source for the chip list: extract `Array.from(new Set(MOVIES.flatMap(m => m.genres)))` from `recommend.ts` MOVIES dataset (Drama, Mystery, Romance, Sci-Fi, Action, Comedy, Adventure, Crime, Horror, Thriller, ...). Multi-select, identical pattern to subscriptions.
- **B. Skip genres in the UI** (just round-trip whatever the Lambda already has, never let the user edit). Violates AC because the issue requires rendering it.

**Recommendation (mine):** **Option A**. Mirror the subscriptions chip pattern. Add a `GENRES` constant either to `recommend.ts` (alongside MOODS/STREAMING_SERVICES) or a new `lib/preferences/options.ts`. The chip values are whatever string set we agree on — most-natural source is the genre set already used by the movie mock data.

### 4. `_design-reference/preferences.*` — does the reference cover the new genres section? (planner-time)

Need a quick check during plan-phase: open `frontend/_design-reference/` for any preferences-section fixtures, see if genres / save-button patterns are illustrated. If not covered, plan-phase should document the deviation explicitly (CLAUDE.md milestone hard rule #2 — "Match it exactly at all 3 breakpoints"). The genres section, if added, must follow the same SectionCard + Chip primitives Phase 8 already uses, so visual fidelity is automatic.

**This is a planner-time check, not a user-decision question.** Flagged here so the planner does it.

</open_questions>

<canonical_refs>
## Canonical References

**Downstream agents (planner, executor) MUST read these before working.**

### Phase 12 wrapper (the seam being consumed)
- `frontend/web/lib/api/client.ts` — `apiGet<T>` / `apiPost<T>` / `Result<T, ApiError>`. Wrapper handles auth, timeout, error classification.
- `frontend/web/lib/api/useApiErrorUx.ts` — hook for error→UX policy.
- `frontend/web/lib/api/recommend.real.ts` — Phase 12 demonstrator. `preferences.ts` mirrors this shape.

### Current UI being modified
- `frontend/web/app/(app)/(protected)/preferences/page.tsx` — Phase 8 client component, local state, no API consumption.
- `frontend/web/components/Chip.tsx`, `frontend/web/components/SectionCard.tsx` — existing primitives the new genres section consumes.

### Lambda contract (read-only)
- `functions/preferences/preferences.py` — wire format source of truth.
  - `_db_to_api()` (lines 11-17): `{ genres, subscriptions, "age-rating", humor }`. `age-rating` is kebab-case on the wire even though DB stores `ageRating`.
  - `_get()` (line 32): returns 401 if user row missing, else `_db_to_api(user.get("preferences") or {})`.
  - `_post()` (lines 41-94): accepts subset of 4 fields, requires ≥1, validates arrays, persists via `SET preferences.field = :v` per included field, writes `PREFERENCES_UPDATED` log row.
- `functions/preferences/test_preferences.py` — confirms shapes via Moto. Empty new user returns `{ genres: [], subscriptions: [], "age-rating": null, humor: null }`.
- `__main__.py:253` (lambda creation), `__main__.py:340-341` (routes: GET + POST `/api/v1/preferences`, JWT-authed via `auth_id=authorizer.id`).

### Project rules
- `frontend/web/AGENTS.md` — DSGN-06 hard rule. Any new genres section consumes only `Chip` + `SectionCard` (already token-clean) so this is automatic.
- `CLAUDE.md` — milestone hard rules. Backend read-only; no `_design-reference/` imports.

### Milestone artifacts
- `.planning/REQUIREMENTS.md` lines 134-136 — INTG-PREF-01..03 acceptance criteria.
- `.planning/ROADMAP.md` §"Phase 14: Preferences Lambda Integration" — goal, success criteria, risks.
- Issue #133 (gh issue view 133) — Portuguese-language scope + AC with the smoke-test requirement.

### Phase 12 docs (templates / convention)
- `.planning/phases/12-secure-lambda-fetch-wrapper/12-CONTEXT.md` — this doc's structure mirrors it.
- `.planning/phases/12-secure-lambda-fetch-wrapper/12-04-SUMMARY.md` — SKIPPED-AWS-DEFERRED smoke pattern to mirror in 14-01-SUMMARY.md.

</canonical_refs>

<code_context>
## Code Context

### Reusable assets
- **`apiGet` / `apiPost`** (`lib/api/client.ts:280-293`) — generic wrappers. Return `Promise<Result<T, ApiError>>`. Phase 14's typed functions are thin wrappers over these.
- **`useApiErrorUx(error)`** (`lib/api/useApiErrorUx.ts`) — React hook that fires `toast.error()` for network/server/forbidden. Caller passes current error state.
- **`Chip` + `SectionCard`** (`components/`) — Phase 8 primitives. Token-clean per DSGN-06. New genres section reuses them.
- **`useAuth()`** (`lib/auth/AuthContext.tsx`) — still used for the email row + sign-out button at page bottom (no change).

### Patterns to follow
- **Wrapper-backed typed function pattern** — exact copy of `recommend.real.ts` shape, swap path + types.
- **Mount-effect with cancellation flag** — already documented in 12-PATTERNS.md §"Mount-effect with cancellation flag". Apply to the GET on mount in `preferences/page.tsx`.
- **`useApiErrorUx` consumption** — pass last `ApiError | null` to the hook; let it fire toast side-effects on change.
- **Skeleton UX during initial load** — no in-repo analog yet (this is the first read-on-mount screen). Planner authors a `<ChipSkeleton />` component (`components/ChipSkeleton.tsx`?) or inlines a `<div className="bg-surface-2 rounded-md h-8 w-20 animate-pulse" />` array.

### Open question for planner
- **Where does the genres options list live?** (a) Append `GENRES` export to `lib/api/recommend.ts` alongside MOODS/STREAMING_SERVICES (consistent with current layout), (b) new `lib/preferences/options.ts` (decouples preferences from the movie mock). Recommend (a) for symmetry — `recommend.ts` already exports the lookup tables; one more is fine.

</code_context>

<assumptions>
## Assumptions to Verify in Planning

- **`/api/v1/preferences` POST returns 200 + empty body on success.** From `functions/preferences/preferences.py:93` — `return ok()`. Check `shared/response.py:ok()` returns `{ statusCode: 200, body: "" }` (or similar). If body is `{}` or `{ok: true}`, narrow the return type in `putPreferences()`.
- **The Lambda's `_db_to_api` returns the SAME shape whether the user has preferences or not.** Yes per test `test_get_returns_empty_prefs_for_new_user`.
- **POST 401 with missing user row.** The handler returns 401 if `get_user(sub)` returns None on GET, but POST does an `UpdateExpression` directly via `users().update_item()` — what happens if the user row is missing? Worth a one-off Moto test review during the plan. If POST creates the row implicitly (DynamoDB's UpdateExpression with `SET` creates the item if not exists), great. If it fails silently, surface as a backend concern.
- **`shared/response.py:ok()` does NOT set `Content-Type: application/json` for empty bodies.** The wrapper's `response.text()` → `JSON.parse(text)` path returns `null as T` for empty strings. Fine for `Result<null, ApiError>`.

</assumptions>

<deferred>
## Noted for Later
- **Optimistic update history / undo** — v2.1. Add an "undo last save" toast action if churn rate is high.
- **Cross-field validation** — explicitly out of scope per issue #133.
- **Genre recommendations based on history** — v2.1+ per issue #133.
- **Preference-change audit log surfaced in UI** — log table is being written (`write_log` in `_post`) but no UI consumer until v2.1.
</deferred>

---

*Phase: 14-preferences-integration*
*Context gathered: 2026-05-14 (manual — research mode off in config.json)*
*Awaiting user decisions on Open Questions 1, 2, 3 before plan-phase.*
