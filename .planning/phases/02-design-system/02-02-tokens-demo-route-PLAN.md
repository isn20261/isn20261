---
phase: 02-design-system
plan: 02
type: execute
wave: 2
depends_on: [02-01]
files_modified:
  - frontend/web/app/tokens/page.tsx
autonomous: true
requirements: [DSGN-05]
tags: [nextjs, app-router, tokens-demo, server-component, no-drift-gallery]

must_haves:
  truths:
    - "Visiting `http://localhost:3000/tokens` (after `pnpm dev`) renders a single-page gallery showing every design token from `_design-reference/styles.css` grouped by category (colors, typography, radii, shadows, layout sizes) — ROADMAP success #3."
    - "Every color token from D-06's bullet list (bg → surface → surface-elevated → surface-2 → border → border-strong → text-primary → text-secondary → text-muted → accent → accent-hover → accent-soft → on-accent → success → warning → danger) appears as a swatch labeled with its token name AND its resolved hex/rgba value."
    - "The typography section renders one row per type-scale step (12, 14, 16, 20, 28, 40, 64) showing the lorem text in BOTH `font-display` (Manrope) and `font-body` (Inter) — so any drift in font loading or sizing is spottable at a glance."
    - "The radii section renders 4 squares with `rounded-sm`/`md`/`lg`/`xl` labeled with px values (6/10/16/22)."
    - "The shadows section renders 2 cards with `shadow-md` and `shadow-lg` on the page background labeled with their token names."
    - "The layout-sizes section renders one filled `w-rail h-tab` (64×64) box and one full-width `h-tab` band labeled with their px values."
    - "The page is a server component (no `'use client'`), uses no shadcn primitives (none exist yet in this phase), and consumes ONLY Tailwind theme variables — no hardcoded hex / px in the file."
    - "`pnpm lint` exits 0 and `pnpm exec tsc --noEmit` exits 0 for this file."
  artifacts:
    - path: "frontend/web/app/tokens/page.tsx"
      provides: "Visible token gallery proving zero drift from `_design-reference/styles.css`"
      exports: ["default"]
      contains: "export default function TokensPage"
  key_links:
    - from: "frontend/web/app/tokens/page.tsx"
      to: "frontend/web/styles/globals.css"
      via: "every Tailwind utility class on the page (`bg-bg`, `text-primary`, `font-display`, `text-16`, `rounded-md`, `shadow-md`, `w-rail`, `h-tab`) resolves through the `@theme` block authored in plan 02-01"
      pattern: "bg-bg|bg-surface|bg-accent|text-primary|text-12|font-display|rounded-md|shadow-md|w-rail|h-tab"
---

<objective>
Replace the Phase 1 placeholder body of `frontend/web/app/tokens/page.tsx` with a visible token gallery that renders every design token from `frontend/_design-reference/styles.css` (`:root` block) on a single screen, grouped by category, so any visual drift between the rendered values and the reference is spottable in one glance. Closes DSGN-05.

Purpose: This is the no-drift proof for ROADMAP success criterion #3. The previous plan (02-01) authored the tokens — this plan PROVES they render correctly at the call site. Without this, "the tokens work" is an unverified assertion.

Output: One modified file (`frontend/web/app/tokens/page.tsx`) — a Next.js App Router server component that uses ONLY Tailwind utility classes from the Phase-2 `@theme` block (no hardcoded hex, no inline px font-sizes). The file path is locked: it replaces the existing Phase-1 placeholder in place per Phase 1 D-03.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
@$HOME/.claude/get-shit-done/references/agent-contracts.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-design-system/02-CONTEXT.md
@frontend/_design-reference/styles.css
@frontend/web/styles/globals.css
@frontend/web/app/tokens/page.tsx
@frontend/web/app/page.tsx
@frontend/web/app/layout.tsx
@CLAUDE.md
@frontend/web/AGENTS.md
@frontend/web/CLAUDE.md
@.planning/phases/02-design-system/02-01-SUMMARY.md

