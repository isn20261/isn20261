---
phase: 02-design-system
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/web/styles/globals.css
autonomous: true
requirements: [DSGN-01, DSGN-02, DSGN-03, DSGN-04]
tags: [tailwind-v4, theme-block, design-tokens, css-first]

must_haves:
  truths:
    - "A developer can write `bg-bg`, `bg-surface`, `bg-surface-elevated`, `bg-surface-2`, `border-border`, `border-border-strong`, `text-primary`, `text-secondary`, `text-muted`, `bg-accent`, `bg-accent-hover`, `bg-accent-soft`, `text-on-accent`, `text-success`, `text-warning`, `text-danger` and the rendered colors match `_design-reference/styles.css` exactly (ROADMAP success #1)."
    - "Tailwind utilities `text-12`, `text-14`, `text-16`, `text-20`, `text-28`, `text-40`, `text-64` resolve to 12/14/16/20/28/40/64 px (ROADMAP success #2 type scale)."
    - "Utilities `font-display` resolve to the Manrope `next/font` CSS variable; `font-body` resolves to the Inter `next/font` CSS variable (ROADMAP success #2 fonts)."
    - "Utilities `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` produce 6/10/16/22 px corners (ROADMAP success #2 radii)."
    - "Utilities `shadow-md` and `shadow-lg` apply the box-shadow values from `_design-reference/styles.css:45-46` (ROADMAP success #2 shadows)."
    - "Utilities `w-rail`, `h-rail`, `w-tab`, `h-tab` all resolve to 64 px (ROADMAP success #2 layout sizes — D-05)."
    - "The base reset from `_design-reference/styles.css:53-86` (sans the `#root` selector) ships under `@layer base` so html/body inherit the dark background, primary text color and Inter body font automatically (D-08)."
    - "`pnpm build` succeeds — Tailwind v4 parses the `@theme` block without error."
  artifacts:
    - path: "frontend/web/styles/globals.css"
      provides: "Tailwind v4 entry + `@theme` block mirroring all reference tokens + `@layer base` reset"
      contains: "@theme"
  key_links:
    - from: "frontend/web/styles/globals.css"
      to: "frontend/_design-reference/styles.css"
      via: "verbatim mirror of `:root` token names and values (D-02)"
      pattern: "--color-bg|--color-surface|--color-accent|--font-display|--rail-w"
    - from: "frontend/web/styles/globals.css"
      to: "frontend/web/app/layout.tsx"
      via: "`--font-display` and `--font-body` CSS variables exposed on `<html>` by `next/font/google` are referenced inside the `@theme` block (D-04)"
      pattern: "var\\(--font-display\\)|var\\(--font-body\\)"
---

<objective>
Author the Tailwind v4 `@theme` block in `frontend/web/styles/globals.css` so every token defined in `frontend/_design-reference/styles.css:5-50` becomes a Tailwind utility (`bg-*`, `text-*`, `font-*`, `rounded-*`, `shadow-*`, `w-rail`, `h-tab`, etc.) — and carry the reference's base reset rules (`_design-reference/styles.css:53-86`, sans `#root`) into a `@layer base` block so html/body inherit dark mode, Inter body font, and the antialiased smoothing automatically.

Purpose: Closes DSGN-01..04. This plan is the heart of Phase 2 — it's the one file that turns the design reference into reachable Tailwind utilities for every screen phase that follows. No `tailwind.config.ts` (D-01 forbids it).

Output: A single modified file (`frontend/web/styles/globals.css`) that:
1. Keeps the existing `@import "tailwindcss";` at the top.
2. Declares a `@theme` block mirroring every token name verbatim from the reference.
3. Carries a `@layer base` block with the reset rules and html/body styling.
4. Does NOT include any utility-class definitions, component CSS, animations, or shadcn additions — those belong to later phases.
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
@frontend/web/app/layout.tsx
@CLAUDE.md
@frontend/web/AGENTS.md
@frontend/web/CLAUDE.md
@.planning/phases/01-foundation/01-04-SUMMARY.md

