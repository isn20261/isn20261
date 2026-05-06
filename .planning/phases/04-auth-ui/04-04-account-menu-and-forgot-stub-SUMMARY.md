---
phase: 04
plan: 04
subsystem: auth
tags: [auth, popover, account-menu, forgot-stub, sign-out, AUTH-06]
requirements: [AUTH-06]
dependency-graph:
  requires:
    - frontend/web/lib/api/auth.ts (signOut from Plan 04-01)
    - frontend/web/components/ui/popover.tsx (shadcn Popover from Plan 04-01 — base-ui backed)
    - frontend/web/components/Sidebar.tsx (Phase 3 chrome — modified in place)
    - frontend/web/components/Navbar.tsx (Phase 3 chrome — modified in place)
    - frontend/web/app/(auth)/layout.tsx (AuthShell from Phase 3 — wraps /forgot)
  provides:
    - frontend/web/app/(auth)/forgot/page.tsx (D-01 stub Server Component)
    - frontend/web/components/AccountMenu.tsx (D-05 popover wrapper)
  affects:
    - downstream Plan 04-05 (verification — AUTH-06 acceptance grep + manual smoke)
    - downstream Phase 5 (auth context will swap loggedIn from manual prop to useAuth().isAuthenticated; AccountMenu Sign-out continues to work unchanged)
    - downstream Phase 8 (Preferences page — Account menu item already routes there)
tech-stack:
  added: []  # @base-ui/react and lucide-react already installed Phases 1 + 3
  patterns:
    - "Popover wrapper exposing children via base-ui's `render` prop (NOT Radix `asChild`) — base-ui PopoverTrigger accepts ReactElement via render"
    - "Sidebar branches on loggedIn: <AccountMenu><button> when true, <Link> when false — preserves logged-out anonymous-user navigation"
    - "Server Navbar renders Client AccountMenu child without becoming Client itself — Next.js 16 Server-renders-Client tree composition"
    - "Mobile chrome kept untouched (D-06) — no popover on the 64 px tab bar"
    - "Inset focus ring (focus-visible:outline-offset-[-2px]) on popover menu items so the ring doesn't clip against the popover border"
key-files:
  created:
    - frontend/web/app/(auth)/forgot/page.tsx (39 lines)
    - frontend/web/components/AccountMenu.tsx (73 lines)
  modified:
    - frontend/web/components/Sidebar.tsx (176 lines, +13 / -3 from previous 165)
    - frontend/web/components/Navbar.tsx (89 lines, +9 / -1 from previous 80)
decisions:
  - "AccountMenu uses base-ui's `render={children}` prop, not Radix `asChild` — primitive shipped in Plan 04-01 wraps @base-ui/react (documented divergence from PLAN action body which assumed Radix)"
  - "Sidebar gains optional userName prop (default 'June') so AccountMenu aria-label template can interpolate; backwards-compatible — existing callers passing only `loggedIn` still typecheck"
  - "Navbar stays a Server Component — adding 'use client' would have been a Phase 3 chrome regression and is unnecessary (Server-renders-Client is supported)"
  - "PopoverContent className override stacks token utilities (min-w-44 p-1 bg-surface-elevated border border-border rounded-md shadow-lg w-auto gap-0) after shadcn defaults; tailwind-merge resolves the conflict so the consumer wins"
  - "Sign-out item is a `<button type='button'>` (action), Account item is a `<Link>` (navigation); destructive copy `Sign out` is the affordance, no confirmation modal (CONTEXT D-05)"
metrics:
  duration: ~10 min
  completed: 2026-05-06
---

# Phase 04 Plan 04: AccountMenu + Forgot Stub Summary

