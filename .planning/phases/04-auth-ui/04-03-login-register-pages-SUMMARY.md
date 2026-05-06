---
phase: 04
plan: 03
subsystem: auth
tags: [auth, login, register, forms, validation, two-tier-errors, dsgn-06]
requirements: [AUTH-01, AUTH-02, AUTH-03, AUTH-05, AUTH-07]
dependency-graph:
  requires:
    - frontend/web/app/(auth)/layout.tsx (Phase 3 — AuthShell card chrome)
    - frontend/web/components/Field.tsx (Plan 04-02 — floating-label form input)
    - frontend/web/lib/api/auth.ts (Plan 04-01 — signIn / signUp / UsernameExistsException / NotAuthorizedException / Session)
    - frontend/web/styles/globals.css (Phase 2 — bg-accent, text-on-accent, text-danger, bg-danger/10, etc.)
    - lucide-react (ArrowRight, AlertCircle — already a dep from Phase 3)
    - next/navigation (useRouter)
    - next/link
  provides:
    - frontend/web/app/(auth)/login/page.tsx (default export LoginPage — AUTH-01, AUTH-03, AUTH-05)
    - frontend/web/app/(auth)/register/page.tsx (default export RegisterPage — AUTH-02, AUTH-03, AUTH-05)
  affects:
    - downstream Plan 04 (AccountMenu — pages will receive loggedIn=true after a successful signIn/signUp once Phase 5 useAuth lands)
    - downstream Plan 05 (forgot stub — Forgot password? link in /login navigates here)
    - downstream Phase 5 (auth context — wraps these submit handlers behind useAuth().signIn/signUp; the handler shape is already context-friendly)
tech-stack:
  added: []  # No new deps — useState / useRouter / Link / lucide-react / Field / signIn / signUp were all already available
  patterns:
    - "Default-export Next.js page (app/* contract) inside (auth) route group"
    - "Client form: useState for inputs + errors + formError + isSubmitting"
    - "Hand-written validators returning a Record<string, string> errors object (no validation library — D-09)"
    - "<form noValidate> to disable HTML5 popup validation; we run our own validators"
    - "In-flight guard `if (isSubmitting) return;` at top of submit handler"
    - "Two-tier error display (D-10): field-level via <Field error=...>, form-level via banner above submit"
    - "Catch block collapses ALL errors into safe hardcoded copy — never leaks Cognito-internal messages (T-04-13)"
    - "router.push('/') on success — D-11 (Phase 5 will extend with ?from= search param)"
    - "Submit-button loading state: animate-spin 16px circle replaces ArrowRight icon"
    - "Terms checkbox wrapped in <label> with accent-accent so the native checkmark uses the project amber"
key-files:
  created:
    - frontend/web/app/(auth)/login/page.tsx
    - frontend/web/app/(auth)/register/page.tsx
  modified: []
decisions:
  - "Both pages inline the form inside the page component (no <LoginForm>/<RegisterForm> extraction) — CONTEXT §Claude's Discretion recommendation taken; the forms are bespoke per page and extracting buys nothing"
  - "Catch block in both pages collapses unknown errors into the safe hardcoded copy ('Incorrect email or password.' for login; 'An account with this email already exists.' for register) — defense against future error variants leaking Cognito internals (T-04-13)"
  - "Terms 'Required' error renders OUTSIDE <Field> (the checkbox is not a Field) — uses the same text-12 text-danger leading-tight styling as Field's error slot for visual consistency"
  - "Submit button retains the same 'Sign in' / 'Create account' label text in the loading state; only the trailing ArrowRight icon swaps for an animate-spin circle (UI-SPEC §Empty/loading/disabled)"
  - "Bottom-card link substring uses text-accent + font-semibold (Phase 4 supplement entry #8 to the accent reserved-for list)"
metrics:
  duration: ~2 min
  completed: 2026-05-06
---

# Phase 04 Plan 03: Login + Register Pages Summary

