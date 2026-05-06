---
phase: 03-layout
plan: 02
type: execute
wave: 2
depends_on: ["03-01"]
files_modified:
  - frontend/web/components/Sidebar.tsx
autonomous: true
requirements:
  - LAYT-02
  - LAYT-05
user_setup: []

must_haves:
  truths:
    - "On desktop (≥ 768 px) a fixed left vertical rail at 64 px width is visible with 5 nav items + a bottom avatar."
    - "On mobile (< 768 px) the rail is hidden and a fixed bottom tab bar at 64 px height is visible with the same 5 routes (central Pick CTA stands out as a 52×52 amber circle)."
    - "Navigating to one of the 5 routes highlights that item (active style: amber 3 px bar at left edge on desktop; primary text color + bg-surface-elevated)."
    - "Sidebar is a Client Component and reads the active path via `usePathname()`."
    - "All 5 sidebar links use `next/link` (not `<a>`); each icon-only link has `aria-label` and `title`."
  artifacts:
    - path: "frontend/web/components/Sidebar.tsx"
      provides: "Named export `Sidebar({ loggedIn?: boolean })`"
      contains: "use client"
      min_lines: 80
  key_links:
    - from: "frontend/web/components/Sidebar.tsx"
      to: "next/navigation usePathname"
      via: "import + active-state computation"
      pattern: "usePathname\\(\\)"
    - from: "frontend/web/components/Sidebar.tsx"
      to: "lucide-react icons (Home, Clock, Sparkles, Bookmark, User)"
      via: "named imports"
      pattern: "from ['\"]lucide-react['\"]"
    - from: "frontend/web/components/Sidebar.tsx"
      to: "Tailwind w-rail / h-tab utilities (Phase 2 tokens)"
      via: "className strings"
      pattern: "(w-rail|h-tab|pl-rail|pb-tab)"
---

<objective>
Ship the Sidebar — a single Client Component that internally branches on the `md` breakpoint to render either the desktop left vertical rail (≥ 768 px) or the mobile bottom tab bar (< 768 px). It reads `usePathname()` from `next/navigation` to compute active state for the 5 app routes (`/`, `/history`, `/recommendation`, `/watch-later`, `/preferences`) per CONTEXT D-01, D-02, D-07. Implements LAYT-02 (Sidebar) and contributes to LAYT-05 (responsive at 3 breakpoints).

Purpose: The most complex Phase 3 component — combines responsive branching, icon-driven navigation, active-state pattern matching, and the two documented escape hatches (`bg-bg/70` rail backdrop + `shadow-[0_6px_18px_rgba(245,181,68,0.35)]` mobile CTA glow). Wave 2 runs in parallel with Plan 03 (Navbar + Footer) — files do not overlap.
Output: One Client Component file at `frontend/web/components/Sidebar.tsx`.
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
@frontend/web/lib/utils.ts
@frontend/web/styles/globals.css
@frontend/web/app/tokens/page.tsx

<interfaces>
<!-- Public API this plan creates: -->
```ts
export function Sidebar(props?: { loggedIn?: boolean }): JSX.Element;
// default: loggedIn = false. The prop currently affects only the bottom
// avatar's link target ('/preferences' if loggedIn, '/login' if not) and
// the avatar fallback content (initials 'JR' if loggedIn, <User /> if not).
// Phase 5 swaps the prop for `useAuth()` at the page level.
```

<!-- Existing utilities consumed: -->

From frontend/web/lib/utils.ts (Phase 1):
```ts
export function cn(...inputs: ClassValue[]): string;
```

From next/navigation (Next.js 16):
```ts
export function usePathname(): string;
```

From lucide-react (installed in Plan 01):
```ts
export const Home: ComponentType<{ size?: number; className?: string }>;
export const Clock: ComponentType<{ size?: number; className?: string }>;
export const Sparkles: ComponentType<{ size?: number; className?: string }>;
export const Bookmark: ComponentType<{ size?: number; className?: string }>;
export const User: ComponentType<{ size?: number; className?: string }>;
```

From components/BrandMark.tsx (Plan 01):
```ts
export function BrandMark(props: { size?: number; withWord?: boolean }): JSX.Element;
```

