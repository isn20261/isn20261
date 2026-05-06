---
phase: 04
plan: 04
type: execute
wave: 2
depends_on: [1]
files_modified:
  - frontend/web/app/(auth)/forgot/page.tsx
  - frontend/web/components/AccountMenu.tsx
  - frontend/web/components/Sidebar.tsx
  - frontend/web/components/Navbar.tsx
autonomous: true
requirements: [AUTH-06]
must_haves:
  truths:
    - "Navigating to /forgot shows the stub copy 'Password reset is coming in a future update.' inside the AuthShell card with a back link to /login"
    - "When the desktop Sidebar avatar is clicked while logged-in, an AccountMenu popover opens with two items: Account (links to /preferences) and Sign out (clears recommend-a.session and navigates to /login)"
    - "When the desktop Navbar greeting is clicked while logged-in, the same AccountMenu popover opens"
    - "Mobile Sidebar tab User-slot keeps Phase 3 behavior — navigates directly to /preferences with no popover"
    - "After clicking Sign out, recommend-a.session is removed from localStorage; recommend-a.users persists"
  artifacts:
    - path: "frontend/web/app/(auth)/forgot/page.tsx"
      provides: "Forgot-password stub Server Component (D-01)"
      contains: "Password reset is coming in a future update."
    - path: "frontend/web/components/AccountMenu.tsx"
      provides: "Popover wrapper with Account + Sign-out items (D-05)"
      contains: "use client, signOut, /preferences"
    - path: "frontend/web/components/Sidebar.tsx"
      provides: "Modified to wrap avatar in AccountMenu when logged-in (D-05)"
      contains: "AccountMenu"
    - path: "frontend/web/components/Navbar.tsx"
      provides: "Modified to wrap greeting in AccountMenu when logged-in + variant home (D-05)"
      contains: "AccountMenu"
  key_links:
    - from: "frontend/web/components/AccountMenu.tsx"
      to: "@/lib/api/auth signOut"
      via: "Sign-out menu item onClick handler"
      pattern: "signOut\\(\\)"
    - from: "frontend/web/components/AccountMenu.tsx"
      to: "@/components/ui/popover"
      via: "Popover, PopoverTrigger, PopoverContent"
      pattern: "from .[\"']@/components/ui/popover"
    - from: "frontend/web/components/Sidebar.tsx"
      to: "AccountMenu"
      via: "wraps avatar button when loggedIn === true"
      pattern: "AccountMenu"
    - from: "frontend/web/components/Navbar.tsx"
      to: "AccountMenu"
      via: "wraps greeting button when loggedIn === true && variant === 'home'"
      pattern: "AccountMenu"
---

<objective>
Ship the AUTH-06 logout surface and the D-01 forgot-password stub. The logout flow uses a shadcn Popover anchored on TWO desktop chrome surfaces (Sidebar avatar + Navbar greeting) that share a single `<AccountMenu>` Client Component. The forgot stub renders a Server Component placeholder so the design's `Forgot password?` link doesn't dangle.

Purpose: AUTH-06 (logout button in app shell that clears the localStorage session) requires actual chrome wiring — Plan 03 does not touch chrome. The forgot stub closes the loose link surfaced by Plan 03's `Forgot password?` link.

Output: One new Server Component (`/forgot` page), one new Client Component (`AccountMenu`), and minor edits to two existing Phase 3 components (Sidebar avatar, Navbar greeting) to wrap their trigger surfaces in `<AccountMenu>` when `loggedIn`.
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
@frontend/web/components/Sidebar.tsx
@frontend/web/components/Navbar.tsx
@frontend/web/app/(auth)/layout.tsx
@frontend/web/app/(app)/page.tsx
@frontend/web/components/ui/popover.tsx
@frontend/web/lib/api/auth.ts

<interfaces>
<!-- Inputs this plan consumes (created in Plan 01): -->

```ts
import { signOut } from "@/lib/api/auth";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
```

