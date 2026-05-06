---
phase: 01-foundation
plan: 03
type: execute
wave: 3
depends_on: ["01-01", "01-02"]
files_modified:
  - frontend/web/app/layout.tsx
  - frontend/web/lib/api/.gitkeep
  - frontend/web/components/.gitkeep
  - frontend/web/public/.gitkeep
must_haves:
  truths:
    - "frontend/web/ contains every required folder: app/, components/, lib/, lib/api/, public/, styles/"
    - "Manrope (display) is loaded via next/font/google and exposed on <html> as the CSS variable --font-display"
    - "Inter (body) is loaded via next/font/google and exposed on <html> as the CSS variable --font-body"
    - "No code imports JSX from frontend/_design-reference/"
    - "lib/api/ exists but is empty — Phase 4 (AUTH-04) owns its contents"
  artifacts:
    - path: "frontend/web/app/layout.tsx"
      provides: "Root layout that loads Manrope+Inter via next/font/google with `variable: '--font-display'` and `variable: '--font-body'`, and applies both font CSS-variable classes on <html>"
      contains: "next/font/google"
    - path: "frontend/web/lib/api/.gitkeep"
      provides: "Keeps the empty `lib/api/` directory in git — Phase 4 fills it (per CONTEXT.md `<code_context>` Integration Points)"
    - path: "frontend/web/components/.gitkeep"
      provides: "Keeps the empty `components/` directory in git — Phase 3 (Layout) authors the first real component"
    - path: "frontend/web/public/.gitkeep"
      provides: "Keeps the public/ directory in git (in case create-next-app didn't seed an asset)"
  key_links:
    - from: "frontend/web/app/layout.tsx"
      to: "frontend/web/styles/globals.css"
      via: "@/styles/globals.css import (already wired in plan 02)"
      pattern: "import.*styles/globals\\.css"
    - from: "frontend/web/app/layout.tsx"
      to: "<html> CSS-variable contract for Phase 2"
      via: "next/font `variable:` options on Manrope and Inter"
      pattern: "variable:\\s*['\"]--font-(display|body)['\"]"
autonomous: true
requirements:
  - FOUND-04
  - FOUND-05
---

<objective>
Create the canonical folder skeleton (`app/`, `components/`, `lib/`, `lib/api/`, `public/`, `styles/` — `styles/` already exists from plan 02) and wire Manrope (display) + Inter (body) into the root layout via `next/font/google`. The font CSS-variable names — `--font-display` and `--font-body` — are load-bearing: they mirror `frontend/_design-reference/styles.css:35-36` so Phase 2's `@theme` block can consume them without renaming.

Implements REQ FOUND-04 (font portion) and FOUND-05 (folder skeleton). The placeholder routes and end-to-end verification (dev server, build, fonts.googleapis.com grep) come in plan 04.

Purpose: Plan 04 needs the layout's font wiring locked before it can write the placeholder pages and run the build verification grep. Phase 2 needs `--font-display` / `--font-body` reachable on `<html>` before its `@theme { --font-display: var(--font-display); ... }` line will work.

Output: A complete `frontend/web/{app,components,lib,lib/api,public,styles}/` tree with `.gitkeep` markers where directories must persist empty, and an `app/layout.tsx` that loads both fonts via `next/font/google` and exposes them as CSS variables on `<html>`.
</objective>

<execution_context>
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/workflows/execute-plan.md
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-PATTERNS.md
@.planning/phases/01-foundation/01-01-SUMMARY.md
@.planning/phases/01-foundation/01-02-SUMMARY.md
@frontend/_design-reference/styles.css
</context>

<interfaces>
<!-- The font CSS-variable names below are the **contract** Phase 2's @theme block consumes. -->
<!-- DO NOT rename. They mirror frontend/_design-reference/styles.css:35-36 verbatim. -->

From `frontend/_design-reference/styles.css` (lines 35-36 — naming-only inheritance, do NOT copy CSS rules):
```css
  --font-display: 'Manrope', system-ui, -apple-system, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
```

Required `next/font/google` shape for `app/layout.tsx`:
```ts
import { Manrope, Inter } from "next/font/google";

const fontDisplay = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
```

