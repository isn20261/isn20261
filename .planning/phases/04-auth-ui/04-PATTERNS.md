# Phase 4: Login + Register UI — Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 9 (6 new + 1 shadcn-generated + 2 modified)
**Analogs found:** 9 / 9 (every Phase 4 file has a Phase 1–3 analog or established convention to copy from)

> Source of truth for downstream planner: every new/modified file's role, data flow, and the closest existing file that already encodes the project's conventions. Excerpts are byte-exact from the cited line ranges. The planner copies these patterns verbatim into PLAN.md actions.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/web/app/(auth)/login/page.tsx` | route page (Client) | request-response (form → mock API → redirect) | `frontend/web/app/(auth)/layout.tsx` (route-group sibling) + `frontend/web/components/Sidebar.tsx` (`"use client"` + `useRouter`-equivalent `usePathname` pattern) | role-match (no existing Client form page yet — borrow doc-comment + import shape from layout sibling, hooks pattern from Sidebar) |
| `frontend/web/app/(auth)/register/page.tsx` | route page (Client) | request-response | same as login | role-match |
| `frontend/web/app/(auth)/forgot/page.tsx` | route page (Server, static) | none (static placeholder) | `frontend/web/app/(app)/page.tsx` (static placeholder Server Component with `<Link>`) | exact (both are Server Component placeholders inside a route group with no async data) |
| `frontend/web/lib/api/auth.ts` | service / typed mock seam | request-response (Promise + localStorage) | none — first occupant of `lib/api/`. Closest convention donor: `frontend/web/lib/utils.ts` (export style, no side effects on import) | partial (no analog for the mock-seam shape — fall back to RESEARCH-equivalent CONTEXT D-02..D-04 for shape; copy export/file-header conventions from `lib/utils.ts` and the Phase-3 doc-comment style from `BrandMark.tsx`) |
| `frontend/web/components/Field.tsx` | reusable component (Client, form input) | event-driven (controlled input via `onChange`) | `frontend/web/components/Sidebar.tsx` (Client Component with `useState`-style hook, `cn()` helper, conditional border, focus-ring pattern) | role-match (closest Client component with conditional Tailwind classes) |
| `frontend/web/components/AccountMenu.tsx` | reusable component (Client, popover trigger wrapper) | event-driven (Popover open/close + onClick handlers) | `frontend/web/components/Sidebar.tsx` (Client Component, `usePathname`/`useRouter` family hooks, `lucide-react` icons, `<Link>` + `<button>` mix) | role-match |
| `frontend/web/components/ui/popover.tsx` | shadcn primitive (generated) | n/a (passive primitive) | none in repo — first `components/ui/` occupant. Reference: shadcn registry default. | n/a (generator-owned; no manual edits per UI-SPEC §Component Inventory) |
| `frontend/web/components/Sidebar.tsx` (MODIFIED) | reusable component (Client) | self (wraps existing `<Link>` in `<AccountMenu>` when `loggedIn`) | self (lines 99-113 — the avatar block) | self-edit |
| `frontend/web/components/Navbar.tsx` (MODIFIED) | reusable component (Server) | self (wraps greeting `<span>` in `<AccountMenu>` when `loggedIn && variant === 'home'`) | self (line 60 — the greeting cluster) | self-edit |

---

## Pattern Assignments

### `frontend/web/app/(auth)/login/page.tsx` (route page, Client, request-response)

**Closest analogs:**
- Doc-comment + import shape: `frontend/web/app/(auth)/layout.tsx` (route-group sibling, file lines 1-17, 19-23)
- `"use client"` placement + hook imports: `frontend/web/components/Sidebar.tsx` (lines 1, 23-27)

**`"use client"` directive placement** — copy from `Sidebar.tsx:1`:
```tsx
"use client";
```
Place at byte 0 of the file. Doc-comment block follows immediately after, then imports.

**File-header doc-comment pattern** — copy from `app/(auth)/layout.tsx:1-15`:
```tsx
/**
 * Phase 4 (AUTH-XX, issue #93) — /login page (Client).
 *
 * Form lives inside the AuthShell card (rendered by app/(auth)/layout.tsx).
 * Submits to lib/api/auth.signIn (mock seam — Cognito-shaped, see CONTEXT D-04).
 * On success: router.push('/') (CONTEXT D-11). On NotAuthorizedException:
 * form-level error banner (UI-SPEC §Copywriting "Incorrect email or password.").
 */
