# Roadmap: recommend-a Frontend

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
- [ ] **Phase 6: Home / Hero** — Home screen using one of the 3 backdrop variants, CTA wired to `/recommendation` (issue #95)
- [ ] **Phase 7: Recommendation Result** — Mocked recommendation result screen (poster, title, summary, metadata) (issue #96)
- [ ] **Phase 8: Preferences** — Mocked, protected preferences screen (issue #97)
- [ ] **Phase 9: History** — Mocked, protected history screen (issue #98)
- [ ] **Phase 10: Watch Later** — Mocked, protected watch-later screen (issue #99)

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
| 6. Home / Hero | 0/TBD | Not started | - |
| 7. Recommendation Result | 0/TBD | Not started | - |
| 8. Preferences | 0/TBD | Not started | - |
| 9. History | 0/TBD | Not started | - |
| 10. Watch Later | 0/TBD | Not started | - |

## Coverage

- v1 requirements: 56 total
- Mapped to phases: 56 (FOUND-01..07 → P1, DSGN-01..06 → P2, LAYT-01..05 → P3, AUTH-01..07 → P4, AUTH-08..13 → P5, HOME-01..05 → P6, RECO-01..04 → P7, PREF-01..05 → P8, HIST-01..05 → P9, WTCL-01..05 → P10)
- Unmapped: 0
- Duplicates across phases: 0

---
*Roadmap created: 2026-05-04*
