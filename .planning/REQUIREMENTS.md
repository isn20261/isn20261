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
- [ ] **AUTH-04**: `lib/api/auth` mocks Cognito `signUp` + `signIn` shapes (returns fake tokens, simulates failure cases)
- [ ] **AUTH-05**: Successful login/register stores a mock session token in `localStorage`
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

## v2 Requirements

Deferred — covered by future GitHub issues outside this milestone.

### Backend Integration

- **INTG-01**: Replace mock `lib/api/auth` with real Cognito SDK
- **INTG-02**: Replace mock data sources with real Lambda / API Gateway calls
- **INTG-03**: Real session refresh / token rotation
- **INTG-04**: Error UX for real network/auth failures

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
| AUTH-04 | Phase 4 (Login + Register UI) | #93 | Pending |
| AUTH-05 | Phase 4 (Login + Register UI) | #93 | Pending |
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

**Coverage:**
- v1 requirements: 56 total
- Mapped to phases: 56 (confirmed by gsd-roadmapper, 2026-05-04)
- Unmapped: 0
- Duplicates across phases: 0

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-04 — Traceability table populated and confirmed by gsd-roadmapper*
