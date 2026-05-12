# Requirements: recommend-a Frontend

**Defined:** 2026-05-04
**Core Value:** A user can navigate a polished, design-faithful UI that matches `frontend/_design-reference/` exactly and exercise the full app flow (auth, home, recommendation, preferences, history, watch-later) on top of mocked backend calls.

## v1 Requirements

Each `[CATEGORY]-N` requirement is atomic and testable. Categories map 1:1 to GitHub sub-issues #90–#99 and to GSD phases (1 issue = 1 phase = 1 branch off `frontend` = 1 PR).

### Foundation (issue #90)

- [ ] **FOUND-01**: Next.js 16 + TypeScript project initialized at `frontend/web/`
- [ ] **FOUND-02**: TypeScript configured in `strict` mode
- [ ] **FOUND-03**: ESLint + Prettier configured and `pnpm lint` (or equivalent) passes
- [ ] **FOUND-04**: Initial dependencies installed: TailwindCSS, shadcn-ready setup, Manrope + Inter via `next/font`
- [ ] **FOUND-05**: Project folder structure created: `app/`, `components/`, `lib/`, `lib/api/` (mock seam), `public/`, `styles/`
- [ ] **FOUND-06**: App runs locally with `pnpm dev` and renders a placeholder root route
- [ ] **FOUND-07**: At least one secondary route renders (proves App Router routing works)

### Design System (issue #91)

- [ ] **DSGN-01**: Tailwind color tokens mirror `_design-reference/styles.css` exactly: bg, surface (3 levels), border (2 levels), text (primary/secondary/muted), amber accent (with hover and soft variants), on-accent, success/warning/danger
- [ ] **DSGN-02**: Tailwind typography tokens match: Manrope (display), Inter (body), type scale 12/14/16/20/28/40/64 px
- [ ] **DSGN-03**: Tailwind tokens for radii (sm/md/lg/xl) and shadows (md/lg) match reference values
- [ ] **DSGN-04**: Layout tokens (rail width 64px, tab height 64px) exposed as Tailwind utilities
- [ ] **DSGN-05**: A "tokens demo" route renders every token visually so the design team can spot drift
- [ ] **DSGN-06**: Components author rule: only Tailwind theme variables — hardcoded hex/px values forbidden in component files (lint or doc rule)

### Layout (issue #92)

- [x] **LAYT-01**: Navbar component built from scratch and visually matches the reference — Phase 3 (03-03)
- [x] **LAYT-02**: Sidebar component built from scratch and visually matches the reference — Phase 3 (03-02)
- [x] **LAYT-03**: Footer component built from scratch and visually matches the reference — Phase 3 (03-03)
- [x] **LAYT-04**: Page layout wrapper composes navbar + sidebar + footer + page-content slot — Phase 3 (03-04)
- [x] **LAYT-05**: Layout components are responsive at ~375px / ~768px / 1440px — Phase 3 (03-05 manual 3-breakpoint check approved)

### Authentication UI (issue #93)

- [ ] **AUTH-01**: Login screen at `/login` matches reference design
- [ ] **AUTH-02**: Register screen at `/register` matches reference design
- [ ] **AUTH-03**: Client-side form validation (email format, password rules) with inline error messaging that matches the design's error treatment
- [x] **AUTH-04**: `lib/api/auth` mocks Cognito `signUp` + `signIn` shapes (returns fake tokens, simulates failure cases) — Phase 4 (04-01)
- [x] **AUTH-05**: Successful login/register stores a mock session token in `localStorage` — Phase 4 (04-01)
- [ ] **AUTH-06**: Logout button (in app shell) clears the localStorage session
- [ ] **AUTH-07**: Login + register screens responsive at ~375px / ~768px / 1440px

### Auth System & Protected Routes (issue #94)

- [ ] **AUTH-08**: Global auth context exposes `{ user, isAuthenticated, login, register, logout }` to the component tree
- [ ] **AUTH-09**: A `RequireAuth` wrapper / middleware redirects unauthenticated visitors to `/login`
- [ ] **AUTH-10**: Session rehydrates from `localStorage` on initial mount — refresh keeps you logged in
- [ ] **AUTH-11**: Mocked token expiry triggers redirect to `/login` and clears the auth context
- [ ] **AUTH-12**: Navigating between protected routes works without auth flicker / unauthenticated flashes
- [ ] **AUTH-13**: Logout immediately revokes access to protected routes (a manual nav after logout redirects to `/login`)