**One-liner:** Two design-faithful auth pages — `/login` (149 LOC) and `/register` (175 LOC) — Client Components inside the existing `(auth)` route group. Each consumes Plan 02 `<Field>` for inputs and Plan 01 `signIn` / `signUp` for the mock seam, validates client-side per D-09 with verbatim copy, surfaces a two-tier error display (inline Field error + form-level banner above submit), and `router.push('/')` on success — delivering the issue #93 acceptance criterion of register-then-sign-in working end-to-end.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Author /login page with email/password Field inputs, validation D-09, two-tier errors D-10, and signIn submit (AUTH-01, AUTH-03, AUTH-05) | `43b47bc` | `frontend/web/app/(auth)/login/page.tsx` |
| 2 | Author /register page with email + password (>=8) + confirm + Terms checkbox, validation D-09, two-tier errors D-10, and signUp submit (AUTH-02, AUTH-03, AUTH-05) | `ea64d06` | `frontend/web/app/(auth)/register/page.tsx` |

## Public Surface

```ts
// app/(auth)/login/page.tsx
export default function LoginPage(): JSX.Element;

// app/(auth)/register/page.tsx
export default function RegisterPage(): JSX.Element;
```

Both pages are default-exported Client Components rendering form content inside the AuthShell card. The AuthShell layout (Phase 3) wraps every `(auth)/*` page with the centered card + BrandMark + footer disclaimer — the pages themselves contain only form chrome.

### Login form contract

- Title: `Welcome back.` (with trailing period)
- Subtitle: `Pick up your queue and history.`
- Inputs: email (`type="email"`, `autoComplete="email"`), password (`type="password"`, `autoComplete="current-password"`) — both via `<Field>`
- Validators: email contains `@` (`Enter a valid email`); password >= 6 chars (`Min 6 characters`)
- `Forgot password?` link to `/forgot`
- Submit: `Sign in` + `ArrowRight` icon; spinner replaces icon while in flight
- Form-level banner on `NotAuthorizedException` (or any error): `Incorrect email or password.`
- Bottom-card cluster: `New here? Create an account` → `/register`
- Success: `router.push('/')` (D-11)

### Register form contract

