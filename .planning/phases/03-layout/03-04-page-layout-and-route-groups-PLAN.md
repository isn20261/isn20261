---
phase: 03-layout
plan: 04
type: execute
wave: 3
depends_on: ["03-01", "03-02", "03-03"]
files_modified:
  - frontend/web/components/PageLayout.tsx
  - frontend/web/app/(app)/layout.tsx
  - frontend/web/app/(auth)/layout.tsx
  - frontend/web/app/(app)/page.tsx
  - frontend/web/app/page.tsx
  - frontend/web/app/(app)/tokens/page.tsx
  - frontend/web/app/tokens/page.tsx
autonomous: true
requirements:
  - LAYT-04
  - LAYT-05
user_setup: []

must_haves:
  truths:
    - "Visiting `/` (root) renders the Phase-1 placeholder content INSIDE the chrome (Sidebar visible at md+, Footer below content)."
    - "Visiting `/tokens` renders the Phase-2 token gallery INSIDE the chrome — URL path unchanged from before migration."
    - "On desktop (>= 768 px), main content is offset by `pl-rail` (= 64 px) so the sidebar rail does not overlap it."
    - "On mobile (< 768 px), main content has `pb-tab` (= 64 px) bottom padding so the tab bar does not cover it."
    - "The `(auth)` route-group layout exists and renders an AuthShell-style centered card with the disclaimer (Phase 4 will add `/login` and `/register` pages under this group)."
    - "Old route files `app/page.tsx` and `app/tokens/page.tsx` no longer exist (migrated into the `(app)` group)."
  artifacts:
    - path: "frontend/web/components/PageLayout.tsx"
      provides: "Named export PageLayout({ header?: ReactNode; children: ReactNode })"
      min_lines: 15
    - path: "frontend/web/app/(app)/layout.tsx"
      provides: "Default-export route-group layout that wraps children in PageLayout"
      min_lines: 8
    - path: "frontend/web/app/(auth)/layout.tsx"
      provides: "Default-export route-group layout (AuthShell-style centered card)"
      contains: "Recommend·a is a fictional concept design."
      min_lines: 20
    - path: "frontend/web/app/(app)/page.tsx"
      provides: "Migrated Phase-1 placeholder root page"
    - path: "frontend/web/app/(app)/tokens/page.tsx"
      provides: "Migrated Phase-2 tokens gallery"
  key_links:
    - from: "frontend/web/app/(app)/layout.tsx"
      to: "components/PageLayout"
      via: "named import"
      pattern: "PageLayout"
    - from: "frontend/web/components/PageLayout.tsx"
      to: "components/Sidebar + components/Footer"
      via: "named imports + JSX composition"
      pattern: "(Sidebar|Footer)"
    - from: "frontend/web/app/(auth)/layout.tsx"
      to: "components/BrandMark"
      via: "named import"
      pattern: "BrandMark"
---

<objective>
Compose the chrome. Ship `<PageLayout>` (LAYT-04) — the Server Component that renders Sidebar + content + Footer with correct responsive offsets — then create the two Next.js App Router route-group layouts (`(app)/layout.tsx` and `(auth)/layout.tsx` per CONTEXT D-06), migrate the existing root and tokens pages into the `(app)` group preserving URL paths exactly, and ship the AuthShell-style chrome inlined into `(auth)/layout.tsx` per CONTEXT D-Discretion.

Purpose: Wave 3 — depends on Plans 01 (BrandMark), 02 (Sidebar), 03 (Navbar + Footer). This plan is the integration that makes the chrome actually visible on existing routes. After this plan, every page reachable under `(app)` shows Sidebar + Footer; the `(auth)` group is shipped layout-only ready for Phase 4 to drop `/login` and `/register` pages into it.
Output: 1 new component + 2 new route-group layouts + 2 page migrations.
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
@.planning/phases/03-layout/03-02-sidebar-PLAN.md
@.planning/phases/03-layout/03-03-navbar-and-footer-PLAN.md
@frontend/web/AGENTS.md
@frontend/web/app/layout.tsx
@frontend/web/app/page.tsx
@frontend/web/app/tokens/page.tsx
@frontend/web/styles/globals.css

<interfaces>
Public APIs this plan creates:

```ts
// components/PageLayout.tsx
import type { ReactNode } from "react";
type PageLayoutProps = Readonly<{
  header?: ReactNode;
  children: ReactNode;
}>;
export function PageLayout(props: PageLayoutProps): JSX.Element;
```

```tsx
// app/(app)/layout.tsx — default export per Next.js layout contract
export default function AppGroupLayout(props: Readonly<{ children: React.ReactNode }>): JSX.Element;
```

```tsx
// app/(auth)/layout.tsx — default export per Next.js layout contract
export default function AuthGroupLayout(props: Readonly<{ children: React.ReactNode }>): JSX.Element;
```

Existing consumed:
- `Sidebar` from `@/components/Sidebar` (Plan 02)
- `Footer` from `@/components/Footer` (Plan 03)
- `BrandMark` from `@/components/BrandMark` (Plan 01)
- Tokens: `bg-bg`, `bg-surface`, `text-text-primary`, `text-text-muted`, `border-border`, `font-body`, `pl-rail`, `pb-tab`, `text-12`, `rounded-lg`, `shadow-lg`, `backdrop-blur-lg`
- Phase 1 root layout (`app/layout.tsx`) — NOT modified by this plan; route-group layouts nest under it.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Author components/PageLayout.tsx (chrome composer)</name>
  <files>frontend/web/components/PageLayout.tsx</files>
  <read_first>
    - frontend/web/components/PageLayout.tsx (confirm does not exist)
    - .planning/phases/03-layout/03-UI-SPEC.md §Component Inventory row "PageLayout" + §Responsive Behavior table (content-offset rules pl-rail / pb-tab) + §Z-index stack
    - .planning/phases/03-layout/03-PATTERNS.md §5 "components/PageLayout.tsx — Chrome composer" (full ready-to-paste TSX with Readonly<{...}> props idiom)
    - .planning/phases/03-layout/03-CONTEXT.md §Decisions D-06 (two layout wrappers via route groups) + §Discretion (PageLayout prop shape: { header?, children })
    - frontend/web/app/layout.tsx (root layout idiom: Readonly<{ children: React.ReactNode }>) — code-style precedent
  </read_first>
  <action>
    Create `frontend/web/components/PageLayout.tsx` with the following exact content:

    ```tsx
    /**
     * Phase 3 (LAYT-04, issue #92) — chrome composer for the (app) route group.
     *
     * Composes Sidebar + optional `header` slot + page content + Footer with the
     * responsive content offsets from UI-SPEC §Responsive Behavior:
     *   - md+ : pl-rail (= 64 px) so content clears the fixed left rail
     *   - <md : pb-tab (= 64 px) so content scrolls clear of the fixed bottom tab bar
     *
     * Server Component. Sidebar (Client) is a child — Next.js handles the boundary.
     * The `header` prop is optional: pages opt-in to a Navbar (CONTEXT D-03).
     * Footer is unconditional in the (app) group (UI-SPEC §Component Inventory).
     */

    import type { ReactNode } from "react";
    import { Sidebar } from "@/components/Sidebar";
    import { Footer } from "@/components/Footer";

    type PageLayoutProps = Readonly<{
      header?: ReactNode;
      children: ReactNode;
    }>;

    export function PageLayout({ header, children }: PageLayoutProps) {
      return (
        <div className="min-h-screen bg-bg text-text-primary font-body">
          <Sidebar />
          <div className="md:pl-rail pb-tab md:pb-0 min-h-screen flex flex-col">
            {header}
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </div>
      );
    }
    ```

    Critical authoring rules:
    - NO `"use client"` (Server Component — Sidebar is the client surface, not the wrapper).
    - `Readonly<{...}>` props idiom (mirrors root `app/layout.tsx`).
    - Named export `PageLayout` (no `export default` — components/* convention).
    - Content-offset utilities are exactly `md:pl-rail` and `pb-tab md:pb-0` — no literal `64`/`64px` strings.
    - Sidebar is unconditional (CONTEXT D-Discretion: "Avoid adding `<Sidebar>` as a prop").
    - NO `style={{ }}`, NO hex/rgba in className.
  </action>
  <verify>
    <automated>cd frontend/web && test -f components/PageLayout.tsx && pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f frontend/web/components/PageLayout.tsx` exits 0.
    - `head -1 frontend/web/components/PageLayout.tsx` does NOT start with `"use client"`.
    - `git grep -nE 'export function PageLayout' -- 'frontend/web/components/PageLayout.tsx'` returns 1 hit.
    - `git grep -nE 'export default' -- 'frontend/web/components/PageLayout.tsx'` returns 0 hits.
    - `git grep -nE "from ['\"]@/components/Sidebar['\"]" -- 'frontend/web/components/PageLayout.tsx'` returns 1 hit.
    - `git grep -nE "from ['\"]@/components/Footer['\"]" -- 'frontend/web/components/PageLayout.tsx'` returns 1 hit.
    - `git grep -nE 'md:pl-rail' -- 'frontend/web/components/PageLayout.tsx'` returns ≥ 1 hit.
    - `git grep -nE 'pb-tab' -- 'frontend/web/components/PageLayout.tsx'` returns ≥ 1 hit.
    - `git grep -nE '\b64px\b|width:\s*64\b|height:\s*64\b' -- 'frontend/web/components/PageLayout.tsx'` returns 0 hits.
    - `git grep -nE 'style=\{' -- 'frontend/web/components/PageLayout.tsx'` returns 0 hits.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
  </acceptance_criteria>
  <done>
    PageLayout.tsx exists, is a Server Component, exports `PageLayout` named, composes Sidebar + optional header + children + Footer with `md:pl-rail` / `pb-tab` responsive offsets, passes tsc.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create app/(app)/layout.tsx and migrate existing pages into the (app) group</name>
  <files>frontend/web/app/(app)/layout.tsx, frontend/web/app/(app)/page.tsx, frontend/web/app/(app)/tokens/page.tsx, frontend/web/app/page.tsx, frontend/web/app/tokens/page.tsx</files>
  <read_first>
    - frontend/web/app/page.tsx (existing Phase-1 placeholder — full content; will be moved verbatim)
    - frontend/web/app/tokens/page.tsx (existing Phase-2 token gallery — full content; will be moved verbatim)
    - frontend/web/app/layout.tsx (root layout — NOT modified, just confirm it stays as the parent)
    - .planning/phases/03-layout/03-PATTERNS.md §6 "app/(app)/layout.tsx" + §8 "app/(app)/page.tsx" (relocation pattern) + §9 "app/(app)/tokens/page.tsx"
    - .planning/phases/03-layout/03-UI-SPEC.md §Component Inventory route-group-layouts table + §Migrations
    - .planning/phases/03-layout/03-CONTEXT.md §Decisions D-06 (route groups are URL-cosmetic — `/` and `/tokens` URLs unchanged after migration)
  </read_first>
  <action>
    Three sub-steps in order:

    **Step A: Create `frontend/web/app/(app)/layout.tsx`** (the `(app)` route-group layout file) with this exact content:

    ```tsx
    /**
     * Phase 3 (LAYT-04, issue #92) — `(app)` route-group layout.
     *
     * Wraps every page under app/(app)/ with the chrome composer (PageLayout).
     * Route group `(app)` is URL-cosmetic — pages keep their original URL paths.
     *
     * Per CONTEXT D-Discretion: this layout does NOT pre-render a Navbar header.
     * Pages opt into a top bar by including <Navbar variant="..." /> in their
     * own JSX. (Phase 6 home will pass it; detail screens skip it, matching the
     * reference design.)
     *
     * Server Component (Sidebar inside PageLayout is the client boundary).
     */

    import { PageLayout } from "@/components/PageLayout";

    export default function AppGroupLayout({
      children,
    }: Readonly<{
      children: React.ReactNode;
    }>) {
      return <PageLayout>{children}</PageLayout>;
    }
    ```

    **Step B: Migrate `app/page.tsx` to `app/(app)/page.tsx`.** Read the current content of `frontend/web/app/page.tsx` (Phase-1 placeholder, ~19 lines). Create `frontend/web/app/(app)/page.tsx` with the SAME content verbatim. Delete the original `frontend/web/app/page.tsx`. Use `git mv` if available so history is preserved.

    Expected content for `frontend/web/app/(app)/page.tsx` (verbatim from existing):

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

    **Step C: Migrate `app/tokens/page.tsx` to `app/(app)/tokens/page.tsx`.** Read the existing Phase-2 tokens gallery (~167 lines). Create `frontend/web/app/(app)/tokens/page.tsx` with the SAME content verbatim. Delete the original `frontend/web/app/tokens/page.tsx`. Remove the now-empty `frontend/web/app/tokens/` directory.

    Critical: Do NOT modify the content of either migrated file beyond moving its location. The Phase-2 tokens gallery already passes the DSGN-06 lint exception per `frontend/web/AGENTS.md` (the gallery may contain hex/rgba literals as inline JSX text content). The verification grep in UI-SPEC §Verification Hooks line 270 explicitly excludes the tokens page (`grep -v 'app/(app)/tokens/page.tsx'`) — that exclusion path now matches the migrated location.

    After all three sub-steps:
    - `frontend/web/app/(app)/layout.tsx` exists.
    - `frontend/web/app/(app)/page.tsx` exists with Phase-1 placeholder content (verbatim).
    - `frontend/web/app/(app)/tokens/page.tsx` exists with Phase-2 gallery content (verbatim).
    - `frontend/web/app/page.tsx` no longer exists.
    - `frontend/web/app/tokens/page.tsx` no longer exists.
    - `frontend/web/app/tokens/` directory no longer exists.
    - `frontend/web/app/layout.tsx` (root) is UNCHANGED.
  </action>
  <verify>
    <automated>cd frontend/web && test -f 'app/(app)/layout.tsx' && test -f 'app/(app)/page.tsx' && test -f 'app/(app)/tokens/page.tsx' && ! test -f 'app/page.tsx' && ! test -f 'app/tokens/page.tsx' && pnpm tsc --noEmit && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `test -f 'frontend/web/app/(app)/layout.tsx'` exits 0.
    - `test -f 'frontend/web/app/(app)/page.tsx'` exits 0.
    - `test -f 'frontend/web/app/(app)/tokens/page.tsx'` exits 0.
    - `test -f frontend/web/app/page.tsx` exits 1 (file removed).
    - `test -f frontend/web/app/tokens/page.tsx` exits 1 (file removed).
    - `test -d frontend/web/app/tokens` exits 1 (directory removed).
    - `git grep -nE 'export default function AppGroupLayout' -- 'frontend/web/app/(app)/layout.tsx'` returns 1 hit.
    - `git grep -nE "from ['\"]@/components/PageLayout['\"]" -- 'frontend/web/app/(app)/layout.tsx'` returns 1 hit.
    - `git grep -nF 'recommend-a — coming soon' -- 'frontend/web/app/(app)/page.tsx'` returns 1 hit (placeholder copy preserved).
    - The migrated tokens gallery is byte-equivalent to the previous file: the `COLORS`, `TYPE_SCALE`, etc. arrays still exist — `git grep -nE 'const COLORS' -- 'frontend/web/app/(app)/tokens/page.tsx'` returns 1 hit.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm build` exits 0 (Next.js builds the `(app)` group successfully — proves route resolution works for `/` and `/tokens` after migration).
    - `cd frontend/web && pnpm dev` boots without errors and `curl -sI http://localhost:3000/` returns HTTP 200, `curl -sI http://localhost:3000/tokens` returns HTTP 200 (URLs unchanged after migration). [Manual or CI step — see Plan 05 for the dev-server check; this acceptance is satisfied by `pnpm build` succeeding.]
  </acceptance_criteria>
  <done>
    `(app)` route-group layout exists and uses PageLayout. The two pre-existing pages are now under `(app)/` with their original URL paths intact. `pnpm build` succeeds, proving the route table is correct.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Author app/(auth)/layout.tsx (AuthShell-style chrome, no pages yet)</name>
  <files>frontend/web/app/(auth)/layout.tsx</files>
  <read_first>
    - .planning/phases/03-layout/03-UI-SPEC.md §Component Inventory row "(auth)/layout.tsx" + §Copywriting Contract row "Footer disclaimer"
    - .planning/phases/03-layout/03-PATTERNS.md §7 "app/(auth)/layout.tsx — (auth) route-group layout" (full visual numbers table from auth.jsx:3-35 + ready-to-paste TSX)
    - .planning/phases/03-layout/03-CONTEXT.md §Decisions D-06 (auth route group ships layout-only in Phase 3 — pages land Phase 4)
    - frontend/web/_design-reference/auth.jsx lines 1-35, line 86 (literal disclaimer string with U+00B7 middot — read for the exact characters, do NOT import JSX)
  </read_first>
  <action>
    Create `frontend/web/app/(auth)/layout.tsx` with the following exact content. The disclaimer string MUST contain U+00B7 middot.

    ```tsx
    /**
     * Phase 3 (LAYT-04, issue #92) — `(auth)` route-group layout.
     *
     * Centered-card chrome for /login + /register (Phase 4 fills these pages).
     * Re-authored fresh from `_design-reference/auth.jsx:3-35` per CLAUDE.md rule #2.
     *
     * Does NOT render Sidebar (no rail / no tab bar on auth routes).
     * Does NOT render the global Footer — its own internal disclaimer is below the card.
     *
     * Server Component. Default export per Next.js layout contract.
     *
     * Note: this file is shipped in Phase 3 even though /login and /register pages
     * land in Phase 4 (CONTEXT D-06) — shipping the layout shape now avoids a
     * Phase-4 layout-decision detour.
     */

    import { BrandMark } from "@/components/BrandMark";

    export default function AuthGroupLayout({
      children,
    }: Readonly<{
      children: React.ReactNode;
    }>) {
      return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg">
          <div className="relative w-[min(420px,calc(100%-40px))] py-10 px-8 bg-surface/75 border border-border rounded-lg backdrop-blur-lg shadow-lg">
            <div className="flex justify-center mb-7">
              <BrandMark size={36} />
            </div>
            {children}
          </div>
          <div className="absolute bottom-6 left-0 right-0 text-center text-text-muted text-12 font-body">
            Recommend·a is a fictional concept design.
          </div>
        </div>
      );
    }
    ```

    Critical authoring rules:
    - The disclaimer span MUST contain U+00B7 middot character verbatim.
    - `w-[min(420px,calc(100%-40px))]` is a size primitive (NOT a design token). The arbitrary-value Tailwind syntax is permitted because it expresses a layout responsive width formula, not a tokenized color/font/spacing value. Add an inline comment: `{/* size primitive: card max-width 420px with 20px gutters at <420px viewports — see UI-SPEC §Component Inventory (auth) row */}`.
    - `bg-surface/75` is the Tailwind opacity utility (token-resolved). Add an inline comment: `{/* approximation: bg-surface/75 stands in for reference rgba(20,20,22,.75) */}`.
    - `rounded-lg` (= 16 px) is used instead of the reference's exact 18 px — per UI-SPEC §Component Inventory the 2 px drift is acceptable; if reviewers flag it, swap to `rounded-[18px]` with an inline non-tokenized comment.
    - NO `"use client"`.
    - NO `style={{ }}`.
    - NO hex/rgba literals in className.
    - Default export per Next.js layout contract.
    - Does NOT import or render `<Footer>` (UI-SPEC §Component Inventory note).
    - Does NOT import or render `<Sidebar>`.
    - The `(auth)` route group has no pages yet (Phase 4 ships `/login` + `/register`); Next.js does NOT require a child page for a route group to compile (route groups are cosmetic to URLs and only affect routing when pages exist). `pnpm build` will still succeed.
  </action>
  <verify>
    <automated>cd frontend/web && test -f 'app/(auth)/layout.tsx' && pnpm tsc --noEmit && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `test -f 'frontend/web/app/(auth)/layout.tsx'` exits 0.
    - `head -1 'frontend/web/app/(auth)/layout.tsx'` does NOT start with `"use client"`.
    - `git grep -nE 'export default function AuthGroupLayout' -- 'frontend/web/app/(auth)/layout.tsx'` returns 1 hit.
    - `git grep -nF 'Recommend·a is a fictional concept design.' -- 'frontend/web/app/(auth)/layout.tsx'` returns 1 hit (middot — UI-SPEC §Verification Hooks grep #4).
    - `git grep -nF 'Recommend-a' -- 'frontend/web/app/(auth)/layout.tsx'` returns 0 hits.
    - `git grep -nE "from ['\"]@/components/BrandMark['\"]" -- 'frontend/web/app/(auth)/layout.tsx'` returns 1 hit.
    - `git grep -nE "from ['\"]@/components/Sidebar['\"]" -- 'frontend/web/app/(auth)/layout.tsx'` returns 0 hits (no sidebar).
    - `git grep -nE "from ['\"]@/components/Footer['\"]" -- 'frontend/web/app/(auth)/layout.tsx'` returns 0 hits (no global footer).
    - `git grep -nE 'style=\{' -- 'frontend/web/app/(auth)/layout.tsx'` returns 0 hits.
    - `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'frontend/web/app/(auth)/layout.tsx'` returns 0 hits.
    - `git grep -nE "from ['\"].*_design-reference" -- 'frontend/web/app/(auth)/layout.tsx'` returns 0 hits.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm build` exits 0 (build succeeds with the empty `(auth)` route group).
  </acceptance_criteria>
  <done>
    `(auth)/layout.tsx` exists, is a Server Component, exports `AuthGroupLayout` default, renders the centered card with BrandMark + the U+00B7-middot disclaimer + children slot, does NOT compose Sidebar or global Footer. Phase 4 can drop `/login` and `/register` pages directly under `app/(auth)/` without further layout work.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| n/a (chrome-only) | All three layout files render hardcoded structural JSX with no user input, no API calls, no auth state. PageLayout takes a `children: ReactNode` prop — that's the page content slot, owned and trusted by the page being rendered. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-12 | Tampering | Route-group migration | accept | The migration moves files verbatim — no transformation of content. The verification step (`pnpm build` succeeds) proves the route table is correct after migration. |
| T-03-13 | Information Disclosure | `(auth)` group rendered without auth pages | accept | The `(auth)/layout.tsx` exists in Phase 3 with no child pages yet. Next.js does not generate routes for a layout file alone — visiting any `/login` or `/register` URL still 404s until Phase 4 ships the pages. There is no risk of accidentally exposing auth UI prematurely. |
| T-03-14 | XSS | PageLayout `children` prop | accept | `children: ReactNode` flows directly into JSX. React escapes string children automatically. JSX children produced by Server Components in this milestone come from hardcoded sources (Phase-1 placeholder, Phase-2 token data). No user-supplied content reaches `children` until Phase 4+ form input. |
</threat_model>

<verification>
- `cd frontend/web && pnpm tsc --noEmit` exits 0.
- `cd frontend/web && pnpm build` exits 0 (proves `(app)` and `(auth)` route groups compile).
- `cd frontend/web && pnpm lint` exits 0.
- `test -f 'frontend/web/app/(app)/layout.tsx' && test -f 'frontend/web/app/(auth)/layout.tsx' && test -f 'frontend/web/components/PageLayout.tsx'` all exit 0.
- `! test -f frontend/web/app/page.tsx && ! test -f frontend/web/app/tokens/page.tsx` (originals removed).
- `git grep -nF 'Recommend·a is a fictional concept design.' -- 'frontend/web/app/(auth)/layout.tsx'` returns 1 hit.
- Combined middot count across all Phase-3 chrome files: `git grep -nF 'Recommend·a' -- 'frontend/web/components/' 'frontend/web/app/'` returns ≥ 3 hits (BrandMark wordmark + Footer disclaimer + (auth) layout disclaimer).
</verification>

<success_criteria>
- `components/PageLayout.tsx` exists, exports named `PageLayout`, composes Sidebar + optional header + children + Footer.
- `app/(app)/layout.tsx` exists with default export, wraps children in `<PageLayout>`.
- `app/(auth)/layout.tsx` exists with default export, renders centered AuthShell card with the disclaimer.
- `app/(app)/page.tsx` exists (migrated Phase-1 placeholder).
- `app/(app)/tokens/page.tsx` exists (migrated Phase-2 gallery).
- `app/page.tsx` and `app/tokens/page.tsx` no longer exist.
- `pnpm build` succeeds (proves URL paths `/` and `/tokens` still resolve, and `(auth)` group compiles).
- All DSGN-06 verification greps still pass.
</success_criteria>

<output>
After completion, create `.planning/phases/03-layout/03-04-SUMMARY.md` covering:
- 5 files created (PageLayout, two route-group layouts, two migrated pages)
- 2 files deleted (old `app/page.tsx`, old `app/tokens/page.tsx`)
- Confirmation that `pnpm build` succeeds and the route table includes `/` and `/tokens` (Next.js build output lists these routes).
- Verification grep results for the 5 UI-SPEC verification hooks (running them across `frontend/web/`)
- Combined middot count (≥ 3 hits across BrandMark + Footer + (auth) layout)
- `pnpm tsc --noEmit` exit code, `pnpm lint` exit code, `pnpm build` exit code
</output>