### Home / Hero (issue #95)

- [ ] **HOME-01**: Home page renders at `/` using ONE of the 3 backdrop variants from the reference (collage / gradient / drift)
- [ ] **HOME-02**: Home page composition (hero copy, CTA, card placement) matches reference exactly
- [ ] **HOME-03**: Home uses only Tailwind theme variables for color/typography (no hardcoded values)
- [ ] **HOME-04**: Home page responsive at ~375px / ~768px / 1440px
- [ ] **HOME-05**: Primary "recommend a movie" CTA navigates to `/recommendation` (or equivalent route)

### Recommendation Result (issue #96)

- [ ] **RECO-01**: Recommendation result page renders mocked movie data (poster, title, summary, metadata)
- [ ] **RECO-02**: Page composition matches reference design exactly
- [ ] **RECO-03**: Page uses only Tailwind theme variables
- [ ] **RECO-04**: Page responsive at ~375px / ~768px / 1440px

### Preferences (issue #97)

- [ ] **PREF-01**: Preferences page renders mocked preferences data
- [ ] **PREF-02**: Route is protected — unauthenticated users redirect to `/login`
- [ ] **PREF-03**: Page composition matches reference design exactly
- [ ] **PREF-04**: Page uses only Tailwind theme variables
- [ ] **PREF-05**: Page responsive at ~375px / ~768px / 1440px

### History (issue #98)

- [ ] **HIST-01**: History page renders mocked history data
- [ ] **HIST-02**: Route is protected
- [ ] **HIST-03**: Page composition matches reference design exactly
- [ ] **HIST-04**: Page uses only Tailwind theme variables
- [ ] **HIST-05**: Page responsive at ~375px / ~768px / 1440px

### Watch Later (issue #99)

- [ ] **WTCL-01**: Watch-later page renders mocked watch-later data
- [ ] **WTCL-02**: Route is protected
- [ ] **WTCL-03**: Page composition matches reference design exactly
- [ ] **WTCL-04**: Page uses only Tailwind theme variables
- [ ] **WTCL-05**: Page responsive at ~375px / ~768px / 1440px

## v2.0 Requirements — Backend Integration (ACTIVE)

**Defined:** 2026-05-12
**Umbrella issue:** #127

The v1 placeholders INTG-01..04 are now concretized into the categories below. Each `[CATEGORY]-NN` requirement is atomic and testable. Categories map 1:N to v2 phases (Phase 11 onward) and to sub-issues under umbrella #127.

### Cognito Frontend Integration (Phase 11, issue #128 — in PR)

Supersedes the v1 placeholder **INTG-01**.

- [ ] **AUTH-COGN-01**: `lib/api/auth` uses `amazon-cognito-identity-js`; mock removed
- [ ] **AUTH-COGN-02**: Sign-up creates a Cognito user and the email confirmation code flow works end-to-end
- [ ] **AUTH-COGN-03**: Sign-in returns real Cognito tokens (IdToken + RefreshToken) persisted client-side
- [ ] **AUTH-COGN-04**: `post_confirm` Lambda seeds DynamoDB on confirmation — wiring verified from the frontend sign-up → confirm → DynamoDB check
- [ ] **AUTH-COGN-05**: Logout clears the Cognito session and frontend token storage; protected routes redirect to `/login`
- [ ] **AUTH-COGN-06**: Auth context surfaces user identity from Cognito attributes; no mock fallback remains in the code path

### Secure Lambda Fetch Wrapper (Phase 12)

Supersedes the v1 placeholders **INTG-02 / INTG-03 / INTG-04**.

- [ ] **FETCH-01**: `lib/api/client.ts` typed `fetch` wrapper auto-injects the Cognito IdToken on `Authorization`
- [ ] **FETCH-02**: Error taxonomy: `NetworkError` / `UnauthorizedError` (401) / `ForbiddenError` (403) / `ValidationError` (4xx) / `ServerError` (5xx) — discriminated union
- [ ] **FETCH-03**: Single-retry refresh-then-replay on 401 using the Cognito RefreshToken; second 401 forces logout
- [ ] **FETCH-04**: Per-request timeout (default 10s) via `AbortController`; callers can pass their own signal
- [ ] **FETCH-05**: One typed TS function per Lambda endpoint (`recommend`, `getPreferences`, `putPreferences`, `getHistory`, `getWatchLater`, `addWatchLater`, `removeWatchLater`) sharing a `Result<T, ApiError>` return contract
- [ ] **FETCH-06**: Every `lib/api/*` call routes through the wrapper — no raw `fetch()` outside `client.ts`
- [ ] **FETCH-07**: A reusable hook / utility surfaces error-class-aware UX (toast / inline message) on failure