<!-- New AccountMenu surface that Sidebar and Navbar consume: -->
```tsx
type AccountMenuProps = {
  children: React.ReactNode;
  userName?: string;
  side?: "right" | "bottom";
  align?: "start" | "end";
};
export function AccountMenu(props: AccountMenuProps): JSX.Element;
```

<!-- New /forgot page (default-export Server Component): -->
```tsx
export default function ForgotPage(): JSX.Element;
```

<!-- Existing prop interfaces that MUST be preserved (no breaking changes): -->
```tsx
type SidebarProps = { loggedIn?: boolean };
type NavbarProps = { variant?: "home" | "mobile"; loggedIn?: boolean; userName?: string };
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Author /forgot stub Server Component (D-01)</name>
  <files>frontend/web/app/(auth)/forgot/page.tsx</files>
  <read_first>
    - frontend/web/app/(auth)/forgot/page.tsx (will be new — confirm currently absent)
    - frontend/web/app/(app)/page.tsx (analog: static placeholder Server Component with `<Link>`, default export, no "use client", doc-comment style)
    - frontend/web/app/(auth)/layout.tsx (the AuthShell wrapper this page renders inside)
    - .planning/phases/04-auth-ui/04-CONTEXT.md §"D-01 Forgot-password is a stub" (verbatim copy: 'Password reset is coming in a future update.' + '← Back to sign in' link to /login)
    - .planning/phases/04-auth-ui/04-UI-SPEC.md §"Copywriting Contract" Forgot stub table (locks the title to 'Reset password — coming soon' with em-dash and the verbatim back-link including U+2190 left arrow)
    - .planning/phases/04-auth-ui/04-PATTERNS.md §"frontend/web/app/(auth)/forgot/page.tsx" (full code excerpt and arbitrary-value comments)
  </read_first>
  <action>
Create `frontend/web/app/(auth)/forgot/page.tsx`. This is a STATIC Server Component — NO `"use client"` directive, no async data fetching, no useState. It renders inside the existing AuthShell card (the route-group layout wraps `{children}`).

**File structure:**

1. **File-header doc-comment** (no `"use client"` — Server Component):
```tsx
/**
 * Phase 4 (D-01, issue #93) — /forgot password-reset stub.
 *
 * Server Component placeholder. The design reference's 3-step recovery flow
 * (auth.jsx:162-261: email → check-email → strength-meter new-password) is
 * deferred to a future phase / v2 — issue #93 explicitly scopes Phase 4 to
 * AUTH-01..07 only.
 *
 * Renders inside the existing AuthShell card from app/(auth)/layout.tsx.
 *
 * DSGN-06 escape hatches (carry over from auth title styling — see UI-SPEC §Typography):
 *   - text-[26px], tracking-[-0.02em], leading-[1.02] : auth-title scale
 *   - text-[13px]                                     : auth-subtitle scale
 */