**One-liner:** Ships AUTH-06 (logout in the app shell) by introducing a shared `<AccountMenu>` Client Component (Account → /preferences, Sign out → signOut + router.push('/login')) anchored on both the desktop Sidebar avatar and the desktop Navbar greeting, plus the D-01 `/forgot` Server Component stub that catches the design's "Forgot password?" link.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Author /forgot stub Server Component (D-01) | `b5792e3` | `frontend/web/app/(auth)/forgot/page.tsx` |
| 2 | Author AccountMenu Client Component (D-05, AUTH-06) | `1e29770` | `frontend/web/components/AccountMenu.tsx` |
| 3 | Wire Sidebar avatar + Navbar greeting through AccountMenu when logged-in | `4f5e3fa` | `frontend/web/components/Sidebar.tsx`, `frontend/web/components/Navbar.tsx` |

## Public Surface (downstream consumers)

```ts
// Available to import from any Client Component (Phase 5+ callers)
import { AccountMenu } from "@/components/AccountMenu";

type AccountMenuProps = {
  children: React.ReactNode;
  userName?: string;        // default "June" (Phase 5 will derive from useAuth().user)
  side?: "right" | "bottom"; // default "bottom"
  align?: "start" | "end";   // default "end"
};

// Sidebar gained an optional userName prop (Phase 3 callers unaffected — default keeps "June")
type SidebarProps = {
  loggedIn?: boolean;
  userName?: string;
};
```

## Verification Results

- `cd frontend/web && pnpm tsc --noEmit` → exit 0 (clean)
- `cd frontend/web && pnpm lint` → exit 0 (clean)
- `cd frontend/web && pnpm build` → exit 0; new `/forgot` route appears in static prerender list alongside `/`, `/login`, `/register`, `/tokens`
- UI-SPEC verification hook #9 (forgot stub copy verbatim, U+2190 arrow): PASS — file contains `← Back to sign in` and `Password reset is coming in a future update.` byte-exact, plus the em-dash `Reset password — coming soon` title (U+2014)
- UI-SPEC verification hook #14 (AccountMenu wraps Sidebar avatar + Navbar greeting): PASS — `git grep -F "AccountMenu"` shows 3 hits in each chrome file (1 import + 2 JSX usages each)
- DSGN-06 (no hex / no inline style) in Phase 4 surfaces: PASS — `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}'` returns 0 hits across the four touched files; `git grep -nE 'style=\{'` returns 0 hits
- Sidebar `"use client"` preserved at byte 0; Navbar contains zero `"use client"` directives — chrome boundaries unchanged
- AUTH-06 contract (signOut clears localStorage session): traceable through `<AccountMenu>` Sign-out `<button>` → `handleSignOut` → `signOut()` from `@/lib/api/auth` (which performs `window.localStorage.removeItem(SESSION_KEY)` per Plan 04-01 source) → `router.push('/login')`. Devtools-verifiable smoke is deferred to Plan 04-05 (end-of-phase manual check).

## Public Surface — file diffs (load-bearing)

### `frontend/web/components/Sidebar.tsx` (avatar block: lines 99-113 → 99-123)

Was a single `<Link href={avatarHref}>` with the JR-or-User-icon ternary inside it. Now a `loggedIn` ternary at the outer level: when true, an `<AccountMenu side="right" align="start" userName={userName}>` wraps a `<button>` carrying the same circle styling and `JR` initials; when false, the original `<Link href={avatarHref}>` renders unchanged with the lucide `<User size={16}>` glyph. Plus a one-line import addition (`AccountMenu`) and a new optional `userName` field on `SidebarProps` with default `"June"`.

### `frontend/web/components/Navbar.tsx` (greeting: line 60 → lines 60-68)

