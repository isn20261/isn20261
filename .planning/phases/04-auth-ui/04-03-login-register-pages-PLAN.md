---
phase: 04
plan: 03
type: execute
wave: 2
depends_on: [1, 2]
files_modified:
  - frontend/web/app/(auth)/login/page.tsx
  - frontend/web/app/(auth)/register/page.tsx
autonomous: true
requirements: [AUTH-01, AUTH-02, AUTH-03, AUTH-05, AUTH-07]
must_haves:
  truths:
    - "Navigating to /login renders the login form with title 'Welcome back.', subtitle, email + password Fields, Forgot password? link, Sign in submit, and bottom-card 'New here? Create an account' link"
    - "Navigating to /register renders the register form with title 'Make it yours.', subtitle, email + password (min 8) + confirm-password Fields, Terms checkbox, Create account submit, and bottom-card 'Already have one? Sign in' link"
    - "Submitting an invalid email or weak password shows an inline error in red without calling lib/api/auth"
    - "Submitting valid credentials calls signIn / signUp from @/lib/api/auth and on success router.push('/')"
    - "On UsernameExistsException the register page shows the form-level banner 'An account with this email already exists.' above the submit button"
    - "On NotAuthorizedException the login page shows the form-level banner 'Incorrect email or password.' above the submit button"
  artifacts:
    - path: "frontend/web/app/(auth)/login/page.tsx"
      provides: "Login form (AUTH-01, AUTH-03)"
      contains: "use client, signIn, Welcome back."
    - path: "frontend/web/app/(auth)/register/page.tsx"
      provides: "Register form (AUTH-02, AUTH-03)"
      contains: "use client, signUp, Make it yours."
  key_links:
    - from: "frontend/web/app/(auth)/login/page.tsx"
      to: "@/lib/api/auth signIn"
      via: "submit handler awaits signIn({email, password})"
      pattern: "signIn\\(\\{"
    - from: "frontend/web/app/(auth)/register/page.tsx"
      to: "@/lib/api/auth signUp"
      via: "submit handler awaits signUp({email, password})"
      pattern: "signUp\\(\\{"
    - from: "both pages"
      to: "@/components/Field"
      via: "<Field> for email/password inputs"
      pattern: "import \\{ Field \\}"
    - from: "both pages"
      to: "next/navigation useRouter"
      via: "router.push('/') after success"
      pattern: "router\\.push\\(['\"]/['\"]?\\)"
---

<objective>
Ship the two design-faithful auth screens — `/login` and `/register` — as Client Components inside the existing `(auth)` route group. Both pages consume the Plan 02 `<Field>` component for inputs, the Plan 01 `lib/api/auth.ts` mock seam for submit, and produce a Cognito-shaped session in localStorage on success.

Purpose: AUTH-01 (login screen), AUTH-02 (register screen), AUTH-03 (validation + inline error), AUTH-05 (writes localStorage session), AUTH-07 (responsive at 375 / 768 / 1440 — inherited from the AuthShell card geometry). This plan delivers the user-facing acceptance criterion of issue #93: "possibilitar a criação de um usuário e login usando a UI" (register-then-sign-in works end-to-end).

Output: Two route-page files at `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx`, each with verbatim copy, hand-written validators, two-tier error display (field-level via Field, form-level via banner above submit), and post-success `router.push('/')`.
</objective>

<execution_context>
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/workflows/execute-plan.md
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-auth-ui/04-CONTEXT.md
@.planning/phases/04-auth-ui/04-UI-SPEC.md
@.planning/phases/04-auth-ui/04-PATTERNS.md
@CLAUDE.md
@frontend/web/AGENTS.md
@frontend/web/app/(auth)/layout.tsx
@frontend/web/components/Sidebar.tsx
@frontend/web/components/Field.tsx
@frontend/web/lib/api/auth.ts

<interfaces>
<!-- Inputs this plan consumes (created in Plan 01 + Plan 02): -->

```ts
// from @/lib/api/auth
import { signIn, signUp, UsernameExistsException, NotAuthorizedException, type Session } from "@/lib/api/auth";

// from @/components/Field
import { Field } from "@/components/Field";
// FieldProps: { label, type?, value, onChange, error?, hint?, name?, autoComplete?, disabled? }
```

