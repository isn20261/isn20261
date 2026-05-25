# Roadmap: Cinedica Frontend

## Overview

Ten sequential phases that ship a polished, design-faithful Next.js 16 + TypeScript + TailwindCSS frontend at `frontend/web/`, mirroring `frontend/_design-reference/` exactly across mobile (~375px), tablet (~768px) and desktop (1440px) breakpoints. Each phase is one GitHub sub-issue (#90–#99), one feature branch off `frontend`, and one PR back into `frontend`. Foundation phases (1–3) unblock all screen phases per parent issue #88; auth context (5) unblocks protected screens (8–10). Backend remains read-only — every Cognito/Lambda/DynamoDB call is mocked through a single typed `lib/api/` module with `localStorage`-backed sessions, so real backend integration becomes a one-provider swap in v2 (INTG-01..04).

## Context

- **Brownfield repo, greenfield frontend.** Backend (Pulumi + AWS Lambda + Cognito + DynamoDB) is mapped at `.planning/codebase/STACK.md` and `ARCHITECTURE.md` and is strictly read-only this milestone. Known backend issues (env-var name mismatch, missing PyJWT dep, ~8 of 11 lambdas not wired) are tracked in `.planning/codebase/CONCERNS.md` and explicitly out of scope.
- **Locked design source:** `frontend/_design-reference/` (dark theme `#0a0a0b`, amber accent `#f5b544`, Manrope display + Inter body, type scale 12/14/16/20/28/40/64, radii sm/md/lg/xl, layout rail 64px / tab 64px). The `_design-reference/` directory stays on disk for visual reference and is deleted just before the final `frontend → main` PR.
- **Stack locked by issue #88:** Next.js 16, TypeScript (strict), TailwindCSS, shadcn primitives where they speed component work without diverging from tokens.
- **Granularity:** `fine` (config.json). Mode: `interactive`. Parallelization: `false` — phases must run sequentially because branches stack.
- **Branching:** every phase = `feature/issue-{N}-{slug}` off `frontend`, PR'd into `frontend`. Final `frontend → main` PR happens after Phase 10.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work — one per GitHub sub-issue
- Decimal phases (e.g. 5.1): Reserved for urgent insertions (none planned)

- [x] **Phase 1: Foundation** — Initialize Next.js 16 + TS + Tailwind project at `frontend/web/` with strict TS, lint, fonts, folder layout, and a working dev server (issue #90)
- [x] **Phase 2: Design System** — Mirror `_design-reference/styles.css` tokens into Tailwind theme (colors, type, radii, shadows, layout) with a tokens demo route (issue #91)
- [x] **Phase 3: Layout** — Build navbar / sidebar / footer / page wrapper from scratch, responsive at all 3 breakpoints (issue #92) — COMPLETED 2026-05-06
- [x] **Phase 4: Login + Register UI** — Design-faithful auth screens with validation and the mock `lib/api/auth` Cognito-shaped seam (issue #93) — COMPLETED 2026-05-06
- [x] **Phase 5: Auth Context + Protected Routes** — Global auth context, `RequireAuth` wrapper, localStorage rehydration, expiry redirect (issue #94) — COMPLETED 2026-05-06
- [x] **Phase 6: Home / Hero** — Home screen using one of the 3 backdrop variants, CTA wired to `/recommendation` (issue #95) — COMPLETED 2026-05-06 (gradient variant)
- [x] **Phase 7: Recommendation Result** — Mocked recommendation result screen (poster, title, summary, metadata) (issue #96) — COMPLETED 2026-05-06
- [x] **Phase 8: Preferences** — Mocked, protected preferences screen (issue #97) — COMPLETED 2026-05-06
- [x] **Phase 9: History** — Mocked, protected history screen (issue #98) — COMPLETED 2026-05-06
- [x] **Phase 10: Watch Later** — Mocked, protected watch-later screen (issue #99) — COMPLETED 2026-05-06 (milestone closed)

## Phase Details

### Phase 1: Foundation
**Goal**: A Next.js 16 + TypeScript + Tailwind project boots locally at `frontend/web/`, lints clean, and routes between two pages.
**GitHub issue**: #90
**Branch**: `feature/issue-90-foundation`
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07
**Success Criteria** (what must be TRUE):
  1. `pnpm dev` (run from `frontend/web/`) boots the app and the root route renders a placeholder page in the browser.
  2. Navigating to a second route (e.g. `/_health` or `/tokens`) renders successfully — proves App Router wiring.
  3. `pnpm lint` passes with no errors against ESLint + Prettier config, and `tsc --noEmit` passes under `strict: true`.
  4. The `frontend/web/` tree contains `app/`, `components/`, `lib/`, `lib/api/`, `public/`, `styles/` directories, and Manrope + Inter are loaded via `next/font` (no Google Fonts CDN at runtime).
**Plans**: 4 plans
- [x] `01-01-project-init-PLAN.md` — Bootstrap Next.js 16 + TS, pin Node/pnpm, ESLint flat config, Prettier+tailwindcss plugin, strict tsconfig with noUncheckedIndexedAccess (FOUND-01, 02, 03 lint setup) — COMPLETED 2026-05-05
- [x] `01-02-tailwind-shadcn-init-PLAN.md` — Consolidate Tailwind v4 entry at `styles/globals.css`, run shadcn init (no example component), produce `lib/utils.ts` + `components.json` (FOUND-04 Tailwind+shadcn portion) — COMPLETED 2026-05-06
- [x] `01-03-skeleton-and-fonts-PLAN.md` — Create `{app,components,lib,lib/api,public,styles}` skeleton with .gitkeeps, wire Manrope+Inter via `next/font/google` exposing `--font-display` + `--font-body` (FOUND-04 font portion, FOUND-05) — COMPLETED 2026-05-06
- [x] `01-04-routes-and-verification-PLAN.md` — Author `/` and `/tokens` placeholder routes, run `pnpm dev`/`build`/`lint`/`tsc`, grep `.next/` for `fonts.googleapis.com` = 0 hits (FOUND-03 lint pass, FOUND-06, FOUND-07) — COMPLETED 2026-05-05

**Notes / risks:**
- Next.js 16 is recent — verify pnpm + Node compatibility before committing the lockfile.
- Keep `lib/api/` empty-but-present in this phase; Phase 4 fills it. The directory is the seam future Cognito-SDK swap (INTG-01) will replace.

### Phase 2: Design System
**Goal**: Every color, font, type-scale step, radius, shadow and layout token from `_design-reference/styles.css` is reachable as a Tailwind utility, and a visible tokens demo proves no drift.
**GitHub issue**: #91
**Branch**: `feature/issue-91-design-system`
**Depends on**: Phase 1
**Requirements**: DSGN-01, DSGN-02, DSGN-03, DSGN-04, DSGN-05, DSGN-06
**Success Criteria** (what must be TRUE):
  1. A developer can write `bg-bg`, `bg-surface`, `bg-surface-elevated`, `bg-surface-2`, `border-border`, `border-border-strong`, `text-primary`/`secondary`/`muted`, `bg-accent`, `bg-accent-hover`, `bg-accent-soft`, `text-on-accent`, `text-success`/`warning`/`danger` and the rendered colors match the CSS-variable values in `_design-reference/styles.css` exactly.
  2. Tailwind utilities exist for the type scale (`text-12`/`14`/`16`/`20`/`28`/`40`/`64`), font families (`font-display` → Manrope, `font-body` → Inter), radii (`rounded-sm`/`md`/`lg`/`xl` = 6/10/16/22 px), shadows (`shadow-md`/`lg`), and layout sizes (`w-rail` = 64px, `h-tab` = 64px).
  3. A `/tokens` (or equivalent) route renders every token visually — color swatches, type samples, radius and shadow examples — so visual drift against `_design-reference/styles.css` is spottable in one screen.
  4. No component file in `frontend/web/components/` or `frontend/web/app/` contains a hardcoded hex color or px font-size — enforced via lint rule or documented author rule that PR review checks.
**Plans**: 3 plans
- [x] `02-01-theme-block-and-base-reset-PLAN.md` — Author Tailwind v4 `@theme` block mirroring all reference tokens + `@layer base` reset (DSGN-01..04) — COMPLETED 2026-05-05
- [x] `02-02-tokens-demo-route-PLAN.md` — Visible tokens demo gallery at `/tokens` with 16 color swatches, 7 type-scale rows, 4 radii, 2 shadows, 2 layout demos (DSGN-05) — COMPLETED 2026-05-05
- [x] `02-03-author-rule-and-verification-PLAN.md` — Document DSGN-06 author rule in AGENTS.md, add visible banner at /tokens, end-to-end verification (DSGN-06) — COMPLETED 2026-05-05

**Notes / risks:**
- Tailwind v4 token authoring differs from v3; lock the approach (`@theme` block vs `tailwind.config.ts`) before the design demo route is built.
- The `_design-reference/styles.css` is the spec — read it line-by-line, do not paraphrase.

### Phase 3: Layout
**Goal**: Navbar, sidebar, footer and a page wrapper compose into a chrome that visually matches the reference at all three breakpoints — the shell every screen phase will plug into.
**GitHub issue**: #92
**Branch**: `feature/issue-92-layout`
**Depends on**: Phase 2
**Requirements**: LAYT-01, LAYT-02, LAYT-03, LAYT-04, LAYT-05
**Success Criteria** (what must be TRUE):
  1. A user visiting any route inside the page wrapper sees the navbar, sidebar (collapsed at mobile), main content area and footer in the positions and proportions defined by `_design-reference/`.
  2. Navbar, sidebar and footer are reusable React components in `frontend/web/components/` — none of them imports JSX from `_design-reference/`.
  3. Layout matches the reference design at all 3 breakpoints (~375px / ~768px / 1440px) — sidebar collapses or transforms appropriately on mobile, content reflows correctly, no horizontal scroll at 375px.
  4. The page wrapper exposes a content slot so screen phases (6–10) only author the screen-specific markup, never re-implement chrome.
**Plans**: 5 plans
Plans:
- [x] 03-01-deps-and-brand-mark-PLAN.md - Install lucide-react + author components/BrandMark.tsx (Server Component, fresh re-author) — COMPLETED 2026-05-06
- [x] 03-02-sidebar-PLAN.md - Sidebar Client Component (desktop rail + mobile tab bar in one file, usePathname active state, 5 routes) — COMPLETED 2026-05-06
- [x] 03-03-navbar-and-footer-PLAN.md - Navbar (home + mobile variants) + Footer (disclaimer + 2 stub anchors), both Server Components — COMPLETED 2026-05-06
- [x] 03-04-page-layout-and-route-groups-PLAN.md - PageLayout composer + (app)/layout.tsx + (auth)/layout.tsx + migrate root + tokens pages into (app) group — COMPLETED 2026-05-06
- [x] 03-05-verification-PLAN.md - End-of-phase verification: 5 UI-SPEC verification hooks + tsc/lint/build + manual 3-breakpoint visual check (LAYT-05) — COMPLETED 2026-05-06
**UI hint**: yes

**Notes / risks:**
- Issue #88 explicitly blocks screen issues until #90/#91/#92 are merged — Phase 3 is the unlock gate.
- Reference uses `--rail-w: 64px` and `--tab-h: 64px`; ensure those flow from Phase 2 tokens, not hardcoded.

### Phase 4: Login + Register UI
**Goal**: Users can interact with design-faithful login and register screens, get inline validation feedback, and the mock auth seam (`lib/api/auth`) returns Cognito-shaped success/failure responses.
**GitHub issue**: #93
**Branch**: `feature/issue-93-auth-ui`
**Depends on**: Phase 3
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. A user navigating to `/login` or `/register` sees forms whose layout, fields, button styling and error treatment match the reference design exactly at all 3 breakpoints (~375px / ~768px / 1440px).
  2. Submitting an invalid email or weak password shows an inline error styled per the reference (`.input.error` red border, helper text) without submitting the form.
  3. Submitting valid credentials calls `lib/api/auth.signIn` / `signUp` (a typed module that mocks Cognito's response shape — fake tokens, simulated `UsernameExistsException` / `NotAuthorizedException` failure paths) and on success writes a mock session token to `localStorage`.
  4. A logout control (in the app shell) clears the `localStorage` session entry — verifiable by checking devtools Application > Local Storage before and after.
**Plans**: 5 plans
Plans:
- [x] 04-01-mock-auth-seam-PLAN.md - Cognito-shaped lib/api/auth.ts mock seam (D-02..D-04) + scaffold shadcn Popover primitive (D-07) — COMPLETED 2026-05-06
- [x] 04-02-field-component-PLAN.md - Reusable <Field> Client Component with floating label, show/hide toggle, error/hint slot (D-08) — COMPLETED 2026-05-06
- [x] 04-03-login-register-pages-PLAN.md - /login + /register Client Components with validation D-09, two-tier errors D-10, signIn/signUp submit + router.push(/) on success (D-11) — COMPLETED 2026-05-06
- [x] 04-04-account-menu-and-forgot-stub-PLAN.md - /forgot Server Component stub (D-01) + AccountMenu popover wrapper (D-05) + Sidebar/Navbar wiring (AUTH-06) — COMPLETED 2026-05-06
- [x] 04-05-verification-PLAN.md - End-of-phase verification: 16 UI-SPEC hooks + tsc/lint/build + manual 3-breakpoint check + register-then-sign-in end-to-end — COMPLETED 2026-05-06
**UI hint**: yes

**Notes / risks:**
- The shape of `lib/api/auth` is the contract that INTG-01 will swap to real Cognito SDK; mirror Cognito's `AdminInitiateAuth` / `AdminCreateUser` response keys (`AccessToken`, `IdToken`, `RefreshToken`).
- Logout button lives in the app shell from Phase 3 but its wiring (clearing session) is Phase 4 work.

### Phase 5: Auth Context + Protected Routes
**Goal**: A global auth context governs access to private routes, sessions survive a page refresh, and unauthenticated users are routed to `/login` without flashes.
**GitHub issue**: #94
**Branch**: `feature/issue-94-auth-context`
**Depends on**: Phase 4
**Requirements**: AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-12, AUTH-13
**Success Criteria** (what must be TRUE):
  1. After login, refreshing the browser keeps the user logged in — the auth context rehydrates from `localStorage` on initial mount with no visible logout flicker.
  2. An unauthenticated visitor navigating directly to a protected route (e.g. `/preferences`) is redirected to `/login`; an authenticated user navigating to the same URL renders the protected page.
  3. Clicking logout immediately clears the auth context, and any subsequent navigation to a protected route redirects to `/login`.
  4. Mocked token expiry (forced via `lib/api/auth` test hook) clears the auth context and redirects to `/login` — proves the expiry path the future real-Cognito refresh-token flow (INTG-03) will plug into.
  5. Navigating between two protected routes while authenticated does not show an unauthenticated flash or empty state at any point.
**Plans**: TBD

**Notes / risks:**
- Avoid auth flicker: rehydrate on the client before rendering protected children, or render a skeleton until the context resolves.
- Phase 5 is the gate for Phases 8–10 (protected screens); without it `RequireAuth` cannot exist.

### Phase 6: Home / Hero
**Goal**: A user lands on a polished home screen — one of the 3 reference backdrop variants — and can click the primary CTA to start a recommendation.
**GitHub issue**: #95
**Branch**: `feature/issue-95-home`
**Depends on**: Phase 5
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05
**Success Criteria** (what must be TRUE):
  1. The `/` route renders a home page using exactly one chosen backdrop variant from `_design-reference/` (collage, gradient, or drift) — the chosen variant is documented in the PR description.
  2. Hero copy, CTA, card placement and overall composition match the reference design exactly at all 3 breakpoints (~375px / ~768px / 1440px).
  3. The primary "recommend a movie" CTA navigates to `/recommendation` (or the equivalent route used in Phase 7) — clicking it actually changes the URL.
  4. The home page consumes only Tailwind theme variables for colors and typography — `git grep -E '#[0-9a-fA-F]{3,6}|font-size:\s*[0-9]+px'` against `app/` and `components/` returns no hits introduced by this phase.
**Plans**: TBD
**UI hint**: yes

**Notes / risks:**
- Backdrop variant choice is up to the implementer; lock it in the PR description so reviewers compare against the right reference.
- `/` may be public OR pre-auth landing — clarify in plan-phase whether logged-in users skip past it.

### Phase 7: Recommendation Result
**Goal**: After clicking the home CTA, a user sees a fully-rendered recommendation result screen with mocked movie data that matches the reference exactly.
**GitHub issue**: #96
**Branch**: `feature/issue-96-recommendation`
**Depends on**: Phase 6
**Requirements**: RECO-01, RECO-02, RECO-03, RECO-04
**Success Criteria** (what must be TRUE):
  1. Visiting `/recommendation` renders a poster, title, summary and metadata (year, genre, runtime, match%) sourced from a mocked dataset in `lib/api/recommend` — no real API call is made.
  2. Page composition (poster size, copy hierarchy, action buttons, surrounding chrome) matches the reference design exactly at all 3 breakpoints (~375px / ~768px / 1440px).
  3. The page consumes only Tailwind theme variables for colors and typography — no new hardcoded hex/px values introduced by this phase.
  4. The mocked dataset shape mirrors what a future `recommend` Lambda response would look like (fields like `title`, `posterUrl`, `summary`, `match`), so the future swap (INTG-02) is a one-provider replacement.
**Plans**: TBD
**UI hint**: yes

**Notes / risks:**
- `_design-reference/detail.jsx` and `data.jsx` are the source of truth for shape and visuals — read them directly.
- Anti-pattern called out in `ARCHITECTURE.md` ("cross-Lambda imports of sibling code"): keep `lib/api/recommend` self-contained, do not couple it to `lib/api/auth` beyond importing types.

### Phase 8: Preferences
**Goal**: An authenticated user can view a polished, mocked preferences page; unauthenticated users are redirected.
**GitHub issue**: #97
**Branch**: `feature/issue-97-preferences`
**Depends on**: Phase 7
**Requirements**: PREF-01, PREF-02, PREF-03, PREF-04, PREF-05
**Success Criteria** (what must be TRUE):
  1. An authenticated user navigating to `/preferences` sees their mocked preferences (genres, subscriptions, age rating, humor — matching the implementation-side schema noted in `ARCHITECTURE.md`) rendered per the reference design.
  2. An unauthenticated user navigating to `/preferences` is redirected to `/login` (validates the Phase-5 `RequireAuth` integration on a real screen).
  3. The page composition matches the reference design exactly at all 3 breakpoints (~375px / ~768px / 1440px).
  4. The page consumes only Tailwind theme variables for colors and typography.
**Plans**: TBD
**UI hint**: yes

**Notes / risks:**
- The implemented backend `preferences` shape (genres / subscriptions / ageRating / humor) diverges from `Modelagem.md`; mock the implementation-side shape so INTG-02 can swap cleanly.
- Read-only display this milestone; editing/persisting preferences is a v2 concern.

### Phase 9: History
**Goal**: An authenticated user can view a polished, mocked history page; unauthenticated users are redirected.
**GitHub issue**: #98
**Branch**: `feature/issue-98-history`
**Depends on**: Phase 8
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05
**Success Criteria** (what must be TRUE):
  1. An authenticated user navigating to `/history` sees a mocked list of past recommendations (title, date, poster thumb) rendered per the reference design.
  2. An unauthenticated user navigating to `/history` is redirected to `/login`.
  3. The page composition matches the reference design exactly at all 3 breakpoints (~375px / ~768px / 1440px).
  4. The page consumes only Tailwind theme variables for colors and typography.
**Plans**: TBD
**UI hint**: yes

**Notes / risks:**
- Source-of-truth design is `_design-reference/history-queue.jsx`.
- Mock dataset should include 0-item, few-item, and many-item states so the empty/scroll behaviour can be exercised without ambiguity.

### Phase 10: Watch Later
**Goal**: An authenticated user can view a polished, mocked watch-later page; unauthenticated users are redirected. Final phase before the `frontend → main` PR.
**GitHub issue**: #99
**Branch**: `feature/issue-99-watch-later`
**Depends on**: Phase 9
**Requirements**: WTCL-01, WTCL-02, WTCL-03, WTCL-04, WTCL-05
**Success Criteria** (what must be TRUE):
  1. An authenticated user navigating to `/watch-later` sees a mocked list of saved movies (title, poster, added-at) rendered per the reference design.
  2. An unauthenticated user navigating to `/watch-later` is redirected to `/login`.
  3. The page composition matches the reference design exactly at all 3 breakpoints (~375px / ~768px / 1440px).
  4. The page consumes only Tailwind theme variables for colors and typography.
**Plans**: TBD
**UI hint**: yes

**Notes / risks:**
- After Phase 10 ships into `frontend`, perform the `_design-reference/` deletion and open the final `frontend → main` PR (per PROJECT.md decision log).
- Watch-later schema in the backend nests `title` inside the array entry (anti-pattern noted in ARCHITECTURE.md); mirror the implementation shape, not `Modelagem.md`.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-05-05 |
| 2. Design System | 3/3 | Complete | 2026-05-05 |
| 3. Layout | 5/5 | Complete | 2026-05-06 |
| 4. Login + Register UI | 5/5 | Complete | 2026-05-06 |
| 5. Auth Context + Protected Routes | 2/2 | Complete | 2026-05-06 |
| 6. Home / Hero | 1/1 | Complete | 2026-05-06 |
| 7. Recommendation Result | 1/1 | Complete | 2026-05-06 |
| 8. Preferences | 1/1 | Complete | 2026-05-06 |
| 9. History | 1/1 | Complete | 2026-05-06 |
| 10. Watch Later | 1/1 | Complete | 2026-05-06 |

## Coverage

- v1 requirements: 56 total
- Mapped to phases: 56 (FOUND-01..07 → P1, DSGN-01..06 → P2, LAYT-01..05 → P3, AUTH-01..07 → P4, AUTH-08..13 → P5, HOME-01..05 → P6, RECO-01..04 → P7, PREF-01..05 → P8, HIST-01..05 → P9, WTCL-01..05 → P10)
- Unmapped: 0
- Duplicates across phases: 0

---
*Roadmap created: 2026-05-04*

---

## Milestone v2.0 — Backend Integration

**Defined:** 2026-05-12
**Umbrella issue:** #127
**Phase numbering:** continues from v1.0 (which ended at Phase 10). v2.0 begins at **Phase 11**.

### Overview

Seven sequential phases that replace every `lib/api/*` mock with the real Cognito + API Gateway v2 + Lambda surface, and ship an end-to-end onboarding guide so a fresh teammate can clone the repo, provision their own AWS infra via Pulumi, and run the app against it. Pattern B / Cognito-direct: the frontend talks to Cognito for sign-up/login (via `amazon-cognito-identity-js`), a `post_confirm` Lambda trigger seeds DynamoDB on confirmation, and authenticated requests carry the IdToken to API Gateway v2's JWT authorizer before reaching the per-screen Lambdas.

### Context

- **v2 branches off `main`** (v1 already merged) — not off `frontend`. The `frontend` branch is closed at the end of v1.0.
- **1 phase = 1 sub-issue under umbrella #127 = 1 feature branch off `main` = 1 PR back into `main`.** Branch naming: `feature/issue-{N}-{slug}`. Phase 11 is already in PR as issue #128 (retroactively roadmapped); Phases 12–17 will open new sub-issues under #127.
- **Backend remains read-only this milestone.** `functions/`, `__main__.py`, Pulumi configs (`Pulumi.dev.yaml`, etc.) are not modified. The only exceptions are minimal fixes strictly required to unblock integration — these are flagged in the phase plan and surfaced to the user, not done unilaterally. Standing pre-existing backend concerns (env-var mismatch, missing PyJWT, ~8/11 lambdas not wired) are tracked in `.planning/codebase/CONCERNS.md` and addressed by separate non-roadmap issues (#117 closed, #120 closed, #122 closed, #123, #125).
- **Phase order is fixed and sequential.** 11 → 12 → 13 → 14 → 15 → 16 → 17. Cognito tokens (P11) must exist before the fetch wrapper (P12) can inject them; the wrapper must exist before per-screen Lambda integration (P13–P16); all integrations must work before the onboarding guide (P17) can be cold-run end-to-end.
- **Out of scope, per REQUIREMENTS.md §v2.0 Out of Scope:** backend bugfixes beyond what blocks integration, LocalStack (handled separately by a teammate), OAuth/magic-link/2FA/password-reset UI, CI/CD pipeline (v2.1), production hardening (v2.1), native mobile.

### Phases

- [ ] **Phase 11: Cognito Frontend Integration** — Replace the `lib/api/auth` mock with `amazon-cognito-identity-js`; sign-up → email confirm → sign-in → logout round-trip against real Cognito + `post_confirm` Lambda → DynamoDB (issue #128, retroactive — already in PR)
- [x] **Phase 12: Secure Lambda Fetch Wrapper** — Typed `lib/api/client.ts` that auto-injects the Cognito IdToken, exposes a discriminated `ApiError` taxonomy, refreshes-and-replays once on 401, applies per-request timeouts, and surfaces error-class-aware UX (TBD — open as sub-issue of #127) (completed 2026-05-12)
- [ ] **Phase 13: Recommendation Lambda Integration** — Recommendation screen calls the real `/recommend` Lambda through the wrapper with loading / error / empty states (TBD — open as sub-issue of #127)
- [x] **Phase 14: Preferences Lambda Integration** — Preferences screen reads + writes the real `/preferences` Lambda (GET + POST; PUT was an issue-title mistake — POST only) with loading / error / empty states and a documented per-toggle optimistic update strategy (issue #133, completed 2026-05-14 — live-AWS smoke deferred)
- [ ] **Phase 15: History Lambda Integration** — History screen reads the real `/history` Lambda with loading / error / empty states (TBD — open as sub-issue of #127)
- [ ] **Phase 16: Watch-Later Lambda Integration** — Watch-later screen reads + writes (add / remove) the real `/watch-later` Lambda with loading / error / empty states (TBD — open as sub-issue of #127)
- [ ] **Phase 17: Onboarding Guide + E2E Cold-Run** — `ONBOARDING.md` covers AWS account + IAM → AWS CLI → Pulumi install + config → `pulumi up` → `.env` from `pulumi stack output` → `pnpm install && pnpm dev` → end-to-end smoke test; validated by a teammate cold-running it on a fresh AWS account (TBD — open as sub-issue of #127)

### Phase Details

#### Phase 11: Cognito Frontend Integration
**Goal**: A user can sign up with a fresh email, confirm with the emailed code, sign in against real Cognito, and the resulting session shows them as a confirmed user in the DynamoDB users table — with zero mock fallback remaining in the auth code path.
**GitHub issue**: #128 (retroactive — already in PR)
**Branch**: `feature/issue-128-cognito-auth`
**Depends on**: v1.0 complete (Phases 1–10)
**Requirements**: AUTH-COGN-01, AUTH-COGN-02, AUTH-COGN-03, AUTH-COGN-04, AUTH-COGN-05, AUTH-COGN-06
**Success Criteria** (what must be TRUE):
  1. A user submitting `/register` with a fresh email + valid password receives a confirmation code by email and can complete the `confirm` flow from the UI; their Cognito user transitions from `UNCONFIRMED` to `CONFIRMED`.
  2. After confirmation, a `GetItem` against the `cinedica.users` DynamoDB table by the same `sub` returns a row — proving the `post_confirm` Lambda trigger fired end-to-end from a frontend-initiated sign-up.
  3. A user submitting `/login` with confirmed credentials receives real Cognito tokens (IdToken + RefreshToken), the IdToken decodes (jwt.io or in-app) to the expected `sub` / `email` / `cognito:groups` claims, and the session persists across a browser refresh.
  4. Clicking logout clears the Cognito session and the frontend token storage; any subsequent navigation to a protected route redirects to `/login`.
  5. `git grep -E 'MOCK_LATENCY_MS|USERS_KEY|signIn.*mock|signUp.*mock'` against `frontend/web/lib/api/auth*` and `frontend/web/components/` returns zero hits — no mock fallback remains in the auth path.
**Plans**: TBD

**Notes / risks:**
- Retroactively roadmapped: work landed before v2.0 was formally defined, so this phase documents what already shipped on `feature/issue-128-cognito-auth`. Plan-phase for P11 captures the final state, not future work.
- The `post_confirm` Lambda was fixed in #117 (now closed). If the cold-run reveals a regression, it's a v2.0 bug, not a backend-bugfix carve-out.
- Cognito user pool + client are managed by Pulumi (`__main__.py`); `.env` carries `NEXT_PUBLIC_COGNITO_USER_POOL_ID` and `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`. Onboarding (P17) must document the `.env` → `pulumi stack output` mapping.

#### Phase 12: Secure Lambda Fetch Wrapper
**Goal**: Every authenticated frontend call to API Gateway v2 routes through a single typed wrapper that injects the Cognito IdToken, classifies errors into a discriminated union, retries once on 401 via refresh-then-replay, and times out cleanly — providing the one seam the per-screen integration phases (13–16) consume.
**GitHub issue**: TBD — open as sub-issue of #127
**Branch**: `feature/issue-TBD-fetch-wrapper`
**Depends on**: Phase 11 (real Cognito tokens are needed for IdToken injection and RefreshToken-based replay)
**Requirements**: FETCH-01, FETCH-02, FETCH-03, FETCH-04, FETCH-05, FETCH-06, FETCH-07
**Success Criteria** (what must be TRUE):
  1. Every typed `lib/api/*` endpoint function (`recommend`, `getPreferences`, `putPreferences`, `getHistory`, `getWatchLater`, `addWatchLater`, `removeWatchLater`) returns a `Result<T, ApiError>` where `ApiError` is a discriminated union of `NetworkError | UnauthorizedError | ForbiddenError | ValidationError | ServerError` — exhaustively checkable in TypeScript.
  2. A successful authenticated call carries `Authorization: Bearer <IdToken>` (the current Cognito IdToken at call time) and `git grep -nE '\\bfetch\\(' frontend/web` outside `lib/api/client.ts` returns zero hits — all callers go through the wrapper.
  3. Forcing a 401 (e.g. via an expired IdToken in devtools) results in exactly one silent refresh-then-replay using the RefreshToken; if the replay also returns 401 the wrapper triggers logout and routes to `/login` — verifiable in the Network panel as `original 401 → token refresh call → replayed request 200`, or `original 401 → refresh → replayed 401 → logout`.
  4. A request that exceeds the wrapper's per-request timeout (default 10s, overridable via caller signal) aborts and surfaces a `NetworkError` to the caller — verifiable by pointing one endpoint at a delay endpoint or via `setTimeout` in a test harness.
  5. A reusable hook/utility consumes the `ApiError` discriminated union and renders error-class-appropriate UX (toast for `NetworkError`/`ServerError`, inline form message for `ValidationError`, forced redirect for `UnauthorizedError` after the retry budget is spent) — exercisable from at least one screen in this phase.
**Plans**: 4 plans
Plans:
- [x] 12-01-PLAN.md — Sonner install + Toaster mount in app/layout + .env.example documentation (foundation; partial FETCH-06, FETCH-07)
- [x] 12-02-PLAN.md — `lib/api/client.ts` wrapper (types, env init, getSession-per-request, IdToken injection, AbortController timeout, 5-kind ApiError classifier, sanitization) + `setOnUnauthorized(signOut)` registration in AuthProvider (FETCH-01, FETCH-02, FETCH-03 pre-emptive, FETCH-04, FETCH-06 introduces wrapper)
- [x] 12-03-PLAN.md — `useApiErrorUx` hook + `recommend.real.ts` demonstrator typed function (FETCH-05 partial, FETCH-07)
- [x] 12-04-PLAN.md — End-of-phase verification: grep gates (FETCH-06 enforcement, threat-model checks T-12-01..06), manual auth-flow walkthrough, summary report

**Notes / risks:**
- Refresh-then-replay must NOT race: if a second 401 arrives mid-refresh, the second caller should reuse the in-flight refresh promise, not start a new one. Plan-phase should call this out.
- API Gateway v2 JWT authorizer expects the IdToken (not AccessToken) — the wrapper must read the IdToken from the same storage Phase 11 writes to.
- Single source of `Authorization` header injection: if a caller passes their own `Authorization` header, the wrapper should reject or replace it deterministically — document the choice in the plan.

#### Phase 13: Recommendation Lambda Integration
**Goal**: The recommendation screen renders a real movie recommendation fetched from the `/recommend` Lambda through the Phase 12 wrapper, with explicit loading, error and empty states — and no recommendation mock left in the code path.
**GitHub issue**: TBD — open as sub-issue of #127
**Branch**: `feature/issue-TBD-reco-integration`
**Depends on**: Phase 12 (consumes the typed fetch wrapper + `Result<T, ApiError>` contract)
**Requirements**: INTG-RECO-01, INTG-RECO-02
**Success Criteria** (what must be TRUE):
  1. Visiting `/recommendation` while authenticated triggers a real `GET /recommend` (or POST per the Lambda contract) request visible in the Network panel, and the rendered poster / title / summary / metadata are sourced from the Lambda response — not from `lib/api/recommend` mock data.
  2. `git grep -n 'mock' frontend/web/lib/api/recommend*` and `git grep -nE 'lib/api/recommend' frontend/web/app frontend/web/components` show all imports route through the wrapper-backed function only; no fallback mock dataset remains in the recommendation code path.
  3. Cutting the network (devtools offline) renders the wrapper's error-class-aware error UX on the recommendation screen — not a blank page or unhandled exception.
  4. A response with no recommendation (empty or null payload) renders the screen's empty state per the Phase 7 design — not a crash and not a loading spinner.
**Plans**: 4 plans
Plans:
- [x] 13-01-type-narrowing-and-adapter-PLAN.md — Narrow recommend.real.ts to a Phase-13-specific `RecommendationResponse` / `RecommendedMovie` type; introduce kebab→camel adapter at the lib boundary; getRecommendationReal() returns `Result<RecommendedMovie | null, ApiError>` (INTG-RECO-01)
- [x] 13-02-screen-swap-and-states-PLAN.md — Swap `/recommendation` page from mock-backed `getRecommendation()`/`getSimilar()` to `getRecommendationReal()`; wire useApiErrorUx; render loading/ready/empty/error branches; hide Similar Films rail; conditionally omit Phase-7-only fields (INTG-RECO-01, INTG-RECO-02)
- [ ] 13-03-mock-deletion-PLAN.md — Delete MOVIES dataset + getRecommendation + getSimilar + PICK_LATENCY_MS from lib/api/recommend.ts; keep Movie/Service types, RATINGS/STREAMING_SERVICES/MOODS constants, posterUrl/backdropUrl helpers; rewrite module header (zero "mock" references) (INTG-RECO-02)
- [ ] 13-04-verification-PLAN.md — End-of-phase verification gate: automated grep gates (Block A), build/lint/tsc (Block B), code-inspection (Block C), manual live-AWS smoke 6 scenarios (Block D), closure summary (Block E)

**Notes / risks:**
- The live `/api/v1/recommend` Lambda shape (verified 2026-05-14 against `dev-test-combined`) returns ONLY `title` / `genre` / `streaming-services` — 10 Phase-7 fields (year, runtime, rating, match, director, cast, synopsis, mood, posterSeed, backdropSeed) are NOT returned. Phase 13 chose Option C — graceful degradation now, backend enrichment deferred to issue #70 (OMDb + Streaming Availability API).
- The kebab-case wire key `streaming-services` is converted to camelCase `streamingServices` at the adapter boundary inside `recommend.real.ts` — that file is the SOLE place in `frontend/web/` that touches the kebab form.
- The Similar Films rail is hidden this phase (no `/similar` endpoint exists). JSX comment marker preserves the layout slot for re-introduction.
- Backend remains read-only — no edits to `functions/recommend/recommend.py` or `__main__.py` in this phase chain (CORS was already added separately in commit 8f06653).
- `/smoke` page (Phase 12 manual harness) stays through Phase 16; Phase 17 owns its deletion.

#### Phase 14: Preferences Lambda Integration
**Goal**: The preferences screen reads from and writes to the real `/preferences` Lambda through the Phase 12 wrapper, with explicit loading, error and empty states and a documented update strategy (optimistic vs conservative).
**GitHub issue**: TBD — open as sub-issue of #127
**Branch**: `feature/issue-TBD-prefs-integration`
**Depends on**: Phase 12
**Requirements**: INTG-PREF-01, INTG-PREF-02, INTG-PREF-03
**Success Criteria** (what must be TRUE):
  1. Visiting `/preferences` while authenticated triggers a real `GET /preferences` request and the rendered genres / subscriptions / age rating / humor reflect the Lambda response — not mocked data.
  2. Saving an edit on `/preferences` triggers a real `PUT` (or `POST`) request to the `/preferences` Lambda; reloading the page shows the persisted value — proving round-trip persistence end-to-end against the user's own DynamoDB.
  3. The update strategy (optimistic-update-then-rollback-on-error vs conservative-disable-until-confirmed) is explicitly chosen and documented in the plan, and the resulting UX matches: cutting the network during save renders the chosen failure path (rollback or disabled state) and the wrapper's error UX surfaces.
  4. Loading and empty states render correctly: first visit before the request resolves shows a loading state; a brand-new account with no preferences row renders the empty state (or default-prefs flow, whichever the plan chooses) without crashing.
**Plans**: TBD

**Notes / risks:**
- Backend preferences shape diverges from `Modelagem.md` (per `ARCHITECTURE.md`); confirm the live shape against the Pulumi stack output before locking the wire format in the plan.
- The `preferences` Lambda may not be wired in API Gateway yet (`CONCERNS.md` ~8/11 not wired); if so, surface a narrow integration-blocker exception in plan-phase.

#### Phase 15: History Lambda Integration
**Goal**: The history screen renders the user's real recommendation history fetched from the `/history` Lambda through the Phase 12 wrapper, with explicit loading, error and empty states.
**GitHub issue**: TBD — open as sub-issue of #127
**Branch**: `feature/issue-TBD-history-integration`
**Depends on**: Phase 12
**Requirements**: INTG-HIST-01, INTG-HIST-02
**Success Criteria** (what must be TRUE):
  1. Visiting `/history` while authenticated triggers a real `GET /history` request and the rendered list (title / date / poster thumb) reflects the Lambda response — not the mocked dataset from Phase 9.
  2. A brand-new account with no history renders the empty state per the Phase 9 design — not a crash and not a perpetual loading spinner.
  3. Cutting the network on the history screen renders the wrapper's error-class-aware error UX — not a blank list.
  4. `git grep -n 'mock' frontend/web/lib/api/history*` shows all imports route through the wrapper-backed function only; no fallback mock dataset remains in the history code path.
**Plans**: TBD

**Notes / risks:**
- History payloads can be long; if the Lambda doesn't paginate, the plan should note current behaviour (render-all) and flag pagination as a v2.1 concern.
- History Lambda may not be wired in API Gateway yet (`CONCERNS.md`); if so, surface in plan-phase.

#### Phase 16: Watch-Later Lambda Integration
**Goal**: The watch-later screen reads and mutates (add / remove) the user's real watch-later list against the `/watch-later` Lambda through the Phase 12 wrapper, with explicit loading, error and empty states.
**GitHub issue**: TBD — open as sub-issue of #127
**Branch**: `feature/issue-TBD-watch-later-integration`
**Depends on**: Phase 12
**Requirements**: INTG-WTCL-01, INTG-WTCL-02, INTG-WTCL-03
**Success Criteria** (what must be TRUE):
  1. Visiting `/watch-later` while authenticated triggers a real `GET /watch-later` request and the rendered list (title / poster / added-at) reflects the Lambda response — not the mocked dataset from Phase 10.
  2. Clicking "add" on a movie triggers a real add request (POST/PUT) and the item appears in the list on the next read; clicking "remove" triggers a real remove request (DELETE) and the item disappears — verifiable round-trip against the user's own DynamoDB.
  3. A brand-new account with no saved items renders the empty state per the Phase 10 design; cutting the network during add/remove renders the wrapper's error UX and (per the documented update strategy) leaves the list in a consistent state.
  4. `git grep -n 'mock' frontend/web/lib/api/watch*later*` shows no fallback mock dataset remains in the watch-later code path.
**Plans**: TBD

**Notes / risks:**
- Watch-later schema nests `title` inside the array entry per `ARCHITECTURE.md`; mirror the live Lambda shape, not `Modelagem.md`.
- Add/remove update strategy should mirror Phase 14's choice (optimistic vs conservative) unless the plan explicitly justifies divergence.

#### Phase 17: Onboarding Guide + E2E Cold-Run
**Goal**: A teammate who has never seen the project can clone the repo, follow `ONBOARDING.md` on a fresh AWS account, provision the full stack via `pulumi up`, populate `frontend/web/.env` from `pulumi stack output`, run `pnpm dev`, and complete the full smoke test (sign-up → confirm → home → recommend → preferences → history → watch-later) end-to-end against their own infra — with any gaps the cold-run surfaces folded back into the guide.
**GitHub issue**: TBD — open as sub-issue of #127
**Branch**: `feature/issue-TBD-onboarding-guide`
**Depends on**: Phases 11, 12, 13, 14, 15, 16 (the guide validates the full working app end-to-end)
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07
**Success Criteria** (what must be TRUE):
  1. `ONBOARDING.md` exists at the repo root and walks through, in order: AWS account creation → IAM user/role with required permissions (Cognito, Lambda, API Gateway, DynamoDB, IAM, CloudWatch, S3 if needed) → AWS CLI install + `aws configure` → Pulumi install + `pulumi login` + per-stack `pulumi config` → `.env` for `frontend/web/` (UserPoolId, ClientId, API Gateway URL) sourced from `pulumi stack output` → `pulumi up` with documented expected outputs → `pnpm install && pnpm dev`.
  2. The smoke-test checklist in `ONBOARDING.md` enumerates the full user flow — sign-up → email confirm → login → home → recommend → preferences (read + edit) → history → watch-later (add + remove) — and a teammate ticking through it can verify the app works end-to-end against their own infra.
  3. A teammate who did not author the guide cold-runs it on a fresh AWS account, the app works end-to-end, and the run is logged (notes, screenshots, or PR comment trail). Every gap or ambiguity the teammate hits is folded back into `ONBOARDING.md` before this phase closes.
  4. After the cold-run, a second dry read-through by either the author or the teammate produces zero new corrections — the guide is stable.
**Plans**: TBD

**Notes / risks:**
- The cold-run is the success bar — not "guide reads well." Schedule the teammate's cold-run before claiming Phase 17 complete.
- IAM permission scoping is the easiest place for gaps; document the exact least-privilege policy(ies), not "AdministratorAccess."
- `pulumi stack output` field names must match the `.env` keys the frontend expects (`NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`, API Gateway URL); verify mapping in the plan.
- LocalStack support is explicitly out of scope (handled by a teammate separately); do not include LocalStack paths in the guide.

### Dependencies / Phase Order

v2.0 phases execute in strict numeric order — no parallelization:

```
11 (Cognito) → 12 (Fetch wrapper) → 13 (Reco) → 14 (Prefs) → 15 (History) → 16 (Watch-later) → 17 (Onboarding)
```

- **Phase 12 depends on Phase 11**: the fetch wrapper auto-injects the Cognito IdToken and uses the RefreshToken for the refresh-then-replay path; neither exists until Phase 11 lands real Cognito tokens.
- **Phases 13, 14, 15, 16 each depend on Phase 12**: every screen integration consumes the same typed wrapper, the same `Result<T, ApiError>` contract, and the same error-class-aware UX hook.
- **Phase 17 depends on Phases 11–16**: the onboarding guide's success bar is a teammate cold-running the full app end-to-end against their own AWS infra, which requires every screen integration to work.

Phases 13–16 are sequenced (not concurrent) because branches stack and PRs land sequentially per the project rule "1 phase = 1 sub-issue = 1 feature branch off `main` = 1 PR." If a reviewer/the user later opts to parallelize 13–16 (independent screens), the dependency on Phase 12 still holds and concurrency is a workflow choice, not a roadmap change.

### Progress (v2.0)

**Execution Order:** 11 → 12 → 13 → 14 → 15 → 16 → 17

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 11. Cognito Frontend Integration | 0/TBD | Defining | - |
| 12. Secure Lambda Fetch Wrapper | 4/4 | Complete   | 2026-05-12 |
| 13. Recommendation Lambda Integration | 4/4 | Complete | 2026-05-15 |
| 14. Preferences Lambda Integration | 3/3 | Complete (smoke deferred) | 2026-05-14 |
| 15. History Lambda Integration | 0/TBD | Not started | - |
| 16. Watch-Later Lambda Integration | 0/TBD | Not started | - |
| 17. Onboarding Guide + E2E Cold-Run | 0/TBD | Not started | - |

### Coverage (v2.0)

- v2.0 requirements: 30 total
  - AUTH-COGN-01..06 (6) → Phase 11
  - FETCH-01..07 (7) → Phase 12
  - INTG-RECO-01..02 (2) → Phase 13
  - INTG-PREF-01..03 (3) → Phase 14
  - INTG-HIST-01..02 (2) → Phase 15
  - INTG-WTCL-01..03 (3) → Phase 16
  - DOCS-01..07 (7) → Phase 17
- Mapped to phases: 30
- Unmapped: 0
- Duplicates across phases: 0

---
*v2.0 roadmap section added: 2026-05-12*
