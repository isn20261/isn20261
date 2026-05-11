# recommend-a — Frontend Milestone

This repo is mid-milestone on the **recommend-a frontend**, planned and tracked via GSD. Read these files first when picking up work:

- `.planning/PROJECT.md` — what this is, core value, decisions
- `.planning/REQUIREMENTS.md` — 56 v1 REQ-IDs grouped by category
- `.planning/ROADMAP.md` — 10 phases, 1:1 with GitHub sub-issues #90–#99
- `.planning/STATE.md` — current phase, deferred items, blockers
- `.planning/codebase/` — existing brownfield backend map (read-only this milestone)
- `frontend/github-context.md` — original GitHub issue text

## Hard rules for this milestone

1. **Frontend lives at `frontend/web/`.** All Next.js + TS + Tailwind code goes there. The Pulumi backend (`__main__.py`, `functions/`) is **read-only** this milestone — do not modify it.
2. **Visual design source of truth: `frontend/_design-reference/`.**
   - Match it exactly at all 3 breakpoints (~375 / ~768 / 1440).
   - **Never import** JSX from `_design-reference/` into `frontend/web/`. Components must be authored fresh, using shadcn primitives where useful.
   - `_design-reference/` stays on disk through the milestone; it is deleted just before the final `frontend → main` PR (Phase 10 handoff).
3. **All backend calls are mocked.** A typed `frontend/web/lib/api/` module mimics the future Cognito + Lambda surface, with `localStorage`-backed sessions. Real Cognito SDK / API Gateway integration is **v2** (INTG-01..04) — out of scope this milestone.
4. **No hardcoded design values.** Once Phase 2 (Design System) ships, components consume only Tailwind theme variables. No hex colors, no px font-sizes inside `app/` or `components/`.
5. **Branching:** 1 GSD phase = 1 GitHub sub-issue = 1 feature branch off `frontend` = 1 PR back into `frontend`. Branch naming: `feature/issue-{N}-{slug}` (e.g. `feature/issue-90-foundation`). The final `frontend → main` PR happens after Phase 10.
6. **Phase order is fixed and sequential.** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Issue #88 blocks screen issues until #90/#91/#92 land; auth context (Phase 5) blocks protected screens (Phases 8/9/10).
7. **Pre-existing backend issues are out of scope.** `.planning/codebase/CONCERNS.md` documents real bugs in the Lambda/Cognito stack (env-var mismatch, missing PyJWT, ~8 of 11 lambdas not wired). Don't get pulled into fixing them this milestone.

## GSD workflow you'll be operating inside

GSD splits work into **discuss → plan → execute → verify** per phase, with optional plan-check and verifier agents (both **on** for this project — `.planning/config.json`). Research agent is **off** (lean — stack is locked).

For each phase:

```
/gsd:plan-phase {N}        # produces .planning/phase-{N}/PLAN.md
/gsd:execute-phase {N}     # implements, commits atomically, runs verifier
/gsd:transition            # rolls PROJECT.md / STATE.md forward
```

Useful side commands:
- `/gsd:progress` — situational check / advance
- `/gsd:resume-work` — restore context after `/clear`
- `/gsd:ship` — open the PR for the current phase
- `/gsd:map-codebase --paths frontend/web` — incremental remap once `frontend/web/` exists

## When in doubt

- Acceptance bar = "matches reference design at all 3 breakpoints, uses only theme variables, doesn't import from `_design-reference/`."
- If a UI decision isn't covered by `_design-reference/`, surface the ambiguity instead of guessing.
- If a backend call isn't covered by `lib/api/`, add the typed mock with a Cognito/Lambda-shaped signature so v2 swap is one provider replacement.

---
*Initialized: 2026-05-04 via /gsd:new-project. Currently on branch `frontend`, Phase 1 not yet planned.*