<!-- Each page is a default-export Next.js Client Component: -->
```tsx
// app/(auth)/login/page.tsx
export default function LoginPage(): JSX.Element;
// app/(auth)/register/page.tsx
export default function RegisterPage(): JSX.Element;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Author /login page with email/password Field inputs, validation D-09, two-tier errors D-10, and signIn submit (AUTH-01, AUTH-03, AUTH-05)</name>
  <files>frontend/web/app/(auth)/login/page.tsx</files>
  <read_first>
    - frontend/web/app/(auth)/login/page.tsx (will be new — confirm currently absent)
    - frontend/web/app/(auth)/layout.tsx (the AuthShell wrapper — confirms the centered card + BrandMark + footer disclaimer is owned by the layout; pages just provide form content as children)
    - frontend/web/app/(app)/page.tsx (analog: route page file structure, default export, doc-comment style)
    - frontend/web/components/Sidebar.tsx lines 1-27 (analog: "use client" placement, doc-comment, hook + lucide + cn imports)
    - frontend/web/components/Field.tsx (the input primitive this page consumes — read the FieldProps signature)
    - frontend/web/lib/api/auth.ts (the mock seam this page consumes — read the signIn signature, the NotAuthorizedException class, the Session type)
    - frontend/_design-reference/auth.jsx lines 71-112 (LoginScreen visual source — read for titles, subtitle, copy, form layout, validation rules; do NOT import per CLAUDE.md hard rule #2)
    - .planning/phases/04-auth-ui/04-CONTEXT.md §"D-09 Validation matches verbatim", §"D-10 Two-tier error display", §"D-11 Successful login → /", §"Specific Ideas" (every copy string)
    - .planning/phases/04-auth-ui/04-UI-SPEC.md §"Copywriting Contract" Login table (verbatim copy strings); §"Component Inventory" Pages table; §"Color" Form-level error banner color contract; §"Interaction Contracts" (focus-ring, submit handler, in-flight guard)
    - .planning/phases/04-auth-ui/04-PATTERNS.md §"frontend/web/app/(auth)/login/page.tsx" (byte-exact code excerpts: "use client", doc-comment, imports, validators, success-redirect, no-bare-input rule)
  </read_first>
  <action>
Create `frontend/web/app/(auth)/login/page.tsx` as a default-export Client Component. The page renders form content INSIDE the AuthShell card (the `(auth)/layout.tsx` already provides the BrandMark + centered card + footer disclaimer — DO NOT re-implement chrome).

**File structure (in this exact order):**

1. **`"use client"` directive** at byte 0:
```tsx
"use client";
```

2. **File-header doc-comment**:
```tsx
/**
 * Phase 4 (AUTH-01, AUTH-03, AUTH-05, issue #93) — /login page (Client).
 *
 * Form lives inside the AuthShell card (rendered by app/(auth)/layout.tsx).
 * Submits to lib/api/auth.signIn (mock seam — Cognito-shaped, see CONTEXT D-04).
 * On success: router.push('/') (CONTEXT D-11).
 * On NotAuthorizedException: form-level error banner with copy
 * "Incorrect email or password." (UI-SPEC §Copywriting).
 *
 * Phase 4 hardcodes the post-auth redirect to '/'. The ?from=<protected-path>
 * extension (Phase 5 / AUTH-09) is forward-compatible — Phase 5 will read
 * searchParams.from if present, fall back to '/'.
 */
