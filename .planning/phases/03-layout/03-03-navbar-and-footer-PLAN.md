---
phase: 03-layout
plan: 03
type: execute
wave: 2
depends_on: ["03-01"]
files_modified:
  - frontend/web/components/Navbar.tsx
  - frontend/web/components/Footer.tsx
autonomous: true
requirements:
  - LAYT-01
  - LAYT-03
  - LAYT-05
user_setup: []

must_haves:
  truths:
    - "A page can render `<Navbar variant=\"home\" />` to show a desktop top bar (BrandMark left + auth/greeting right)."
    - "A page can render `<Navbar variant=\"mobile\" />` to show a compact mobile top bar (BrandMark left + Bell right)."
    - "Logged-out Navbar shows `Sign in` / `Create account` text-links pointing at `/login` / `/register`; logged-in Navbar shows a Bell button + `Hi, {name}` greeting."
    - "Footer renders the BrandMark + the literal disclaimer `Recommend·a is a fictional concept design.` + two no-op About / Privacy stub anchors."
    - "Both Navbar and Footer are Server Components (no `\"use client\"` directive)."
  artifacts:
    - path: "frontend/web/components/Navbar.tsx"
      provides: "Named export `Navbar({ variant?: 'home' | 'mobile'; loggedIn?: boolean; userName?: string })`"
      min_lines: 40
    - path: "frontend/web/components/Footer.tsx"
      provides: "Named export `Footer()` (no props)"
      contains: "Recommend·a is a fictional concept design."
      min_lines: 15
  key_links:
    - from: "frontend/web/components/Navbar.tsx"
      to: "components/BrandMark"
      via: "named import"
      pattern: "from ['\"]@/components/BrandMark['\"]"
    - from: "frontend/web/components/Footer.tsx"
      to: "components/BrandMark"
      via: "named import"
      pattern: "from ['\"]@/components/BrandMark['\"]"
    - from: "frontend/web/components/Navbar.tsx"
      to: "lucide-react Bell icon"
      via: "named import"
      pattern: "Bell"
---

<objective>
Ship Navbar (LAYT-01) and Footer (LAYT-03) — both Server Components in `frontend/web/components/`. Both depend on Plan 01's BrandMark. Navbar takes a `variant` prop (`'home'` desktop or `'mobile'` compact) and a `loggedIn` mock prop (Phase 5 swaps callers to use real auth context). Footer is static. Both consume only Phase 2 tokens + Tailwind core utilities — no escape hatches.

Purpose: Wave 2 — runs in parallel with Plan 02 (Sidebar) since `Navbar.tsx` and `Footer.tsx` do not overlap with `Sidebar.tsx`. Both files MUST exist before Plan 04 composes them inside `<PageLayout>`.
Output: Two component files at `frontend/web/components/Navbar.tsx` and `frontend/web/components/Footer.tsx`.
</objective>

<execution_context>
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/workflows/execute-plan.md
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-layout/03-CONTEXT.md
@.planning/phases/03-layout/03-UI-SPEC.md
@.planning/phases/03-layout/03-PATTERNS.md
@.planning/phases/03-layout/03-01-deps-and-brand-mark-PLAN.md
@frontend/web/AGENTS.md
@frontend/web/styles/globals.css
@frontend/web/app/tokens/page.tsx

<interfaces>
<!-- Public APIs this plan creates: -->
```ts
// components/Navbar.tsx
type NavbarProps = {
  variant?: "home" | "mobile";
  loggedIn?: boolean;
  userName?: string;
};
export function Navbar(props?: NavbarProps): JSX.Element;
// defaults: variant = "home", loggedIn = false, userName = "June"

// components/Footer.tsx
export function Footer(): JSX.Element;
// no props
```

