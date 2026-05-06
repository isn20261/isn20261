---
phase: 03-layout
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/web/package.json
  - frontend/web/pnpm-lock.yaml
  - frontend/web/components/BrandMark.tsx
  - frontend/web/components/.gitkeep
autonomous: true
requirements:
  - LAYT-01
  - LAYT-02
  - LAYT-03
user_setup: []

must_haves:
  truths:
    - "Developer can `import { BrandMark } from '@/components/BrandMark'` and render the brand SVG + wordmark."
    - "BrandMark wordmark spells `Recommend·a` with the U+00B7 middot character (not a hyphen)."
    - "lucide-react is installed at the latest version and pinned in pnpm-lock.yaml."
    - "BrandMark renders without `\"use client\"` (Server Component)."
    - "BrandMark uses no Tailwind hex literals or className-side hardcoded colors; SVG attributes use `var(--color-accent|accent-hover|on-accent)` per the documented escape hatch."
  artifacts:
    - path: "frontend/web/components/BrandMark.tsx"
      provides: "Named export `BrandMark({ size?: number; withWord?: boolean })` (defaults size=28, withWord=true)"
      contains: "Recommend·a"
      min_lines: 25
    - path: "frontend/web/package.json"
      provides: "lucide-react in dependencies"
      contains: "lucide-react"
  key_links:
    - from: "frontend/web/components/BrandMark.tsx"
      to: "var(--color-accent), var(--color-accent-hover), var(--color-on-accent)"
      via: "SVG <stop stopColor> + <rect fill> + <path fill> attributes (documented escape hatch)"
      pattern: "var\\(--color-(accent|accent-hover|on-accent)\\)"
---