<critical_reminders>
- **Next.js 16 is NOT the Next.js you know.** `frontend/web/AGENTS.md` requires reading `node_modules/next/dist/docs/` before writing code that touches Next.js APIs. This plan only modifies one CSS file, so Next.js APIs aren't touched directly — but the `@theme` block must consume the `--font-display` / `--font-body` CSS variables that `app/layout.tsx` exposes via `next/font/google` (already wired in Phase 1). Do NOT re-declare or rewire fonts here.
- **Tailwind v4 is CSS-first (D-01 from Phase 1, reaffirmed by D-01 in Phase 2 CONTEXT).** No `tailwind.config.ts`. Do not create one. The `@theme` block in this file is the single source of truth for tokens.
- **Token names are verbatim (D-02).** `--color-bg` stays `--color-bg`. `--color-on-accent` stays `--color-on-accent`. No paraphrasing, no aliasing.
- **`_design-reference/` is read-only.** Read it as the spec; never modify it.
- **No hardcoded design values in `app/` or `components/` (CLAUDE.md hard rule #4).** This file lives in `styles/` so the rule does not apply here — `globals.css` IS the place values are authored.
</critical_reminders>

<interfaces>
<!-- Phase 1 already wires these CSS variables on `<html>` via `next/font/google` in `app/layout.tsx`. -->
<!-- The `@theme` block in this plan must reference them via `var(--font-display)` / `var(--font-body)`. -->
<!-- DO NOT redeclare them or change their names. -->

From frontend/web/app/layout.tsx (Phase 1, do NOT modify):
```typescript
const fontDisplay = Manrope({ ..., variable: "--font-display" });
const fontBody = Inter({ ..., variable: "--font-body" });
// applied as: <html className={`${fontDisplay.variable} ${fontBody.variable}`}>
```

From frontend/_design-reference/styles.css:5-50 (the spec — read directly, mirror verbatim):
```
--color-bg, --color-surface, --color-surface-elevated, --color-surface-2,
--color-border, --color-border-strong,
--color-text-primary, --color-text-secondary, --color-text-muted,
--color-accent, --color-accent-hover, --color-accent-soft, --color-on-accent,
--color-success, --color-warning, --color-danger,
--fs-12, --fs-14, --fs-16, --fs-20, --fs-28, --fs-40, --fs-64,
--font-display, --font-body,
--r-sm, --r-md, --r-lg, --r-xl,
--shadow-md, --shadow-lg,
--rail-w, --tab-h
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author the `@theme` block + `@layer base` in `globals.css`</name>
  <files>frontend/web/styles/globals.css</files>
  <action>
Replace the contents of `frontend/web/styles/globals.css` with the following, in this exact order:

1. **Line 1:** Keep `@import "tailwindcss";` (already present in the Phase 1 file).
2. **`@theme` block** mirroring every token from `frontend/_design-reference/styles.css:5-50`. Use Tailwind v4 namespaces per CONTEXT.md D-01..D-05. The mapping is exact and load-bearing — do NOT improvise:

   - **Colors** (D-02 — verbatim names) under the `--color-*` namespace:
     - `--color-bg: #0a0a0b;`
     - `--color-surface: #131316;`
     - `--color-surface-elevated: #1c1c20;`
     - `--color-surface-2: #232328;`
     - `--color-border: #2a2a30;`
     - `--color-border-strong: #3a3a42;`
     - `--color-text-primary: #f5f5f6;` → produces `text-text-primary` and `bg-text-primary`. CONTEXT.md success criterion #1 lists `text-primary`/`secondary`/`muted` as expected utilities. To honor that exact phrasing without colliding with Tailwind's own `text-*` size utility namespace, additionally declare three short-name aliases under the `--color-*` namespace: `--color-primary: var(--color-text-primary);`, `--color-secondary: var(--color-text-secondary);`, `--color-muted: var(--color-text-muted);`. This produces both `text-primary`/`secondary`/`muted` AND `text-text-primary`/`text-secondary`/`text-muted` — both sets resolve to the same hex. (Decision per D-02: token names are verbatim; the aliases are additive, not replacements.) Document this with a one-line CSS comment above the aliases: `/* Short-name aliases so the ROADMAP-listed text-primary / text-secondary / text-muted utilities resolve. The verbatim --color-text-* tokens above are the source of truth. */`
     - `--color-text-secondary: #a4a4ad;`
     - `--color-text-muted: #6c6c76;`
     - `--color-accent: #f5b544;`
     - `--color-accent-hover: #ffc560;`
     - `--color-accent-soft: rgba(245, 181, 68, 0.12);` (D-Discretion: keep `rgba(...)`, NOT oklch)
     - `--color-on-accent: #1a1305;`
     - `--color-success: #4ade80;`
     - `--color-warning: #f59e0b;`
     - `--color-danger: #f87171;`

   - **Type scale** (D-03) under the `--text-*` namespace — produces `text-12`, `text-14`, etc.:
     - `--text-12: 12px;`
     - `--text-14: 14px;`
     - `--text-16: 16px;`
     - `--text-20: 20px;`
     - `--text-28: 28px;`
     - `--text-40: 40px;`
     - `--text-64: 64px;`

   - **Fonts** (D-04) under the `--font-*` namespace — resolve through to the `next/font` CSS variables already exposed on `<html>` by Phase 1's `app/layout.tsx`. Preserve the full fallback stack from `_design-reference/styles.css:35-36`:
     - `--font-display: var(--font-display), 'Manrope', system-ui, -apple-system, sans-serif;`
     - `--font-body: var(--font-body), 'Inter', system-ui, -apple-system, sans-serif;`

     IMPORTANT: This declares `--font-display` inside `@theme` to itself reference `var(--font-display)`. Inside Tailwind's `@theme`, the namespace-scoped name is what generates the utility (`font-display`); the right-hand side is the value Tailwind emits. Because the inherited `--font-display` (Manrope) is set on `<html>` at runtime, the CSS variable resolves correctly at the call site. Test this in Task 2 by running `pnpm build` and confirming no warnings; if Tailwind v4 rejects self-referential names, fall back to renaming the theme key (e.g. `--font-display: var(--font-display, 'Manrope'), system-ui, ...`) — Tailwind v4 supports the same name on both sides because the var() lookup uses CSS cascade, not the @theme value. Per D-04, preserve the literal string-fallback stack so the page never goes unstyled if the font fails to load.

   - **Radii** (D-05) under the `--radius-*` namespace — produces `rounded-sm`/`md`/`lg`/`xl`:
     - `--radius-sm: 6px;`
     - `--radius-md: 10px;`
     - `--radius-lg: 16px;`
     - `--radius-xl: 22px;`

   - **Shadows** (D-05) under the `--shadow-*` namespace:
     - `--shadow-md: 0 6px 24px rgba(0, 0, 0, 0.35);`
     - `--shadow-lg: 0 24px 60px rgba(0, 0, 0, 0.5);`

   - **Layout sizes** (D-05) under the `--spacing-*` namespace — produces `w-rail`, `h-rail`, `w-tab`, `h-tab` and any other size utility (`p-rail`, `m-tab`, etc.) all resolving to 64 px:
     - `--spacing-rail: 64px;`
     - `--spacing-tab: 64px;`

   Use **non-inline `@theme`** (D-Discretion) so the runtime CSS-variable surface is preserved (matches the reference's `:root` model and keeps the future tweaks-panel option open). Syntax: `@theme { ... }` — NOT `@theme inline { ... }`.

3. **`@layer base` block** carrying over the reset rules from `frontend/_design-reference/styles.css:53-86` (D-08). Per D-08, OMIT the `#root` selector (Next.js App Router doesn't use it); keep `html, body`. Do NOT carry over typography utility classes (`.display`, `.eyebrow`, `.btn-*`, `.input`, `.chip`, `.card`, animation keyframes) — those are component CSS that does not belong in this phase. Carry these and only these:

   ```css
   @layer base {
     * { box-sizing: border-box; }

     html, body {
       margin: 0;
       padding: 0;
       background: var(--color-bg);
       color: var(--color-text-primary);
       font-family: var(--font-body);
       font-size: 16px;
       -webkit-font-smoothing: antialiased;
       -moz-osx-font-smoothing: grayscale;
     }

     button {
       font-family: inherit;
       cursor: pointer;
       border: none;
       background: none;
       color: inherit;
     }

     input, textarea {
       font-family: inherit;
       color: inherit;
     }

     a { color: inherit; text-decoration: none; }
   }
   ```

4. **Add a top-of-file comment** (above `@import`) describing the file's contract:
   ```css
   /*
    * recommend-a — Tailwind v4 entry + design tokens (Phase 2 / DSGN-01..04 / issue #91).
    *
    * The `@theme` block mirrors frontend/_design-reference/styles.css:5-50 verbatim
    * (token names per Phase 2 CONTEXT D-02). It produces the Tailwind utilities every
    * screen phase consumes: bg-bg / bg-surface{,-elevated,-2} / border-border{,-strong} /
    * text-{primary,secondary,muted} / bg-accent{,-hover,-soft} / text-on-accent /
    * text-{success,warning,danger} / text-{12,14,16,20,28,40,64} / font-display /
    * font-body / rounded-{sm,md,lg,xl} / shadow-{md,lg} / w-rail / h-tab.
    *
    * The `@layer base` block carries the reference's reset rules (styles.css:53-86,
    * minus the #root selector — Next.js App Router doesn't use it).
    *
    * Do NOT add a tailwind.config.ts — Tailwind v4 is CSS-first (Phase 1 D-01,
    * Phase 2 D-01). All token authoring happens in this file.
    */
   ```

**Forbidden in this file (carries scope into later phases):**
- Component classes (`.btn`, `.btn-primary`, `.input`, `.chip`, `.card`, `.match`, `.no-scrollbar`, `.poster-bg`, `.grain`, `.spinner`, `.rail`, `.display`, `.display-lg`, `.eyebrow`)
- Animation keyframes (`@keyframes ra-spin`, `ra-fade-up`, `ra-fade`, `ra-pulse`, `ra-shimmer`)
- Any `tailwind.config.ts` (D-01 forbids — do not create one)
- Light-theme overrides (out of milestone scope)
- Motion/transition tokens (deferred per CONTEXT.md `<deferred>`)

**Verification within this task:**
After writing, grep the file to assert load-bearing tokens are present (no missing entries):

```bash
cd frontend/web
# Every required color name must be in the @theme block (16 colors + 3 short-name aliases = 19 lines total).
grep -cE '^\s*--color-(bg|surface|surface-elevated|surface-2|border|border-strong|text-primary|text-secondary|text-muted|primary|secondary|muted|accent|accent-hover|accent-soft|on-accent|success|warning|danger):' styles/globals.css
# Expected output: 19

# Every required type-scale entry.
grep -cE '^\s*--text-(12|14|16|20|28|40|64):' styles/globals.css
# Expected output: 7

# Font namespace.
grep -cE '^\s*--font-(display|body):' styles/globals.css
# Expected output: 2

# Radii.
grep -cE '^\s*--radius-(sm|md|lg|xl):' styles/globals.css
# Expected output: 4

# Shadows.
grep -cE '^\s*--shadow-(md|lg):' styles/globals.css
# Expected output: 2

# Layout sizes.
grep -cE '^\s*--spacing-(rail|tab):' styles/globals.css
# Expected output: 2

# @theme block must be present.
grep -c '^@theme' styles/globals.css
# Expected output: 1 (non-inline)

# @layer base block must be present.
grep -c '^@layer base' styles/globals.css
# Expected output: 1

# No tailwind.config.* file should be created by this plan.
ls tailwind.config.* 2>/dev/null && echo "FAIL: tailwind.config.* exists — D-01 forbids it" || echo "OK: no tailwind.config.* (D-01 honored)"

# No component classes (anti-pattern check — these belong to later phases).
grep -cE '^\s*\.(btn|input|chip|card|display|eyebrow|spinner|rail|grain|match|poster-bg|no-scrollbar)' styles/globals.css
# Expected output: 0

# No animation keyframes.
grep -c '^@keyframes' styles/globals.css
# Expected output: 0
```

Per D-07 commit each task atomically. After this task is verified, commit with:
```
git add frontend/web/styles/globals.css
git commit -m "feat(02-01): author Tailwind v4 @theme block + @layer base reset (DSGN-01..04)

Mirrors frontend/_design-reference/styles.css:5-50 token names verbatim
into the Tailwind v4 @theme block (D-02), producing utilities bg-bg,
text-primary, font-display, text-16, rounded-md, shadow-md, w-rail, h-tab
etc. (ROADMAP success #1, #2). Carries the reference's reset rules
(styles.css:53-86, sans #root) under @layer base (D-08).

Closes DSGN-01..04 implementation surface. DSGN-05 (tokens demo route) +
DSGN-06 (author rule) ship in plans 02-02 and 02-03 respectively.

No tailwind.config.ts (D-01 — Tailwind v4 CSS-first only)."
```
  </action>
  <verify>
    <automated>cd frontend/web && grep -cE '^\s*--color-(bg|surface|surface-elevated|surface-2|border|border-strong|text-primary|text-secondary|text-muted|primary|secondary|muted|accent|accent-hover|accent-soft|on-accent|success|warning|danger):' styles/globals.css | grep -qE '^19$' && grep -cE '^\s*--text-(12|14|16|20|28|40|64):' styles/globals.css | grep -qE '^7$' && grep -cE '^\s*--font-(display|body):' styles/globals.css | grep -qE '^2$' && grep -cE '^\s*--radius-(sm|md|lg|xl):' styles/globals.css | grep -qE '^4$' && grep -cE '^\s*--shadow-(md|lg):' styles/globals.css | grep -qE '^2$' && grep -cE '^\s*--spacing-(rail|tab):' styles/globals.css | grep -qE '^2$' && grep -c '^@theme' styles/globals.css | grep -qE '^1$' && grep -c '^@layer base' styles/globals.css | grep -qE '^1$' && [ ! -f tailwind.config.ts ] && [ ! -f tailwind.config.js ] && [ ! -f tailwind.config.mjs ] && echo "ALL TOKEN GREP ASSERTIONS PASSED"</automated>
  </verify>
  <done>
- `frontend/web/styles/globals.css` contains exactly one `@theme { ... }` block with: 16 verbatim color tokens + 3 short-name aliases (primary/secondary/muted) = 19 `--color-*` declarations; 7 `--text-*` declarations (12/14/16/20/28/40/64); 2 `--font-*` declarations (display/body) referencing the Phase-1 `next/font` CSS variables with full fallback stacks; 4 `--radius-*` declarations (sm/md/lg/xl); 2 `--shadow-*` declarations (md/lg); 2 `--spacing-*` declarations (rail/tab).
- The `@theme` block is non-inline (no `inline` keyword) per D-Discretion.
- A `@layer base` block carries the box-sizing reset, html/body styling (background/color/font-family/font-size/font-smoothing/margin/padding), and button/input/textarea/anchor inherit rules from `_design-reference/styles.css:53-86`. The `#root` selector is omitted.
- Zero component classes (`.btn*`, `.input*`, `.chip*`, `.card*`, `.display*`, `.eyebrow*`, `.spinner*`, `.rail*`, `.grain*`, `.match*`, `.poster-bg*`, `.no-scrollbar*`) exist in this file.
- Zero `@keyframes` rules exist in this file.
- No `tailwind.config.ts`/`.js`/`.mjs` was created.
- The grep-gate command above prints `ALL TOKEN GREP ASSERTIONS PASSED`.
- A single commit `feat(02-01): author Tailwind v4 @theme block + @layer base reset (DSGN-01..04)` has been created.
  </done>
</task>

<task type="auto">
  <name>Task 2: Smoke-test that Tailwind v4 parses the new theme</name>
  <files></files>
  <action>
Run `pnpm build` from `frontend/web/` to confirm Tailwind v4 parses the new `@theme` block without errors and no PostCSS warnings about unknown directives or self-referential `var(--font-display)` cycles surface. This is a build-only verification — produces no source file changes.

```bash
cd frontend/web
pnpm build 2>&1 | tee /tmp/02-01-build.log
echo "exit=$?"
```

Expected output checks:
1. The exit code is `0`.
2. `/tmp/02-01-build.log` contains the line `Compiled successfully` (or whatever Next 16 emits as its success marker — read the actual output, do not assume).
3. `/tmp/02-01-build.log` contains zero occurrences of `Error:` (case-sensitive Next.js error prefix).
4. `/tmp/02-01-build.log` does NOT contain `Cannot resolve` or `Unknown at-rule` (Tailwind/PostCSS rejection signals).

If `var(--font-display)` self-reference inside `@theme` produces a Tailwind v4 warning or causes the build to fail, the workaround per Task 1's action notes is to consult `node_modules/next/dist/docs/` and `node_modules/tailwindcss/` for the correct Tailwind v4 syntax for "theme variable that resolves to an externally-set CSS variable" — likely the answer is to use the same `--font-display: var(--font-display), 'Manrope', system-ui, -apple-system, sans-serif;` form (which IS valid CSS — `var(--font-display)` resolves through the `:root`-cascaded value Phase 1 set, while the `@theme` declaration writes the same name back into Tailwind's theme registry). Document any deviation in the SUMMARY's "Deviations from Plan" section.

If the build fails for an unrelated reason (e.g. a TypeScript error in another file unrelated to this plan), STOP and surface to the user — do not paper over.

Per the executor contract, this task does not produce a commit (verification-only, no source file changes).
  </action>
  <verify>
    <automated>cd frontend/web && pnpm build 2>&1 | tee /tmp/02-01-build.log && grep -q -i 'compiled' /tmp/02-01-build.log && ! grep -qE '^Error:|Unknown at-rule|Cannot resolve' /tmp/02-01-build.log && echo "BUILD SMOKE PASS"</automated>
  </verify>
  <done>
- `pnpm build` exits 0 from `frontend/web/`.
- The build log shows a successful compile marker (Next 16's success line).
- No `Error:`, `Unknown at-rule`, or `Cannot resolve` entries appear in the build output.
- No source files modified by this task; no commit created.
- The grep-gate prints `BUILD SMOKE PASS`.
- If a deviation was required (e.g. font self-reference workaround), it is recorded for inclusion in the SUMMARY.
  </done>
</task>

</tasks>

<verification>
Plan-level verification covers DSGN-01..04 individually:

| REQ | Verified by |
|-----|-------------|
| DSGN-01 (color tokens) | Task 1 grep-gate confirms all 19 `--color-*` declarations present in `@theme`; Task 2 build proves Tailwind parses them. The actual rendered-color match is verified visually in plan 02-02 (tokens demo) and asserted in plan 02-03's final verification. |
| DSGN-02 (typography tokens) | Task 1 grep-gate confirms all 7 `--text-*` and 2 `--font-*` declarations; Task 2 build proves they parse. |
| DSGN-03 (radii + shadows) | Task 1 grep-gate confirms 4 `--radius-*` + 2 `--shadow-*`; Task 2 build proves they parse. |
| DSGN-04 (layout tokens) | Task 1 grep-gate confirms 2 `--spacing-*` (rail, tab); Task 2 build proves they parse. |

End-to-end ROADMAP success criteria #1 and #2 are partially proven here (utility names exist, Tailwind parses) and fully closed in plan 02-03 (the visible `/tokens` route renders the correct values, lint/tsc/build all pass).
</verification>

<success_criteria>
- `frontend/web/styles/globals.css` exists with the structure described in Task 1 — `@import "tailwindcss";` at top, `@theme { ... }` block (non-inline), `@layer base { ... }` block.
- All grep-gate counts pass exactly (no off-by-one).
- `pnpm build` from `frontend/web/` exits 0.
- No `tailwind.config.*` file exists in `frontend/web/`.
- One commit on the branch `feature/issue-91-design-system`: `feat(02-01): author Tailwind v4 @theme block + @layer base reset (DSGN-01..04)`.
- DSGN-05 and DSGN-06 are NOT addressed by this plan — they belong to plans 02-02 and 02-03 respectively. Do not slip them in here.
</success_criteria>

<output>
After completion, create `.planning/phases/02-design-system/02-01-SUMMARY.md` per the GSD summary template, including:
- Token mirror table: every reference token → its `@theme` namespace + Tailwind utility (e.g. `--color-bg` → `--color-bg` → `bg-bg`).
- Grep-gate output (numbers proving all 19 / 7 / 2 / 4 / 2 / 2 declarations are present).
- `pnpm build` exit code and timing.
- Any deviation from the plan (e.g. if the font self-reference required a workaround).
- The single commit SHA.
- A note that DSGN-05 (visual demo) and DSGN-06 (author rule + final verification) are owned by the next two plans.
</output>
