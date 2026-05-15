# Phase 14: Preferences Lambda Integration — Discussion Log

**Date:** 2026-05-14
**Participants:** User (Nicolas), Claude
**Outcome:** 3 design decisions locked; ready for plan-phase.

---

## 1. Scope intake

User requested batch execution of issues #133 (Preferences), #134 (History), #135 (Watch-later) — all sub-issues of the v2.0 umbrella #127.

Mapped to ROADMAP v2.0 phases 14, 15, 16. Phase 13 (Recommendation, #132) was flagged as a sequencing gap; user confirmed Phase 13 is being executed by another teammate and is not critical to phases 14/15/16 (the 4 screens are independent at the `lib/api/*` boundary).

Decided to pull these 3 forward as their own GSD cycle, each a separate sub-issue / branch / PR.

## 2. Pre-flight blockers surfaced

- **`watch_later` cross-package import (`functions/watch_later.py` importing `from recommend`)** — known blocker per `.planning/codebase/CONCERNS.md`. User confirmed the fix already landed on `main` in a backend-team PR; this branch (`backend-integration`) is frontend-only, so we don't touch `functions/`.
- **Live-AWS smoke** — Phase 12's smoke was deferred until user returns to home AWS environment. Same call applies here: Phase 14/15/16 will be implemented and gated on type-check / lint / build, with the round-trip smoke logged as `SKIPPED-AWS-DEFERRED` mirroring Phase 12's pattern.
- **Workflow** — user opted for the full GSD step-by-step cycle on each phase (`discuss → plan → execute → transition`) rather than a leaner direct execution.

## 3. Wire-format reconciliation (Phase 14)

Inspected `functions/preferences/preferences.py` and discovered three mismatches between the Phase 8 mock UI and the real Lambda contract:

| Field | Lambda | Phase 8 UI |
|---|---|---|
| `subscriptions: string[]` | ✓ | `services: string[]` (just a local-name mismatch) |
| `"age-rating": string \| null` | ✓ | `rating: Rating` (close, no null) |
| `humor: string \| null` (single) | — | `moods: string[]` (multi) — **type mismatch** |
| `genres: string[]` | ✓ | **MISSING from UI entirely** |

This forced 3 user-facing decisions, captured below.

## 4. Decisions

### D-01 Update strategy: **per-toggle optimistic** (Option A)

**Why this over alternatives:**
- Matches the existing "Changes save automatically" copy in Phase 8.
- Cleanest mental model — chip click → POST → optimistic UI; rollback on failure.
- Debounced variant (B) muddied error attribution when multiple fields change in the same window.
- Conservative Save-button variant (C) is the most robust but introduces a UI element not present in `_design-reference/`, violating CLAUDE.md hard rule #2 ("Match it exactly at all 3 breakpoints").
- Dedup pattern is small (~15 LOC) and contained.

**Phase 16 implication:** the same strategy applies to watch-later add/remove. ROADMAP §Phase 16 already calls this out — Phase 14's choice is the canon.

### D-02 `humor` shape: **single-select UI** (Option A)

**Why this over alternatives:**
- Backend is read-only this milestone — we can't widen the wire to an array (Option C, deferred to v2.1 as a follow-up issue).
- Option B (multi-select UI, send first) creates a cognitive trap where UI state ≠ DB state. Future devs would have to chase this.
- Single-select matches the wire faithfully. No real user data exists yet, so no lossy migration concern.

### D-03 `genres` UI: **add "Favorite genres" SectionCard** (Option A)

**Why this over alternatives:**
- Issue #133 explicitly requires rendering genres (`"GET /preferences ... renderiza generos / subscrições / faixa etária / humor reais"`).
- Adds one SectionCard + chip set; copies the subscriptions pattern.
- Genres lookup source: `Array.from(new Set(MOVIES.flatMap(m => m.genres)))` from `lib/api/recommend.ts`. Export as a new `GENRES` const for symmetry with `MOODS` / `STREAMING_SERVICES`.

## 5. Out-of-scope reaffirmations

- No changes to `functions/` (backend read-only).
- No `_design-reference/` imports (CLAUDE.md hard rule #2).
- No cross-field validation (issue #133 explicit out-of-scope).
- No preference-change-history UI (deferred v2.1).
- No live-AWS smoke this PR (smoke checklist in SUMMARY).

## 6. Next steps

1. Author `14-PATTERNS.md` (file-by-file analog map per Phase 12 convention).
2. Create branch `feature/issue-133-preferences-integration` off `backend-integration`.
3. Author `14-01-PLAN.md`; surface for user confirmation per `gates.confirm_plan = true`.
4. Execute with atomic commits; produce `14-01-SUMMARY.md`.
5. Transition (STATE.md + ROADMAP.md roll forward), open PR `feature/issue-133-* → backend-integration`.

---

*Logged: 2026-05-14*
