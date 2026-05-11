# Phase 4: Login + Register UI — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `04-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 04-auth-ui
**Areas discussed:** Forgot password scope, Mock auth seam (lib/api/auth), Logout placement in app shell, Form architecture & redirect

---

## Forgot password scope

| Option | Description | Selected |
|--------|-------------|----------|
| Stub: link visible, opens "Coming soon" page | Render the "Forgot password?" link in /login as designed; clicking opens a small placeholder page noting the flow lands later | ✓ |
| Ship the 3-step recovery flow | Build /forgot, /forgot/sent, /forgot/reset with mock email send + strength meter, matching the reference exactly | |
| Hide the link entirely this phase | Remove the link until a later phase; smallest scope but visible drift from reference | |
| Link to Preferences (Phase 8 placeholder) | Forgot? → /preferences (404s until Phase 8); confusing UX | |

**User's choice:** Stub
**Notes:** Stub renders inside the existing AuthShell at `app/(auth)/forgot/page.tsx` (the route-group layout wraps it for free).

---

## Mock auth seam (lib/api/auth)

### Question 1: How should the mock authenticate users for the demo?

| Option | Description | Selected |
|--------|-------------|----------|
| Persist registered users in localStorage | signUp writes to a localStorage map; signIn matches against it; register-then-sign-in works end-to-end | ✓ |
| Hardcoded seed user only | Single fixed credential pair; signUp pretends to succeed without persisting | |
| Always succeed for any valid-looking input | No persistence; errors only fire from magic-string emails | |

**User's choice:** Persisted users in localStorage

### Question 2: Should the mock simulate network latency?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — ~400-700ms with a configurable constant | Randomized delay so loading state is testable; constant at module top for test override | ✓ |
| No — instant resolution | Synchronous resolution; loading state never shows | |

**User's choice:** Yes, randomized 400-700ms

### Question 3: What shape goes into localStorage on success?

| Option | Description | Selected |
|--------|-------------|----------|
| Full Cognito-shaped session object | { AccessToken, IdToken, RefreshToken, ExpiresAt, user } as JSON under one key | ✓ |
| AccessToken string only | Just the token string under one key | |
| Two keys: token + user (split) | Separate localStorage entries for token and user | |

**User's choice:** Full Cognito-shaped session object under `recommend-a.session`

---

## Logout placement in app shell

### Question 1: Where does the logout control live?

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar opens a small popover with "Sign out" | shadcn Popover anchored to Sidebar avatar (and Navbar greeting); items: Account + Sign out | ✓ |
| Dedicated logout icon at bottom of desktop rail | LogOut lucide icon below/replacing avatar; eats rail real estate | |
| Logout link in Navbar's logged-in cluster only | Visible only on screens that opt into the Navbar header — detail screens have no Navbar | |
| Defer to Phase 5 + temp control on /preferences | Lowest risk of revisiting Phase 3; highest risk of dead code | |

**User's choice:** Avatar popover

### Question 2: Avatar popover scope across breakpoints?

| Option | Description | Selected |
|--------|-------------|----------|
| Desktop Sidebar + desktop Navbar; mobile keeps /preferences nav | Popover on desktop only; mobile User-tab still navigates as before; Phase 8 Preferences hosts the mobile Sign-out | ✓ |
| All three surfaces (Sidebar + Navbar + mobile tab) | Tapping User on mobile tab also opens popover; surprises users | |
| Sidebar only — Navbar greeting stays plain text | Greeting decorative; mobile unreachable until /preferences | |

**User's choice:** Desktop Sidebar + desktop Navbar (mobile unchanged)

### Question 3: Popover implementation?

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn Popover primitive | Built on Radix; pnpm dlx shadcn add popover scaffolds into components/ui/popover.tsx; accessible by default | ✓ |
| @base-ui/react Popover | Already in package.json from Phase 1; thinner dep graph but different API | |
| Hand-rolled with useRef + outside-click | Smallest dep but reinvents focus / a11y | |

**User's choice:** shadcn Popover

---

## Form architecture, validation strength & redirect

### Question 1: Form input architecture?

| Option | Description | Selected |
|--------|-------------|----------|
| One reusable <Field> Client Component in components/ | Floating label + show/hide built-in; reused 5+ times across login/register/forgot stub | ✓ |
| shadcn Input + Label primitives (no custom Field) | Less new code but no built-in floating label or show/hide | |
| Inline JSX per page (no abstraction) | Fastest first-pass; ugly by third use | |

**User's choice:** Reusable `<Field>` component at `components/Field.tsx`

### Question 2: Validation strength?

| Option | Description | Selected |
|--------|-------------|----------|
| Match the design verbatim | Login: @ + password ≥ 6; Register: @ + password ≥ 8 + confirm + Terms | ✓ |
| Stricter regex on email + password complexity | RFC-5322-ish email; uppercase + digit required | |
| Library-driven (Zod schemas) | Schema-first; heavier than two short forms need | |

**User's choice:** Match design verbatim

### Question 3: API-level error display?

| Option | Description | Selected |
|--------|-------------|----------|
| Form-level banner above the submit button | Field errors stay inline; API errors render in a small danger banner above the button | ✓ |
| Map API error to a field error | NotAuthorizedException → password field error; conflates server vs client validation | |
| Toast notification | Requires a toast surface (none in Phase 3); out of scope | |

**User's choice:** Form-level banner

### Question 4: Where does a successful login/register redirect?

| Option | Description | Selected |
|--------|-------------|----------|
| `/` (home) — Phase 5 will add ?from= return-to | Hardcode `/` for now; Phase 5 introduces ?from= | ✓ |
| `/recommendation` — the post-login flow | Skips home hero; Phase 7 must be ready to render in logged-in state | |
| Stay on the same screen and surface a "Welcome" banner | Awkward UX; user stuck on form | |

**User's choice:** `/` (home)

---

## Claude's Discretion

The planner / executor have flexibility on:
- Whether each page-level Client Component inlines its form JSX or extracts a `<LoginForm>` / `<RegisterForm>` Client Component.
- Whether popover items render as `<Link>` (Account) + `<button>` (Sign out), or some other valid Next.js 16 idiom.
- Specific copy on the `/forgot` placeholder page beyond "feature is coming" + back-to-sign-in.
- Exact randomized-latency implementation.
- Test/lint structure for `lib/api/auth.ts` (in-browser register→login flow is the acceptance test).

## Deferred Ideas

- Forgot-password 3-step flow (auth.jsx:162-261)
- Real Cognito SDK + API Gateway (INTG-01..04, v2)
- Refresh-token rotation (INTG-03)
- `?from=<protected-path>` return-to redirect (Phase 5 AUTH-09)
- Auth context + `useAuth()` + `RequireAuth` (Phase 5 AUTH-08..10, AUTH-12)
- Mocked-token-expiry redirect (Phase 5 AUTH-11)
- Logout-clears-context immediate revoke (Phase 5 AUTH-13)
- Mobile-tab-bar logout surface (absorbed by Phase 8 Preferences)
- Toast / snackbar notification system (out of milestone)
- Light theme (out of milestone)
- Real password complexity rules (server-side in v2)