<critical_reminders>
- **Next.js 16 is NOT the Next.js you know.** `frontend/web/AGENTS.md` requires consulting `node_modules/next/dist/docs/` (especially `01-app/`) before writing App Router code. Patterns from older Next.js versions may not apply (e.g. metadata API, server vs client component defaults, `Link` props).
- **No JSX imports from `_design-reference/`** (CLAUDE.md hard rule #2). Read `_design-reference/styles.css` for the spec; do NOT import `_design-reference/*.jsx`. Author the gallery fresh.
- **No hardcoded hex / px in this file** (CLAUDE.md hard rule #4 + DSGN-06). Every color, font-size, radius, shadow, and layout size MUST be expressed as a Tailwind utility class (e.g. `bg-bg`, `text-12`, `rounded-md`, `shadow-md`, `w-rail`). The literal hex/rgba values appear ONLY inside JSX text content (e.g. `<code>#0a0a0b</code>`) — not inside a `style={...}` prop or a `className`.
- **Server component, no `'use client'`** (CONTEXT.md D-06). No state, no effects, no event handlers. Pure JSX.
- **No shadcn primitives** (CONTEXT.md D-06 — `components/` is still empty in this phase). Use plain `<div>`, `<section>`, `<h1>`, `<h2>`, `<p>`, `<code>`, `<span>`. Phase 3 owns shadcn-driven layout chrome.
- **The file path is locked** — do not rename, do not delete-and-recreate. Modify in place per Phase 1 D-03.
</critical_reminders>

<interfaces>
<!-- Tailwind utilities available from plan 02-01's `@theme` block. -->
<!-- This is the full menu of class names this page may use. Do not invent others. -->

Colors (bg-* / text-* / border-* prefixes apply):
  bg-bg, bg-surface, bg-surface-elevated, bg-surface-2,
  border-border, border-border-strong,
  text-primary, text-secondary, text-muted (short-name aliases per 02-01),
  text-text-primary, text-text-secondary, text-text-muted (verbatim names per D-02 — equivalent),
  bg-accent, bg-accent-hover, bg-accent-soft, text-on-accent,
  text-success, text-warning, text-danger
  (also: bg-success, bg-warning, bg-danger, etc. — Tailwind v4 generates the full prefix matrix)

Type scale: text-12, text-14, text-16, text-20, text-28, text-40, text-64

Fonts: font-display (Manrope), font-body (Inter)

Radii: rounded-sm (6px), rounded-md (10px), rounded-lg (16px), rounded-xl (22px)

Shadows: shadow-md, shadow-lg

Layout sizes (work with any size utility): w-rail / h-rail / w-tab / h-tab / p-rail / m-tab / etc. — all 64px

For Tailwind's standard utilities (flex, grid, gap-*, p-*, m-*, max-w-*, etc.) — use freely; they don't require any token authoring and are part of Tailwind v4's default theme.
</interfaces>

<existing_phase1_placeholder>
The current contents of `frontend/web/app/tokens/page.tsx` (Phase 1 D-03 placeholder — to be replaced):

```typescript
import Link from "next/link";

export default function TokensPage() {
  return (
    <main>
      <h1>Design tokens — populated in Phase 2</h1>
      <p>Foundation phase placeholder. ...</p>
      <p><Link href="/">← Back to home placeholder</Link></p>
    </main>
  );
}
```

Replace the body but keep the same export shape (`export default function TokensPage`) so the route stays at `/tokens`.
</existing_phase1_placeholder>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author the tokens demo page</name>
  <files>frontend/web/app/tokens/page.tsx</files>
  <action>
Replace the contents of `frontend/web/app/tokens/page.tsx` with a server component that renders five sections in this order: Colors → Typography → Radii → Shadows → Layout sizes. The structure below is mandatory; whitespace, exact heading copy, and minor internal spacing decisions are at the implementer's discretion (CONTEXT.md D-Discretion).

**Required structural skeleton:**

```typescript
/**
 * Phase 2 (DSGN-05) tokens demo route — visible proof that every token
 * authored in styles/globals.css `@theme` (plan 02-01) renders correctly
 * at the call site.
 *
 * This page mirrors frontend/_design-reference/styles.css :root tokens
 * one-for-one so any drift is spottable in a single screen.
 *
 * Author rule (Phase 2 DSGN-06 / CLAUDE.md hard rule #4): only Tailwind
 * theme variables in classNames. Hex / px values appear here ONLY as
 * inline text content for the human reader to compare against the
 * reference — never inside style={...} props or className strings.
 */
import Link from "next/link";

export default function TokensPage() {
  return (
    <main className="min-h-screen bg-bg text-primary font-body p-8 md:p-12">
      <header className="mb-12">
        <h1 className="font-display text-40 leading-none mb-2">recommend-a — design tokens</h1>
        <p className="text-secondary text-14">
          Visible no-drift gallery for every token in
          <code className="font-mono text-text-secondary"> frontend/_design-reference/styles.css</code>.
          Author rule: only Tailwind theme variables in components — no hardcoded hex or px.
        </p>
        <Link href="/" className="text-accent text-14 underline">← Back to home</Link>
      </header>

      {/* === Colors === */}
      <section aria-labelledby="colors-heading" className="mb-16">
        <h2 id="colors-heading" className="font-display text-28 mb-6">Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Order MANDATED by CONTEXT.md D-06: bg → surface → surface-elevated → surface-2
              → border → border-strong → text-primary → text-secondary → text-muted
              → accent → accent-hover → accent-soft → on-accent → success → warning → danger */}
          {/* For each token, render: a colored chip painted with the matching utility +
              the token name + the resolved hex/rgba value */}
        </div>
      </section>

      {/* === Typography === */}
      <section aria-labelledby="type-heading" className="mb-16">
        <h2 id="type-heading" className="font-display text-28 mb-6">Typography</h2>
        <div className="space-y-6">
          {/* For each step (12, 14, 16, 20, 28, 40, 64): one row showing the lorem text
              in BOTH font-display (Manrope) and font-body (Inter), labeled with the px size. */}
        </div>
      </section>

      {/* === Radii === */}
      <section aria-labelledby="radii-heading" className="mb-16">
        <h2 id="radii-heading" className="font-display text-28 mb-6">Radii</h2>
        <div className="flex flex-wrap gap-6">
          {/* Four squares (e.g. w-24 h-24 bg-surface-2) with rounded-sm / md / lg / xl,
              labeled with the px value beneath each. */}
        </div>
      </section>

      {/* === Shadows === */}
      <section aria-labelledby="shadows-heading" className="mb-16">
        <h2 id="shadows-heading" className="font-display text-28 mb-6">Shadows</h2>
        <div className="flex flex-wrap gap-8">
          {/* Two cards on the page background — one with shadow-md, one with shadow-lg —
              both with `bg-surface` and a subtle border so the shadow is visible against
              the dark background. Label each with its token name. */}
        </div>
      </section>

      {/* === Layout sizes === */}
      <section aria-labelledby="layout-heading" className="mb-16">
        <h2 id="layout-heading" className="font-display text-28 mb-6">Layout sizes</h2>
        <div className="space-y-4">
          {/* One w-rail h-tab (64 × 64) filled box (e.g. bg-accent) labeled "w-rail × h-tab — 64px × 64px".
              One w-full h-tab band (e.g. bg-surface-elevated border border-border) labeled "h-tab band — 64px tall". */}
        </div>
      </section>
    </main>
  );
}
```

**Implementation specifics (must follow):**

1. **Color section** — render exactly 16 swatches in the order from CONTEXT.md D-06. Each swatch is a `<div>` block:
   ```tsx
   <div className="rounded-md border border-border overflow-hidden">
     <div className="h-20 bg-bg" aria-label="bg swatch" />
     <div className="p-3 text-12">
       <div className="font-mono text-text-primary">bg-bg</div>
       <div className="text-muted">#0a0a0b</div>
     </div>
   </div>
   ```
   Repeat for each token, swapping the `bg-*` class and the token name + hex literal. The 16 entries (with their resolved values for the human-readable label):

   | Order | Utility | Token name | Resolved value |
   |---|---|---|---|
   | 1 | `bg-bg` | `bg` | `#0a0a0b` |
   | 2 | `bg-surface` | `surface` | `#131316` |
   | 3 | `bg-surface-elevated` | `surface-elevated` | `#1c1c20` |
   | 4 | `bg-surface-2` | `surface-2` | `#232328` |
   | 5 | `bg-border` (use a swatch with this background to show the color) | `border` | `#2a2a30` |
   | 6 | `bg-border-strong` | `border-strong` | `#3a3a42` |
   | 7 | `bg-text-primary` | `text-primary` | `#f5f5f6` |
   | 8 | `bg-text-secondary` | `text-secondary` | `#a4a4ad` |
   | 9 | `bg-text-muted` | `text-muted` | `#6c6c76` |
   | 10 | `bg-accent` | `accent` | `#f5b544` |
   | 11 | `bg-accent-hover` | `accent-hover` | `#ffc560` |
   | 12 | `bg-accent-soft` | `accent-soft` | `rgba(245, 181, 68, 0.12)` |
   | 13 | `bg-on-accent` | `on-accent` | `#1a1305` |
   | 14 | `bg-success` | `success` | `#4ade80` |
   | 15 | `bg-warning` | `warning` | `#f59e0b` |
   | 16 | `bg-danger` | `danger` | `#f87171` |

   For text-color tokens (7/8/9), additionally include a small `<span className="text-primary">Aa</span>` (or `text-secondary`/`text-muted`) inside the chip's caption block so the human can also see the token used as a foreground color. The colored chip surface itself uses the `bg-*` form so each token is visually present.

2. **Typography section** — render 7 rows. Each row:
   ```tsx
   <div className="border-b border-border pb-4">
     <div className="text-muted text-12 font-mono mb-2">text-12 / 12px</div>
     <p className="text-12 font-display mb-1">Manrope (display) — The quick brown fox jumps over the lazy dog</p>
     <p className="text-12 font-body">Inter (body) — The quick brown fox jumps over the lazy dog</p>
   </div>
   ```
   Repeat for `text-12`, `text-14`, `text-16`, `text-20`, `text-28`, `text-40`, `text-64`. The label format `{utility} / {px}px` is mandatory so a viewer can confirm both name and resolved value at a glance.

3. **Radii section** — 4 squares of size `w-20 h-20` (or similar non-token pixel-size from Tailwind's default spacing scale, e.g. `w-24`/`h-24` is fine), background `bg-surface-2`, border `border border-border`, with each in `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`. Label each below with `<span className="text-12 text-muted font-mono">rounded-sm / 6px</span>` etc.

4. **Shadows section** — 2 cards `w-48 h-32` (or similar), `bg-surface`, `rounded-lg`, with `shadow-md` and `shadow-lg` respectively. Centered vertically inside a `flex` container. Label each with `<span className="text-12 text-muted font-mono">shadow-md</span>` etc. underneath.

5. **Layout sizes section** —
   ```tsx
   <div>
     <div className="w-rail h-tab bg-accent rounded-md" />
     <div className="text-12 text-muted font-mono mt-2">w-rail × h-tab — 64px × 64px</div>
   </div>
   <div>
     <div className="w-full h-tab bg-surface-elevated border border-border rounded-md" />
     <div className="text-12 text-muted font-mono mt-2">h-tab band — 64px tall</div>
   </div>
   ```

**File-level invariants (anti-pattern checks the executor must self-verify):**

- The file MUST NOT contain `'use client'` or `"use client"`.
- The file MUST NOT contain a `style=` prop. Every visual property is a className.
- The file MUST NOT contain a `#` followed by 3 or 6 hex digits inside a `className` value. Hex literals appear ONLY inside JSX text content (e.g. `<div>{"#0a0a0b"}</div>` or `<div>#0a0a0b</div>`). Use the regex below to confirm.
- The file MUST NOT import from `frontend/_design-reference/`.
- The file MUST NOT import shadcn primitives (none exist yet) — only `next/link` is imported.

After writing, run these grep gates from `frontend/web/`:

```bash
# No 'use client' directive (server component invariant).
grep -cE "['\"]use client['\"]" app/tokens/page.tsx
# Expected output: 0

# No style={...} props (Tailwind utilities only).
grep -cE 'style=\{' app/tokens/page.tsx
# Expected output: 0

# No hardcoded hex inside className strings (the gate that proves DSGN-06 compliance).
# This regex looks for #[0-9a-fA-F]{3,6} appearing on the same line as className=.
grep -nE 'className=.*#[0-9a-fA-F]{3,6}|#[0-9a-fA-F]{3,6}.*className=' app/tokens/page.tsx
# Expected: no output (exit 1 / no matches).

# No imports from _design-reference (CLAUDE.md hard rule #2).
grep -cE '_design-reference' app/tokens/page.tsx
# Expected output: 0

# All 16 mandated color utility classes present in className positions.
for c in bg-bg bg-surface bg-surface-elevated bg-surface-2 bg-border bg-border-strong bg-text-primary bg-text-secondary bg-text-muted bg-accent bg-accent-hover bg-accent-soft bg-on-accent bg-success bg-warning bg-danger; do
  grep -q -E "\\b${c}\\b" app/tokens/page.tsx || echo "MISSING: ${c}"
done
# Expected: zero "MISSING:" lines.

# All 7 type-scale utility classes present.
for t in text-12 text-14 text-16 text-20 text-28 text-40 text-64; do
  grep -q -E "\\b${t}\\b" app/tokens/page.tsx || echo "MISSING: ${t}"
done
# Expected: zero "MISSING:" lines.

# Both font utilities present.
grep -q -E '\bfont-display\b' app/tokens/page.tsx || echo "MISSING: font-display"
grep -q -E '\bfont-body\b' app/tokens/page.tsx || echo "MISSING: font-body"

# All 4 radii utilities present.
for r in rounded-sm rounded-md rounded-lg rounded-xl; do
  grep -q -E "\\b${r}\\b" app/tokens/page.tsx || echo "MISSING: ${r}"
done

# Both shadow utilities present.
grep -q -E '\bshadow-md\b' app/tokens/page.tsx || echo "MISSING: shadow-md"
grep -q -E '\bshadow-lg\b' app/tokens/page.tsx || echo "MISSING: shadow-lg"

# Layout-size utilities — at least one of the rail/tab spacing utilities present.
grep -q -E '\b(w|h|p|m)-rail\b' app/tokens/page.tsx || echo "MISSING: rail spacing utility"
grep -q -E '\b(w|h|p|m)-tab\b' app/tokens/page.tsx || echo "MISSING: tab spacing utility"

# Lint + typecheck.
pnpm lint
pnpm exec tsc --noEmit
```

Per D-Discretion, the implementer chooses exact heading copy, the visual ordering inside each section's grid (as long as the colors keep D-06's mandated order), and any minor padding/gap decisions using non-token Tailwind defaults.

After verification, commit:
```
git add frontend/web/app/tokens/page.tsx
git commit -m "feat(02-02): visible tokens demo at /tokens (DSGN-05)

Replaces the Phase 1 placeholder with a server-component gallery
rendering every token from frontend/_design-reference/styles.css :root —
16 color swatches in the D-06 order, 7 type-scale rows in both Manrope
and Inter, 4 radii squares, 2 shadow cards, and 2 layout-size demos
(w-rail × h-tab, h-tab band). Pure Tailwind theme variables — zero
hardcoded hex or px in classNames (DSGN-06 / CLAUDE.md hard rule #4).

Closes DSGN-05. Visual no-drift verification (browser smoke) is
performed in plan 02-03's end-to-end check."
```
  </action>
  <verify>
    <automated>cd frontend/web && [ "$(grep -cE "['\"]use client['\"]" app/tokens/page.tsx)" = "0" ] && [ "$(grep -cE 'style=\{' app/tokens/page.tsx)" = "0" ] && ! grep -qE 'className=.*#[0-9a-fA-F]{3,6}|#[0-9a-fA-F]{3,6}.*className=' app/tokens/page.tsx && [ "$(grep -cE '_design-reference' app/tokens/page.tsx)" = "0" ] && for c in bg-bg bg-surface bg-surface-elevated bg-surface-2 bg-border bg-border-strong bg-text-primary bg-text-secondary bg-text-muted bg-accent bg-accent-hover bg-accent-soft bg-on-accent bg-success bg-warning bg-danger text-12 text-14 text-16 text-20 text-28 text-40 text-64 font-display font-body rounded-sm rounded-md rounded-lg rounded-xl shadow-md shadow-lg; do grep -q -E "\\b${c}\\b" app/tokens/page.tsx || { echo "MISSING: ${c}"; exit 1; }; done && grep -q -E '\b(w|h|p|m)-rail\b' app/tokens/page.tsx && grep -q -E '\b(w|h|p|m)-tab\b' app/tokens/page.tsx && pnpm lint && pnpm exec tsc --noEmit && echo "TOKENS-PAGE GATE PASS"</automated>
  </verify>
  <done>
- `frontend/web/app/tokens/page.tsx` is a server component (no `'use client'`), default-exporting `TokensPage`.
- The page contains five sections in order: Colors, Typography, Radii, Shadows, Layout sizes.
- Color section contains all 16 utility classes from CONTEXT.md D-06 in the mandated order, each labeled with its token name and resolved value.
- Typography section contains 7 rows (one per scale step) showing the lorem text in both `font-display` and `font-body`.
- Radii section contains 4 squares with `rounded-sm`/`md`/`lg`/`xl`.
- Shadows section contains 2 cards with `shadow-md` / `shadow-lg`.
- Layout-sizes section contains at least one element using a `*-rail` utility AND at least one using a `*-tab` utility, both 64 px.
- No `style=` prop appears anywhere in the file.
- No `#xxx` hex literal appears inside any `className` (regex gate passes — they appear only in text content).
- No import from `_design-reference/`.
- `pnpm lint` exits 0 and `pnpm exec tsc --noEmit` exits 0.
- One commit `feat(02-02): visible tokens demo at /tokens (DSGN-05)` exists on the branch.
- The grep-gate prints `TOKENS-PAGE GATE PASS`.
  </done>
</task>

</tasks>

<verification>
| REQ | Verified by |
|-----|-------------|
| DSGN-05 (visible tokens demo route) | Task 1 grep-gate confirms all required utilities are present in the file; lint + tsc confirm syntax correctness. The actual browser-rendered visual check (the dev server + curl + manual look at `/tokens`) lives in plan 02-03's final verification — that is the no-drift human-eyeball gate. |

Plans 02-01 and 02-02 together are necessary but not sufficient for ROADMAP success criterion #3 — plan 02-03's end-to-end smoke verifies that the page renders without runtime errors.
</verification>

<success_criteria>
- `frontend/web/app/tokens/page.tsx` modified in place (NOT renamed, NOT recreated) per Phase 1 D-03.
- File is a server component (no `'use client'`), default-exports `TokensPage`, imports only `next/link`.
- All 16 colors + 7 type-scale rows + 4 radii + 2 shadows + at least 1 rail/tab layout demo render via Tailwind utilities only.
- Zero hardcoded hex inside className strings; zero style props; zero `_design-reference/` imports.
- `pnpm lint` exits 0; `pnpm exec tsc --noEmit` exits 0.
- One atomic commit on `feature/issue-91-design-system`.
- DSGN-06 (author rule + global enforcement) is NOT addressed by this plan — it ships in plan 02-03.
</success_criteria>

<output>
After completion, create `.planning/phases/02-design-system/02-02-SUMMARY.md` per the GSD summary template, including:
- Section-by-section table of which utilities are used (Colors / Typography / Radii / Shadows / Layout).
- Confirmation that all 16 colors appear in the D-06 mandated order.
- Output of the grep-gate command (proving zero hardcoded hex in className, etc.).
- Lint + tsc exit codes.
- The single commit SHA.
- A note that DSGN-06 (author rule) and the end-to-end browser/CLI verification ship in plan 02-03.
</output>