<!-- Tokens consumed (already shipped by Phase 2): -->
- `w-rail` / `h-tab`           = 64 px (rail width / tab height)
- `pl-rail` / `pb-tab`         = padding-left / padding-bottom 64 px (used in PageLayout, NOT Sidebar)
- `bg-bg`, `bg-surface-elevated`, `border-border`, `border-border-strong`
- `text-text-primary`, `text-text-muted`, `text-on-accent`, `bg-accent`
- `rounded-sm`, `rounded-md`, `rounded-full`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Author components/Sidebar.tsx (desktop rail + mobile tab bar in one Client Component)</name>
  <files>frontend/web/components/Sidebar.tsx</files>
  <read_first>
    - frontend/web/components/Sidebar.tsx (confirm does not exist yet — fresh file)
    - .planning/phases/03-layout/03-UI-SPEC.md §Component Inventory row "Sidebar" + §Spacing Scale (full table + Active sidebar indicator geometry + Exceptions) + §Color "Active sidebar item color treatment" + §Color "Token escape hatches" + §Copywriting Contract (5 sidebar item copy strings + avatar aria-labels) + §Interaction Contracts (sidebar item Click/Hover/Focus rows) + §Responsive Behavior table + §Verification Hooks greps #1, #2, #5
    - .planning/phases/03-layout/03-PATTERNS.md §2 "components/Sidebar.tsx" (full pattern: required client directive, items array pattern, active-match logic, all visual numbers tables for rail and tab bar, active-state visual contract, cn() import, responsive-split wrappers, critical rules)
    - .planning/phases/03-layout/03-CONTEXT.md §Decisions D-01, D-02, D-07, D-08, D-10 + §Specifics (active indicator geometry, mobile CTA glow, rail bg, blur values)
    - frontend/web/AGENTS.md §Forbidden in app/ and components/ + §How to verify before pushing
    - frontend/web/lib/utils.ts (cn() helper signature)
    - frontend/web/_design-reference/shared.jsx lines 32-138 (visual SPEC ONLY — read for numbers, do NOT import)
    - frontend/web/app/tokens/page.tsx lines 7-24 (existing array-of-objects + .map() rendering precedent)
  </read_first>
  <action>
    Create `frontend/web/components/Sidebar.tsx`. The file MUST start with the `"use client"` directive on line 1 (CONTEXT D-07 — `usePathname` requires client).

    Author the following exact structure. Copy class strings verbatim from this action — they encode all spacing, color, and escape-hatch decisions from UI-SPEC.

    ```tsx
    "use client";

    /**
     * Phase 3 (LAYT-02, issue #92) — primary navigation.
     *
     * Single Client Component that internally branches on Tailwind `md` (768 px):
     *   - Desktop (≥ md): fixed left vertical rail at w-rail (64 px) with brand,
     *     5 icon nav items, bottom avatar.
     *   - Mobile (< md): fixed bottom tab bar at h-tab (64 px) with 5 items;
     *     central Pick CTA is a 52×52 amber circle (UI-SPEC §Spacing Scale row 13).
     *
     * Active state computed via usePathname() — exact match for "/", prefix-match
     * for the other four routes (CONTEXT D-07).
     *
     * DSGN-06 escape hatches (the only ones in this file — see UI-SPEC §Color):
     *   - bg-bg/70             : rail backdrop opacity approximation of reference rgba(8,8,9,.7)
     *   - shadow-[0_6px_...]   : amber glow on mobile Pick CTA — one-off shadow shape
     *   - w-[52px] h-[52px]    : mobile Pick CTA circle (size primitive, not a design token)
     *   - text-[10px]          : mobile tab label font-size (below Phase 2 type scale)
     *   - -left-2.5 / w-[3px]  : active indicator bar geometry (UI-SPEC §Spacing Scale)
     */

    import Link from "next/link";
    import { usePathname } from "next/navigation";
    import { Home, Clock, Sparkles, Bookmark, User } from "lucide-react";
    import { BrandMark } from "@/components/BrandMark";
    import { cn } from "@/lib/utils";

    type NavItem = {
      href: string;
      label: string;
      Icon: typeof Home;
      exact: boolean;
      primary?: boolean;
    };

    const NAV_ITEMS: readonly NavItem[] = [
      { href: "/",               label: "Home",          Icon: Home,     exact: true },
      { href: "/history",        label: "History",       Icon: Clock,    exact: false },
      { href: "/recommendation", label: "Pick a movie",  Icon: Sparkles, exact: false, primary: true },
      { href: "/watch-later",    label: "Watch later",   Icon: Bookmark, exact: false },
      { href: "/preferences",    label: "Preferences",   Icon: User,     exact: false },
    ] as const;

    function isActive(pathname: string, href: string, exact: boolean): boolean {
      if (exact) return pathname === href;
      return pathname === href || pathname.startsWith(`${href}/`);
    }

    type SidebarProps = {
      loggedIn?: boolean;
    };

    export function Sidebar({ loggedIn = false }: SidebarProps) {
      const pathname = usePathname();
      const avatarHref = loggedIn ? "/preferences" : "/login";
      const avatarLabel = loggedIn ? "Account: June" : "Sign in";

      return (
        <>
          {/* Desktop rail — hidden below md, visible at md+ */}
          {/* non-tokenized: bg-bg/70 approximates reference rgba(8,8,9,.7) — see UI-SPEC §Color Escape Hatches. Promote to --color-rail-bg if reviewers spot drift at PR. */}
          <aside
            className="hidden md:flex fixed left-0 top-0 bottom-0 w-rail flex-col items-center bg-bg/70 backdrop-blur-md border-r border-border py-4 gap-1 z-30"
            aria-label="Primary"
          >
            <div className="flex items-center justify-center pb-3">
              <BrandMark size={28} withWord={false} />
            </div>
            <ul className="flex flex-col items-center gap-1 mt-4">
              {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
                const active = isActive(pathname, href, exact);
                return (
                  <li key={href} className="relative">
                    {active && (
                      // non-tokenized: -left-2.5 (-10px) and w-[3px] are the exact reference geometry — see UI-SPEC §Spacing Scale "Active sidebar indicator geometry"
                      <span
                        className="absolute -left-2.5 top-2 bottom-2 w-[3px] bg-accent rounded-sm"
                        aria-hidden
                      />
                    )}
                    <Link
                      href={href}
                      title={label}
                      aria-label={label}
                      className={cn(
                        "relative w-11 h-11 rounded-md flex items-center justify-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                        active
                          ? "text-text-primary bg-surface-elevated"
                          : "text-text-muted hover:text-text-primary"
                      )}
                    >
                      <Icon size={20} />
                    </Link>
                  </li>
                );
              })}
            </ul>
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
          </aside>

          {/* Mobile tab bar — visible below md, hidden at md+ */}
          {/* non-tokenized: bg-bg/90 (slightly more opaque than rail to mask scroll content underneath) — also approximation of reference rgba(8,8,9,...) */}
          <nav
            className="flex md:hidden fixed left-0 right-0 bottom-0 h-tab grid grid-cols-5 items-center px-1.5 bg-bg/90 backdrop-blur-lg border-t border-border z-30"
            aria-label="Primary"
          >
            {NAV_ITEMS.map(({ href, label, Icon, exact, primary }) => {
              const active = isActive(pathname, href, exact);

              if (primary) {
                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    aria-label={label}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2"
                    )}
                  >
                    {/* non-tokenized: w-[52px] h-[52px] is the exact reference 52×52 px CTA (no Tailwind core scale step at 52) — see UI-SPEC §Spacing Scale row 13 */}
                    {/* non-tokenized: shadow-[0_6px_18px_rgba(245,181,68,0.35)] is the amber CTA glow — see UI-SPEC §Color Escape Hatches #1. Promote to --shadow-cta-glow if Phase 6 hero CTA reuses it. */}
                    <span className="w-[52px] h-[52px] rounded-full bg-accent text-on-accent flex items-center justify-center shadow-[0_6px_18px_rgba(245,181,68,0.35)]">
                      <Icon size={22} />
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={label}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                    active ? "text-text-primary" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <Icon size={20} />
                  {/* non-tokenized: text-[10px] is below Phase 2 type scale (smallest = text-12) — see UI-SPEC §Typography */}
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      );
    }
    ```

    Critical authoring rules (executor — verify each):
    1. `"use client"` is line 1.
    2. NO `style={{ }}` props anywhere in the file.
    3. NO hex/rgba literals inside `className` strings (the `rgba(245,181,68,0.35)` inside `shadow-[...]` IS inside an arbitrary-value Tailwind utility — that is the documented escape hatch and is allowed; it is NOT a `className=` literal hex per UI-SPEC verification grep #1, which excludes the `shadow-[...]` syntax).
    4. NO literal `64`, `64px`, `width: 64`, `height: 64` strings — only `w-rail` / `h-tab` (UI-SPEC verification grep #5).
    5. Every icon-only `<Link>` carries BOTH `aria-label` AND `title`.
    6. The `Sparkles` Pick CTA does NOT receive an `active` style — it is always amber regardless of pathname (UI-SPEC §Interaction Contracts row "Mobile primary CTA").
    7. Each escape-hatch occurrence (`bg-bg/70`, `bg-bg/90`, `shadow-[0_6px_18px_rgba(245,181,68,0.35)]`, `w-[52px] h-[52px]`, `text-[10px]`, `-left-2.5`, `w-[3px]`) is preceded by a `// non-tokenized:` or `// TODO Phase 5:` comment justifying it.
    8. Named export `Sidebar` (no `export default`).
  </action>
  <verify>
    <automated>cd frontend/web && test -f components/Sidebar.tsx && head -1 components/Sidebar.tsx | grep -q '"use client"' && pnpm tsc --noEmit && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - `test -f frontend/web/components/Sidebar.tsx` exits 0.
    - `head -1 frontend/web/components/Sidebar.tsx` returns the line `"use client";` exactly (UI-SPEC §Component Inventory row Sidebar — Type: Client).
    - `git grep -nE 'usePathname\(\)' -- 'frontend/web/components/Sidebar.tsx'` returns ≥ 1 hit.
    - `git grep -nE "from ['\"]lucide-react['\"]" -- 'frontend/web/components/Sidebar.tsx'` returns 1 hit (single import statement).
    - `git grep -nE 'w-rail' -- 'frontend/web/components/Sidebar.tsx'` returns ≥ 1 hit AND `git grep -nE 'h-tab' -- 'frontend/web/components/Sidebar.tsx'` returns ≥ 1 hit (Phase 2 layout tokens consumed — UI-SPEC verification grep #5).
    - `git grep -nE '\b64px\b|width:\s*64\b|height:\s*64\b' -- 'frontend/web/components/Sidebar.tsx'` returns 0 hits (UI-SPEC verification grep #5).
    - `git grep -nE 'style=\{' -- 'frontend/web/components/Sidebar.tsx'` returns 0 hits (DSGN-06 / UI-SPEC verification grep #2).
    - `git grep -nE "from ['\"].*_design-reference" -- 'frontend/web/components/Sidebar.tsx'` returns 0 hits (CLAUDE.md rule #2 / UI-SPEC verification grep #3).
    - `git grep -nE 'from ["\']next/link["\']' -- 'frontend/web/components/Sidebar.tsx'` returns 1 hit (uses next/link, not bare `<a>` for internal nav — Phase 1 PATTERNS Convention 4).
    - `git grep -nE '\baria-label\b' -- 'frontend/web/components/Sidebar.tsx'` returns ≥ 6 hits (5 nav items + bottom avatar in desktop rail; mobile tab bar items each repeat — count is ≥ 6, the exact number depends on whether the executor inlines aria-labels for both rail and tab bar; both surfaces MUST have them per UI-SPEC §Interaction Contracts).
    - All five route hrefs are present: `git grep -nF '"/history"' -- 'frontend/web/components/Sidebar.tsx'`, `git grep -nF '"/recommendation"' ...`, `git grep -nF '"/watch-later"' ...`, `git grep -nF '"/preferences"' ...` each return ≥ 1 hit; `git grep -nE 'href=["\']/["\']' ...` (root) returns ≥ 1 hit.
    - Escape-hatch comments: `git grep -nF 'non-tokenized:' -- 'frontend/web/components/Sidebar.tsx'` returns ≥ 5 hits (covers the documented exceptions).
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    Sidebar.tsx exists, starts with `"use client"`, calls `usePathname()`, renders the 5-route navigation in both desktop-rail and mobile-tab-bar surfaces using only Tailwind tokens + the documented escape hatches, has aria-labels on all icon-only links, passes tsc + lint.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| n/a (chrome-only) | Sidebar renders 5 hardcoded `next/link` hrefs and reads `usePathname()` (untrusted-by-default URL) only to compare against hardcoded literals. No user input flows into navigation, no auth state, no API. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-04 | Tampering | `usePathname()` return value | accept | Pathname is compared by string-equality / `startsWith` against 5 hardcoded literals (`/`, `/history`, `/recommendation`, `/watch-later`, `/preferences`). A malicious pathname can only fail to match — there is no code path where a tampered value triggers anything beyond a no-active-state render. |
| T-03-05 | Information Disclosure | Sidebar prop `loggedIn` | accept | Phase 3 ships a `loggedIn?: boolean` prop with default `false`. No auth state is read or persisted by this component. Phase 5 will swap callers to pass `useAuth().isAuthenticated`. The Phase-3 placeholder cannot disclose anything since no real session exists yet. |
| T-03-06 | Open redirect | `<Link href={...}>` targets | mitigate | All 5 hrefs are hardcoded string literals at module scope (`NAV_ITEMS` array) plus `avatarHref` which is a ternary between two hardcoded literals (`/preferences` or `/login`). No user-controlled href is ever passed to `<Link>`. |
| T-03-07 | XSS | Icon `size={20}` etc. | accept | All `size` props are number literals at the call site. TypeScript `strict` enforces. `aria-label` and `title` props receive string literals from the hardcoded `NAV_ITEMS` array. |
</threat_model>

<verification>
- `cd frontend/web && pnpm tsc --noEmit` exits 0.
- `cd frontend/web && pnpm lint` exits 0.
- `head -1 frontend/web/components/Sidebar.tsx` is `"use client";`.
- `git grep -nE "from ['\"].*_design-reference" -- 'frontend/web/components/Sidebar.tsx'` returns 0.
- `git grep -nE '\b64px\b|width:\s*64\b|height:\s*64\b' -- 'frontend/web/components/Sidebar.tsx'` returns 0.
- `git grep -nE 'style=\{' -- 'frontend/web/components/Sidebar.tsx'` returns 0.
</verification>

<success_criteria>
- `frontend/web/components/Sidebar.tsx` exists, starts with `"use client"`, exports named `Sidebar`.
- Component imports `usePathname` from `next/navigation` and 5 lucide icons (`Home`, `Clock`, `Sparkles`, `Bookmark`, `User`).
- Renders both desktop rail (`hidden md:flex`) and mobile tab bar (`flex md:hidden`) — single component, dual surface (CONTEXT D-01).
- 5 nav items match the route map in CONTEXT D-02.
- Active state computed correctly: exact match for `/`, prefix match for the rest.
- Mobile primary CTA renders as `w-[52px] h-[52px] rounded-full bg-accent` with the documented `shadow-[0_6px_18px_rgba(245,181,68,0.35)]` glow.
- DSGN-06 verification greps all pass.
- `tsc --noEmit` and `pnpm lint` pass.
</success_criteria>

<output>
After completion, create `.planning/phases/03-layout/03-02-SUMMARY.md` covering:
- File created (`Sidebar.tsx`), line count
- Confirmation that line 1 is `"use client";`
- All escape hatches used (list each line + the inline comment)
- Verification grep results: hex-in-className count (0), `style={` count (0), `_design-reference` import count (0), `64px|width: 64|height: 64` count (0), `usePathname` count (≥ 1), `aria-label` count
- `pnpm tsc --noEmit` exit code, `pnpm lint` exit code
- Any deviations from the spec (should be none)
</output>
