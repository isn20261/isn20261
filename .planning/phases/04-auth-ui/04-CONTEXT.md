# Phase 4: Login + Register UI — Context

**Gathered:** 2026-05-06
**Status:** Ready for planning
**Source:** Issue #93 acceptance criteria (user-supplied) + ROADMAP §"Phase 4" + REQUIREMENTS AUTH-01..07

<domain>
## Phase Boundary

Build the two design-faithful auth pages — `/login` and `/register` — under the existing `app/(auth)/` route group (Phase 3 D-06 shipped the AuthShell wrapper); ship the typed mocked Cognito-shaped seam at `frontend/web/lib/api/auth.ts`; write a `localStorage`-backed session on success; wire a logout control into the desktop app shell that clears the session. Plus a stub `/forgot` route so the design's "Forgot password?" link doesn't dangle.

**User-stated intent (issue #93 verbatim, Portuguese):**
> Objetivo: Implementar tela de login e register integrada ao Cognito.
> Checklist: Formulário login, Formulário register, Validação, Integração Cognito, Armazenamento do token, Logout, Responsividade em dispositivos de celular, tablet e computador (~375px → ~768px → 1440px), Utilizar apenas variáveis criadas no tailwind para seguir o padrão do design.
> Critério de aceite: Seguir fielmente o design criado e possibilitar a criação de um usuário e login usando a UI.

**Scope reality:** "Integração Cognito" means the **mock seam mirrors Cognito's response shape** (`AdminInitiateAuth` / `AdminCreateUser`). Real Cognito SDK wiring is INTG-01..04 (deferred to v2 per CLAUDE.md hard rule #3 and PROJECT.md Out of Scope). Issue #88 explicitly defers backend integration; Phase 4 ships the seam that the v2 swap replaces with one provider change.

**Not in this phase (Phase 5 owns):** Global auth context (`useAuth()` hook), `RequireAuth` wrapper, session rehydration on mount, mocked-token-expiry → redirect-to-login, `?from=` return-to query param, auth-flicker prevention. Phase 4 reads/writes localStorage directly inside the form-submit handlers; Phase 5 wraps that behind the context.

**Not in this phase (deferred):** Real Cognito SDK / Lambda integration (v2 INTG-01..04), refresh-token rotation, real email delivery for password reset, toast/snackbar notification surface, light theme, motion/animation tokens, the full 3-step Forgot password flow (the visible "Forgot password?" link points to a Coming-soon stub — see D-01), a mobile-tab-bar logout surface (Phase 8 Preferences screen will absorb that need).

</domain>

<decisions>
## Implementation Decisions

### Forgot Password Scope

- **D-01: Forgot-password is a stub.** Login screen retains the visible `Forgot password?` link (matches reference exactly). Clicking it navigates to `/forgot` — a new minimal Server Component page at `app/(auth)/forgot/page.tsx` that renders inside the existing AuthShell card and shows "Password reset is coming in a future update." plus a `← Back to sign in` link. The 3-step recovery flow from `_design-reference/auth.jsx:162-261` (email → check-email → strength-meter new-password) is **deferred** — Phase 4 keeps issue #93's scope tight to AUTH-01..07.

### Mock Auth Seam (`lib/api/auth.ts`)

- **D-02: Persisted users in localStorage.** `signUp({ email, password })` writes the new credentials into a `recommend-a.users` localStorage key (a JSON object map keyed by email, with `{ password, sub }` as the value — a generated UUID for `sub`). Plain-text storage is acceptable because it is a mock seam, not a security boundary; the real Cognito SDK in v2 holds passwords server-side.
  - Re-registering an existing email → throws `UsernameExistsException` (Cognito-shaped error: `name: 'UsernameExistsException', message: 'An account with the given email already exists.'`).
  - `signIn({ email, password })` looks up the email in the users map. Unknown email OR wrong password → throws `NotAuthorizedException` (`message: 'Incorrect email or password.'`). The two failure paths intentionally surface the **same** UI error so the demo doesn't accidentally enumerate users.
  - This satisfies issue #93's acceptance criterion verbatim — *"possibilitar a criação de um usuário e login usando a UI"*: register-then-sign-in works end-to-end.

- **D-03: Mock latency simulated, not instant.** Both `signIn` and `signUp` resolve after a randomized delay between 400–700 ms. The bounds live as a single `MOCK_LATENCY_MS = [400, 700]` module constant at the top of `lib/api/auth.ts` so tests can override (or set to `[0, 0]`). Makes the form's loading state — disabled submit button, spinner — testable in dev. Mirrors how the real Cognito-via-API-Gateway round-trip will feel in v2.

- **D-04: Single localStorage key holds the full Cognito-shaped session.** Key: `recommend-a.session`. Value (JSON):
  ```ts
  type Session = {
    AccessToken: string;        // mock UUID
    IdToken: string;            // mock UUID
    RefreshToken: string;       // mock UUID
    ExpiresAt: number;          // ms epoch, +1h from issue
    user: { email: string; sub: string };
  };
  ```
  Phase 5 auth context reads this shape directly (no re-shape needed). INTG-03 (real refresh-token flow) swaps the `signIn` / `signUp` writers; the consumer contract is forward-compatible.

### Logout Placement

- **D-05: Logout via shadcn Popover anchored to the desktop Sidebar avatar AND the desktop Navbar greeting cluster.** When `loggedIn`, clicking either surface opens a popover with two items:
  - **Account** → `<Link>` to `/preferences` (Phase 8 fills the page; Phase 4 just navigates).
  - **Sign out** → calls `lib/api/auth.signOut()`, which removes `recommend-a.session` from localStorage, then `router.push('/login')`.

  Popover styling consumes only Phase 2 tokens — `bg-surface-elevated`, `border-border`, `rounded-md`, `shadow-lg`, `text-text-primary`/`text-text-muted`, `text-danger` for the Sign-out item.

- **D-06: Mobile Me-tab keeps current behavior.** The Sidebar's mobile bottom-tab User slot still navigates to `/preferences` (no popover on a 64 px tab bar — would feel cramped and surprise users). Phase 8 (Preferences screen) will include its own visible Sign-out button as part of the screen content; that absorbs the mobile logout need without adding a sixth tab item.

- **D-07: First shadcn primitive lands at `components/ui/popover.tsx`** via `pnpm dlx shadcn add popover`. Built on Radix UI under the hood; bundle cost accepted. Pattern: one shadcn primitive per phase as the need surfaces — Phase 4 takes Popover; future phases may take Dialog (Phase 7), Toast (Phase 8+), etc.

### Form Architecture

- **D-08: One reusable `<Field>` Client Component at `components/Field.tsx`.** Re-authored fresh from `_design-reference/auth.jsx:38-69` (NOT imported). Props:
  ```ts
  type FieldProps = {
    label: string;
    type?: 'text' | 'email' | 'password';
    value: string;
    onChange: (value: string) => void;
    error?: string;
    hint?: string;
    name?: string;          // for autofill / form parsing
    autoComplete?: string;  // 'email' | 'current-password' | 'new-password'
  };
  ```
  - `"use client"` (uses `useState` for show/hide on `type="password"`).
  - Floating-label visual matches the reference: `placeholder=" "` on `<input>`, `<label>` positioned absolutely, lifts when input has value or focus.
  - Built-in show/hide eye toggle for `type="password"` using `Eye` / `EyeOff` lucide icons.
  - Inline error rendered below the input in `text-danger text-12` when `error` is set; otherwise `hint` renders in `text-text-muted text-12` if provided. Mutually exclusive — error wins.
  - Tokenized: `border-border` default, `border-danger` when `error` is set; no hex/rgba in `className`.
  - Login + Register + Forgot stub all consume this component.

- **D-09: Validation matches the design reference verbatim.**
  - **Login** (`auth.jsx:76-83`): email must contain `@`; password ≥ 6 chars.
  - **Register** (`auth.jsx:121-129`): email must contain `@`; password ≥ 8 chars; password === confirm; Terms checkbox checked.
  - Error copy taken verbatim from the reference: `"Enter a valid email"`, `"Min 6 characters"` (login), `"Use at least 8 characters"` (register), `"Passwords don't match"`, `"Required"` (Terms).
  - No external validation library this phase. Both forms are short; a hand-written validator function returning a `Record<string, string>` errors object is enough.

- **D-10: Two-tier error display.**
  - **Field-level (inline)** for client-side validation — rendered by `<Field>` itself, under each input.
  - **Form-level banner** above the submit button for API errors (`UsernameExistsException`, `NotAuthorizedException`). One small notice strip styled `bg-danger/10 border border-danger text-danger text-14 rounded-md px-3 py-2`. Copy: `"Incorrect email or password."` for `NotAuthorizedException`; `"An account with this email already exists."` for `UsernameExistsException`. Disambiguates "this field is malformed" from "the request was rejected."

### Post-Auth Redirect

- **D-11: Successful login or register navigates to `/`.** `router.push('/')` after the mock resolves. Phase 5 (AUTH-09 RequireAuth) will introduce `?from=<protected-path>` so a deep link to `/preferences` while signed out routes through `/login?from=/preferences` and bounces back; Phase 4 hardcodes `/` and ignores the search param. The `from` extension is forward-compatible — Phase 5 reads `searchParams.from` if present, falls back to `/`.

### Page File Layout

- **D-12: Pages live flat under `(auth)/`** — no nested folders. Files added by Phase 4:
  - `app/(auth)/login/page.tsx` — Client Component (state for inputs/errors). Renders form inside the AuthShell card the layout wraps.
  - `app/(auth)/register/page.tsx` — Client Component. Same pattern.
  - `app/(auth)/forgot/page.tsx` — Server Component. Static placeholder (D-01).
  - `lib/api/auth.ts` — typed mock seam (D-02..D-04).
  - `components/Field.tsx` — reusable input (D-08).
  - `components/AccountMenu.tsx` (or similar) — Client Component wrapping the shadcn Popover; used by Sidebar avatar and Navbar greeting (D-05).
  - `components/ui/popover.tsx` — shadcn-generated.

  Sidebar.tsx and Navbar.tsx receive minor edits to wrap the avatar / greeting in `<AccountMenu>` when `loggedIn` is true. The Phase 3 `loggedIn?: boolean` prop interface is preserved — Phase 4 still passes the prop manually from each page (Phase 5 swaps to `useAuth().isAuthenticated`).

### Claude's Discretion

The planner / executor have flexibility on:
- Whether each page-level Client Component inlines its form JSX or extracts a `<LoginForm>` / `<RegisterForm>` Client Component (either is acceptable; if extracted, place under `components/` flat, not `components/auth/`).
- Whether the popover items are rendered as `<Link>` (for Account) and `<button>` (for Sign out), or both `<Link>` with one wrapping a server action — pick whichever fits Next.js 16 idioms cleanest.
- Specific copy on the `/forgot` placeholder page beyond the requirement that it acknowledges the feature is coming and links back to `/login`.
- Exact randomized-latency implementation (e.g., `setTimeout` + Promise vs `await new Promise(...)`).
- Test/lint structure for `lib/api/auth.ts` — Phase 4 doesn't mandate unit tests; the in-browser register→login flow is the acceptance test.

### Folded Todos

None — todos backlog is empty for this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project rules
- `CLAUDE.md` — milestone hard rules (#2 no JSX import from `_design-reference/`; #3 all backend mocked, real Cognito is v2)
- `frontend/web/AGENTS.md` — DSGN-06 author rule (only Tailwind theme variables in `app/` and `components/`)

### Roadmap & requirements
- `.planning/ROADMAP.md` §"Phase 4: Login + Register UI" — goal, depends-on, success criteria, notes (Cognito-shaped response keys; logout wired in app shell from Phase 3)
- `.planning/REQUIREMENTS.md` AUTH-01..07 — atomic phase requirements
- `.planning/PROJECT.md` §Out of Scope — confirms real Cognito / Lambda calls deferred (INTG-01..04)

### Design source of truth (visual spec — READ for numbers, do NOT import per CLAUDE.md #2)
- `frontend/_design-reference/auth.jsx:38-69` — `<Field>` component visual contract (floating label, show/hide, error/hint slots)
- `frontend/_design-reference/auth.jsx:71-112` — `LoginScreen` (titles, copy, form layout, validation rules)
- `frontend/_design-reference/auth.jsx:114-160` — `RegisterScreen` (titles, copy, Terms checkbox, validation rules)
- `frontend/_design-reference/auth.jsx:3-35` — AuthShell (already implemented as `app/(auth)/layout.tsx` in Phase 3)
- `frontend/_design-reference/styles.css` — Phase 2 tokens already mirror this; reference only if a new token surfaces

### Phase 3 contracts that this phase consumes / extends
- `.planning/phases/03-layout/03-CONTEXT.md` §D-06 (route groups), §D-10 (component file layout — flat in `components/`, shadcn primitives in `components/ui/`)
- `frontend/web/app/(auth)/layout.tsx` — AuthShell card (already wraps children — pages just provide form content)
- `frontend/web/components/Sidebar.tsx` — `loggedIn?: boolean` prop interface, avatar `<Link>` that this phase replaces with `<AccountMenu>`
- `frontend/web/components/Navbar.tsx` — `loggedIn` / `userName` props, greeting cluster that this phase wraps with `<AccountMenu>`
- `frontend/web/components/BrandMark.tsx` — already used by AuthShell layout

### Tooling
- `frontend/web/components.json` — shadcn config (`pnpm dlx shadcn add popover` scaffolds into `components/ui/popover.tsx` here)
- `frontend/web/lib/utils.ts` — `cn()` helper for conditional classNames

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`app/(auth)/layout.tsx` (Phase 3)** — already AuthShell-wraps every `(auth)/*` page with the centered card + middot disclaimer. Phase 4 pages render form content as `children`; no chrome work.
- **`components/BrandMark.tsx`** — already imported by the auth layout; `<Link>`-wrapping it for Phase 4 isn't needed (the AuthShell intentionally doesn't link the brand mark to home — UI-SPEC §Interaction Contracts).
- **`components/Sidebar.tsx`** — accepts `loggedIn?: boolean`; when `true` the avatar shows the literal initials `JR` (TODO comment from Phase 3 already flags Phase 5 for derive-from-`useAuth()`). Phase 4 keeps the prop interface; the avatar wrap target changes from a static `<Link>` to `<AccountMenu>`.
- **`components/Navbar.tsx`** — `loggedIn` + `userName` props; the greeting `Hi, {userName}` cluster is currently a static `<span>`. Phase 4 wraps the greeting (or inserts a button next to it) in `<AccountMenu>`.
- **`components/Footer.tsx`** — not used on auth pages (the `(auth)` layout has its own internal disclaimer per Phase 3 D-04); irrelevant to Phase 4.
- **`lib/utils.ts` `cn()`** — used by `<Field>` for conditional `border-border` vs `border-danger`.

### Established Patterns
- **Server-Component-by-default; opt into client only when needed.** Pages that hold form state opt into `"use client"` (login, register); `/forgot` placeholder stays Server.
- **Theme tokens only.** No `style={{ }}` for tokenized properties; Phase 4 verification reuses Phase 3's grep recipes (`git grep className.*#[0-9a-fA-F]` returns 0; `git grep style=\\{` returns 0; `git grep _design-reference` returns 0).
- **`lucide-react` for icons** — `Eye` / `EyeOff` (Field show/hide), `LogOut` (popover Sign-out item), `User` (popover Account item, already imported by Sidebar). Already in `package.json`.
- **`next/link` for internal navigation** (Phase 1 Convention 4) — popover Account link uses it; Sign-out is a `<button>` because it triggers an action, not navigation, before redirecting.
- **`next/navigation` `useRouter()`** — Phase 4 form-submit handlers call `router.push('/')` after successful auth.

### Integration Points
- `lib/api/auth.ts` is the new module — `lib/api/` is currently empty. Phase 4 creates the first file here.
- `components/ui/` is currently empty (Phase 1 D-02 reserved it; Phase 3 D-10 confirmed). Phase 4's Popover is the first occupant.
- The Sidebar / Navbar prop interface (`loggedIn`) doesn't change. Pages pass `loggedIn={true}` manually after a successful login; Phase 5 swaps to `useAuth().isAuthenticated`.

</code_context>

<specifics>
## Specific Ideas

Drawn directly from `_design-reference/auth.jsx`:

- **Login title:** `Welcome back.` (display font, ~26 px, centered)
- **Login subtitle:** `Pick up your queue and history.` (text-text-secondary, ~13 px, centered, 6 px below title)
- **Login submit button:** `Sign in` + `Arrow` icon (lucide `ArrowRight`), primary amber bg
- **Login footer link:** `New here? Create an account` — secondary text + amber link to `/register`
- **Register title:** `Make it yours.`
- **Register subtitle:** `Save recommendations, build a queue, learn what you love.`
- **Register submit button:** `Create account` + arrow icon
- **Register Terms copy:** `I agree to the Terms and Privacy Policy.` — checkbox left, label right; both link targets are `#` stubs (Terms / Privacy never wired this milestone).
- **Register footer link:** `Already have one? Sign in` to `/login`
- **Field placeholder:** literal space character (`" "`) so the floating label CSS works
- **Show/hide toggle position:** absolute right inside input; eye icon size 16 (`size={16}` is icon-internal, not a token)
- **Error / hint typography:** 11–12 px, `text-danger` for error, `text-text-muted` for hint
- **Form-level error banner copy:** `"Incorrect email or password."` (NotAuthorizedException), `"An account with this email already exists."` (UsernameExistsException)
- **Forgot stub copy:** `"Password reset is coming in a future update."` + `← Back to sign in` link to `/login`
- **localStorage key names (verbatim):** `recommend-a.session` (single Cognito-shaped JSON), `recommend-a.users` (registration map; gets cleared on Sign-out only if explicitly desired — recommend keeping users persisted across logouts so a demo user can sign back in)

</specifics>

<deferred>
## Deferred Ideas

These came up during discussion but belong in other phases or v2:

- **Forgot-password 3-step flow** (`_design-reference/auth.jsx:162-261`) — email entry → "check your email" with countdown resend → strength-meter new-password reset. Out of REQUIREMENTS AUTH-01..07. Future phase OR v2 backlog. The visible "Forgot password?" link in `/login` points to the stub at `/forgot` until then.
- **Real Cognito SDK + API Gateway calls** — INTG-01..04 (deferred to v2 per PROJECT.md). The Phase 4 mock seam is the swap point.
- **Refresh-token rotation** — INTG-03; Phase 4 stores `RefreshToken` in the session blob but never uses it (no `refreshSession()` method this phase).
- **`?from=<protected-path>` return-to redirect** — Phase 5 (AUTH-09).
- **Auth context + `useAuth()` hook + `RequireAuth` wrapper** — Phase 5 (AUTH-08, AUTH-09, AUTH-10, AUTH-12).
- **Mocked-token-expiry redirect** — Phase 5 (AUTH-11).
- **Logout-clears-context immediate revoke** — Phase 5 (AUTH-13). Phase 4's `signOut()` clears localStorage but does not revoke a context that doesn't exist yet.
- **Mobile-tab-bar logout surface** — Phase 8 Preferences screen will include a visible Sign-out button as part of the screen content.
- **Toast / snackbar notification system** — out of milestone (would unblock alternate API-error UX patterns).
- **Light theme** — out of milestone.
- **Real password complexity requirements** — Cognito server-side rules apply in v2; client validation in Phase 4 stays minimal per the reference design.

</deferred>

---

*Phase: 04-auth-ui*
*Context gathered: 2026-05-06*