```

**Import block pattern** — copy from `Sidebar.tsx:23-27` (Client) for the hook + lucide + `cn` shape; extend with `useState` and the new `lib/api/auth` module:
```tsx
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Field } from "@/components/Field";
import { signIn } from "@/lib/api/auth";
```
Note: the project uses `next/navigation` `useRouter` (not the legacy `next/router`) — see `Sidebar.tsx:24` (`usePathname`) for the same family of imports.

**Path alias `@/` convention** — copy from `Sidebar.tsx:26-27`, `app/(auth)/layout.tsx:17`, `PageLayout.tsx:15-16`:
```tsx
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
```
All cross-folder imports go through `@/...`. No relative `../` imports anywhere in `app/` or `components/`.

**Form error-state object pattern** — copy verbatim from `_design-reference/auth.jsx:74, 78-82` (the planner re-authors fresh, but the shape is identical):
```tsx
const [errors, setErrors] = useState<Record<string, string>>({});
// ...
const errs: Record<string, string> = {};
if (!email.includes('@')) errs.email = 'Enter a valid email';
if (password.length < 6) errs.password = 'Min 6 characters';
setErrors(errs);
if (Object.keys(errs).length) return;
```

**Success-redirect pattern** — derived from CONTEXT D-11 + Sidebar's `next/navigation` import:
```tsx
const router = useRouter();
// inside submit handler, after signIn resolves:
router.push('/');
```

**No `<input className="...">` directly** — UI-SPEC verification hook #5 (`git grep -nE '<input\s' -- 'app/(auth)/'`) requires that login/register pages contain zero `<input>` for email/password. Use `<Field>` exclusively; the only allowed `<input>` is the Terms `<input type="checkbox">` in register (and even that is wrapped in a `<label>`).

---

### `frontend/web/app/(auth)/register/page.tsx` (route page, Client, request-response)

Same patterns as login. Three differences:

1. Validators copy from `_design-reference/auth.jsx:122-128` (re-authored):
```tsx
if (!email.includes('@')) errs.email = 'Enter a valid email';
if (pw1.length < 8)        errs.pw1 = 'Use at least 8 characters';
if (pw1 !== pw2)           errs.pw2 = "Passwords don't match";  // straight ASCII apostrophe — UI-SPEC verification hook #10
if (!agree)                errs.agree = 'Required';
```

2. Calls `signUp` from `@/lib/api/auth` (not `signIn`).

3. Catches `UsernameExistsException` → form-banner copy `"An account with this email already exists."` (UI-SPEC §Copywriting Register table).

Terms checkbox `<label>` wrapper pattern — re-author from `_design-reference/auth.jsx:142-146`, keeping the `accent-accent` Tailwind utility for the `accentColor: var(--color-accent)` (UI-SPEC §Color row "Terms checkbox"). No inline style.

---

### `frontend/web/app/(auth)/forgot/page.tsx` (route page, Server, static)

**Analog:** `frontend/web/app/(app)/page.tsx` (lines 1-19) — the only existing static placeholder Server Component in the repo.

**Full pattern to copy** — from `app/(app)/page.tsx:1-19`:
```tsx
/**
 * Phase 1 (FOUND-06) placeholder root route.
 * Phase 6 (HOME-01..05, issue #95) replaces this entirely with the home/hero screen.
 */