Was `<span className="text-text-secondary text-14 font-medium">Hi, {userName}</span>`. Now an `<AccountMenu userName={userName}>` wrapping a `<button type="button" aria-label={\`Account menu for ${userName}\`}>Hi, {userName}</button>`. The button's className adds `hover:text-text-primary` (interactive affordance the static span didn't need), `transition-colors duration-150` (matches Phase 3 chrome focus pattern), and the standard focus-ring + `rounded-sm`. The mobile-variant block, the Notifications button, and the logged-out branch (Sign-in / Create-account links) are untouched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — blocking issue] AccountMenu uses base-ui `render` prop, not Radix `asChild`**
- **Found during:** Task 2
- **Issue:** The PLAN.md action body specifies `<PopoverTrigger asChild>{children}</PopoverTrigger>` and the `<verify>` grep checks for `grep -c "asChild"`. However, the shadcn primitive shipped in Plan 04-01 wraps `@base-ui/react/popover` (NOT `@radix-ui/react-popover`) — Plan 04-01 SUMMARY explicitly documents this divergence. Base-UI `PopoverTrigger` does not accept `asChild`; it accepts a `render` prop typed as `React.ReactElement` for trigger composition.
- **Fix:** Used `<PopoverTrigger render={children as React.ReactElement<Record<string, unknown>>} />` instead. Functionally equivalent — base-ui injects the popover-trigger props onto the rendered child element, preserving the wrapping element's existing className, aria attributes, and event handlers. Same behavior the PLAN intended.
- **Files modified:** `frontend/web/components/AccountMenu.tsx`
- **Commit:** `1e29770`
- **Why downstream-safe:** UI-SPEC §"Component Inventory — `<Popover>`" already authorized className overrides via the consumer; the trigger composition mechanism is an implementation detail of the primitive. Plan 04-05 verification hook #14 only checks that `AccountMenu` is referenced in Sidebar / Navbar, which still passes. The PLAN.md verify hook `grep -c "asChild"` is now spurious for this codebase but does not affect functional acceptance.

**2. [Rule 2 — missing critical functionality] PopoverContent className adds `w-auto gap-0`**
- **Found during:** Task 2
- **Issue:** The shadcn-generated `popover.tsx` ships PopoverContent with default `w-72 gap-2.5 p-2.5 rounded-lg bg-popover ...`. Without explicit `w-auto` and `gap-0` overrides, the popover would either render at fixed 288 px width (defeating `min-w-44`) or with extra vertical gaps between menu items inconsistent with UI-SPEC §"Spacing Scale" (Account and Sign out should sit flush, separated only by their own `py-2` padding).
- **Fix:** Appended `w-auto gap-0` to the `className` passed into `<PopoverContent>` so tailwind-merge replaces the shadcn default `w-72 gap-2.5`.
- **Files modified:** `frontend/web/components/AccountMenu.tsx`
- **Commit:** `1e29770`

### None — out-of-scope

Plan executed inside its declared scope. No pre-existing warnings, lint errors, or unrelated failures encountered.

## Auth Gates

None — this plan made no network requests, performed no authentication, and required no secrets. The `signOut()` call is in-process localStorage manipulation only.

## Threat Surface Scan

No new threat surface introduced beyond the threat register in PLAN.md. The Sidebar avatar `<button>` and Navbar greeting `<button>` are interaction surfaces inside the existing chrome trust boundary; both call only `signOut()` and `router.push('/login')` — no dynamic redirect targets, no deserialization, no external resources fetched.

T-04-20 (Server Navbar leaking session data into Client AccountMenu) is mitigated as planned: Navbar passes only the `userName` string prop (already a Phase 3 prop, value is the literal `"June"` default this milestone). AccountMenu re-imports `signOut` on the client side; nothing crosses the Server→Client boundary except the userName string and the React-element children.

## Manual Smoke

Deferred to Plan 04-05 (end-of-phase verification). The plan's `<done>` section explicitly delegates the live popover-open / Sign-out / localStorage-cleared smoke to that verification plan.

## Self-Check: PASSED

- `frontend/web/app/(auth)/forgot/page.tsx` — FOUND (39 lines)
- `frontend/web/components/AccountMenu.tsx` — FOUND (73 lines)
- `frontend/web/components/Sidebar.tsx` — FOUND (176 lines, modified)
- `frontend/web/components/Navbar.tsx` — FOUND (89 lines, modified)
- Commit `b5792e3` (Task 1) — FOUND in `git log --oneline`
- Commit `1e29770` (Task 2) — FOUND in `git log --oneline`
- Commit `4f5e3fa` (Task 3) — FOUND in `git log --oneline`
- `pnpm tsc --noEmit && pnpm lint && pnpm build` — all exit 0 (verified before commits)