<objective>
Install `lucide-react` and ship the `BrandMark` component — the foundational building block consumed by Sidebar (Plan 02), Navbar + Footer (Plan 03) and the AuthShell layout (Plan 04). BrandMark is re-authored fresh from `_design-reference/shared.jsx:4-29` (CLAUDE.md hard rule #2 — no JSX import from `_design-reference/`). DSGN-06 strict: SVG `var(--color-*)` references are the ONE documented escape hatch; the wordmark `<span>` styling uses Tailwind utilities only.

Purpose: Wave-1 prerequisite for every other Phase 3 component. Without BrandMark, Plans 02–04 cannot ship.
Output: One npm dependency installed (`lucide-react`) and one Server Component file in `components/`.
</objective>

<execution_context>
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/workflows/execute-plan.md
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-layout/03-CONTEXT.md
@.planning/phases/03-layout/03-UI-SPEC.md
@.planning/phases/03-layout/03-PATTERNS.md
@CLAUDE.md
@frontend/web/AGENTS.md
@frontend/web/styles/globals.css
@frontend/web/app/tokens/page.tsx

<interfaces>
<!-- Tokens consumed (already shipped by Phase 2; verify only, do not extend): -->

From frontend/web/styles/globals.css @theme block:
- --color-accent          = #f5b544     → Tailwind `text-accent` / `bg-accent`
- --color-accent-hover    = #ffc560     → Tailwind `bg-accent-hover` (used in SVG gradient stop only)
- --color-on-accent       = #1a1305     → Tailwind `text-on-accent`
- --color-text-primary    = #f5f5f6     → Tailwind `text-text-primary`
- --font-display          = Manrope     → Tailwind `font-display`

Public API this plan creates:
```ts
export function BrandMark(props: { size?: number; withWord?: boolean }): JSX.Element;
// defaults: size = 28, withWord = true
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install lucide-react and pin in lockfile</name>
  <files>frontend/web/package.json, frontend/web/pnpm-lock.yaml</files>
  <read_first>
    - frontend/web/package.json (current dependencies — confirm lucide-react not already present)
    - .planning/phases/03-layout/03-CONTEXT.md §Decisions D-08 (icons via lucide-react, latest, pin in lockfile)
    - .planning/phases/03-layout/03-PATTERNS.md §Convention 8 (lucide-react install command + size-prop note)
    - frontend/web/AGENTS.md (icon-internal `size` prop is NOT a DSGN-06 violation)
  </read_first>
  <action>
    Run `pnpm add lucide-react` from `frontend/web/`. Do NOT pass a version flag — install latest, pnpm pins exactly in `pnpm-lock.yaml`. Per CONTEXT D-08 the package is a transitive concern from shadcn's `components.json` — installing it as a direct dep is the supported path.

    If `pnpm add` is unavailable in the sandbox, edit `frontend/web/package.json` to add `"lucide-react": "^0.474.0"` (or whatever the current latest reads from npm) under `"dependencies"` and run `pnpm install` to regenerate the lockfile entry. Either path produces the same end state: `lucide-react` listed in `dependencies` of `package.json` and a corresponding `lucide-react` block in `pnpm-lock.yaml`.

    Do NOT install any other packages. Do NOT modify `components.json` (already configured at Phase 1).
  </action>
  <verify>
    <automated>cd frontend/web && grep -q '"lucide-react"' package.json && grep -q '/lucide-react' pnpm-lock.yaml && pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q '"lucide-react"' frontend/web/package.json` exits 0 (dependency listed in package.json).
    - `grep -q '/lucide-react' frontend/web/pnpm-lock.yaml` exits 0 (lockfile entry present and pinned).
    - `cd frontend/web && pnpm tsc --noEmit` exits 0 (lucide-react TS types resolve cleanly).
    - No other dependencies were added or removed (diff `package.json` shows only the lucide-react addition).
  </acceptance_criteria>
  <done>
    `lucide-react` installed at latest, pinned in lockfile, TypeScript resolves icon imports without error. No collateral package changes.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Author components/BrandMark.tsx (fresh re-author)</name>
  <files>frontend/web/components/BrandMark.tsx, frontend/web/components/.gitkeep</files>
  <read_first>
    - frontend/web/components/.gitkeep (confirm components/ is currently empty per Phase 1 D-02)
    - .planning/phases/03-layout/03-UI-SPEC.md §Component Inventory row "BrandMark" + §Typography row "Brand wordmark" + §Color row "Accent reserved for"
    - .planning/phases/03-layout/03-PATTERNS.md §1 "components/BrandMark.tsx — fresh re-author" (full SVG geometry block, wordmark span, server-component default)
    - .planning/phases/03-layout/03-CONTEXT.md §Decisions D-09 (BrandMark fresh re-author) + §Specifics (middot character)
    - CLAUDE.md root §"Hard rules" rule #2 (NEVER import JSX from `_design-reference/`)
    - frontend/web/AGENTS.md §"Forbidden in app/ and components/" (no `style={{ }}` for tokenized properties)
    - frontend/web/_design-reference/shared.jsx lines 4-29 (visual SVG geometry — read for numbers ONLY, do not import)
  </read_first>
  <action>
    Create `frontend/web/components/BrandMark.tsx` with the following exact content. Then delete `frontend/web/components/.gitkeep` (no longer needed — directory is no longer empty).

    File content (UTF-8, MUST contain U+00B7 middot character verbatim):

    ```tsx
    /**
     * Phase 3 (LAYT-01..04, issue #92) — Brand mark.
     *
     * Re-authored fresh from frontend/_design-reference/shared.jsx:4-29 per
     * CLAUDE.md hard rule #2 (no JSX import from _design-reference/).
     *
     * DSGN-06 escape hatch (the ONLY one in this file):
     * SVG <stop stopColor>, <rect fill> and <path fill> attribute values cannot
     * be reached by Tailwind utilities — they reference the CSS custom properties
     * directly via var(...). See UI-SPEC §Color Escape Hatches.
     *
     * The wordmark <span> uses Tailwind utilities only (no inline style).
     */

    type BrandMarkProps = {
      size?: number;
      withWord?: boolean;
    };

    export function BrandMark({ size = 28, withWord = true }: BrandMarkProps) {
      return (
        <span className="inline-flex items-center gap-2">
          <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            aria-hidden
            role="img"
          >
            <defs>
              <linearGradient id="ra-bg" x1="0" x2="1" y1="0" y2="1">
                {/* non-tokenized: SVG <stop stopColor> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches */}
                <stop offset="0" stopColor="var(--color-accent)" />
                <stop offset="1" stopColor="var(--color-accent-hover)" />
              </linearGradient>
            </defs>
            {/* non-tokenized: SVG <rect fill> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches */}
            <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#ra-bg)" />
            {/* non-tokenized: SVG <path fill> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches */}
            <path
              d="M11 22V10h6.2c2.4 0 4 1.5 4 3.7 0 1.7-.9 2.9-2.4 3.4l3 4.9h-3l-2.7-4.5h-2.4V22zm2.7-6.7h3c1.2 0 2-.6 2-1.6s-.8-1.6-2-1.6h-3z"
              fill="var(--color-on-accent)"
            />
          </svg>
          {withWord && (
            // non-tokenized: brand-mark wordmark size 18px is outside the Phase 2 type scale (12/14/16/20/28/40/64) — see UI-SPEC §Typography
            <span className="font-display font-extrabold tracking-tight text-[18px] text-text-primary leading-tight">
              Recommend<span className="text-accent">·</span>a
            </span>
          )}
        </span>
      );
    }
    ```

    Critical authoring notes (executor — do not deviate):
    - The middot character between "Recommend" and "a" MUST be U+00B7 (`·`), not a hyphen `-`. Copy-paste it from this file or from `_design-reference/auth.jsx:86`. Verify with `git grep -nF 'Recommend·a' -- 'frontend/web/components/BrandMark.tsx'`.
    - NO `"use client"` directive.
    - Named export only (no `export default`).
    - The four `var(--color-*)` references inside SVG attributes are the documented exception per DSGN-06 / UI-SPEC §Color Escape Hatches. Each MUST have an inline `// non-tokenized: ...` comment.
    - The `text-[18px]` arbitrary value is the documented exception per UI-SPEC §Typography. Inline comment required.
    - No other arbitrary values, no inline `style={{ }}`, no hex/rgba literals in `className`.

    After writing, delete `frontend/web/components/.gitkeep` (use `rm` or equivalent — Phase 1 placed it; now obsolete).
  </action>
  <verify>
    <automated>cd frontend/web && test -f components/BrandMark.tsx && ! test -f components/.gitkeep && pnpm tsc --noEmit && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - `test -f frontend/web/components/BrandMark.tsx` exits 0.
    - `test -f frontend/web/components/.gitkeep` exits 1 (file removed).
    - `head -1 frontend/web/components/BrandMark.tsx` does NOT start with `"use client"` (Server Component).
    - `git grep -nF 'Recommend·a' -- 'frontend/web/components/BrandMark.tsx'` returns ≥ 1 hit (middot present).
    - `git grep -nF 'Recommend-a' -- 'frontend/web/components/BrandMark.tsx'` returns 0 hits (no hyphen variant).
    - `git grep -nE 'export function BrandMark' -- 'frontend/web/components/BrandMark.tsx'` returns ≥ 1 hit (named export).
    - `git grep -nE 'export default' -- 'frontend/web/components/BrandMark.tsx'` returns 0 hits.
    - `git grep -nE 'from .*_design-reference' -- 'frontend/web/components/BrandMark.tsx'` returns 0 hits (no JSX import — CLAUDE.md rule #2).
    - `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'frontend/web/components/BrandMark.tsx'` returns 0 hits (no hex in className).
    - The 3 SVG color references (`stopColor="var(--color-accent)"`, `stopColor="var(--color-accent-hover)"`, `fill="var(--color-on-accent)"`) are present AND each is preceded by a `// non-tokenized:` comment.
    - The `text-[18px]` literal is present AND preceded by a `// non-tokenized:` comment.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    BrandMark exists at `components/BrandMark.tsx`, is a Server Component, exports `BrandMark` named, contains the U+00B7 middot in the wordmark, references the 3 SVG color CSS variables (the only documented inline-style-equivalent exception per DSGN-06), passes tsc + lint.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| n/a (chrome-only) | This plan ships a presentational SVG component and an npm dep install. No untrusted input, no network, no auth state, no user input handlers. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Tampering | `pnpm add lucide-react` (supply-chain) | accept | Risk is intrinsic to any npm install; mitigated at the repo level by pnpm lockfile pinning + (future) `pnpm audit` in CI. Phase 3 only adds `lucide-react`, a widely-used library (Vercel-recommended for shadcn). No additional gate added. |
| T-03-02 | XSS / Injection | `BrandMark` rendering | accept | Component takes `size: number` and `withWord: boolean` only — no string props that flow into `dangerouslySetInnerHTML` or unescaped DOM insertion. TypeScript `strict` mode prevents string-to-number coercion. The hardcoded SVG path uses static literals. |
| T-03-03 | Repudiation / Logging | n/a | n/a | Component has no side effects to log. |
</threat_model>

<verification>
- `cd frontend/web && pnpm install` (or pnpm add command) produces a lockfile entry for lucide-react.
- `cd frontend/web && pnpm tsc --noEmit` exits 0 — proves type-resolution of both lucide-react imports and BrandMark.
- `cd frontend/web && pnpm lint` exits 0 — proves DSGN-06 / Next.js / TS lint rules pass.
- `git grep -nF 'Recommend·a' -- 'frontend/web/components/BrandMark.tsx'` returns ≥ 1 hit (middot verified).
- `git grep -nE "from ['\"].*_design-reference" -- 'frontend/web/components/BrandMark.tsx'` returns 0 hits (no JSX import).
</verification>

<success_criteria>
- `frontend/web/components/BrandMark.tsx` exists, exports named `BrandMark`, is a Server Component, renders the SVG + wordmark with U+00B7 middot, uses Tailwind utilities for the wordmark and `var(--color-*)` for the 3 SVG attributes.
- `lucide-react` is installed and pinned.
- `tsc --noEmit` and `pnpm lint` both pass.
- `components/.gitkeep` is removed (directory is no longer empty).
- No JSX imported from `frontend/_design-reference/`.
- No hex/rgba literals in `className`, no `style={{ }}` props (the SVG `var(...)` attributes are the documented exception, not `style={{ }}`).
</success_criteria>

<output>
After completion, create `.planning/phases/03-layout/03-01-SUMMARY.md` covering:
- Files created/modified (`BrandMark.tsx`, `package.json`, `pnpm-lock.yaml`; deleted `.gitkeep`)
- Exact `lucide-react` version installed
- Confirmation grep results: `Recommend·a` count, hex-in-className count (must be 0), JSX-import-from-design-reference count (must be 0)
- Any DSGN-06 escape hatches used (the 3 SVG `var(--color-*)` and the 1 `text-[18px]`) — quote each comment line
- `pnpm tsc --noEmit` exit code, `pnpm lint` exit code
</output>
