---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Backend Integration
status: "Phase 13 (Recommendation, #132) merged into backend-integration on 2026-05-15. Phase 14 (Preferences Lambda Integration) complete on feature/issue-133-preferences-integration; Block A static gates all green; live-AWS smoke deferred (mirror of Phase 12). Phase 15 (History) next."
stopped_at: Phase 14 complete (live-AWS smoke deferred); Phase 15 next
last_updated: "2026-05-15T00:00:00.000Z"
last_activity: 2026-05-15 — Phase 13 merged + Phase 14 closure on its own branch
progress:
  total_phases: 17
  completed_phases: 7
  total_plans: 31
  completed_plans: 28
  percent: 41
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04)
See: .planning/ROADMAP.md (v2.0 section added 2026-05-12)

**Core value:** v2.0 — The same polished v1.0 UI consuming the real backend: Cognito sign-up/confirm/login, JWT-authorized Lambda calls via API Gateway v2, errors and token refresh handled production-style. A new collaborator can stand up their own AWS infra from `ONBOARDING.md` and run the app against it.
**Current focus:** Phase 14 — Preferences Lambda Integration (COMPLETE; live-AWS smoke deferred). Next: open PR `feature/issue-133-preferences-integration` → `backend-integration`, then run Phase 15 (History) GSD cycle. Phase 13 (#132 Recommendation) is being handled on a parallel teammate branch.

## Current Position

Phase: 14 (Preferences Lambda Integration) — COMPLETE (3/3 plans, 2026-05-14) on top of Phase 13 (merged 2026-05-15)
Plan: 3 of 3 (14-03 verification gate + transition)
Status: Phase 14 closure SUMMARY written; automated Block A gates all green (tsc/lint/build/mock-grep/fetch-grep/DSGN-06); Block B layout-only pass; Block C live-AWS smoke SKIPPED-AWS-DEFERRED with run-when-home checklist in 14-03-SUMMARY.md
Last activity: 2026-05-15 — rebased Phase 14 branch onto post-Phase-13 backend-integration

## Performance Metrics

**Velocity:**

- Total plans completed (v1.0): 8
- Average duration: ~10 min
- Total execution time: ~1.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | 57 min | 14 min |
| 04-auth-ui    | 5/5 | ~30 min | 6 min  |

**Recent Trend:**

- Last 5 plans: 04-01 (10 min), 04-02 (5 min), 04-03 (2 min), 04-04 (10 min), 04-05 (verification gate, ~5 min automated + manual smoke)
- Trend: Steady ~2-15 min per plan

*Updated after each plan completion*
| Phase 13 P02 | ~3 min | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Project init: Next.js 16 + TS + Tailwind app at `frontend/web/` (sibling to `_design-reference/`).
- Project init: Mock module + `localStorage` (not MSW) — single provider swap to real Cognito SDK.
- Project init: 1 GSD phase = 1 GitHub sub-issue = 1 feature branch off `frontend` = 1 PR.
- Project init: Skip Research agent (Lean workflow); stack is fixed by issue #88.
- Project init: Defer `_design-reference/` deletion until just before final `frontend → main` PR.
- v2.0 init (2026-05-12): Phase numbering continues from v1.0 — v2.0 starts at Phase 11.
- v2.0 init (2026-05-12): v2 branches off `main` (v1 already merged), not off `frontend`.
- v2.0 init (2026-05-12): Pattern B / Cognito-direct architecture per umbrella issue #127 — frontend → Cognito directly via `amazon-cognito-identity-js`; `post_confirm` Lambda trigger seeds DynamoDB; authenticated requests carry IdToken to API Gateway v2 JWT authorizer.
- v2.0 init (2026-05-12): Backend (`functions/`, `__main__.py`, Pulumi configs) remains read-only this milestone; only narrow fixes strictly required to unblock integration are in scope, and they must be surfaced before being done.
- [Phase 13]: Phase 13 Plan 02: ServiceBadge placeholder kind=included until issue #70 enriches with rent/buy tier data
- [Phase 13]: Phase 13 Plan 02: Backdrop strategy Path B (suppress img element, keep gradient scrims) — backdropUrl deleted from /recommendation
- [Phase 13]: Phase 13 Plan 02: Watch-later interim id pattern live:title until Phase 16 wires real /watch-later Lambda

### Decisions (Plan 01-01)

- pnpm 10.33.3 via corepack (not pre-installed on host; corepack enable resolved it)
- Node 22 pinned via .nvmrc and engines.node (host runs Node v24.15.0, compatible)
- next-env.d.ts correctly excluded from git (auto-generated at build time)
- exactOptionalPropertyTypes deliberately NOT enabled (D-05: fights React/Next types)

### Decisions (Plan 01-02)

- shadcn CLI 4.7.0 used with --defaults (--base-color flag not supported in this version)
- shadcn-scaffolded button.tsx deleted per Convention 8 (components/ stays empty)
- shadcn modifications to styles/globals.css reverted to Phase 1 minimal form (D-01)
- components.json written with tailwind.css: styles/globals.css and correct @/* aliases

### Decisions (Plan 01-03)

- public/ had create-next-app SVG assets so no .gitkeep added (only truly empty dirs get .gitkeep)
- lib/api/ uses .gitkeep not index.ts — deliberate Phase 4 boundary marker
- Manrope+Inter weights ['400','500','600','700'] — baseline; Phase 2 may extend to '800' for 64px display
- Font .variable classes on <html> (not <body>) — CSS vars resolve from root

### Decisions (Plan 01-04)

- Used next/link instead of <a href> for internal navigation — required by @next/next/no-html-link-for-pages ESLint rule
- Both routes are server components (no 'use client') — static JSX only per PATTERNS.md Convention 4
- app/tokens/page.tsx file path is locked — Phase 2 (DSGN-05) fills this file in place
- app/page.tsx is locked as Phase 1 placeholder — Phase 6 (HOME-01..05) replaces in place
- pnpm build verified clean; .next/ contains zero fonts.googleapis.com references (ROADMAP success #4)

### Decisions (Plan 04-01)

- shadcn 'base-nova' style emits a Popover backed by @base-ui/react (not @radix-ui/react-popover); plan §key_links expectation diverged but @base-ui/react was already a Phase 1 dep, so no new package landed
- Mock auth seam exposes MOCK_LATENCY_MS / SESSION_KEY / USERS_KEY as `as const` literal types; tests can override latency to [0, 0]
- Plain-text passwords in `cinedica.users` accepted (CONTEXT D-02) — INTG-01 swap point documented in module header
- Defensive guards landed: `typeof window === 'undefined'` on every storage path, `Object.prototype.hasOwnProperty.call` for prototype-pollution, JSON.parse shape check rejects null/array/primitive

### Decisions (Plan 04-02)

- Floating label expressed via Tailwind v4 `peer` + `peer-[&:not(:placeholder-shown)]` arbitrary variants — zero inline `style` props (UI-SPEC verification hook #2 satisfied)
- `placeholder=" "` (single literal space) is the load-bearing trick that keeps `:placeholder-shown` toggling correctly without rendering visible placeholder text
- Five DSGN-06 escape hatches (pt-[18px], top-[14px], text-[10px], text-[13px], tracking-[0.06em]) confined to this single file, each carrying an inline `// non-tokenized:` comment per AGENTS.md
- Show/hide eye toggle is a sibling `<button type="button">` (not a wrapper), keeping tab order natural and preventing form submission on click
- `useId()` generates per-instance `inputId` and `msgId`; `<label htmlFor>` + `aria-describedby` + `aria-invalid` complete the a11y contract (UI-SPEC verification hook #13)

### Decisions (Plan 04-03)

- Both /login and /register inline their forms inside the page component (no <LoginForm>/<RegisterForm> extraction) — CONTEXT §Claude's Discretion recommendation; bespoke per-page forms gain nothing from extraction
- Catch blocks in BOTH pages collapse ALL errors (including unknown variants) into the safe hardcoded copy — `if (err instanceof X) {...} else {...}` both branches set the same string; Cognito-internal messages cannot leak (T-04-13 mitigation)
- "Passwords don't match" uses STRAIGHT ASCII apostrophe (U+0027); curly U+2019 forbidden by UI-SPEC hook #10 — verified 0 hits for the curly form
- Submit button retains "Sign in" / "Create account" label in loading state; only the trailing ArrowRight icon swaps for an animate-spin 16px circle (UI-SPEC §Empty/loading/disabled)
- Terms checkbox is the ONLY raw <input> allowed in /register (UI-SPEC hook #5 explicitly permits checkbox raw inputs); email/password/confirm all go through <Field>
- text-accent on bottom-card link is the Phase 4 supplement entry #8 to the accent reserved-for list (the other 7 entries inherited from Phase 3 + Plan 04-01/02)

### Decisions (Phase 14 — 14-01 / 14-02 / 14-03)

- D-01 Update strategy: **per-toggle optimistic with replay queue** (user-locked 2026-05-14). Each chip click fires savePreferences immediately; in-flight per-field dedup via useRef<Set>; concurrent supersedes queued in useRef<Map> and replayed after the in-flight POST resolves. On failure: rollback to snapshot + useApiErrorUx toast. **Phase 16 (watch-later) MUST mirror this** unless its plan justifies divergence (ROADMAP §Phase 16 Notes).
- D-02 `humor` shape: **single-select UI**. The wire's `humor: string | null` is matched faithfully by the chip toggle returning `string | null`. The Phase 8 multi-select mood UX was a wire-divergence and is corrected here.
- D-03 New `<SectionCard title="Favorite genres">` added above Streaming services. Chips driven by `GENRES` const newly exported from `lib/api/recommend.ts`.
- D-04 The TypeScript write function is named `savePreferences()` (semantic verb, not HTTP-shaped). The endpoint is POST-only — no PUT route exists or will exist this milestone (`__main__.py:340-341`). The original issue title's mention of "PUT" was a user-clarified mistake (2026-05-14).
- D-05 Kebab-case `"age-rating"` is the wire key — accessed via `prefs["age-rating"]`. No client-side renaming to camelCase. The TS type carries the literal bracket key.
- D-06 Lambda `if X is not None` quirk: literal `null` in POST is silently dropped by `_post()`. Workaround at the page-level `commit()` function: translate `null → ""` for single-string fields (`humor`, `age-rating`) right before the wire write. UI treats both `null` and `""` as "no selection". Backend cleanup deferred to v2.1.
- D-07 ChipsSkeleton component is the first skeleton primitive in the repo. Phase 16 may reuse; Phase 15 (history) likely needs a different row-style skeleton.
- D-08 Pre-existing smoke harness lint fix: 1-line `eslint-disable-next-line react-hooks/purity` on `Date.now()` in `app/(app)/(protected)/smoke/page.tsx:66`. Minimum-scope patch to keep full lint gate green; harness is scheduled for Phase 17 deletion anyway.

### Pending Todos

- Phase 11 plan: capture the final state shipped on `feature/issue-128-cognito-auth` (retroactive plan).
- Phase 15: open `/gsd:discuss-phase 15` to start the history integration GSD cycle. Pattern is largely the Phase 14 lib seam shape minus the write path.
- Phase 16: open `/gsd:discuss-phase 16` for watch-later. Mirror Phase 14's per-toggle optimistic + replay-queue + rollback strategy.
- Phase 17: schedule a teammate cold-run on a fresh AWS account before claiming the phase complete.
- Phase 17: **delete `frontend/web/app/(app)/(protected)/smoke/`** before the final `backend-integration → main` PR. It's the throwaway Phase 12 fetch-wrapper smoke harness (commit 6bfb57f). Kept through P13–P16 because it's a useful manual harness for the real-Lambda integrations; the "REVERT BEFORE PR" note on the commit was scoped to the (now-superseded) Phase 12 PR-back-into-frontend gate. Phase 14 added a 1-line eslint-disable to keep lint green; deletion will remove it.
- v2.1 backend cleanup: `functions/preferences/preferences.py:_post` should differentiate `null` (clear field) from missing (skip field). Phase 14 currently sends `""` to clear single-string fields — works, but is a wart.
- Pre-existing review: `frontend/web/components/MovieCard.tsx:50` and `frontend/web/components/ui/sonner.tsx:43` both use `style={...}` — verify these are dynamic non-design-system properties (allowed) vs design-system values (forbidden per DSGN-06). Not blocking Phase 14 PR.

### Blockers/Concerns

- Phase 12 cannot start until Phase 11's Cognito tokens are durable client-side (the wrapper auto-injects the IdToken and refresh-replays via the RefreshToken). Sequential order enforced by the v2.0 dependency block.
- Phases 13–16 each depend on the Phase 12 fetch wrapper landing. Any per-screen integration starting before P12 will reintroduce raw `fetch()` calls and break FETCH-06.
- Pre-existing backend concerns remain in `.planning/codebase/CONCERNS.md` (env-var name mismatch, missing PyJWT dep, ~8 of 11 lambdas not wired). Most are addressed by separate non-roadmap issues (#117 closed, #120 closed, #122 closed, #123, #125). If an integration phase trips on an unwired Lambda, surface a narrow read-only-backend exception in plan-phase rather than silently editing `functions/`.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Backend integration | INTG-01 Real Cognito SDK | Concretized as AUTH-COGN-01..06 (Phase 11) | 2026-05-04 (project init) → re-scoped 2026-05-12 |
| Backend integration | INTG-02 Real Lambda / API Gateway calls | Concretized as FETCH-01..07 (P12) + INTG-RECO/PREF/HIST/WTCL (P13–P16) | 2026-05-04 → re-scoped 2026-05-12 |
| Backend integration | INTG-03 Real session refresh / token rotation | Concretized as FETCH-03 (Phase 12) | 2026-05-04 → re-scoped 2026-05-12 |
| Backend integration | INTG-04 Error UX for real network/auth failures | Concretized as FETCH-02 + FETCH-07 (Phase 12) | 2026-05-04 → re-scoped 2026-05-12 |
| CI/CD | Pipeline | v2.1 | 2026-05-12 |
| Production hardening | Rate-limit UI, account lockout UX | v2.1 | 2026-05-12 |
| LocalStack | Local AWS emulation | Handled separately by a teammate | 2026-05-12 |
| Phase 14 smoke | Live-AWS GET+POST round-trip vs DynamoDB | run-when-home (checklist in 14-03-SUMMARY.md) | 2026-05-14 |
| Backend cleanup | `_post()` null-vs-missing differentiation in functions/preferences/preferences.py | v2.1 follow-up (workaround: send "" for clear) | 2026-05-14 |
| Style audit | MovieCard.tsx:50 + ui/sonner.tsx:43 inline style props review | Non-blocking — verify dynamic-only vs design-system | 2026-05-14 |

## Session Continuity

Last session: 2026-05-15T00:00:00.000Z
Stopped at: Phase 14 complete (live-AWS smoke deferred); PR #153 open against post-Phase-13 backend-integration
Next step: Phase 15 (History) and Phase 16 (Watch-Later) PRs rebase onto post-Phase-13 backend-integration in parallel; then Phase 17 (Onboarding Guide) once all three merge.
Resume file: .planning/phases/14-preferences-integration/14-03-SUMMARY.md
