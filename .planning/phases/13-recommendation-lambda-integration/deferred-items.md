# Phase 13 — Deferred Items

Items discovered during execution that are **out of scope** for the
plan that surfaced them, per the GSD executor's SCOPE BOUNDARY rule.

---

## Pre-existing ESLint failure in `smoke/page.tsx`

**Discovered during:** Plan 13-01, Task 1 (`pnpm lint` acceptance check).

**Location:** `frontend/web/app/(app)/(protected)/smoke/page.tsx:66:19`

**Rule:** `react-hooks/purity` — "Cannot call impure function during render"
on `const stamp = Date.now();` inside the `fireSynthetic` event-handler
function defined within the component body.

**Why pre-existing (not introduced by Plan 13-01):**
- The smoke page was added in commit `6bfb57f` (Phase 12 closure, plan 12-04)
  and has not been modified since.
- `git diff HEAD -- "frontend/web/app/(app)/(protected)/smoke/page.tsx"`
  shows no diff against the executor's pre-execution baseline.
- Plan 13-01 only touches `frontend/web/lib/api/recommend.real.ts`. That
  file lints clean (`./node_modules/.bin/eslint lib/api/recommend.real.ts`
  exits 0).

**Why deferred instead of fixed:**
- The smoke page is a **throwaway harness** explicitly slated for deletion
  at Phase 17 (see STATE.md "Pending Todos" — "delete `frontend/web/app/(app)/(protected)/smoke/`
  before the final `backend-integration → main` PR").
- Plan 13-01's scope is the type-narrowing of `recommend.real.ts`.
  Modifying the smoke page is unrelated and risks introducing churn into
  the deletion target.
- GSD executor SCOPE BOUNDARY: "Only auto-fix issues DIRECTLY caused by
  the current task's changes. Pre-existing warnings, linting errors, or
  failures in unrelated files are out of scope. Log out-of-scope
  discoveries to `deferred-items.md` in the phase directory. Do NOT fix
  them."

**Suggested resolution path (post-Plan-13-01):**
- Option A (preferred — aligns with existing roadmap): wait for Phase 17
  smoke-page deletion. The error vanishes with the file.
- Option B (if a downstream plan needs `pnpm lint` clean for its own
  gates): add `// eslint-disable-next-line react-hooks/purity` on
  smoke/page.tsx:66, or hoist `Date.now()` into the dispatched message
  string at the setSyntheticError call sites (replacing the `stamp` local).

**Plan 13-04 (verification) is the natural place to revisit:** if the
verification gate needs a globally-clean lint, it should either consume
Option B at execute-time or defer the lint gate to per-file checks
that exclude the smoke harness until Phase 17.