### Per-Screen Lambda Integration (Phases 13–16)

#### Recommendation (Phase 13)

- [ ] **INTG-RECO-01**: Recommendation screen calls real `/recommend` Lambda; mock removed
- [ ] **INTG-RECO-02**: Recommendation screen renders loading / error / empty states via the fetch wrapper

#### Preferences (Phase 14)

- [ ] **INTG-PREF-01**: Preferences screen reads real `/preferences` Lambda (GET)
- [ ] **INTG-PREF-02**: Preferences screen writes to real `/preferences` Lambda (PUT/POST)
- [ ] **INTG-PREF-03**: Preferences screen renders loading / error / empty states; update strategy (optimistic vs conservative) documented in the plan

#### History (Phase 15)

- [ ] **INTG-HIST-01**: History screen reads real `/history` Lambda
- [ ] **INTG-HIST-02**: History screen renders loading / error / empty states

#### Watch Later (Phase 16)

- [ ] **INTG-WTCL-01**: Watch-later screen reads real `/watch-later` Lambda
- [ ] **INTG-WTCL-02**: Watch-later screen writes (add / remove) to real `/watch-later` Lambda
- [ ] **INTG-WTCL-03**: Watch-later screen renders loading / error / empty states

### Onboarding Guide (Phase 17)

- [ ] **DOCS-01**: `ONBOARDING.md` documents AWS account creation + IAM user/role with required permissions (Cognito, Lambda, API Gateway, DynamoDB, IAM, CloudWatch, S3 if needed)
- [ ] **DOCS-02**: `ONBOARDING.md` documents AWS CLI install + `aws configure` (access key + region)
- [ ] **DOCS-03**: `ONBOARDING.md` documents Pulumi install + `pulumi login` (cloud or local backend) + per-stack config
- [ ] **DOCS-04**: `ONBOARDING.md` documents `pulumi up` to provision the full stack, including expected outputs
- [ ] **DOCS-05**: `ONBOARDING.md` documents `.env` for `frontend/web/` (UserPoolId, ClientId, API Gateway URL) — sourced from `pulumi stack output`
- [ ] **DOCS-06**: `ONBOARDING.md` documents `pnpm install && pnpm dev` and a smoke-test checklist (sign-up → confirm → home → recommend → preferences → history → watch-later)
- [ ] **DOCS-07**: A teammate who didn't write the guide cold-runs it on a fresh AWS account and the app works end-to-end — the run is logged and gaps are fixed

### v2.0 Out of Scope

