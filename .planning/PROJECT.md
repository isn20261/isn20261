# recommend-a Frontend

## What This Is

The Next.js + TypeScript + TailwindCSS web frontend for **recommend-a**, a movie recommendation app. The frontend mirrors the locked design in `frontend/_design-reference/` and will eventually consume the existing AWS Lambda + Cognito + DynamoDB backend — but every backend interaction is mocked for this milestone so frontend work can ship independently.

## Core Value

A user can navigate a polished, design-faithful UI that matches `frontend/_design-reference/` exactly — sign up, log in, browse home, get a recommendation, and manage preferences/history/watch-later — even though every backend call is currently mocked.

## Requirements

### Validated

<!-- Inferred from existing codebase map (.planning/codebase/) -->

- ✓ AWS Lambda + Cognito + DynamoDB backend exists — existing
- ✓ Pulumi-managed infra (`__main__.py`, `Pulumi.{dev,prod,yaml}`) — existing
- ✓ Locked visual design (`frontend/_design-reference/` — JSX + HTML + CSS, dark theme, amber accent, Manrope/Inter, 3 home backdrop variants) — existing

### Active

<!-- v1 hypotheses, sourced from GitHub sub-issues #90-#99 -->

- [ ] Initialize Next.js 16 + TypeScript + TailwindCSS app at `frontend/web/` (issue #90)
- [ ] Tailwind theme + design system that mirrors `_design-reference/styles.css` tokens — colors, typography, spacing, radii, shadows (issue #91)
- [ ] App shell: navbar, sidebar, footer, page wrapper (issue #92)
- [ ] Login + register screens, design-faithful, with mocked Cognito (issue #93)
- [ ] Auth context + protected routes + mock-session persistence via localStorage (issue #94)
- [ ] Home/hero screen — pick one of the 3 backdrop variants (issue #95)
- [ ] Recommendation result screen, mocked (issue #96)
- [ ] Preferences screen, mocked, protected (issue #97)
- [ ] History screen, mocked, protected (issue #98)
- [ ] Watch-later screen, mocked, protected (issue #99)
- [ ] All screens responsive at ~375px / ~768px / 1440px breakpoints

### Out of Scope

- Real Cognito SDK wiring — deferred to a later milestone (separate issues will be created for backend integration)
- Real Lambda / API Gateway calls — deferred to a later milestone
- Backend changes (`functions/`, `__main__.py`, Pulumi configs) — strictly read-only this milestone
- Importing or reusing JSX from `frontend/_design-reference/` — components must be built fresh with Next.js + shadcn primitives
- Native mobile app — web-first

## Context

**Existing codebase (mapped at `.planning/codebase/`):**
- Python backend with Pulumi-managed AWS Lambda + API Gateway + Cognito + DynamoDB.
- Pre-existing backend issues are documented in `.planning/codebase/CONCERNS.md` (env-var name mismatch, missing PyJWT dep, ~8 of 11 lambdas not wired up). **These are explicitly out of scope** for this milestone — flagged so the frontend mock surface is clearly separate from any backend repair work.
- `frontend/_design-reference/` is throwaway design source-of-truth: dark theme (`--color-bg: #0a0a0b`), amber accent (`#f5b544`), Manrope/Inter fonts, well-defined CSS variables for colors / type scale / radii / shadows / layout. Three home backdrop variants are pre-designed (collage / gradient / drift).

**Workflow context:**
- Parent GitHub issue **#88** + 10 sub-issues (**#90–#99**) define the scope. Parent issue states: *"Não iniciar as tasks de telas antes das sub-issues 90 até 92 estarem prontas"* — foundation issues block screen issues.
- Branching plan (user-confirmed): each sub-issue gets its own branch off `frontend`, PRs back into `frontend`, then a final PR `frontend → main` once all issues are done.
- `_design-reference/` stays on disk through the milestone for visual reference, then is deleted before the final `frontend → main` PR.

## Constraints

- **Tech stack**: Next.js 16 + TypeScript + TailwindCSS — locked in issue #88. Adding shadcn primitives where it speeds component work without diverging from the design tokens.
- **Visual design**: must match `frontend/_design-reference/` exactly at all 3 breakpoints — this is the user-facing definition of "done".
- **Component reuse**: cannot import from `frontend/_design-reference/` — components must be authored fresh in `frontend/web/`.
- **Backend**: read-only this milestone. No changes to `functions/`, `__main__.py`, Pulumi files, or any infra config.
- **Mock layer**: a single typed `frontend/web/lib/api/` module mimics the future Cognito + Lambda surface; sessions persist via `localStorage` so issue #94's "session survives refresh" criterion is testable. Real implementation swap happens later by replacing one provider.
- **Responsiveness**: 3 breakpoints — ~375px (mobile), ~768px (tablet), 1440px (desktop).
- **Branching**: 1 GSD phase = 1 GitHub sub-issue = 1 feature branch off `frontend` = 1 PR into `frontend`. Sequential (not parallel) — issue dependencies require it.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js app at `frontend/web/` (sibling to `_design-reference/`) | Cleanest separation; reference stays browsable until deleted | — Pending |
| Mock module + localStorage (not MSW) | Simpler swap to real Cognito SDK; one provider replacement | — Pending |
| 1 GSD phase per GitHub sub-issue | Matches branch-per-issue PR workflow exactly | — Pending |
| Skip Research agent (Lean workflow) | Stack already decided in issue #88 — Next 16, TS, Tailwind, shadcn — no domain unknowns | — Pending |
| Defer `_design-reference/` deletion | Keep visible during build; delete just before the final `frontend → main` PR | — Pending |
| Mock all backend now, integrate later in separate issues | Lets frontend ship without blocking on backend repair work | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-04 after initialization*