<!-- Existing consumed: -->
- `BrandMark` from `@/components/BrandMark` (Plan 01)
- `Bell` from `lucide-react` (Plan 01)
- Tokens from Phase 2: `bg-bg`, `bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-accent`, `text-12`, `text-14`, `font-display`, `font-body`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Author components/Navbar.tsx (Server Component, two variants)</name>
  <files>frontend/web/components/Navbar.tsx</files>
  <read_first>
    - frontend/web/components/Navbar.tsx (confirm does not exist)
    - .planning/phases/03-layout/03-UI-SPEC.md §Component Inventory row "Navbar" + §Copywriting Contract rows for Navbar + §Interaction Contracts rows for Navbar bell / Sign in / Create account / BrandMark + §Color (auth-button color tokens) + §Typography rows for Navbar
    - .planning/phases/03-layout/03-PATTERNS.md §3 "components/Navbar.tsx" (full visual numbers from home.jsx:136-153 and 219-225, variant prop shape, auth-button copy, critical rules)
    - .planning/phases/03-layout/03-CONTEXT.md §Decisions D-03 (Navbar = layout-slot top-bar component) + §Deferred (Bell is non-functional)
    - frontend/web/_design-reference/home.jsx lines 126-209 (desktop top-bar visual) + lines 212-264 (mobile top-bar visual) — read for numbers ONLY, do NOT import
  </read_first>
  <action>
    Create `frontend/web/components/Navbar.tsx` with the following exact content:

    ```tsx
    /**
     * Phase 3 (LAYT-01, issue #92) — top-bar component.
     *
     * Reusable top bar rendered as an opt-in `header` slot on `<PageLayout>` (CONTEXT D-03).
     * The `(app)` route-group layout does NOT render Navbar globally — pages opt in by
     * including <Navbar variant="..." /> in their own JSX. This matches the reference:
     * home shows a top bar; detail / settings do not.
     *
     * Server Component — `loggedIn` is a prop (not a hook). Phase 5 will swap callers to
     * pass `useAuth().isAuthenticated` at the page level (page becomes the client boundary).
     */

    import Link from "next/link";
    import { Bell } from "lucide-react";
    import { BrandMark } from "@/components/BrandMark";

    type NavbarProps = {
      variant?: "home" | "mobile";
      loggedIn?: boolean;
      userName?: string;
    };

    export function Navbar({ variant = "home", loggedIn = false, userName = "June" }: NavbarProps) {
      if (variant === "mobile") {
        return (
          <header className="flex items-center justify-between py-[18px] px-5">
            <Link href="/" aria-label="recommend-a — home">
              <BrandMark size={24} withWord={false} />
            </Link>
            <button
              type="button"
              disabled
              aria-label="Notifications (coming soon)"
              className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted"
            >
              <Bell size={18} />
            </button>
          </header>
        );
      }

      // variant === "home" (desktop)
      return (
        <header className="flex items-center justify-between py-6 px-10">
          <Link href="/" aria-label="recommend-a — home">
            <BrandMark size={28} withWord />
          </Link>

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
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-text-secondary hover:text-text-primary text-14 font-semibold transition-colors duration-150 px-3 py-2 rounded-md focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-on-accent bg-accent hover:bg-accent-hover text-14 font-semibold transition-colors duration-150 px-3 py-2 rounded-md focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                Create account
              </Link>
            </div>
          )}
        </header>
      );
    }
    ```

    Critical authoring rules:
    - NO `"use client"` directive (Server Component — `loggedIn` is a prop, NOT a hook).
    - NO `style={{ }}` props.
    - NO hex/rgba in className.
    - The Bell button is `disabled` with no `onClick` (CONTEXT D-Discretion — bell is non-functional this milestone).
    - BrandMark wraps in `<Link href="/">` per UI-SPEC §Interaction Contracts row "BrandMark".
    - The mobile variant uses `py-[18px]` arbitrary value because 18 px is not a Tailwind core scale step — this is a documented size primitive (UI-SPEC §Spacing Scale row "5: 20px → mobile Navbar header" with the `py-[18px]` allowance per PATTERNS table mobile row). Add an inline comment: `// non-tokenized: 18px vertical padding from reference home.jsx:221 — between p-4 (16px) and p-5 (20px)`.
    - Named export `Navbar` (no `export default`).
  </action>
  <verify>
    <automated>cd frontend/web && test -f components/Navbar.tsx && ! head -1 components/Navbar.tsx | grep -q '"use client"' && pnpm tsc --noEmit && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - `test -f frontend/web/components/Navbar.tsx` exits 0.
    - `head -1 frontend/web/components/Navbar.tsx` does NOT start with `"use client"` (Server Component — UI-SPEC §Component Inventory row Navbar).
    - `git grep -nE 'export function Navbar' -- 'frontend/web/components/Navbar.tsx'` returns 1 hit.
    - `git grep -nE 'export default' -- 'frontend/web/components/Navbar.tsx'` returns 0 hits.
    - `git grep -nE "from ['\"]@/components/BrandMark['\"]" -- 'frontend/web/components/Navbar.tsx'` returns 1 hit.
    - `git grep -nE "from ['\"]lucide-react['\"]" -- 'frontend/web/components/Navbar.tsx'` returns 1 hit.
    - `git grep -nE 'aria-label="Notifications \(coming soon\)"' -- 'frontend/web/components/Navbar.tsx'` returns ≥ 1 hit (UI-SPEC §Copywriting Contract).
    - `git grep -nF '"/login"' -- 'frontend/web/components/Navbar.tsx'` returns ≥ 1 hit AND `git grep -nF '"/register"' ...` returns ≥ 1 hit.
    - `git grep -nF 'Sign in' -- 'frontend/web/components/Navbar.tsx'` returns ≥ 1 hit AND `git grep -nF 'Create account' ...` returns ≥ 1 hit AND `git grep -nF 'Hi, ' ...` returns ≥ 1 hit.
    - `git grep -nE 'style=\{' -- 'frontend/web/components/Navbar.tsx'` returns 0 hits.
    - `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'frontend/web/components/Navbar.tsx'` returns 0 hits.
    - `git grep -nE "from ['\"].*_design-reference" -- 'frontend/web/components/Navbar.tsx'` returns 0 hits.
    - Bell button has `disabled` HTML attribute: `git grep -nE '\bdisabled\b' -- 'frontend/web/components/Navbar.tsx'` returns ≥ 1 hit.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    Navbar.tsx exists, is a Server Component, exports `Navbar` named with `variant`/`loggedIn`/`userName` props, renders both home and mobile variants per UI-SPEC, uses only theme variables, passes tsc + lint.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Author components/Footer.tsx (Server Component, static disclaimer)</name>
  <files>frontend/web/components/Footer.tsx</files>
  <read_first>
    - frontend/web/components/Footer.tsx (confirm does not exist)
    - .planning/phases/03-layout/03-UI-SPEC.md §Component Inventory row "Footer" + §Copywriting Contract rows for Footer disclaimer / About / Privacy + §Color row "Footer top border" + §Typography rows for Footer disclaimer / link stubs
    - .planning/phases/03-layout/03-PATTERNS.md §4 "components/Footer.tsx — Static disclaimer block" (full pattern with ready-to-paste TSX)
    - .planning/phases/03-layout/03-CONTEXT.md §Decisions D-04 (Footer = minimal in-flow disclaimer block)
    - frontend/web/_design-reference/auth.jsx line 86 (literal disclaimer string with U+00B7 middot — read for the exact characters, do NOT import)
  </read_first>
  <action>
    Create `frontend/web/components/Footer.tsx` with the following exact content. The disclaimer string MUST contain U+00B7 middot character verbatim (copy from this action or from `auth.jsx:86`).

    ```tsx
    /**
     * Phase 3 (LAYT-03, issue #92) — global footer (in-flow disclaimer block).
     *
     * Composed by `<PageLayout>` after the page content slot. Hidden on auth routes —
     * `(auth)/layout.tsx` does NOT render Footer (the AuthShell has its own internal
     * disclaimer slot per UI-SPEC §Component Inventory).
     *
     * Server Component. No props. No client interactivity.
     */

    import Link from "next/link";
    import { BrandMark } from "@/components/BrandMark";

    export function Footer() {
      return (
        <footer className="border-t border-border py-6 px-5 md:px-10 flex flex-col md:flex-row items-center md:justify-between gap-4 text-text-muted text-12 font-body">
          <div className="flex items-center gap-3">
            <BrandMark size={24} withWord={false} />
            <span>Recommend·a is a fictional concept design.</span>
          </div>
          <nav className="flex items-center gap-4" aria-label="Footer">
            <a
              href="#"
              aria-disabled="true"
              className="text-12 font-medium text-text-muted"
            >
              About
            </a>
            <a
              href="#"
              aria-disabled="true"
              className="text-12 font-medium text-text-muted"
            >
              Privacy
            </a>
          </nav>
        </footer>
      );
    }
    ```

    Critical authoring rules:
    - The disclaimer span MUST contain U+00B7 (`·`) between "Recommend" and "a", NOT a hyphen `-`.
    - About / Privacy use bare `<a href="#" aria-disabled="true">` (NOT `<Link>`) per UI-SPEC §Interaction Contracts row "Footer About / Privacy stubs". They navigate nowhere.
    - BrandMark inside Footer does NOT wrap in `<Link>` per UI-SPEC §Interaction Contracts row "BrandMark" ("BrandMark inside AuthShell footer does NOT wrap in a Link" — same rule applies to the global Footer's BrandMark since it's purely decorative there).
    - NO `"use client"`.
    - NO `style={{ }}`.
    - NO hex/rgba in className.
    - Named export.
  </action>
  <verify>
    <automated>cd frontend/web && test -f components/Footer.tsx && ! head -1 components/Footer.tsx | grep -q '"use client"' && pnpm tsc --noEmit && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - `test -f frontend/web/components/Footer.tsx` exits 0.
    - `head -1 frontend/web/components/Footer.tsx` does NOT start with `"use client"`.
    - `git grep -nF 'Recommend·a is a fictional concept design.' -- 'frontend/web/components/Footer.tsx'` returns ≥ 1 hit (middot verified — UI-SPEC §Verification Hooks grep #4).
    - `git grep -nF 'Recommend-a' -- 'frontend/web/components/Footer.tsx'` returns 0 hits (no hyphen variant).
    - `git grep -nE 'export function Footer' -- 'frontend/web/components/Footer.tsx'` returns 1 hit.
    - `git grep -nE 'aria-disabled="true"' -- 'frontend/web/components/Footer.tsx'` returns 2 hits (About + Privacy).
    - `git grep -nF 'About' -- 'frontend/web/components/Footer.tsx'` returns ≥ 1 hit AND `git grep -nF 'Privacy' ...` returns ≥ 1 hit.
    - `git grep -nE 'border-t border-border' -- 'frontend/web/components/Footer.tsx'` returns 1 hit (top border only — UI-SPEC §Component Inventory).
    - `git grep -nE 'style=\{' -- 'frontend/web/components/Footer.tsx'` returns 0 hits.
    - `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'frontend/web/components/Footer.tsx'` returns 0 hits.
    - `git grep -nE "from ['\"].*_design-reference" -- 'frontend/web/components/Footer.tsx'` returns 0 hits.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    Footer.tsx exists, is a Server Component, exports `Footer` named, renders BrandMark + the literal disclaimer with U+00B7 middot + two no-op About/Privacy stubs, uses only theme tokens, passes tsc + lint.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| n/a (chrome-only) | Both components ship hardcoded copy / hardcoded hrefs / no user input. Only Navbar takes a `userName?: string` prop with default `"June"`; the value flows directly into a JSX text child (auto-escaped by React). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-08 | XSS | Navbar `userName` prop interpolation | accept | React escapes text children automatically. TypeScript `strict` enforces `userName: string`. The Phase-3 default is the literal `"June"`. Phase 5 will swap callers to pass `useAuth().user.name` — that value is already escaped at render time. |
| T-03-09 | Open redirect | Navbar `<Link href="/login">` / `"/register"` | mitigate | Both hrefs are hardcoded literal strings. No user-controlled href. |
| T-03-10 | Click-jacking | Navbar Bell button | accept | Button has `disabled` attribute set; `onClick` is not wired in Phase 3. There is no destructive action behind it. |
| T-03-11 | Open redirect | Footer About / Privacy `href="#"` | accept | Hash anchors with `aria-disabled="true"` and no real navigation target. |
</threat_model>

<verification>
- `cd frontend/web && pnpm tsc --noEmit` exits 0.
- `cd frontend/web && pnpm lint` exits 0.
- `git grep -nF 'Recommend·a is a fictional concept design.' -- 'frontend/web/components/'` returns ≥ 1 hit (Footer disclaimer).
- `git grep -nE "from ['\"].*_design-reference" -- 'frontend/web/components/Navbar.tsx' 'frontend/web/components/Footer.tsx'` returns 0 hits.
- `git grep -nE 'style=\{' -- 'frontend/web/components/Navbar.tsx' 'frontend/web/components/Footer.tsx'` returns 0 hits.
</verification>

<success_criteria>
- `frontend/web/components/Navbar.tsx` exists, exports named `Navbar`, is a Server Component, renders home and mobile variants with the documented copywriting contract.
- `frontend/web/components/Footer.tsx` exists, exports named `Footer`, is a Server Component, contains the U+00B7-middot disclaimer + 2 no-op stubs.
- Both files consume only Phase 2 tokens + Tailwind core utilities.
- DSGN-06 verification greps pass for both files.
- `pnpm tsc --noEmit` and `pnpm lint` both pass.
</success_criteria>

<output>
After completion, create `.planning/phases/03-layout/03-03-SUMMARY.md` covering:
- Two files created (`Navbar.tsx`, `Footer.tsx`)
- Confirmation of named exports (no default exports)
- Confirmation that both are Server Components (no `"use client"` on line 1)
- Verification grep counts: middot in Footer ≥ 1, hex-in-className 0, `style={` 0, `_design-reference` import 0
- `pnpm tsc --noEmit` exit code, `pnpm lint` exit code
</output>