| Item | Reason |
|---|---|
| Backend bugfixes in `functions/` or `__main__.py` beyond what blocks integration | Existing concerns addressed by separate issues (e.g. #117 closed, #120 closed, #122 closed, #123, #125) |
| LocalStack support | Handled separately by a teammate |
| OAuth / magic link / 2FA / password reset UI | Not in v2 scope — sign-up + confirm + login + logout only |
| CI/CD pipeline | v2.1 |
| Production hardening (rate-limit UI, account lockout UX) | v2.1 |
| Native mobile | Web-first |

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real Cognito wiring | Frontend ships mocked first; backend integration is its own milestone |
| Real Lambda calls | Same — backend has known issues (see `.planning/codebase/CONCERNS.md`); fixing them is not part of this milestone |
| Backend changes (`functions/`, `__main__.py`, Pulumi) | Strictly read-only this milestone |
| Importing JSX from `_design-reference/` | Components must be authored fresh in `frontend/web/` |
| Native mobile app | Web-first |
| OAuth / magic link / 2FA | Not in current GitHub issues |
| In-app notifications, moderation, admin tools | Not in current GitHub issues |

## Traceability

Populated by `gsd-roadmapper` on 2026-05-04. Each requirement maps to exactly one phase.

| Requirement | Phase | GitHub Issue | Status |
|-------------|-------|--------------|--------|
| FOUND-01 | Phase 1 (Foundation) | #90 | Pending |
| FOUND-02 | Phase 1 (Foundation) | #90 | Pending |
| FOUND-03 | Phase 1 (Foundation) | #90 | Pending |
| FOUND-04 | Phase 1 (Foundation) | #90 | Pending |
| FOUND-05 | Phase 1 (Foundation) | #90 | Pending |
| FOUND-06 | Phase 1 (Foundation) | #90 | Pending |
| FOUND-07 | Phase 1 (Foundation) | #90 | Pending |
| DSGN-01 | Phase 2 (Design System) | #91 | Pending |
| DSGN-02 | Phase 2 (Design System) | #91 | Pending |
| DSGN-03 | Phase 2 (Design System) | #91 | Pending |
| DSGN-04 | Phase 2 (Design System) | #91 | Pending |
| DSGN-05 | Phase 2 (Design System) | #91 | Pending |
| DSGN-06 | Phase 2 (Design System) | #91 | Pending |
| LAYT-01 | Phase 3 (Layout) | #92 | Pending |
| LAYT-02 | Phase 3 (Layout) | #92 | Pending |
| LAYT-03 | Phase 3 (Layout) | #92 | Pending |
| LAYT-04 | Phase 3 (Layout) | #92 | Pending |
| LAYT-05 | Phase 3 (Layout) | #92 | Pending |
| AUTH-01 | Phase 4 (Login + Register UI) | #93 | Pending |
| AUTH-02 | Phase 4 (Login + Register UI) | #93 | Pending |
| AUTH-03 | Phase 4 (Login + Register UI) | #93 | Pending |
| AUTH-04 | Phase 4 (Login + Register UI) | #93 | Complete (04-01) |
| AUTH-05 | Phase 4 (Login + Register UI) | #93 | Complete (04-01) |
| AUTH-06 | Phase 4 (Login + Register UI) | #93 | Pending |
| AUTH-07 | Phase 4 (Login + Register UI) | #93 | Pending |
| AUTH-08 | Phase 5 (Auth Context + Protected Routes) | #94 | Pending |
| AUTH-09 | Phase 5 (Auth Context + Protected Routes) | #94 | Pending |
| AUTH-10 | Phase 5 (Auth Context + Protected Routes) | #94 | Pending |
| AUTH-11 | Phase 5 (Auth Context + Protected Routes) | #94 | Pending |
| AUTH-12 | Phase 5 (Auth Context + Protected Routes) | #94 | Pending |
| AUTH-13 | Phase 5 (Auth Context + Protected Routes) | #94 | Pending |
| HOME-01 | Phase 6 (Home / Hero) | #95 | Pending |
| HOME-02 | Phase 6 (Home / Hero) | #95 | Pending |
| HOME-03 | Phase 6 (Home / Hero) | #95 | Pending |
| HOME-04 | Phase 6 (Home / Hero) | #95 | Pending |
| HOME-05 | Phase 6 (Home / Hero) | #95 | Pending |
| RECO-01 | Phase 7 (Recommendation Result) | #96 | Pending |
| RECO-02 | Phase 7 (Recommendation Result) | #96 | Pending |
| RECO-03 | Phase 7 (Recommendation Result) | #96 | Pending |
| RECO-04 | Phase 7 (Recommendation Result) | #96 | Pending |
| PREF-01 | Phase 8 (Preferences) | #97 | Pending |
| PREF-02 | Phase 8 (Preferences) | #97 | Pending |
| PREF-03 | Phase 8 (Preferences) | #97 | Pending |
| PREF-04 | Phase 8 (Preferences) | #97 | Pending |
| PREF-05 | Phase 8 (Preferences) | #97 | Pending |
| HIST-01 | Phase 9 (History) | #98 | Pending |
| HIST-02 | Phase 9 (History) | #98 | Pending |
| HIST-03 | Phase 9 (History) | #98 | Pending |
| HIST-04 | Phase 9 (History) | #98 | Pending |
| HIST-05 | Phase 9 (History) | #98 | Pending |
| WTCL-01 | Phase 10 (Watch Later) | #99 | Pending |
| WTCL-02 | Phase 10 (Watch Later) | #99 | Pending |
| WTCL-03 | Phase 10 (Watch Later) | #99 | Pending |
| WTCL-04 | Phase 10 (Watch Later) | #99 | Pending |
| WTCL-05 | Phase 10 (Watch Later) | #99 | Pending |
| AUTH-COGN-01 | Phase 11 (Cognito Frontend Integration) | #128 | Pending |
| AUTH-COGN-02 | Phase 11 (Cognito Frontend Integration) | #128 | Pending |
| AUTH-COGN-03 | Phase 11 (Cognito Frontend Integration) | #128 | Pending |
| AUTH-COGN-04 | Phase 11 (Cognito Frontend Integration) | #128 | Pending |
| AUTH-COGN-05 | Phase 11 (Cognito Frontend Integration) | #128 | Pending |
| AUTH-COGN-06 | Phase 11 (Cognito Frontend Integration) | #128 | Pending |
| FETCH-01 | Phase 12 (Secure Lambda Fetch Wrapper) | TBD (sub-issue of #127) | Pending |
| FETCH-02 | Phase 12 (Secure Lambda Fetch Wrapper) | TBD (sub-issue of #127) | Pending |
| FETCH-03 | Phase 12 (Secure Lambda Fetch Wrapper) | TBD (sub-issue of #127) | Pending |
| FETCH-04 | Phase 12 (Secure Lambda Fetch Wrapper) | TBD (sub-issue of #127) | Pending |
| FETCH-05 | Phase 12 (Secure Lambda Fetch Wrapper) | TBD (sub-issue of #127) | Pending |
| FETCH-06 | Phase 12 (Secure Lambda Fetch Wrapper) | TBD (sub-issue of #127) | Pending |
| FETCH-07 | Phase 12 (Secure Lambda Fetch Wrapper) | TBD (sub-issue of #127) | Pending |
| INTG-RECO-01 | Phase 13 (Recommendation Lambda Integration) | TBD (sub-issue of #127) | Pending |
| INTG-RECO-02 | Phase 13 (Recommendation Lambda Integration) | TBD (sub-issue of #127) | Pending |
| INTG-PREF-01 | Phase 14 (Preferences Lambda Integration) | TBD (sub-issue of #127) | Pending |
| INTG-PREF-02 | Phase 14 (Preferences Lambda Integration) | TBD (sub-issue of #127) | Pending |
| INTG-PREF-03 | Phase 14 (Preferences Lambda Integration) | TBD (sub-issue of #127) | Pending |
| INTG-HIST-01 | Phase 15 (History Lambda Integration) | TBD (sub-issue of #127) | Pending |
| INTG-HIST-02 | Phase 15 (History Lambda Integration) | TBD (sub-issue of #127) | Pending |
| INTG-WTCL-01 | Phase 16 (Watch-Later Lambda Integration) | TBD (sub-issue of #127) | Pending |
| INTG-WTCL-02 | Phase 16 (Watch-Later Lambda Integration) | TBD (sub-issue of #127) | Pending |
| INTG-WTCL-03 | Phase 16 (Watch-Later Lambda Integration) | TBD (sub-issue of #127) | Pending |
| DOCS-01 | Phase 17 (Onboarding Guide + E2E Cold-Run) | TBD (sub-issue of #127) | Pending |
| DOCS-02 | Phase 17 (Onboarding Guide + E2E Cold-Run) | TBD (sub-issue of #127) | Pending |
| DOCS-03 | Phase 17 (Onboarding Guide + E2E Cold-Run) | TBD (sub-issue of #127) | Pending |
| DOCS-04 | Phase 17 (Onboarding Guide + E2E Cold-Run) | TBD (sub-issue of #127) | Pending |
| DOCS-05 | Phase 17 (Onboarding Guide + E2E Cold-Run) | TBD (sub-issue of #127) | Pending |
| DOCS-06 | Phase 17 (Onboarding Guide + E2E Cold-Run) | TBD (sub-issue of #127) | Pending |
| DOCS-07 | Phase 17 (Onboarding Guide + E2E Cold-Run) | TBD (sub-issue of #127) | Pending |

**Coverage:**
- v1 requirements: 56 total
- v1 mapped to phases: 56 (confirmed by gsd-roadmapper, 2026-05-04)
- v2.0 requirements: 30 total (AUTH-COGN-01..06, FETCH-01..07, INTG-RECO-01..02, INTG-PREF-01..03, INTG-HIST-01..02, INTG-WTCL-01..03, DOCS-01..07)
- v2.0 mapped to phases: 30 (confirmed by gsd-roadmapper, 2026-05-12)
- Total mapped: 86 / 86
- Unmapped: 0
- Duplicates across phases: 0

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-12 — v2.0 traceability rows appended (AUTH-COGN-01..06 → P11; FETCH-01..07 → P12; INTG-RECO-01..02 → P13; INTG-PREF-01..03 → P14; INTG-HIST-01..02 → P15; INTG-WTCL-01..03 → P16; DOCS-01..07 → P17) and confirmed by gsd-roadmapper*
