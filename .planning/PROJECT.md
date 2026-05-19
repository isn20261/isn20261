# recommend-a Frontend

## What This Is

The Next.js + TypeScript + TailwindCSS web frontend for **recommend-a**, a movie recommendation app. v1.0 shipped the design-faithful UI on top of `lib/api/*` mocks. v2.0 replaces those mocks with the real Cognito + API Gateway + Lambda surface so a fresh teammate can clone the repo, follow `ONBOARDING.md`, run `pulumi up` against their own AWS account, and use the app end-to-end against their own infra.

## Core Value

**v1.0 (shipped):** A polished, design-faithful UI that matches `frontend/_design-reference/` exactly across 3 breakpoints, with auth, home, recommendation, preferences, history, and watch-later running against typed mocks.

**v2.0 (active):** That same UI consuming the real backend — Cognito sign-up/confirm/login, JWT-authorized Lambda calls via API Gateway v2, errors and token refresh handled production-style. A new collaborator can stand up their own AWS infra from the onboarding guide and run the app against it.

## Current Milestone: v2.0 Backend Integration

**Goal:** Replace every `lib/api/*` mock with real Cognito + API Gateway + Lambda calls, and ship an end-to-end onboarding guide so a teammate can provision their own AWS infra and run the app against it.

**Target features:**
- Real Cognito auth wired into the frontend (sign-up → confirm → login) — already in flight as issue #128
- Typed, production-grade Lambda fetch client (error taxonomy, token refresh, retry/timeout) consumed by every screen
- Recommendation screen calling real `recommend` Lambda
- Preferences screen reading/writing real `preferences` Lambda
- History screen reading real `history` Lambda
- Watch-later screen reading/writing real `watch_later` Lambda
- `ONBOARDING.md` validated by a teammate cold-running it on a fresh AWS account (AWS account → IAM → Pulumi install → `pulumi config` → `.env` → `pulumi up` → `pnpm dev`)

**Phase numbering continues from v1.0 (which ended at Phase 10).** v2.0 begins at Phase 11.

**Architecture (Pattern B / Cognito-direct):** Frontend talks directly to Cognito for sign-up/login (using `amazon-cognito-identity-js`); a `post_confirm` Lambda trigger seeds DynamoDB on confirmation; authenticated requests carry the IdToken and hit API Gateway v2's JWT authorizer before reaching the recommend/preferences/history/watch-later Lambdas. Per umbrella issue #127.

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