import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>recommend-a — coming soon</h1>
      <p>
        Foundation phase placeholder. The real home screen ships in Phase 6.
      </p>
      <p>
        <Link href="/tokens">View design tokens placeholder →</Link>
      </p>
    </main>
  );
}
```

Adapted for `/forgot` (static, no `"use client"`, no async data, single `<Link>` back to `/login`):
- Title → `<h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center">Reset password — coming soon</h1>` (UI-SPEC §Copywriting Forgot table; arbitrary values match the auth-page title style)
- Body → `<p className="text-center text-text-secondary text-[13px] mt-1.5">Password reset is coming in a future update.</p>`
- Back link → `<Link href="/login" className="...">← Back to sign in</Link>` (verbatim arrow `←` U+2190 — UI-SPEC verification hook #9)

**Not Client.** No `"use client"`. The page renders inside the AuthShell card automatically (the route-group layout wraps `{children}`).

---

### `frontend/web/lib/api/auth.ts` (service / typed mock seam, request-response with localStorage)

**No close analog** — `lib/api/` is empty (`.gitkeep` only). Closest convention donors:

**Export style + no-side-effects-on-import** — copy from `frontend/web/lib/utils.ts:1-6`:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
Pattern: top-level `import` block, named `export function`, zero side effects at module load time. Apply the same pattern to `lib/api/auth.ts` — every persistence read/write happens inside an exported function, never at module top-level (so SSR/RSC tree-shaking and tests can import without touching `localStorage`).

**File-header doc-comment** — copy the doc-comment idiom from `BrandMark.tsx:1-13` and `Sidebar.tsx:3-21`:
```ts
/**
 * Phase 4 (AUTH-01..06, issue #93) — typed mock auth seam.
 *
 * Cognito-shaped surface that the real Cognito SDK will replace in v2 (INTG-01..04).
 * Persists registered users in `recommend-a.users` localStorage key (D-02);
 * persists the active session in `recommend-a.session` (D-04).
 * Throws Cognito-shaped error names: UsernameExistsException, NotAuthorizedException.
 *
 * Module is import-safe (no top-level localStorage access — every read/write happens
 * inside an exported function). Tests may override MOCK_LATENCY_MS to [0, 0] (D-03).
 */
```

**Module constant export pattern** (for `MOCK_LATENCY_MS`, `SESSION_KEY`, `USERS_KEY`) — derived from `Sidebar.tsx:37-43` (the `NAV_ITEMS` `as const` pattern):
```ts
export const MOCK_LATENCY_MS = [400, 700] as const;
export const SESSION_KEY = 'recommend-a.session' as const;
export const USERS_KEY   = 'recommend-a.users'   as const;
```
The `as const` narrows the literal types (matches the Sidebar `NAV_ITEMS` style).

**TypeScript surface — `type` keyword + alias style** — copy from `Sidebar.tsx:29-35, 50-52`:
```ts
type Session = {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  ExpiresAt: number;
  user: { email: string; sub: string };
};

type Credentials = { email: string; password: string };
```
Use `type` (not `interface`) — matches every existing project file (`Sidebar.tsx:29`, `Navbar.tsx:17`, `BrandMark.tsx:15`, `PageLayout.tsx:18`).

**Cognito-shaped error subclass pattern** (no analog — define inline, name verbatim per CONTEXT D-02):
```ts
export class UsernameExistsException extends Error {
  name = 'UsernameExistsException' as const;
}
export class NotAuthorizedException extends Error {
  name = 'NotAuthorizedException' as const;
}
```
The `name` field is the load-bearing identifier (UI-SPEC verification hook #11 greps for these strings).

**Session-key centralization** — UI-SPEC verification hook #4 mandates the literal strings `'recommend-a.session'` and `'recommend-a.users'` appear ONLY in `lib/api/auth.ts`. Page-level handlers must import `signIn` / `signUp` / `signOut` and never reach into `localStorage` directly.

---

### `frontend/web/components/Field.tsx` (reusable Client component, event-driven controlled input)

**Analog:** `frontend/web/components/Sidebar.tsx` (best Client-component-with-conditional-Tailwind donor in the repo).

**`"use client"` placement + doc-comment** — copy from `Sidebar.tsx:1-21`:
```tsx
"use client";

/**
 * Phase 4 (AUTH-XX, issue #93) — reusable form input with floating label.
 *
 * Re-authored fresh from frontend/_design-reference/auth.jsx:38-69 per CLAUDE.md
 * hard rule #2 (no JSX import from _design-reference/).
 *
 * DSGN-06 escape hatches (all confined to this file — see UI-SPEC §Spacing exceptions):
 *   - pt-[18px]            : input top inset (floating-label geometry anchor)
 *   - top-[14px] / top-1.5 : resting / lifted label position
 *   - text-[10px]          : lifted label size (below Phase 2 type scale, second occurrence)
 *   - text-[13px]          : resting label size (between text-12 and text-14)
 *   - tracking-[0.06em]    : lifted label letter-spacing
 */
```

**Imports for a Client component** — copy the import-shape from `Sidebar.tsx:23-27`:
```tsx
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
```
- `useId` — UI-SPEC §Accessibility minimums + verification hook #13 require `useId()` for label association.
- `useState` — internal show/hide toggle for `type="password"`.
- `Eye` / `EyeOff` — `size={16}` per CONTEXT §Specifics ("eye icon size 16").

**Prop-type interface** — copy the `type Props = { ... }` pattern from `Sidebar.tsx:50-52`, `Navbar.tsx:17-21`:
```tsx
type FieldProps = {
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
};

export function Field({ label, type = 'text', value, onChange, error, hint, name, autoComplete, disabled }: FieldProps) { ... }
```
Default-export style is NOT used in this repo; every component is a named `export function` (see Sidebar, Navbar, Footer, BrandMark, PageLayout). Match that.

**Conditional className via `cn()`** — copy verbatim from `Sidebar.tsx:86-91`:
```tsx
className={cn(
  "relative w-11 h-11 rounded-md flex items-center justify-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
  active
    ? "text-text-primary bg-surface-elevated"
    : "text-text-muted hover:text-text-primary"
)}
```
Apply the same pattern for `<Field>`'s input border:
```tsx
<input
  className={cn(
    "peer w-full h-12 pt-[18px] pb-1.5 px-3.5 bg-surface text-text-primary text-14 leading-none rounded-md border transition-colors duration-150 focus:bg-surface-elevated focus:border-accent",
    error ? "border-danger" : "border-border"
  )}
  // ...
/>
```

**Focus-ring pattern** (consistency with Phase 3 chrome) — copy from `Sidebar.tsx:87, 104`:
```
focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
```
Apply to the show/hide eye toggle button (UI-SPEC §Interaction Contracts row "show/hide eye toggle | Focus").

**`useState` show/hide toggle** — copy structure from `_design-reference/auth.jsx:39-41` (re-authored):
```tsx
const [show, setShow] = useState(false);
const isPassword = type === 'password';
const inputType = isPassword && show ? 'text' : type;
```

**`useId()` label association** — UI-SPEC verification hook #13:
```tsx
const reactId = useId();
const inputId = `${reactId}-input`;
const msgId   = `${reactId}-msg`;
// ...
<input id={inputId} aria-describedby={msgId} aria-invalid={error ? true : undefined} ... />
<label htmlFor={inputId}>{label}</label>
<div id={msgId} aria-live="polite">{error ?? hint}</div>
```

**Floating-label Tailwind sibling pattern** (no inline style — UI-SPEC verification hook #2 forbids `style={{ }}`) — derived from UI-SPEC §Component Inventory `<Field>` row:
```tsx
<input className="peer ..." placeholder=" " ... />
<label
  htmlFor={inputId}
  className="absolute left-3.5 top-[14px] text-[13px] text-text-muted pointer-events-none transition-all duration-150 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:tracking-[0.06em] peer-focus:uppercase peer-focus:text-text-secondary peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[10px] peer-[&:not(:placeholder-shown)]:tracking-[0.06em] peer-[&:not(:placeholder-shown)]:uppercase peer-[&:not(:placeholder-shown)]:text-text-secondary"
>
  {label}
</label>
```
The single literal-space `placeholder=" "` keeps `:placeholder-shown` toggling correctly without ever rendering visible placeholder text (CONTEXT §Specifics, UI-SPEC §Component Inventory).

**Inline error/hint slot** — re-author from `_design-reference/auth.jsx:62-66`, but use Phase 2 token `text-12` (UI-SPEC §Typography "<Field> error / hint" — drift +1 px from reference 11 px is the documented accessibility nudge):
```tsx
<p
  id={msgId}
  aria-live="polite"
  className={cn(
    "text-12 leading-tight",
    error ? "text-danger" : "text-text-muted"
  )}
>
  {error ?? hint}
</p>
```

---

### `frontend/web/components/AccountMenu.tsx` (reusable Client component, event-driven popover)

**Analog:** `frontend/web/components/Sidebar.tsx` (Client Component with `lucide-react` icons, `<Link>` + `<button>` mix, `useRouter`-family hook from `next/navigation`).

**`"use client"` + doc-comment** — copy from `Sidebar.tsx:1-21`:
```tsx
"use client";

/**
 * Phase 4 (AUTH-XX, issue #93) — account-menu popover wrapper.
 *
 * Wraps the trigger element (children, asChild) in a shadcn Popover. Used by:
 *   - components/Sidebar.tsx desktop avatar (when loggedIn)  — D-05
 *   - components/Navbar.tsx greeting cluster (when loggedIn) — D-05
 *
 * Contains two menu items hardcoded inside this component:
 *   - Account → <Link href="/preferences">       (CONTEXT D-05)
 *   - Sign out → signOut() + router.push('/login')
 */
```

**Imports** — copy shape from `Sidebar.tsx:23-27` and extend with shadcn primitives + the new auth module:
```tsx
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { signOut } from "@/lib/api/auth";
```

**Prop-type pattern** — copy from `Navbar.tsx:17-21`:
```tsx
type AccountMenuProps = {
  children: React.ReactNode;
  userName?: string;
};

export function AccountMenu({ children, userName = "June" }: AccountMenuProps) { ... }
```
Default `"June"` matches `Navbar.tsx:23` (`userName = "June"`) and `Sidebar.tsx:57` (`"Account: June"` literal — Phase 5 derives this from `useAuth()`).

**`<button>` for action, `<Link>` for navigation** — copy the mix from `Sidebar.tsx:81-94, 99-113` (Link for navigation) + `Navbar.tsx:32-38` (button for action):
- Account item → `<Link href="/preferences">` (navigates)
- Sign out item → `<button type="button" onClick={handleSignOut}>` (acts, then navigates programmatically via `router.push`)

**Sign-out handler pattern** — derived from CONTEXT D-05 + the `useRouter` import shape:
```tsx
const router = useRouter();
const handleSignOut = () => {
  signOut();
  router.push('/login');
};
```

**Popover content className** — UI-SPEC §Color "Popover content background":
```tsx
<PopoverContent
  side="bottom"          // override per consumer (Sidebar uses side="right", Navbar uses side="bottom")
  align="end"
  sideOffset={8}
  className="min-w-44 p-1 bg-surface-elevated border border-border rounded-md shadow-lg"
>
  <Link
    href="/preferences"
    className="flex items-center gap-2 px-3 py-2 rounded-sm text-14 font-medium text-text-primary hover:bg-surface-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
  >
    <User size={16} />
    Account
  </Link>
  <button
    type="button"
    onClick={handleSignOut}
    className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-14 font-medium text-danger hover:bg-danger/10 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
  >
    <LogOut size={16} />
    Sign out
  </button>
</PopoverContent>
```

**`<PopoverTrigger asChild>` to preserve children semantics** (UI-SPEC §Component Inventory `<AccountMenu>` row — "wraps its children inside `<PopoverTrigger asChild>`"):
```tsx
<Popover>
  <PopoverTrigger asChild>{children}</PopoverTrigger>
  <PopoverContent ...>...</PopoverContent>
</Popover>
```

**`side` / `align` per consumer** — UI-SPEC §Responsive Behavior "Account popover positioning details":
- Sidebar avatar trigger → `side="right" align="start"`
- Navbar greeting trigger → `side="bottom" align="end"`

To keep both call sites clean, accept an optional prop:
```tsx
type AccountMenuProps = {
  children: React.ReactNode;
  userName?: string;
  side?: "right" | "bottom";   // default "bottom"
  align?: "start" | "end";     // default "end"
};
```
Sidebar passes `side="right" align="start"`; Navbar omits both (defaults).

---

### `frontend/web/components/ui/popover.tsx` (shadcn primitive — generated)

**Generation command** (CONTEXT D-07 + UI-SPEC §Registry Safety):
```bash
cd frontend/web && pnpm dlx shadcn add popover
```
Scaffolds into `frontend/web/components/ui/popover.tsx`. **Do not modify the generated file.** Token-purity is achieved by passing `className` overrides at the consumer (`<AccountMenu>`), not by editing the primitive (UI-SPEC §Component Inventory row).

**Generated file conventions** are owned by the shadcn CLI; the only project-side concern is that `components.json` already exists at `frontend/web/components.json` with `"ui": "@/components/ui"` alias and `style: "base-nova"` (verified). Radix `@radix-ui/react-popover` will be auto-installed as a transitive dependency (UI-SPEC §Registry Safety note).

---

### `frontend/web/components/Sidebar.tsx` (MODIFIED — wrap avatar in `<AccountMenu>` when logged-in)

**Self-edit target:** lines 99-113 (the bottom avatar block).

**Existing code** (`Sidebar.tsx:99-113`):
```tsx
<div className="mt-auto flex flex-col items-center pb-3">
  <Link
    href={avatarHref}
    aria-label={avatarLabel}
    title={avatarLabel}
    className="w-9 h-9 rounded-full border border-border-strong flex items-center justify-center text-text-muted hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
  >
    {loggedIn ? (
      // TODO Phase 5: derive initials from useAuth().user
      <span className="font-display text-12 font-semibold text-text-primary">JR</span>
    ) : (
      <User size={16} />
    )}
  </Link>
</div>
```

**Edit pattern** — branch on `loggedIn`:
- When `loggedIn === true`: replace the `<Link>` with a `<button type="button">` (popover trigger; same className) wrapped in `<AccountMenu side="right" align="start" userName="June">`.
- When `loggedIn === false`: keep the existing `<Link href="/login">` exactly as-is.

**Preserve:**
- `loggedIn?: boolean` prop type (line 51) — UNCHANGED.
- `"use client"` directive (line 1) — UNCHANGED.
- `cn()` import — UNCHANGED.
- Avatar visual classes (`w-9 h-9 rounded-full ...`) — copied verbatim onto the new `<button>`.

**New import to add** (top of file, after the existing imports at line 23-27):
```tsx
import { AccountMenu } from "@/components/AccountMenu";
```

**aria-label override** — UI-SPEC §Copywriting "Trigger aria-label (Sidebar avatar, logged-in)":
```tsx
aria-label={`Account menu for ${userName}`}
```
Note: the existing `avatarLabel` const computes `"Account: June"` for the logged-in path; replace that with the new template-literal aria-label only on the `<button>` branch. The logged-out `<Link>` keeps `aria-label="Sign in"`.

---

### `frontend/web/components/Navbar.tsx` (MODIFIED — wrap greeting in `<AccountMenu>` when logged-in)

**Self-edit target:** line 60 (the greeting `<span>`).

**Existing code** (`Navbar.tsx:50-61`):
```tsx
{loggedIn ? (
  <div className="flex items-center gap-3">
    <button
      type="button"
      disabled
      aria-label="Notifications (coming soon)"
      className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted"
    >
      <Bell size={18} />
    </button>
    <span className="text-text-secondary text-14 font-medium">Hi, {userName}</span>
  </div>
) : (
  // ... unchanged sign-in / create-account block
)}
```

**Edit pattern** — replace the `<span>` with a `<button type="button">` (popover trigger; same visible className) wrapped in `<AccountMenu userName={userName}>`. Defaults `side="bottom" align="end"` per UI-SPEC §Responsive.

**Preserve:**
- Server Component status (no `"use client"` — UI-SPEC §Component Inventory row "Navbar must stay a Server Component"). `<AccountMenu>` is a Client child; Next.js handles the boundary automatically.
- `loggedIn` / `userName` / `variant` prop types (lines 17-21) — UNCHANGED.
- `variant === 'mobile'` branch (lines 24-40) — UNCHANGED (D-06 keeps mobile behavior).
- The Notifications `<button>` next to the greeting (lines 52-59) — UNCHANGED.

**Mobile branch is NOT wrapped** — D-06: only `variant === 'home'` (desktop) gets the popover.

**New import to add** (after line 15):
```tsx
import { AccountMenu } from "@/components/AccountMenu";
```

**aria-label override** — UI-SPEC §Copywriting "Trigger aria-label (Navbar greeting, logged-in)":
```tsx
<button type="button" aria-label={`Account menu for ${userName}`} className="text-text-secondary text-14 font-medium hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
  Hi, {userName}
</button>
```

---

## Shared Patterns

### Client-vs-Server boundary (`"use client"` placement)

**Source:** `frontend/web/components/Sidebar.tsx:1` (the only Client Component in the existing chrome).

**Apply to:** `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `components/Field.tsx`, `components/AccountMenu.tsx`. **Do NOT apply to:** `app/(auth)/forgot/page.tsx`, `lib/api/auth.ts`, `components/Navbar.tsx` (modified — stays Server).

```tsx
"use client";

/**
 * <doc-comment>
 */

import ...
```
The directive sits on byte 0; the doc-comment block follows immediately; imports follow the doc-comment. Match `Sidebar.tsx` line-for-line ordering.

---

### Path alias `@/`

**Source:** every existing file under `app/` and `components/` (e.g. `Sidebar.tsx:26-27`, `app/(auth)/layout.tsx:17`, `PageLayout.tsx:15-16`, `app/layout.tsx:3`).

**Apply to:** every Phase 4 file. No relative `../` imports anywhere in `app/` or `components/`. The alias map (from `components.json:14-21`):
- `@/components` → `frontend/web/components`
- `@/lib/utils` → `frontend/web/lib/utils`
- `@/components/ui` → `frontend/web/components/ui`
- `@/lib` → `frontend/web/lib`

```tsx
import { signIn } from "@/lib/api/auth";
import { Field } from "@/components/Field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
```

---

### `cn()` helper for conditional classNames

**Source:** `frontend/web/lib/utils.ts:1-6`:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Usage pattern** — copy from `Sidebar.tsx:86-91`, `Sidebar.tsx:131-134, 151-154`:
```tsx
className={cn(
  "<base classes>",
  condition ? "<true classes>" : "<false classes>"
)}
```

**Apply to:** `<Field>` input border (`error` ? `border-danger` : `border-border`), `<Field>` error/hint color (`error` ? `text-danger` : `text-text-muted`), submit-button disabled affordance, anywhere a Phase 4 component needs a conditional className.

---

### Focus-ring pattern

**Source:** `Sidebar.tsx:87, 104, 152` — appears 3× in Phase 3 code, locked as the chrome focus-ring contract.

**Outset (default):**
```
focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
```

**Inset (popover items, where outset clips against the popover border)** — UI-SPEC §Color "Menu-item focus ring":
```
focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]
```

**Apply to:** `<Field>` input (browser default ring is OK — but add the explicit ring on the show/hide eye `<button>`); submit button; popover trigger; popover menu items; bottom-card `Create an account` / `Sign in` link; `Forgot password?` link; forgot-stub Back link.

---

### lucide-react icon usage

**Source:** `Sidebar.tsx:25, 93, 110` (`Home, Clock, Sparkles, Bookmark, User` at size 16 / 20 / 22), `Navbar.tsx:14, 37, 58` (`Bell` at size 18).

**Phase 4 icons + sizes** (per UI-SPEC §Design System "Icon library"):
- `Eye` / `EyeOff` — `size={16}` (Field show/hide toggle; CONTEXT §Specifics)
- `ArrowRight` — `size={16}` (Sign in / Create account submit buttons; UI-SPEC §Copywriting)
- `LogOut` — `size={16}` (popover Sign-out item)
- `User` — `size={16}` (popover Account item)
- `AlertCircle` — `size={16}` (form-level error banner; UI-SPEC §Color "Form-level error banner color contract")

```tsx
import { Eye, EyeOff, ArrowRight, LogOut, User, AlertCircle } from "lucide-react";
// ...
<Eye size={16} />
```
The numeric `size={16}` is icon-internal API (not a design token) — explicitly OK per CONTEXT §Specifics ("size={16} is icon-internal, not a token").

---

### Doc-comment file-header style

**Source:** `Sidebar.tsx:3-21`, `Navbar.tsx:1-11`, `BrandMark.tsx:1-13`, `PageLayout.tsx:1-12`, `Footer.tsx:1-9`, `app/(auth)/layout.tsx:1-15`.

**Required sections in the doc-comment block:**
1. Phase number + ticket ID + issue number (`Phase 4 (AUTH-XX, issue #93) — <one-line purpose>`)
2. What it does / where it lives in the architecture
3. Any DSGN-06 escape hatches it introduces (with one-line justification each)
4. Server/Client boundary note when relevant

```tsx
/**
 * Phase 4 (AUTH-XX, issue #93) — <purpose>.
 *
 * <architecture context>
 *
 * DSGN-06 escape hatches (if any):
 *   - <utility>  : <reason>
 */
```

**Apply to:** every new Phase 4 file. The modified Sidebar / Navbar files do NOT need new doc-comments — append a one-liner above the avatar / greeting block referencing Phase 4.

---

### Theme-token-only className

**Source:** `frontend/web/AGENTS.md` DSGN-06 (read in this session) + every existing component file's className strings.

**Verification recipe** (UI-SPEC §Verification Hooks #1, #2; AGENTS.md "How to verify before pushing"):
```bash
git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'app/(auth)/' 'components/Field.tsx' 'components/AccountMenu.tsx'   # expect 0
git grep -nE 'className=.*rgba?\('             -- 'app/(auth)/' 'components/Field.tsx' 'components/AccountMenu.tsx'   # expect 0
git grep -nE 'style=\{'                        -- 'app/(auth)/' 'components/Field.tsx' 'components/AccountMenu.tsx'   # expect 0
```

**Allowed escape hatches in Phase 4** (each with `// non-tokenized: ...` inline comment, all confined to `Field.tsx` + the two auth pages — UI-SPEC §Token Coverage Audit):
- `text-[26px]`, `text-[13px]`, `text-[10px]` — display + secondary copy + lifted-label sizes
- `tracking-[-0.02em]`, `tracking-[-0.005em]`, `tracking-[0.06em]` — title + button + lifted-label letter-spacings
- `pt-[18px]`, `top-[14px]` — Field input + resting-label geometry
- `leading-[1.02]` — auth-title line-height

**No escape hatches in:** `AccountMenu.tsx`, `lib/api/auth.ts`, `forgot/page.tsx`. The popover, the auth module, and the static stub have zero arbitrary values.

---

### `next/link` for internal navigation, `<button>` for actions

**Source:** `Sidebar.tsx` mixes both — `<Link>` at line 82 (navigation) and the `loggedIn` avatar `<Link href={avatarHref}>` at line 100 (navigation). `Navbar.tsx:32-38` uses `<button type="button" disabled>` for the Notifications affordance (action — currently disabled).

**Phase 4 application:**
- `<Link href="/forgot">` for `Forgot password?` (navigation)
- `<Link href="/register">` / `<Link href="/login">` for bottom-card link clusters (navigation)
- `<Link href="/preferences">` for popover Account item (navigation)
- `<Link href="/login">` for forgot-stub Back link (navigation)
- `<button type="submit">` for form submit (action)
- `<button type="button" onClick={...}>` for Field show/hide eye toggle (action)
- `<button type="button" onClick={handleSignOut}>` for popover Sign-out item (action — calls signOut, then router.push)

The popover trigger itself is a `<button>` (action — opens menu) but inherits its element type from the `children` passed by the consumer, since `<PopoverTrigger asChild>` injects Radix props onto the existing element.

---

### Named export, no default export (component files)

**Source:** every component file in `frontend/web/components/` — `export function Sidebar(...)`, `export function Navbar(...)`, `export function BrandMark(...)`, `export function Footer(...)`, `export function PageLayout(...)`. **No default exports.**

**Apply to:** `Field.tsx` → `export function Field(...)`. `AccountMenu.tsx` → `export function AccountMenu(...)`.

**Exception:** route pages and layouts under `app/` MUST be default exports (Next.js contract). Match `app/(app)/page.tsx:7` (`export default function HomePage()`), `app/(auth)/layout.tsx:19` (`export default function AuthGroupLayout(...)`), `app/(app)/layout.tsx:17` (`export default function AppGroupLayout(...)`). Apply to:
- `app/(auth)/login/page.tsx` → `export default function LoginPage()`
- `app/(auth)/register/page.tsx` → `export default function RegisterPage()`
- `app/(auth)/forgot/page.tsx` → `export default function ForgotPage()`

---

## No Analog Found

| File | Role | Data Flow | Reason | Fallback |
|------|------|-----------|--------|----------|
| `frontend/web/lib/api/auth.ts` | service / mock seam | request-response w/ localStorage | `lib/api/` is empty — first occupant. No existing async module, no existing localStorage consumer in the project. | Use the convention donors listed in §Pattern Assignments (export style from `lib/utils.ts`; `as const` constants from `Sidebar.tsx`; `type` aliases from every component file; doc-comment from `BrandMark.tsx`/`Sidebar.tsx`). The functional shape (signIn/signUp/signOut/getSession + Cognito-shaped throws + Session type) is fully specified in CONTEXT D-02..D-04 and UI-SPEC §Component Inventory. |
| `frontend/web/components/ui/popover.tsx` | shadcn primitive | passive | `components/ui/` is empty — first occupant. shadcn-generated; no manual edits per UI-SPEC §Component Inventory. | None needed — output of `pnpm dlx shadcn add popover`. |

---

## Metadata

**Analog search scope:**
- `frontend/web/app/` — all `.tsx` files (5 files: root layout, app group layout, app group home page, tokens page, auth group layout)
- `frontend/web/components/` — all `.tsx` files (5 files: BrandMark, Sidebar, Navbar, Footer, PageLayout)
- `frontend/web/lib/` — all `.ts` files (1 file: utils.ts)
- `frontend/web/components.json`, `frontend/web/package.json` — config + dependency surface
- `frontend/web/AGENTS.md` — DSGN-06 author rule
- `frontend/_design-reference/auth.jsx:3-261` — visual source of truth (read for numbers/copy, not imported)

**Files scanned:** 12 project files (excluding `node_modules/`, `.gitkeep`).

**Project skills checked:** `.claude/skills/`, `.agents/skills/` — neither directory exists. No project skills to load.

**Pattern extraction date:** 2026-05-06

---