- Title: `Make it yours.` (with trailing period)
- Subtitle: `Save recommendations, build a queue, learn what you love.`
- Inputs: email, password (with `hint="At least 8 characters"`, `autoComplete="new-password"`), confirm-password — all via `<Field>`
- Terms checkbox (raw `<input type="checkbox">` allowed per UI-SPEC hook #5; wrapped in `<label>` with `accent-accent`)
- Validators: email contains `@`; password >= 8 chars (`Use at least 8 characters`); password === confirm (`Passwords don't match` — STRAIGHT ASCII apostrophe); Terms checked (`Required`)
- Submit: `Create account` + `ArrowRight` icon; spinner pattern same as login
- Form-level banner on `UsernameExistsException` (or any error): `An account with this email already exists.`
- Bottom-card cluster: `Already have one? Sign in` → `/login`
- Success: `router.push('/')` (D-11)

## Verification

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `cd frontend/web && pnpm tsc --noEmit` | exit 0 (clean) |
| Lint | `cd frontend/web && pnpm lint` | exit 0 (clean) |
| Production build | `cd frontend/web && pnpm build` | exit 0 — `/login` and `/register` both prerender as static (○) alongside `/`, `/tokens`, `/_not-found` |

### Plan §verify grep checks (Task 1 — login)

| Check | Result |
|-------|--------|
| Byte 0 starts with `"use client";` | ✓ |
| `export default function LoginPage` | 1 hit ✓ |
| `Welcome back.` (with trailing period — UI-SPEC hook #6) | 1 hit ✓ |
| `Pick up your queue and history.` (UI-SPEC hook #6) | 1 hit ✓ |
| `Enter a valid email` (UI-SPEC hook #7) | 1 hit ✓ |
| `Min 6 characters` (UI-SPEC hook #7) | 1 hit ✓ |
| `Incorrect email or password.` (UI-SPEC hook #8) | 2 hits (catch branch + fallback) ✓ |
| `Forgot password?` | 1 hit ✓ |
| `New here?` | 1 hit ✓ |
| `Create an account` | 1 hit ✓ |
| `href="/register"` | 1 hit ✓ |
| `href="/forgot"` | 1 hit ✓ |
| `router.push("/")` (UI-SPEC hook #15) | 1 hit ✓ |
| `signIn(` | 1 hit ✓ |
| `NotAuthorizedException` | 2 hits (import + instanceof) ✓ |
| `<Field` | 2 hits (email + password) ✓ |
| `noValidate` | 1 hit ✓ |
| `role="alert"` | 1 hit ✓ |
| `ArrowRight` | 2 hits (import + render) ✓ |
| `<input\s` (UI-SPEC hook #5) | **0 hits** ✓ |
| `className=.*#[0-9a-fA-F]{3,6}` (DSGN-06) | **0 hits** ✓ |
| `style=\{` (UI-SPEC hook #2) | **0 hits** ✓ |
| `from "../...` (relative import) | **0 hits** ✓ |
| `from ".*_design-reference"` | **0 hits** ✓ |

### Plan §verify grep checks (Task 2 — register)

| Check | Result |
|-------|--------|
| Byte 0 starts with `"use client";` | ✓ |
| `export default function RegisterPage` | 1 hit ✓ |
| `Make it yours.` (UI-SPEC hook #6) | 1 hit ✓ |
| `Save recommendations, build a queue, learn what you love.` (UI-SPEC hook #6) | 1 hit ✓ |
| `I agree to the Terms and Privacy Policy.` (UI-SPEC hook #6) | 1 hit ✓ |
| `Use at least 8 characters` (UI-SPEC hook #7) | 1 hit ✓ |
| `At least 8 characters` (Field hint) | 1 hit ✓ |
| `Passwords don't match` (straight ASCII apostrophe — UI-SPEC hook #10) | 3 hits (validator + JSX + maybe doc-comment) ✓ |
| `Passwords don’t match` (curly U+2019 apostrophe — UI-SPEC hook #10) | **0 hits** ✓ |
| `Required` | 1 hit ✓ |
| `Create account` | 2 hits (idle + loading branch) ✓ |
| `Already have one?` | 1 hit ✓ |
| `An account with this email already exists.` (UI-SPEC hook #8) | 2 hits (catch branch + fallback) ✓ |
| `href="/login"` | 1 hit ✓ |
| `signUp(` | 1 hit ✓ |
| `UsernameExistsException` | 2 hits (import + instanceof) ✓ |
| `<Field` | 3 hits (email + pw1 + pw2) ✓ |
| `type="checkbox"` (Terms — explicitly allowed by UI-SPEC hook #5) | 1 hit ✓ |
| `accent-accent` | 1 hit ✓ |
| `noValidate` | 1 hit ✓ |
| `role="alert"` | 1 hit ✓ |
| `router.push("/")` (UI-SPEC hook #15) | 1 hit ✓ |
| `<input\s+type="(email|password)"` | **0 hits** ✓ |
| `className=.*#[0-9a-fA-F]{3,6}` (DSGN-06) | **0 hits** ✓ |
| `style=\{` (UI-SPEC hook #2) | **0 hits** ✓ |
| `from "../...` | **0 hits** ✓ |
| `from ".*_design-reference"` | **0 hits** ✓ |

## DSGN-06 escape hatches used

| Arbitrary value | File | Reference | Justification |
|-----------------|------|-----------|---------------|
| `text-[26px]` | login + register `<h1>` | reference auth.jsx:87 / 134 + .display class styles.css:82 | Display title size; between Phase 2 tokens text-20 / text-28 |
| `tracking-[-0.02em]` | login + register `<h1>` | .display class styles.css:84 | Title letter-spacing; not a token |
| `leading-[1.02]` | login + register `<h1>` | .display class styles.css:85 | Title line-height; not a token |
| `text-[13px]` | login + register subtitle and bottom-card link | reference auth.jsx:88 / 135 | Secondary copy size; between text-12 / text-14 |
| `tracking-[-0.005em]` | login + register submit button | .btn class styles.css:116 | Button label letter-spacing; not a token |

All five values appear inline with `// non-tokenized: ...` comments. Confined to the two page files plus `components/Field.tsx` (which carries its own hatches per Plan 02). No new escape hatches outside what UI-SPEC §Token Coverage Audit already authorized.

## Plan 01 + Plan 02 consumption confirmation

- **Plan 01 (lib/api/auth.ts):** both pages import `signIn` / `signUp` and the matching exception classes via `@/lib/api/auth`. Neither page reaches into `localStorage` directly — UI-SPEC verification hook #4 (session-key strings only in `lib/api/auth.ts`) is preserved. The catch blocks branch on `err instanceof NotAuthorizedException` / `err instanceof UsernameExistsException` (the load-bearing identifier from Plan 01's Cognito-shaped subclasses).
- **Plan 02 (components/Field.tsx):** every email / password / confirm-password input goes through `<Field>` — UI-SPEC verification hook #5 (no raw `<input type="email|password">` in pages) is satisfied. The Plan 02 "Forward Notes" guidance is honored: pages do NOT render their own field-level error `<p>` outside `<Field>` (errors are passed via the `error` prop), the Field's built-in show/hide toggle is used (no custom toggle in the page), and the form-level banner is owned exclusively by the page (above the submit button), not by `<Field>`.

## Threat model mitigations applied

| Threat ID | Mitigation as implemented |
|-----------|---------------------------|
| T-04-12 (Tampering / XSS via banner) | `formError` rendered as JSX text-node `<span>{formError}</span>` (React auto-escapes); Phase 4 hardcodes both possible messages; no user-controlled string ever reaches the banner. |
| T-04-13 (Information disclosure / Cognito message leak) | Catch block in BOTH pages collapses ALL errors (including unknown ones) into the safe hardcoded copy — `if (err instanceof X) {...} else {...}` both branches set the same safe string. Cognito-internal messages cannot leak. |
| T-04-14 (Open redirect via router.push) | Hardcoded `router.push('/')` — no `?from=` handling; no dynamic redirect sink. Phase 5 owns the future `?from=` extension. |
| T-04-15 (Re-submit while in flight) | Guard `if (isSubmitting) return;` at top of `handleSubmit` in both pages. Submit button also has `disabled={isSubmitting}` HTML attribute. |
| T-04-16 (Browser autofill leak) | `autoComplete="email"` / `"current-password"` (login) / `"new-password"` (register) — standard hints intentionally specified. |
| T-04-17 (Email reflected as users-map key) | Mock-only; the Plan 01 `Object.prototype.hasOwnProperty.call` guard already defeats prototype-pollution at the seam. Pages do not touch the users-map directly. |
| T-04-18 (HTML5 validation popup conflict) | `<form noValidate>` on both forms. |

## Deviations from Plan

None — both task action bodies executed exactly as written. The plan was authored by Phase-2-aware planners with byte-precise copy and code excerpts; no Rule 1/2/3 deviations were needed during implementation. Typecheck, lint, and production build all passed on first attempt.

## Auth Gates

None — no external auth required during execution.

## Known Stubs

None — both pages are fully wired:
- `<Field>` consumers receive validation state correctly.
- `signIn` / `signUp` are real (mock) function calls — not placeholders.
- The `Forgot password?` link points to `/forgot`, which Plan 04-04 (forgot-stub-page) will populate. Until Plan 04-04 lands, clicking the link will 404 — this is by design (Plan 03 ships the link, Plan 04 ships the destination); not a stub on Plan 03's surface.
- The post-auth redirect target `/` is the existing Phase 1 placeholder home page, not a stub Plan 03 owns.

## Self-Check

- File `frontend/web/app/(auth)/login/page.tsx` (149 lines) — FOUND
- File `frontend/web/app/(auth)/register/page.tsx` (175 lines) — FOUND
- Commit `43b47bc` (Task 1) — FOUND on `feature/issue-93-auth-ui`
- Commit `ea64d06` (Task 2) — FOUND on `feature/issue-93-auth-ui`
- Build: `pnpm tsc --noEmit && pnpm lint && pnpm build` all exited 0; `/login` and `/register` prerender as static routes.

## Self-Check: PASSED

## Forward Notes for Plan 04 (AccountMenu)

- The `loggedIn` prop on `<Sidebar>` / `<Navbar>` is currently passed by the page-shell wrapper (Phase 3 default `false`); Phase 4 Plan 04 will wrap the avatar / greeting in `<AccountMenu>` when `loggedIn === true`. Plan 03 does NOT change the prop wiring — it only adds the routes that produce a session in `recommend-a.session`.
- `signOut()` from `@/lib/api/auth` is the cleanup hook the AccountMenu Sign-out item will call; Plan 03 does not invoke it.
- After a successful `signIn` / `signUp`, the home page (`/`) currently renders the Phase 1 placeholder. Plan 04 (AccountMenu) and Phase 5 (auth context) together will start exposing the logged-in chrome — Plan 03's pages already write the correct session shape so Phase 5's `getSession()` rehydration just works.

## Forward Notes for Plan 05 (forgot stub)

- The `Forgot password?` link in `/login` already points to `/forgot`; Plan 05 must place its page at `frontend/web/app/(auth)/forgot/page.tsx` so the link resolves. The page is Server (no `"use client"`), static placeholder per CONTEXT D-01.