Required `<html>` element shape (apply BOTH variable classes so the CSS variables resolve anywhere in the tree):
```tsx
<html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`}>
```
</interfaces>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| build-time -> Google Fonts CDN | `next/font/google` fetches font files at BUILD time and self-hosts them in `.next/`. No runtime fetch from `fonts.googleapis.com`. |
| `app/layout.tsx` -> all rendered routes | The layout wraps every page; any `dangerouslySetInnerHTML` or untrusted className here propagates everywhere. |

## STRIDE Threat Register

severity_max: low

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Information Disclosure (third-party CDN exfil / CSP gap) | Font loading in `app/layout.tsx` | mitigate | Use `next/font/google` exclusively. The Next.js compiler downloads font files at build time and serves them from the same origin under `.next/static/media/` — no runtime fetch from `fonts.googleapis.com`. The PATTERNS.md "Convention 9" verifier (`grep -r "fonts.googleapis.com" .next/`) lives in plan 04 and proves this. Refuse `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` (the anti-pattern from `_design-reference/Recommend-a.html`). |
| T-03-02 | Tampering (XSS injection point) | `app/layout.tsx` | mitigate | The layout uses ONLY static JSX — no `dangerouslySetInnerHTML`, no `eval`, no untrusted user input rendered in `<head>` or `<body>`. ClassName strings are static template literals interpolating only the `next/font` `.variable` properties (build-time-known strings). |
| T-03-03 | Tampering (forbidden import) | `app/layout.tsx`, `components/`, `lib/` | mitigate | Per CLAUDE.md hard rule #2 / PATTERNS.md Convention 2, NO file in plan 03 may import JSX from `frontend/_design-reference/`. The only legitimate inheritance is the CSS-variable NAMES (`--font-display`, `--font-body`), and we mirror them through `next/font` `variable:` options — never via import. |
| T-03-04 | Information Disclosure (empty mock seam leaking shape too early) | `lib/api/.gitkeep` | mitigate | Per CLAUDE.md hard rule #3 + CONTEXT.md `<code_context>` Integration Points, `lib/api/` MUST stay empty in Phase 1. Anything beyond `.gitkeep` leaks scope into Phase 4 (AUTH-04) where the mock Cognito surface is authored. The mock-vs-real seam is a one-provider-replacement boundary; pre-shaping it here would create incidental coupling. |

**Note:** No high-severity threats. Manrope + Inter are widely-used Google Fonts; build-time download is the standard `next/font` flow. No runtime third-party scripts, no auth secrets in this plan.
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Create folder skeleton with .gitkeep markers</name>
  <files>
    frontend/web/lib/api/.gitkeep,
    frontend/web/components/.gitkeep,
    frontend/web/public/.gitkeep
  </files>
  <read_first>
    .planning/phases/01-foundation/01-CONTEXT.md (the `Claude's Discretion` "lib/api/ keep-strategy" item — `.gitkeep` chosen over `index.ts` to enforce "deliberately empty"; CONTEXT.md `<code_context>` Integration Points — `lib/api/` is the single mock-vs-real seam, Phase 1 leaves it empty),
    .planning/phases/01-foundation/01-PATTERNS.md (Convention 3, Convention 8, the "lib/api/.gitkeep OR lib/api/index.ts" section, the "public/ + components/" section),
    CLAUDE.md (hard rule #3 — backend calls mocked via lib/api/; this is the SEAM)
  </read_first>
  <action>
    Per REQ FOUND-05, the `frontend/web/` tree must contain `app/`, `components/`, `lib/`, `lib/api/`, `public/`, `styles/`. After plans 01–02, the existing tree has `app/`, `lib/` (with `lib/utils.ts` from shadcn), `styles/` (with `styles/globals.css`), and possibly `public/` (create-next-app default). What's missing or unverified: `components/`, `lib/api/`, and a guaranteed-tracked `public/`.

    1. Create the `lib/api/` directory and add a `.gitkeep`:
       ```bash
       cd /home/aluno/Downloads/isn20261/frontend/web && \
       mkdir -p lib/api && touch lib/api/.gitkeep
       ```
       Per CONTEXT.md Discretion ("Use either `lib/api/.gitkeep` OR a stub `lib/api/index.ts` exporting `export {}` — planner picks. Keep it deliberately empty"), we pick `.gitkeep`. Rationale: an `index.ts` exporting `{}` would be importable, which invites Phase 4 work to "just add the type here" before the real plan lands. `.gitkeep` is a literal "do not put code here yet" marker.

    2. Create the `components/` directory and add a `.gitkeep` (Convention 8 — stays empty in Phase 1):
       ```bash
       cd /home/aluno/Downloads/isn20261/frontend/web && \
       mkdir -p components && touch components/.gitkeep
       ```

    3. Ensure `public/` exists and is tracked. If create-next-app left it empty (no favicon files), create a `.gitkeep` to guarantee it's committed:
       ```bash
       cd /home/aluno/Downloads/isn20261/frontend/web && \
       mkdir -p public && \
       if [ -z "$(find public -mindepth 1 -maxdepth 1 ! -name '.gitkeep' -print -quit 2>/dev/null)" ]; then
         touch public/.gitkeep
       fi
       ```
       (If create-next-app already seeded `public/` with files — e.g., `next.svg`, `vercel.svg` — leave them alone and skip the `.gitkeep`. The conditional above handles both cases.)

    4. **Do NOT create**: `app/page.tsx` and `app/tokens/page.tsx` (plan 04 owns the placeholder routes), any file under `lib/api/` beyond `.gitkeep`, any file under `components/` beyond `.gitkeep`.

    5. Verify `styles/` (created in plan 02) and `lib/` (created when shadcn init wrote `lib/utils.ts` in plan 02) are still on disk. If either is somehow missing, pause and report — plans 01/02 should have left them.
  </action>
  <verify>
    <automated>
      cd /home/aluno/Downloads/isn20261/frontend/web && \
      test -d app && \
      test -d components && \
      test -d lib && \
      test -d lib/api && \
      test -d public && \
      test -d styles && \
      test -f lib/api/.gitkeep && \
      test -f components/.gitkeep && \
      test -f lib/utils.ts && \
      test -f styles/globals.css && \
      [ "$(find lib/api -type f ! -name '.gitkeep' | wc -l)" = "0" ] && \
      [ "$(find components -type f ! -name '.gitkeep' | wc -l)" = "0" ]
    </automated>
  </verify>
  <acceptance_criteria>
    - All six required directories exist: `frontend/web/app`, `frontend/web/components`, `frontend/web/lib`, `frontend/web/lib/api`, `frontend/web/public`, `frontend/web/styles` (verifiable: `ls -d frontend/web/{app,components,lib,lib/api,public,styles}` exits 0).
    - `frontend/web/lib/api/.gitkeep` exists and is the ONLY file in that directory (verifiable: `find frontend/web/lib/api -type f` returns exactly `frontend/web/lib/api/.gitkeep`).
    - `frontend/web/components/.gitkeep` exists; the directory contains zero non-`.gitkeep` files (verifiable: `find frontend/web/components -type f ! -name '.gitkeep' | wc -l` returns 0).
    - `frontend/web/public/` exists. Either it contains files create-next-app seeded, or it contains `.gitkeep`.
    - `frontend/web/lib/utils.ts` (from plan 02) is still in place — the shadcn `cn()` helper.
    - `frontend/web/styles/globals.css` (from plan 02) is still in place.
    - There is NO `lib/api/index.ts`, `lib/api/types.ts`, `lib/api/auth.ts`, or any other `.ts`/`.tsx` file under `lib/api/` (Phase 4's surface).
  </acceptance_criteria>
  <done>
    The full Phase-1 folder skeleton is on disk. `lib/api/` and `components/` are empty (only `.gitkeep`), preserving the Phase 4 / Phase 3 boundaries. `styles/` and `lib/utils.ts` from plan 02 are intact.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire Manrope + Inter via next/font/google in app/layout.tsx</name>
  <files>
    frontend/web/app/layout.tsx
  </files>
  <read_first>
    frontend/web/app/layout.tsx (the existing file from plan 02 — has `import "@/styles/globals.css"` at the top; preserve that and the Next-emitted Metadata export shape),
    .planning/phases/01-foundation/01-CONTEXT.md (the `Claude's Discretion` "Manrope + Inter loading" + "Manrope/Inter CSS-variable names" items — exact font config; ROADMAP success criterion #4),
    .planning/phases/01-foundation/01-PATTERNS.md (the "app/layout.tsx" section — full convention spec; the "anti-pattern to refuse" — no Google Fonts CDN at runtime),
    frontend/_design-reference/styles.css (lines 33-37 — for the EXACT font-family names `Manrope` and `Inter` and the CSS-variable names `--font-display` and `--font-body` that Phase 2 will consume; do NOT copy CSS rules, only mirror these names)
  </read_first>
  <action>
    Rewrite `frontend/web/app/layout.tsx` to load Manrope (display) + Inter (body) via `next/font/google` and expose them as CSS variables on `<html>`. Preserve the `@/styles/globals.css` import added by plan 02.

    Replace the entire contents of `frontend/web/app/layout.tsx` with:

    ```tsx
    import type { Metadata } from "next";
    import { Manrope, Inter } from "next/font/google";
    import "@/styles/globals.css";

    const fontDisplay = Manrope({
      subsets: ["latin"],
      weight: ["400", "500", "600", "700"],
      variable: "--font-display",
      display: "swap",
    });

    const fontBody = Inter({
      subsets: ["latin"],
      weight: ["400", "500", "600", "700"],
      variable: "--font-body",
      display: "swap",
    });

    export const metadata: Metadata = {
      title: "recommend-a",
      description: "Movie recommendation app — coming soon.",
    };

    export default function RootLayout({
      children,
    }: Readonly<{
      children: React.ReactNode;
    }>) {
      return (
        <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`}>
          <body>{children}</body>
        </html>
      );
    }
    ```

    Key points (each is non-optional and verified below):

    - **CSS-variable names are load-bearing.** `variable: "--font-display"` for Manrope and `variable: "--font-body"` for Inter — these names mirror `frontend/_design-reference/styles.css:35-36` verbatim so Phase 2 (DSGN-02) can write `@theme { --font-display: var(--font-display); --font-body: var(--font-body); }` without renaming. CONTEXT.md `<specifics>` makes this explicit.

    - **Subsets and weights.** `subsets: ["latin"]` is the minimum; weights `["400","500","600","700"]` cover the design-reference type scale. Phase 2 may extend (e.g., add `"800"` for the 64px display weight) — Phase 1 ships a sensible baseline.

    - **`display: "swap"`** prevents invisible text during font load (FOUT, not FOIT) — standard `next/font` recommendation. Not strictly required but the install-time-cheapest correct option.

    - **Both `.variable` classes on `<html>`.** Concatenate with a space — both must be present so `var(--font-display)` and `var(--font-body)` resolve in any descendant. Tailwind utility classes added by Phase 2 (`font-display`, `font-body`) will reference these CSS variables.

    - **No Google Fonts CDN.** Do NOT add `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`. The whole point of `next/font/google` is build-time download + self-hosting under `.next/static/media/`. Plan 04's verification step will grep the built `.next/` output for `fonts.googleapis.com` and demand zero hits (PATTERNS.md Convention 9 + ROADMAP success #4). Anti-pattern source: `frontend/_design-reference/Recommend-a.html`.

    - **No `_design-reference/` import.** Per CLAUDE.md hard rule #2 / Convention 2, this file may NOT contain `from "_design-reference/..."` or any path crossing into `frontend/_design-reference/`. The only inheritance is the variable NAMES, encoded via the `next/font` `variable:` options.

    - **No `dangerouslySetInnerHTML`, no `eval`, no inline `<script>`.** Layout is static JSX only.

    - Preserve the existing `app/page.tsx` placeholder content from create-next-app for now — plan 04 replaces it with the Phase-1 placeholder text. Do NOT modify `app/page.tsx` in this plan.
  </action>
  <verify>
    <automated>
      cd /home/aluno/Downloads/isn20261/frontend/web && \
      grep -q 'next/font/google' app/layout.tsx && \
      grep -q 'Manrope' app/layout.tsx && \
      grep -q 'Inter' app/layout.tsx && \
      grep -q 'variable: "--font-display"' app/layout.tsx && \
      grep -q 'variable: "--font-body"' app/layout.tsx && \
      grep -q 'subsets: \["latin"\]' app/layout.tsx && \
      grep -q 'fontDisplay.variable' app/layout.tsx && \
      grep -q 'fontBody.variable' app/layout.tsx && \
      grep -q 'import "@/styles/globals.css"' app/layout.tsx && \
      [ "$(grep -c 'fonts.googleapis.com' app/layout.tsx)" = "0" ] && \
      [ "$(grep -c 'dangerouslySetInnerHTML' app/layout.tsx)" = "0" ] && \
      [ "$(grep -cE '_design-reference' app/layout.tsx)" = "0" ] && \
      pnpm exec tsc --noEmit && \
      pnpm lint
    </automated>
  </verify>
  <acceptance_criteria>
    - `frontend/web/app/layout.tsx` contains the literal string `from "next/font/google"`.
    - `frontend/web/app/layout.tsx` contains BOTH `Manrope(` AND `Inter(` (the `next/font/google` loader calls).
    - `frontend/web/app/layout.tsx` contains the literal string `variable: "--font-display"` AND `variable: "--font-body"` (verifiable by `grep` — both must hit). These names match `frontend/_design-reference/styles.css:35-36`.
    - `frontend/web/app/layout.tsx` contains `subsets: ["latin"]` (used twice, once per font loader).
    - `frontend/web/app/layout.tsx` `<html>` opening tag includes BOTH `${fontDisplay.variable}` AND `${fontBody.variable}` in `className` (or whatever variable names the executor used — but both Manrope.variable AND Inter.variable must appear in `className`). Verifiable by grep on `fontDisplay.variable` AND `fontBody.variable`.
    - `frontend/web/app/layout.tsx` still contains `import "@/styles/globals.css"` (preserved from plan 02).
    - `frontend/web/app/layout.tsx` contains 0 occurrences of `fonts.googleapis.com` (no CDN reference; verifiable: `grep -c "fonts.googleapis.com" frontend/web/app/layout.tsx` returns 0).
    - `frontend/web/app/layout.tsx` contains 0 occurrences of `dangerouslySetInnerHTML`, `eval(`, or `<script` (verifiable: `grep -cE "dangerouslySetInnerHTML|eval\(|<script" frontend/web/app/layout.tsx` returns 0).
    - `frontend/web/app/layout.tsx` contains 0 occurrences of `_design-reference` (no forbidden import; verifiable: `grep -c "_design-reference" frontend/web/app/layout.tsx` returns 0).
    - `cd frontend/web && pnpm exec tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    Root layout loads Manrope (display) + Inter (body) via `next/font/google`, exposes them on `<html>` as `--font-display` and `--font-body` CSS variables, and imports the canonical `@/styles/globals.css`. No CDN font references, no `_design-reference/` imports, no XSS vectors. Lint and tsc still clean. Phase 2's `@theme` block can now consume these variables verbatim.
  </done>
</task>

</tasks>

<verification>
After both tasks:
- `ls -d frontend/web/{app,components,lib,lib/api,public,styles}` exits 0 — all six required directories exist (FOUND-05).
- `app/layout.tsx` loads Manrope + Inter via `next/font/google` and exposes `--font-display` / `--font-body` on `<html>` (FOUND-04 font portion).
- `lib/api/` is empty save for `.gitkeep` — Phase 4 boundary preserved.
- `components/` is empty save for `.gitkeep` — Phase 3 boundary preserved.
- `pnpm lint` and `pnpm exec tsc --noEmit` exit 0.
- The build-time grep for `fonts.googleapis.com` in `.next/` lives in plan 04 (after `pnpm build`); plan 03 verifies only the source-tree absence of CDN references.
</verification>

<success_criteria>
- FOUND-04 (font portion) is satisfied: Manrope + Inter loaded via `next/font/google` (no Google Fonts CDN at runtime), exposed as `--font-display` and `--font-body` CSS variables.
- FOUND-05 is satisfied: `app/`, `components/`, `lib/`, `lib/api/`, `public/`, `styles/` all exist; `lib/api/` and `components/` are empty.
- The Phase 1 → Phase 2 handoff seam is intact: Phase 2 will reference `var(--font-display)` and `var(--font-body)` from its `@theme` block without any renaming.
- The Phase 1 → Phase 3 boundary is intact: `components/` empty, ready for `LAYT-01..05`.
- The Phase 1 → Phase 4 boundary is intact: `lib/api/` empty, ready for `AUTH-04` mock surface.
- No JSX imports from `_design-reference/`, no `dangerouslySetInnerHTML`, no `eval`, no third-party runtime scripts.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-03-SUMMARY.md` capturing:
- The exact `next/font/google` call signatures used (subsets, weights, variable, display).
- Whether `public/` got a `.gitkeep` or had pre-seeded files from create-next-app (favicon etc.).
- Confirmation that `lib/api/` contains exactly `.gitkeep` (no `index.ts` stub).
- Confirmation that the `<html>` className includes both Manrope and Inter `.variable` values.
- Confirmation `pnpm lint` and `pnpm exec tsc --noEmit` exit 0.
</output>