```

2. **Imports** — only `Link` from next/link (no React hooks, no lucide icons):
```tsx
import Link from "next/link";
```

3. **Default-export function** (Next.js page contract):
```tsx
export default function ForgotPage() {
  return (
    <>
      {/* non-tokenized: text-[26px], tracking-[-0.02em], leading-[1.02] match the reference .display class — see UI-SPEC §Typography */}
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
        Reset password — coming soon
      </h1>
      {/* non-tokenized: text-[13px] is the auth-subtitle scale — see UI-SPEC §Typography */}
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Password reset is coming in a future update.
      </p>
      <div className="flex justify-center mt-6">
        <Link
          href="/login"
          className="text-text-secondary hover:text-text-primary text-14 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          ← Back to sign in
        </Link>
      </div>
    </>
  );
}
```

**CRITICAL byte-exact copy notes:**

- **Title:** `Reset password — coming soon` — uses an EM DASH (U+2014, the long dash `—`), NOT a hyphen `-` and NOT an en-dash `–`. UI-SPEC §"Copywriting Contract" Forgot stub table locks this title.
- **Body:** `Password reset is coming in a future update.` — verbatim from CONTEXT D-01 with trailing period.
- **Back link copy:** `← Back to sign in` — starts with the LEFT-POINTING ARROW character `←` (U+2190), followed by a space, then `Back to sign in`. UI-SPEC verification hook #9 explicitly tests for the byte-exact U+2190 arrow.
- **No "use client"** — Server Component (CONTEXT D-01 confirmed).
- **Default export** required by Next.js page contract.
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint</automated>
    Plus the following grep checks:
    - `test -f frontend/web/app/\(auth\)/forgot/page.tsx`
    - `grep -c '"use client"' frontend/web/app/\(auth\)/forgot/page.tsx` returns 0 (Server Component)
    - `grep -c "export default function ForgotPage" frontend/web/app/\(auth\)/forgot/page.tsx` returns ≥ 1
    - `grep -c "Password reset is coming in a future update\." frontend/web/app/\(auth\)/forgot/page.tsx` returns ≥ 1 (UI-SPEC hook #9)
    - `grep -F "← Back to sign in" frontend/web/app/\(auth\)/forgot/page.tsx` returns 1 hit (UI-SPEC hook #9 — U+2190 arrow byte-exact)
    - `grep -c 'href="/login"' frontend/web/app/\(auth\)/forgot/page.tsx` returns ≥ 1
    - `grep -F "Reset password — coming soon" frontend/web/app/\(auth\)/forgot/page.tsx` returns 1 hit (em-dash U+2014)
    - `grep -E "className=.*#[0-9a-fA-F]{3,6}" frontend/web/app/\(auth\)/forgot/page.tsx` returns 0 hits (DSGN-06)
    - `grep -E "style=\\{" frontend/web/app/\(auth\)/forgot/page.tsx` returns 0 hits
  </verify>
  <acceptance_criteria>
    - File `frontend/web/app/(auth)/forgot/page.tsx` exists.
    - File does NOT contain `"use client"` (Server Component).
    - Default-exported `ForgotPage` function.
    - Renders the verbatim title `Reset password — coming soon` with em-dash U+2014.
    - Renders the verbatim body `Password reset is coming in a future update.`.
    - Renders a back link with the verbatim copy `← Back to sign in` (U+2190 arrow + space + text) navigating to `/login`.
    - Uses only theme tokens — zero hex literals, zero `style={` props.
    - `cd frontend/web && pnpm tsc --noEmit && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    /forgot stub renders inside the AuthShell card. Manually visiting `/forgot` (deferred to Plan 05) shows the title, body, and back link, and clicking the back link navigates to `/login`.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Author AccountMenu Client Component (D-05, AUTH-06)</name>
  <files>frontend/web/components/AccountMenu.tsx</files>
  <read_first>
    - frontend/web/components/AccountMenu.tsx (will be new — confirm currently absent)
    - frontend/web/components/Sidebar.tsx (analog: Client Component, "use client" placement, lucide imports, Link + button mix, useRouter via next/navigation, doc-comment style)
    - frontend/web/components/ui/popover.tsx (the shadcn primitive this component consumes — read the named exports Popover / PopoverTrigger / PopoverContent)
    - frontend/web/lib/api/auth.ts (the signOut function this component imports)
    - .planning/phases/04-auth-ui/04-CONTEXT.md §"D-05 Logout via shadcn Popover" (Account → /preferences, Sign out → signOut + router.push('/login'))
    - .planning/phases/04-auth-ui/04-UI-SPEC.md §"Component Inventory — AccountMenu" (props, asChild trigger, side/align defaults); §"Color" Popover hover/focus contract; §"Responsive Behavior" Popover positioning details (Sidebar uses side=right align=start, Navbar uses side=bottom align=end)
    - .planning/phases/04-auth-ui/04-PATTERNS.md §"frontend/web/components/AccountMenu.tsx" (byte-exact code excerpts: imports, prop type, asChild trigger, content className, sign-out handler)
  </read_first>
  <action>
Create `frontend/web/components/AccountMenu.tsx` as a Client Component that wraps a Radix Popover (via shadcn primitive) and exposes two menu items: Account (navigates to `/preferences`) and Sign out (clears `recommend-a.session` then navigates to `/login`).

**File structure:**

1. **`"use client"` directive** at byte 0.

2. **File-header doc-comment**:
```tsx
/**
 * Phase 4 (AUTH-06, D-05, issue #93) — account-menu popover wrapper.
 *
 * Wraps the trigger element (children, asChild) in a shadcn Popover. Used by:
 *   - components/Sidebar.tsx desktop avatar (when loggedIn) — D-05
 *   - components/Navbar.tsx greeting cluster (when loggedIn && variant === 'home') — D-05
 *
 * Two menu items hardcoded inside this component:
 *   - Account → <Link href="/preferences"> (Phase 8 fills the page)
 *   - Sign out → signOut() + router.push('/login') (D-05)
 *
 * Mobile Sidebar tab User-slot is NOT wrapped (D-06 — keeps Phase 3 navigation).
 */
```

3. **Imports**:
```tsx
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { signOut } from "@/lib/api/auth";
```

4. **Prop-type alias** (pattern matches `Navbar.tsx:17-21`):
```tsx
type AccountMenuProps = {
  children: React.ReactNode;
  userName?: string;
  side?: "right" | "bottom";
  align?: "start" | "end";
};
```

5. **Named function export** (no default — match `Sidebar.tsx`, `Navbar.tsx` convention):
```tsx
export function AccountMenu({
  children,
  userName = "June",
  side = "bottom",
  align = "end",
}: AccountMenuProps) {
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    router.push('/login');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="min-w-44 p-1 bg-surface-elevated border border-border rounded-md shadow-lg"
      >
        <Link
          href="/preferences"
          aria-label={`Account for ${userName}`}
          className="flex items-center gap-2 px-3 py-2 rounded-sm text-14 font-medium text-text-primary hover:bg-surface-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
        >
          <User size={16} />
          <span>Account</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-14 font-medium text-danger hover:bg-danger/10 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
```

**Critical implementation notes:**

- **`<PopoverTrigger asChild>{children}</PopoverTrigger>`** — `asChild` is the Radix prop that "transparently" injects the popover's trigger props onto the existing child element instead of wrapping it in another `<button>`. This preserves the Sidebar avatar's existing className/aria attributes and the Navbar greeting's existing styling.
- **`userName` prop default `"June"`** — matches `Navbar.tsx:23` and `Sidebar.tsx:57` literal-string defaults. Phase 5 swaps callers to derive from `useAuth().user`.
- **`side` and `align` defaults** are `"bottom"` and `"end"` (Navbar's positioning). Sidebar passes `side="right" align="start"` per UI-SPEC §"Responsive Behavior".
- **`className` override on `<PopoverContent>`** — the shadcn-generated default uses `bg-popover text-popover-foreground` which may not exist in our `@theme`. Passing `bg-surface-elevated border-border rounded-md shadow-lg` here uses Phase 2 tokens. The `cn()` merge inside the shadcn primitive resolves the override. UI-SPEC §"Component Inventory" row for `popover.tsx` is explicit on this approach.
- **Sign-out item uses `<button type="button">`** (action) with `text-danger` and `hover:bg-danger/10` — destructive-affordance hover background per UI-SPEC §"Color" Popover focus / hover treatment.
- **Account item uses `<Link href="/preferences">`** (navigation) with `text-text-primary` and `hover:bg-surface-2`.
- **Focus ring is INSET** (`outline-offset-[-2px]`) on menu items — UI-SPEC §"Color" explains: outset rings clip against the popover border.
- **Icons:** `User size={16}` for Account, `LogOut size={16}` for Sign out. Icon size 16 is icon-internal API (not a token).
- **No confirmation dialog before signOut** — CONTEXT D-05 explicit: "the destructive copy `Sign out` itself is the affordance; a confirmation modal is not in scope".
- **No hex literals.** No `style={`.
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint</automated>
    Plus the following grep checks:
    - `head -c 12 frontend/web/components/AccountMenu.tsx` starts with `"use client";`
    - `grep -c "export function AccountMenu" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c "from \"@/components/ui/popover\"" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c "from \"@/lib/api/auth\"" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c "signOut()" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c 'router.push' frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c '/login' frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c '/preferences' frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c "asChild" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c "PopoverContent" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c "bg-surface-elevated" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c "text-danger" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c ">Account<" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c ">Sign out<" frontend/web/components/AccountMenu.tsx` returns ≥ 1
    - `grep -c "LogOut" frontend/web/components/AccountMenu.tsx` returns ≥ 2 (import + render)
    - `grep -E "className=.*#[0-9a-fA-F]{3,6}" frontend/web/components/AccountMenu.tsx` returns 0 hits
    - `grep -E "style=\\{" frontend/web/components/AccountMenu.tsx` returns 0 hits
  </verify>
  <acceptance_criteria>
    - File `frontend/web/components/AccountMenu.tsx` exists, byte 0 is `"use client";`.
    - Named export `AccountMenu` (not default).
    - `AccountMenuProps` accepts `children`, optional `userName`, `side`, `align`.
    - Imports `signOut` from `@/lib/api/auth`, `Popover` / `PopoverTrigger` / `PopoverContent` from `@/components/ui/popover`, `LogOut` and `User` from lucide-react, `Link` from next/link, `useRouter` from next/navigation.
    - Uses `<PopoverTrigger asChild>` to preserve children semantics.
    - PopoverContent has `className` override using `bg-surface-elevated border-border rounded-md shadow-lg min-w-44`.
    - Account item: `<Link href="/preferences">` with `User size={16}` icon and copy `Account`.
    - Sign-out item: `<button type="button" onClick={handleSignOut}>` with `LogOut size={16}` icon and copy `Sign out`.
    - `handleSignOut` calls `signOut()` then `router.push('/login')`.
    - Sign-out item uses `text-danger` and `hover:bg-danger/10`.
    - File contains zero hex literals, zero `style={` props.
    - `cd frontend/web && pnpm tsc --noEmit && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    `<AccountMenu>` is implemented and ready for Sidebar / Navbar consumption in Tasks 3–4. Plan 05 verifies the popover opens and clicking Sign out clears `recommend-a.session`.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Wire Sidebar avatar + Navbar greeting through AccountMenu when logged-in (D-05, AUTH-06)</name>
  <files>
    frontend/web/components/Sidebar.tsx
    frontend/web/components/Navbar.tsx
  </files>
  <read_first>
    - frontend/web/components/Sidebar.tsx (modify in place — read lines 1-27 imports, lines 50-57 prop interface, lines 99-113 the avatar block to wrap)
    - frontend/web/components/Navbar.tsx (modify in place — read lines 1-21 imports + prop interface, line 60 the `<span>Hi, {userName}</span>` to wrap)
    - frontend/web/components/AccountMenu.tsx (the new wrapper this task consumes — read the AccountMenuProps signature)
    - .planning/phases/04-auth-ui/04-CONTEXT.md §"D-05 Logout via shadcn Popover" (anchored on BOTH desktop Sidebar avatar AND desktop Navbar greeting); §"D-06 Mobile Me-tab keeps current behavior"
    - .planning/phases/04-auth-ui/04-UI-SPEC.md §"Component Inventory" rows for Sidebar/Navbar edits (preserve loggedIn?: boolean, preserve "use client" on Sidebar, preserve Server-Component on Navbar); §"Copywriting Contract" `<AccountMenu>` aria-label rows (`Account menu for {userName}` template literal)
    - .planning/phases/04-auth-ui/04-PATTERNS.md §"Sidebar.tsx (MODIFIED)" and §"Navbar.tsx (MODIFIED)" (byte-exact diffs, preservation rules, aria-label override pattern)
  </read_first>
  <action>
Modify `Sidebar.tsx` and `Navbar.tsx` IN PLACE to wrap their existing trigger surfaces in `<AccountMenu>` when `loggedIn === true`. The edits are minimal — preserve the Phase 3 prop interfaces, the `"use client"` / Server-Component status, and all existing behavior on the logged-out branch.

**File 1: `frontend/web/components/Sidebar.tsx`**

Step 1 — Add an import at the top (alphabetically with the existing imports at lines 23-27, but the project keeps its own ordering — append after the existing `import { cn }` line):
```tsx
import { AccountMenu } from "@/components/AccountMenu";
```

Step 2 — Add a destructured `userName` prop with default `"June"` to the function signature so it can be forwarded into AccountMenu's aria-label. Update the existing prop type:
```tsx
type SidebarProps = {
  loggedIn?: boolean;
  userName?: string;
};

export function Sidebar({ loggedIn = false, userName = "June" }: SidebarProps) {
```

Step 3 — Replace the avatar block at the existing lines 99-113. Change pattern: branch on `loggedIn`. When TRUE, wrap a `<button>` (visually identical to the existing `<Link>`) in `<AccountMenu side="right" align="start" userName={userName}>`. When FALSE, keep the existing `<Link href={avatarHref}>` exactly as-is.

The CURRENT block (Sidebar.tsx:99-113) is:
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

Replace with:
```tsx
<div className="mt-auto flex flex-col items-center pb-3">
  {loggedIn ? (
    <AccountMenu side="right" align="start" userName={userName}>
      <button
        type="button"
        aria-label={`Account menu for ${userName}`}
        title={`Account menu for ${userName}`}
        className="w-9 h-9 rounded-full border border-border-strong flex items-center justify-center text-text-muted hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        {/* TODO Phase 5: derive initials from useAuth().user */}
        <span className="font-display text-12 font-semibold text-text-primary">JR</span>
      </button>
    </AccountMenu>
  ) : (
    <Link
      href={avatarHref}
      aria-label={avatarLabel}
      title={avatarLabel}
      className="w-9 h-9 rounded-full border border-border-strong flex items-center justify-center text-text-muted hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      <User size={16} />
    </Link>
  )}
</div>
```

The `avatarHref` and `avatarLabel` const declarations (Sidebar.tsx:56-57) STAY — they only feed the logged-out `<Link>`. The logged-in branch uses the `${userName}` template literal directly per UI-SPEC §"Copywriting Contract".

**Preserve:**
- `"use client"` directive at line 1 — UNCHANGED.
- The `usePathname()` hook + `NAV_ITEMS` constant + nav-rendering logic — UNCHANGED.
- The mobile `<nav>` block at lines 116-162 — UNCHANGED (D-06: mobile tab bar keeps current navigation behavior, no popover).
- The Phase 3 doc-comment — UNCHANGED (or append a one-line note after the existing `Active state computed via usePathname()...` line: `* Phase 4 (D-05): logged-in avatar wrapped in <AccountMenu> popover.`).

**File 2: `frontend/web/components/Navbar.tsx`**

Step 1 — Add an import after the existing line 15 (`import { BrandMark } from "@/components/BrandMark";`):
```tsx
import { AccountMenu } from "@/components/AccountMenu";
```

Step 2 — Replace the greeting `<span>` at line 60. The CURRENT block is:
```tsx
<span className="text-text-secondary text-14 font-medium">Hi, {userName}</span>
```

Replace with an AccountMenu-wrapped `<button>` (visually identical, but clickable and acting as the popover trigger):
```tsx
<AccountMenu userName={userName}>
  <button
    type="button"
    aria-label={`Account menu for ${userName}`}
    className="text-text-secondary hover:text-text-primary text-14 font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
  >
    Hi, {userName}
  </button>
</AccountMenu>
```

The AccountMenu defaults `side="bottom" align="end"` are correct for the Navbar greeting position (UI-SPEC §"Responsive Behavior") — no need to pass them.

**Preserve:**
- Server-Component status — DO NOT add `"use client"` to Navbar.tsx. UI-SPEC §"Component Inventory" is explicit: "Navbar must stay a Server Component — `<AccountMenu>` is a Client Component that imports its own boundary; the Server Navbar can render it as a child without becoming Client itself."
- The `variant === 'mobile'` branch at lines 24-40 — UNCHANGED (D-06).
- The Notifications `<button>` at lines 52-59 — UNCHANGED.
- The logged-out branch at lines 62-77 — UNCHANGED.
- The Phase 3 doc-comment — UNCHANGED (or append: `Phase 4 (D-05): logged-in greeting wrapped in <AccountMenu> popover.`).

**Verify both files still typecheck:** the AccountMenu component is a Client boundary; Sidebar already is Client (no change), Navbar stays Server (Next.js 16 supports Server-renders-Client tree composition).
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build</automated>
    Plus the following grep checks:
    - `grep -c "AccountMenu" frontend/web/components/Sidebar.tsx` returns ≥ 2 (import + JSX usage) (UI-SPEC hook #14)
    - `grep -c "AccountMenu" frontend/web/components/Navbar.tsx` returns ≥ 2 (import + JSX usage) (UI-SPEC hook #14)
    - `grep -c '"use client"' frontend/web/components/Navbar.tsx` returns 0 (Navbar stays a Server Component)
    - `grep -c '"use client"' frontend/web/components/Sidebar.tsx` returns 1 (Sidebar stays a Client Component)
    - `grep -c "Account menu for" frontend/web/components/Sidebar.tsx` returns ≥ 1
    - `grep -c "Account menu for" frontend/web/components/Navbar.tsx` returns ≥ 1
    - `grep -c "loggedIn ?" frontend/web/components/Sidebar.tsx` returns ≥ 1 (the new ternary in the avatar block)
    - `grep -c "Hi, {userName}" frontend/web/components/Navbar.tsx` returns ≥ 1 (preserved literal)
    - `grep -c "Bell" frontend/web/components/Navbar.tsx` returns ≥ 2 (Notifications icon preserved on both variants)
    - `grep -E "className=.*#[0-9a-fA-F]{3,6}" frontend/web/components/Sidebar.tsx frontend/web/components/Navbar.tsx` returns 0 hits (DSGN-06 — no NEW hex introduced)
  </verify>
  <acceptance_criteria>
    - `Sidebar.tsx` imports `AccountMenu` from `@/components/AccountMenu`.
    - `Sidebar.tsx` `SidebarProps` now includes optional `userName` (default `"June"`).
    - `Sidebar.tsx` avatar block (formerly lines 99-113) now branches on `loggedIn`: when true, renders `<AccountMenu side="right" align="start" userName={userName}>` wrapping a `<button type="button">` with the same circle styling and `JR` initials; when false, renders the original `<Link href={avatarHref}>` unchanged.
    - `Sidebar.tsx` keeps `"use client"` at byte 0.
    - `Sidebar.tsx` mobile `<nav>` block is unchanged (D-06).
    - `Navbar.tsx` imports `AccountMenu` from `@/components/AccountMenu`.
    - `Navbar.tsx` greeting `<span>` (formerly line 60) is replaced by `<AccountMenu userName={userName}><button type="button" ...>Hi, {userName}</button></AccountMenu>`.
    - `Navbar.tsx` does NOT have `"use client"` (stays a Server Component).
    - `Navbar.tsx` mobile variant block is unchanged.
    - `Navbar.tsx` logged-out branch (Sign-in / Create-account links) is unchanged.
    - Both Sidebar and Navbar `aria-label` for the new buttons is the template literal `Account menu for ${userName}`.
    - `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` all exit 0.
  </acceptance_criteria>
  <done>
    Sidebar avatar + Navbar greeting both anchor `<AccountMenu>` when logged-in. Plan 05 verifies the popover opens, the menu items navigate / sign out correctly, and `recommend-a.session` is removed from localStorage on Sign out (AUTH-06 acceptance criterion from issue #93).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| AccountMenu Sign-out click → signOut() → router.push | Action that mutates localStorage and triggers navigation. |
| Server Navbar → Client AccountMenu boundary | Server-Component imports a Client Component child — Next.js 16 boundary that must not leak server data. |
| `<Link href="/preferences">` in Account item | Static href — no dynamic redirect surface. |

## STRIDE Threat Register (ASVS L1)

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-04-19 | Tampering | Sign-out triggered by accidental click | low → **accept** | accept | CONTEXT D-05 explicit: no confirmation dialog. The destructive copy `Sign out` itself is the affordance; Phase 8 (Preferences) will introduce a more deliberate sign-out flow if needed. |
| T-04-20 | Information disclosure | Server Navbar leaking session data into Client AccountMenu | low → **mitigate** | mitigate | The Navbar Server Component passes only the `userName` string (an existing prop) to AccountMenu. AccountMenu re-imports `signOut` from `@/lib/api/auth` on the client side; no session data is serialized across the Server→Client boundary. |
| T-04-21 | Open redirect | `router.push('/login')` after signOut | low → **accept** | accept | Hardcoded path. AUTH-06 specifies clear-session-and-redirect-to-login as the contract. |
| T-04-22 | Tampering | userName template literal interpolated into aria-label | low → **mitigate** | mitigate | aria-label is a string attribute; React escapes string interpolation by default. The `userName` value is currently the hardcoded literal `"June"` (Phase 5 will derive from session); even when wired to session, it's the user's own self-reported email-prefix and would not be reflected back to other users. |
| T-04-23 | Spoofing | Popover open/close keyboard hijack via Esc/Tab | low → **accept** | accept | Radix manages keyboard handling per WAI-ARIA Authoring Practices. UI-SPEC §"Interaction Contracts" documents the expected behaviour (Esc closes, Tab moves between items). No custom handlers — accept Radix defaults. |
| T-04-24 | Information disclosure | Forgot-page stub leaking implementation timeline | none → **n/a** | accept | Stub is intentionally generic ("coming in a future update") — no version numbers, no internal milestone references. |
</threat_model>

<verification>
After all three tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` all exit 0.
- `git grep -F "← Back to sign in" frontend/web/app/\(auth\)/forgot/page.tsx` returns 1 hit (UI-SPEC hook #9).
- `git grep -nF "AccountMenu" frontend/web/components/Sidebar.tsx frontend/web/components/Navbar.tsx` shows hits in both files (UI-SPEC hook #14).
- Manual smoke (deferred to Plan 05 verification): visit a route where `loggedIn={true}` is passed (need to be authenticated first via Plan 03 register/login), click the Sidebar avatar → popover opens, click Sign out → redirects to `/login`, devtools localStorage shows `recommend-a.session` removed.
</verification>

<success_criteria>
1. /forgot route renders the stub copy inside the AuthShell card and has a working back link to /login.
2. AccountMenu opens a popover with Account (→ /preferences) and Sign out (clears recommend-a.session, navigates to /login) when triggered from the Sidebar avatar OR the Navbar greeting (desktop only).
3. Sidebar mobile tab User-slot still navigates directly to /preferences (no popover — D-06 preserved).
4. Sidebar keeps `"use client"`, Navbar stays Server Component — no boundary regressions.
5. AUTH-06 acceptance: signOut clears the localStorage session entry — verifiable in devtools Application > Local Storage.
6. `pnpm tsc --noEmit && pnpm lint && pnpm build` exit 0.
</success_criteria>

<output>
After completion, create `.planning/phases/04-auth-ui/04-04-SUMMARY.md` documenting:
- Final paths and line counts of new files (forgot/page.tsx, AccountMenu.tsx).
- The byte-exact diff applied to Sidebar.tsx (avatar block) and Navbar.tsx (greeting).
- Confirmation that Sidebar kept `"use client"` and Navbar stayed Server.
- Manual smoke result (if executed).
- Any deviations from the action.
</output>