```

3. **Imports** (must include the new `lib/api/auth` and `components/Field` from Plans 01–02; the optional `AlertCircle` lucide icon is for the form-level banner per UI-SPEC §"Color" Form-level error banner):
```tsx
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Field } from "@/components/Field";
import { signIn, NotAuthorizedException } from "@/lib/api/auth";
```

4. **Default-export function** (Next.js page contract — pages MUST be default-exported):
```tsx
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return; // in-flight guard per UI-SPEC §Interaction Contracts

    // D-09 verbatim: email contains '@'; password length ≥ 6
    const errs: Record<string, string> = {};
    if (!email.includes('@')) errs.email = 'Enter a valid email';
    if (password.length < 6) errs.password = 'Min 6 characters';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      router.push('/'); // D-11
    } catch (err) {
      // Collapse all unknown failures into the safe "Incorrect email or password."
      // copy — never leak Cognito-internal messages (UI-SPEC §Interaction Contracts).
      if (err instanceof NotAuthorizedException) {
        setFormError('Incorrect email or password.');
      } else {
        setFormError('Incorrect email or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* non-tokenized: text-[26px], tracking-[-0.02em], leading-[1.02] match the reference .display class — see UI-SPEC §Typography */}
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
        Welcome back.
      </h1>
      {/* non-tokenized: text-[13px] is the reference auth.jsx:88 fontSize:13 — see UI-SPEC §Typography */}
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Pick up your queue and history.
      </p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-6">
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          disabled={isSubmitting}
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          disabled={isSubmitting}
        />

        <div className="flex justify-end -mt-1.5">
          <Link
            href="/forgot"
            className="text-text-secondary hover:text-text-primary text-12 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            Forgot password?
          </Link>
        </div>

        {formError && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-center gap-2 bg-danger/10 border border-danger text-danger text-14 font-medium rounded-md px-3 py-2"
          >
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
          /* non-tokenized: tracking-[-0.005em] matches reference .btn class — see UI-SPEC §Typography */
          className="h-14 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-on-accent text-16 font-semibold tracking-[-0.005em] rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          {isSubmitting ? (
            <>
              Sign in
              <span className="w-4 h-4 rounded-full border-2 border-on-accent border-t-transparent animate-spin" aria-hidden />
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-text-secondary text-[13px] mt-4">
        New here?{' '}
        <Link
          href="/register"
          className="text-accent font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
```

**Critical implementation notes (verbatim per CONTEXT/UI-SPEC):**

- **Page title:** `Welcome back.` (with trailing period — UI-SPEC §"Copywriting Contract" Login table). NOT `"Welcome back"` — the period is byte-significant and verified by grep.
- **Page subtitle:** `Pick up your queue and history.` (verbatim).
- **Email field error copy:** `Enter a valid email` (verbatim).
- **Password field error copy:** `Min 6 characters` (verbatim — note "Min" not "Minimum").
- **Forgot password link copy:** `Forgot password?` (with trailing question mark, verbatim).
- **Submit button copy (idle):** `Sign in` + `ArrowRight size={16}` icon (verbatim).
- **Submit button copy (loading):** `Sign in` label unchanged + `animate-spin` 16 px circle replaces the arrow (UI-SPEC §"Empty / loading / disabled states").
- **Form-level banner copy:** `Incorrect email or password.` (verbatim — trailing period).
- **Bottom-card secondary text:** `New here?` + space + accent link `Create an account` → `/register` (verbatim per UI-SPEC §"Copywriting Contract").
- **`<form noValidate>`** is mandatory (UI-SPEC §"Accessibility minimums" — we run our own validators; HTML5 popup would conflict).
- **Banner has `role="alert"` and `aria-live="polite"`** so screen readers announce API rejection.
- **Use `<Field>` for both inputs — DO NOT write raw `<input type="email">` or `<input type="password">`** (UI-SPEC verification hook #5).
- **`router.push('/')` on success** — D-11.
- **In-flight guard `if (isSubmitting) return;`** at the top of `handleSubmit` (UI-SPEC §"Interaction Contracts" — re-submitting is no-op).
- **All Field inputs receive `disabled={isSubmitting}`** so the user cannot edit while the mock is resolving.
- **`Forgot password?` does NOT disable** during submit (it's a navigation link, not part of the form transaction).
- **The bottom-card link uses `text-accent`** (per UI-SPEC §"Color" — this is the Phase 4 supplement to the accent reserved-for list, entry #8).
- **No hex literals, no inline `style={{ }}` for tokenized properties.** The four arbitrary values (`text-[26px]`, `text-[13px]`, `tracking-[-0.02em]`, `leading-[1.02]`, `tracking-[-0.005em]`) each have a `// non-tokenized: ...` comment per AGENTS.md.
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint</automated>
    Plus the following grep checks (each must pass):
    - `head -c 12 frontend/web/app/\(auth\)/login/page.tsx` starts with `"use client";`
    - `grep -c "export default function LoginPage" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c "Welcome back\." frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1 (UI-SPEC hook #6)
    - `grep -c "Pick up your queue and history\." frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1 (UI-SPEC hook #6)
    - `grep -c "Enter a valid email" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1 (UI-SPEC hook #7)
    - `grep -c "Min 6 characters" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1 (UI-SPEC hook #7)
    - `grep -c "Incorrect email or password\." frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1 (UI-SPEC hook #8)
    - `grep -c "Forgot password?" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c "New here?" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c "Create an account" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c 'href="/register"' frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c 'href="/forgot"' frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c "router.push" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -E "router\.push\([\"']/[\"']?\)" frontend/web/app/\(auth\)/login/page.tsx` matches at least one line (UI-SPEC hook #15)
    - `grep -c "signIn(" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c "NotAuthorizedException" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c "<Field" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 2
    - `grep -c "noValidate" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c "role=\"alert\"" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 1
    - `grep -c "ArrowRight" frontend/web/app/\(auth\)/login/page.tsx` returns ≥ 2 (import + render)
    - `grep -E "<input\s" frontend/web/app/\(auth\)/login/page.tsx` returns 0 hits (UI-SPEC hook #5 — no raw input in login)
    - `grep -E "className=.*#[0-9a-fA-F]{3,6}" frontend/web/app/\(auth\)/login/page.tsx` returns 0 hits (DSGN-06)
    - `grep -E "style=\\{" frontend/web/app/\(auth\)/login/page.tsx` returns 0 hits (UI-SPEC hook #2)
    - `grep -E "from .[\"']\.\./" frontend/web/app/\(auth\)/login/page.tsx` returns 0 hits (no relative imports — only @/ alias)
    - `grep -E "from .[\"'].*_design-reference" frontend/web/app/\(auth\)/login/page.tsx` returns 0 hits (CLAUDE.md hard rule #2)
  </verify>
  <acceptance_criteria>
    - File `frontend/web/app/(auth)/login/page.tsx` exists, byte 0 is `"use client";`.
    - Default-exported `LoginPage` function.
    - Renders the verbatim title `Welcome back.` (with trailing period) using `font-display`.
    - Renders the verbatim subtitle `Pick up your queue and history.`.
    - Two `<Field>` instances: email (`type="email"`, `autoComplete="email"`, label `Email`) and password (`type="password"`, `autoComplete="current-password"`, label `Password`).
    - Hand-written validator: email must include `@`; password length ≥ 6. Errors set on the `errors` state object: `Enter a valid email` and `Min 6 characters` verbatim.
    - `Forgot password?` link navigates to `/forgot`.
    - Submit button copy `Sign in` plus `ArrowRight` icon (size 16). Button uses `bg-accent hover:bg-accent-hover text-on-accent`.
    - Form-level banner appears above the submit button when `formError` is set; copy `Incorrect email or password.`; uses `bg-danger/10 border border-danger text-danger`; has `role="alert"` and `aria-live="polite"`.
    - Submit handler calls `signIn({ email, password })` from `@/lib/api/auth`; on success `router.push('/')`; on `NotAuthorizedException` (and any other error) sets `formError = 'Incorrect email or password.'`.
    - `<form noValidate>` attribute present.
    - In-flight guard: `if (isSubmitting) return;` at top of submit handler.
    - All Field instances receive `disabled={isSubmitting}`.
    - Bottom-card cluster: `New here? Create an account` with `text-accent` on the link, navigating to `/register`.
    - File contains zero hex literals, zero `style={` props, zero raw `<input>` elements, zero imports from `_design-reference/`, zero relative `../` imports.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    /login page is implemented per the action body, all verifications pass. Manual smoke (deferred to Plan 05) — type bad email, see inline error; type good email + bad password → API banner; type good credentials → router.push('/').
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Author /register page with email + password (min 8) + confirm + Terms checkbox, validation D-09, two-tier errors D-10, and signUp submit (AUTH-02, AUTH-03, AUTH-05)</name>
  <files>frontend/web/app/(auth)/register/page.tsx</files>
  <read_first>
    - frontend/web/app/(auth)/register/page.tsx (will be new — confirm currently absent)
    - frontend/web/app/(auth)/login/page.tsx (Task 1 sibling — same patterns; differences are validators, fields, and signUp instead of signIn)
    - frontend/web/components/Field.tsx (the input primitive this page consumes)
    - frontend/web/lib/api/auth.ts (the mock seam — read the signUp signature, the UsernameExistsException class)
    - frontend/_design-reference/auth.jsx lines 114-160 (RegisterScreen visual source — read for titles, subtitle, copy, Terms checkbox, validation rules; do NOT import per CLAUDE.md hard rule #2)
    - .planning/phases/04-auth-ui/04-CONTEXT.md §"D-09 Validation matches verbatim" (register: email contains @, password ≥ 8, password === confirm, Terms checked); §"Specific Ideas" register copy block
    - .planning/phases/04-auth-ui/04-UI-SPEC.md §"Copywriting Contract" Register table (every copy string verbatim, including the straight ASCII apostrophe in "Passwords don't match"); §"Component Inventory" notes on Terms checkbox `accent-accent`
    - .planning/phases/04-auth-ui/04-PATTERNS.md §"frontend/web/app/(auth)/register/page.tsx" (validators verbatim with straight apostrophe; Terms `<label>` wrapper pattern)
  </read_first>
  <action>
Create `frontend/web/app/(auth)/register/page.tsx`. Same overall pattern as Task 1 (login), with these specific differences:

**Validators (D-09 verbatim — copy from CONTEXT §"D-09" + UI-SPEC §"Copywriting Contract" Register table):**
```ts
const errs: Record<string, string> = {};
if (!email.includes('@'))   errs.email = 'Enter a valid email';
if (pw1.length < 8)         errs.pw1 = 'Use at least 8 characters';
if (pw1 !== pw2)            errs.pw2 = "Passwords don't match"; // STRAIGHT ASCII apostrophe — verified by UI-SPEC hook #10
if (!agree)                 errs.agree = 'Required';
setErrors(errs);
if (Object.keys(errs).length > 0) return;
```

**CRITICAL APOSTROPHE NOTE:** The string `Passwords don't match` MUST use the straight ASCII apostrophe (`'`, U+0027) — NOT the curly typographic apostrophe (`'`, U+2019). UI-SPEC verification hook #10 explicitly greps for the curly one and expects 0 hits. Type the string carefully or copy from the design reference at `auth.jsx:126`.

**Page content (verbatim copy strings from UI-SPEC §"Copywriting Contract" Register table):**

1. `"use client"` directive.
2. File-header doc-comment naming AUTH-02 + issue #93 + the signUp + UsernameExistsException seam.
3. Imports: `useState` from react, `Link` from next/link, `useRouter` from next/navigation, `ArrowRight, AlertCircle` from lucide-react, `Field` from `@/components/Field`, `signUp, UsernameExistsException` from `@/lib/api/auth`.
4. Default-export `RegisterPage`. State: `email`, `pw1`, `pw2`, `agree` (boolean), `errors`, `formError`, `isSubmitting`.
5. **Title** (verbatim — trailing period preserved): `Make it yours.` — same `font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02]` styling as login title with `// non-tokenized:` comment.
6. **Subtitle** (verbatim): `Save recommendations, build a queue, learn what you love.` — same `text-text-secondary text-[13px]` styling.
7. **Form** with `gap-3.5 mt-6`:
   - **Email Field**: `label="Email"`, `type="email"`, `autoComplete="email"`, `error={errors.email}`.
   - **Password Field**: `label="Password"`, `type="password"`, `autoComplete="new-password"`, `error={errors.pw1}`, `hint="At least 8 characters"`. Note: the hint copy is verbatim from UI-SPEC §"Copywriting Contract" Register table row "Password field hint".
   - **Confirm password Field**: `label="Confirm password"`, `type="password"`, `autoComplete="new-password"`, `error={errors.pw2}`.
8. **Terms checkbox row** — Use a single `<label>` wrapping both the `<input type="checkbox">` and the text. The `<input type="checkbox">` IS allowed here (UI-SPEC hook #5 explicitly permits checkbox raw inputs in register/page.tsx). Use `accent-accent` Tailwind class so the checkmark glyph uses the project's amber accent (verbatim from UI-SPEC §"Color" Terms checkbox row):
```tsx
<div className="flex flex-col gap-1.5">
  <label className="flex items-start gap-3 text-12 text-text-secondary cursor-pointer">
    <input
      type="checkbox"
      checked={agree}
      onChange={(e) => setAgree(e.target.checked)}
      disabled={isSubmitting}
      className="accent-accent mt-0.5"
    />
    <span>I agree to the Terms and Privacy Policy.</span>
  </label>
  {errors.agree && (
    <p className="text-12 text-danger leading-tight" aria-live="polite">{errors.agree}</p>
  )}
</div>
```
The label copy `I agree to the Terms and Privacy Policy.` is verbatim with trailing period (UI-SPEC §"Copywriting Contract" Register table; verification hook #6).
9. **Form-level banner** (when `formError` set): same shape as login but copy is `An account with this email already exists.` (when `UsernameExistsException` is caught). For all other errors, also use the same banner copy — there is only ONE failure path on register per UI-SPEC §"Copywriting Contract" Register table.
10. **Submit button**: copy `Create account` + `ArrowRight size={16}` icon (loading spinner pattern same as login).
11. **Bottom-card cluster** (verbatim): `Already have one?` + space + `<Link href="/login">Sign in</Link>` with `text-accent`.

**Submit handler** (full body):
```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (isSubmitting) return;

  const errs: Record<string, string> = {};
  if (!email.includes('@'))   errs.email = 'Enter a valid email';
  if (pw1.length < 8)         errs.pw1 = 'Use at least 8 characters';
  if (pw1 !== pw2)            errs.pw2 = "Passwords don't match";
  if (!agree)                 errs.agree = 'Required';
  setErrors(errs);
  if (Object.keys(errs).length > 0) return;

  setFormError(null);
  setIsSubmitting(true);
  try {
    await signUp({ email, password: pw1 });
    router.push('/'); // D-11
  } catch (err) {
    if (err instanceof UsernameExistsException) {
      setFormError('An account with this email already exists.');
    } else {
      setFormError('An account with this email already exists.');
    }
  } finally {
    setIsSubmitting(false);
  }
}
```

**Critical implementation notes:**

- **Title:** `Make it yours.` (with trailing period — verified by UI-SPEC hook #6).
- **Password Field has BOTH `error` and `hint` props** — Field renders error if set, else hint if set (D-08). The persistent `At least 8 characters` hint shows BEFORE the user submits (so they know the rule); after a failed submit with too-short password the error wins.
- **Confirm password Field uses straight ASCII apostrophe** in the error string `"Passwords don't match"` — UI-SPEC hook #10.
- **Terms checkbox MUST be wrapped in a single `<label>`** so clicking the text toggles the checkbox natively (UI-SPEC §"Accessibility minimums").
- **`accent-accent` Tailwind class** styles the checkmark glyph to the project amber accent — this is the only Phase 4 use of CSS `accent-color` and is explicitly permitted (UI-SPEC §"Color" Terms checkbox row).
- **The Terms label copy includes the period.** `I agree to the Terms and Privacy Policy.` — UI-SPEC hook #6 expects exactly this (with the period).
- **The "Terms" and "Privacy Policy" substrings are NOT individually linked** — UI-SPEC §"Copywriting Contract" is explicit: "the entire phrase is plain text inside the `<label>`".
- **Submit copy is `Create account`** (lowercase 'a' on `account`) — verbatim from auth.jsx:149.
- **Bottom-card copy is `Already have one?`** + accent link `Sign in` → `/login`.
- **Form-level banner copy is `An account with this email already exists.`** (with trailing period) — UI-SPEC hook #8.
- **Default `<input type="checkbox">` is OK in register/page.tsx** — UI-SPEC hook #5 explicitly permits checkbox raw inputs (only email/password raw inputs are forbidden — those go through `<Field>`).
- **Same arbitrary-value escape hatches** as login (`text-[26px]`, `text-[13px]`, etc.) each with a `// non-tokenized: ...` comment.
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint</automated>
    Plus the following grep checks (each must pass):
    - `head -c 12 frontend/web/app/\(auth\)/register/page.tsx` starts with `"use client";`
    - `grep -c "export default function RegisterPage" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1
    - `grep -c "Make it yours\." frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1 (UI-SPEC hook #6)
    - `grep -c "Save recommendations, build a queue, learn what you love\." frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1 (UI-SPEC hook #6)
    - `grep -c "I agree to the Terms and Privacy Policy\." frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1 (UI-SPEC hook #6)
    - `grep -c "Use at least 8 characters" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1 (UI-SPEC hook #7)
    - `grep -c "At least 8 characters" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1 (Field hint)
    - `grep -F "Passwords don't match" frontend/web/app/\(auth\)/register/page.tsx` matches (UI-SPEC hook #10 — straight apostrophe)
    - `grep -F "Passwords don't match" frontend/web/app/\(auth\)/register/page.tsx | wc -l` returns 0 (UI-SPEC hook #10 — curly apostrophe forbidden)
    - `grep -c "Required" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1
    - `grep -c "Create account" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1
    - `grep -c "Already have one?" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1
    - `grep -c "An account with this email already exists\." frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1 (UI-SPEC hook #8)
    - `grep -c 'href="/login"' frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1
    - `grep -c "signUp(" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1
    - `grep -c "UsernameExistsException" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1
    - `grep -c "<Field" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 3 (email + pw1 + pw2)
    - `grep -c 'type="checkbox"' frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1 (Terms input — explicitly allowed)
    - `grep -c "accent-accent" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1 (Terms checkmark color)
    - `grep -c "noValidate" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1
    - `grep -c "role=\"alert\"" frontend/web/app/\(auth\)/register/page.tsx` returns ≥ 1
    - `grep -E "router\.push\([\"']/[\"']?\)" frontend/web/app/\(auth\)/register/page.tsx` matches at least one line (UI-SPEC hook #15)
    - `grep -E "<input\s+type=\"(email|password)\"" frontend/web/app/\(auth\)/register/page.tsx` returns 0 hits (UI-SPEC hook #5 — only checkbox raw input allowed)
    - `grep -E "className=.*#[0-9a-fA-F]{3,6}" frontend/web/app/\(auth\)/register/page.tsx` returns 0 hits (DSGN-06)
    - `grep -E "style=\\{" frontend/web/app/\(auth\)/register/page.tsx` returns 0 hits (UI-SPEC hook #2)
    - `grep -E "from .[\"']\.\./" frontend/web/app/\(auth\)/register/page.tsx` returns 0 hits
    - `grep -E "from .[\"'].*_design-reference" frontend/web/app/\(auth\)/register/page.tsx` returns 0 hits
  </verify>
  <acceptance_criteria>
    - File `frontend/web/app/(auth)/register/page.tsx` exists, byte 0 is `"use client";`.
    - Default-exported `RegisterPage` function.
    - Verbatim title `Make it yours.` (with trailing period).
    - Verbatim subtitle `Save recommendations, build a queue, learn what you love.`.
    - Three `<Field>` instances: email, password (with hint `At least 8 characters` and `autoComplete="new-password"`), confirm-password.
    - Terms checkbox row: `<label>` wraps `<input type="checkbox">` with `accent-accent` class + the verbatim text `I agree to the Terms and Privacy Policy.`.
    - Validators: email contains `@`; password length ≥ 8; password === confirm (with STRAIGHT ASCII apostrophe in `"Passwords don't match"`); Terms checked.
    - Submit handler calls `signUp({ email, password: pw1 })`; on success `router.push('/')`; on `UsernameExistsException` (or any other error) sets `formError = 'An account with this email already exists.'`.
    - Form-level banner: `bg-danger/10 border border-danger text-danger`, `role="alert"`, `aria-live="polite"`, copy verbatim.
    - Submit button: `Create account` + `ArrowRight size={16}` (loading spinner pattern).
    - Bottom-card: `Already have one?` + `<Link href="/login">Sign in</Link>` with `text-accent`.
    - `<form noValidate>` attribute present.
    - In-flight guard `if (isSubmitting) return;` at top of submit handler.
    - All Field + checkbox inputs receive `disabled={isSubmitting}`.
    - Curly apostrophe `'` (U+2019) does NOT appear anywhere in the file (UI-SPEC hook #10).
    - File contains zero hex literals, zero `style={` props, zero raw `<input type="email|password">` elements, zero imports from `_design-reference/`, zero relative `../` imports.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    /register page is implemented per the action body, all verifications pass. Manual smoke (deferred to Plan 05) — register a new email; verify localStorage `recommend-a.users` has the new user and `recommend-a.session` has the Cognito-shaped session; sign out (via Plan 04 AccountMenu); sign back in via /login.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user form input → page state → signIn / signUp | Untrusted text from email + password fields crosses into the mock auth seam. |
| Cognito-shaped error → form-level banner | Error message from lib/api/auth could be reflected verbatim into the DOM if not handled carefully. |
| Link href props (Forgot, Register, Sign in) | Static hrefs — no dynamic redirect surface in Phase 4. |

## STRIDE Threat Register (ASVS L1)

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-04-12 | Tampering / XSS | Form-level banner reflecting `formError` string | medium → **mitigate** | mitigate | The banner renders `formError` as a JSX text node (`<span>{formError}</span>`), NOT via `dangerouslySetInnerHTML`. React escapes text-node interpolation by default, so even if a future error message contains HTML it will be rendered as text. Phase 4 hardcodes both possible messages in the page (one for each Cognito-shaped exception) — no user-controlled string ever reaches the banner. The catch block collapses unknown errors into the safe hardcoded copy (UI-SPEC §"Interaction Contracts"). |
| T-04-13 | Information disclosure | Cognito-internal error messages leaking via banner | medium → **mitigate** | mitigate | Catch block in both pages collapses ALL non-mapped errors into the safe hardcoded copy (`'Incorrect email or password.'` for login; `'An account with this email already exists.'` for register). The `err instanceof X` check only branches on the two known Cognito-shaped exceptions; everything else falls through to the safe copy. |
| T-04-14 | Spoofing / open redirect | `router.push('/')` after success | low → **accept** | accept | Hardcoded redirect path. No `?from=` handling in Phase 4 (CONTEXT D-11 — Phase 5 owns). Plan 05 verification hooks confirm no dynamic redirect sink exists. |
| T-04-15 | Tampering | Form re-submit while in flight | low → **mitigate** | mitigate | Guard `if (isSubmitting) return;` at the top of `handleSubmit` in both pages. Submit button also has the HTML `disabled` attribute when `isSubmitting`. UI-SPEC §"Interaction Contracts" makes this a hard requirement. |
| T-04-16 | Information disclosure | Browser autofill exposing previous credentials in dev mode | low → **accept** | accept | Mock-only — no real credentials persist beyond `recommend-a.users`. Login page uses `autoComplete="current-password"`; register page uses `autoComplete="new-password"`. These are the standard hints for password managers and are intentionally specified. |
| T-04-17 | Spoofing | User-typed email reflected verbatim in `recommend-a.users` key | low → **accept** | accept | Mock seam — the email key is the user's choice. The `Object.prototype.hasOwnProperty.call` guard in lib/api/auth.ts (Plan 01 threat T-04-02) prevents prototype-pollution via crafted email like `__proto__`. |
| T-04-18 | Tampering | HTML5 form validation popups conflicting with our validators | n/a (architectural) → **mitigate** | mitigate | `<form noValidate>` attribute on both forms disables HTML5 validation — UI-SPEC §"Accessibility minimums" makes this mandatory. |
</threat_model>

<verification>
After both tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` all exit 0.
- `git grep -F "Passwords don't match" frontend/web/app/\(auth\)/register/page.tsx` returns 1 hit (straight apostrophe).
- `git grep -F "Passwords don't match" frontend/web/app/\(auth\)/register/page.tsx` returns 0 hits (curly apostrophe forbidden — UI-SPEC hook #10).
- All UI-SPEC verification hooks #6 (page copy), #7 (validation copy), #8 (banner copy), #15 (router.push) pass.
</verification>

<success_criteria>
1. /login renders the verbatim Welcome-back copy + email + password Fields + Forgot link + Sign-in button + bottom-card register link, and on valid credentials calls signIn → writes recommend-a.session → router.push('/'). On invalid credentials shows inline Field errors. On wrong credentials shows form-level banner. (AUTH-01, AUTH-03, AUTH-05)
2. /register renders the verbatim Make-it-yours copy + email + password (≥8) + confirm + Terms + Create-account button + bottom-card login link, and on valid input calls signUp → writes recommend-a.users + recommend-a.session → router.push('/'). On invalid input shows inline Field errors. On duplicate email shows form-level banner. (AUTH-02, AUTH-03, AUTH-05)
3. Both pages responsive at 375 / 768 / 1440 by virtue of inheriting the AuthShell card geometry from Phase 3 (AUTH-07).
4. `pnpm tsc --noEmit && pnpm lint && pnpm build` exit 0.
</success_criteria>

<output>
After completion, create `.planning/phases/04-auth-ui/04-03-SUMMARY.md` documenting:
- Final file paths and line counts.
- Confirmation that Plan 01 (auth seam) and Plan 02 (Field) were consumed correctly.
- Manual smoke result (if executed): register a new email, observe localStorage, sign out, sign back in.
- Any deviations from the action.
</output>
