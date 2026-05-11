---
phase: 01-foundation
plan: 02
type: execute
wave: 2
depends_on: ["01-01"]
files_modified:
  - frontend/web/styles/globals.css
  - frontend/web/app/layout.tsx
  - frontend/web/app/globals.css
  - frontend/web/components.json
  - frontend/web/lib/utils.ts
  - frontend/web/postcss.config.mjs
  - frontend/web/package.json
  - frontend/web/pnpm-lock.yaml
  - frontend/web/tsconfig.json
autonomous: true
requirements:
  - FOUND-04
must_haves:
  truths:
    - "A single canonical globals.css at frontend/web/styles/globals.css imports Tailwind v4 and is imported exactly once by app/layout.tsx"
    - "shadcn CLI has initialized the project (components.json + lib/utils.ts with cn()) WITHOUT scaffolding any example component"
    - "Tailwind v4 is wired CSS-first — no tailwind.config.ts exists; PostCSS plugin is in place"
    - "components/ remains absent or empty — Phase 3 owns the component surface"
  artifacts:
    - path: "frontend/web/styles/globals.css"
      provides: "The single Tailwind v4 entry point — `@import \"tailwindcss\";` plus a placeholder comment for Phase 2's @theme block"
      contains: "@import \"tailwindcss\""
    - path: "frontend/web/components.json"
      provides: "shadcn CLI config (per D-02) — proves the shadcn ↔ Tailwind v4 wiring works end-to-end before Phase 3 needs it"
    - path: "frontend/web/lib/utils.ts"
      provides: "shadcn-emitted cn() helper combining clsx + tailwind-merge"
      contains: "export function cn"
    - path: "frontend/web/postcss.config.mjs"
      provides: "Tailwind v4 PostCSS plugin wiring (whatever create-next-app emitted)"
      contains: "tailwindcss"
  key_links:
    - from: "frontend/web/app/layout.tsx"
      to: "frontend/web/styles/globals.css"
      via: "import statement"
      pattern: "import.*styles/globals\\.css"
    - from: "frontend/web/lib/utils.ts"
      to: "frontend/web/components/ (Phase 3 consumers)"
      via: "named export of cn()"
      pattern: "export function cn"
    - from: "frontend/web/components.json"
      to: "shadcn CLI"
      via: "Phase 3 will run `pnpm dlx shadcn@latest add <component>` against this config"
---

<objective>
Wire Tailwind v4 (CSS-first per D-01) into a single canonical entry point at `frontend/web/styles/globals.css`, and run `shadcn init` (per D-02) to validate the shadcn ↔ Tailwind v4 wiring end-to-end. Implements REQ FOUND-04 (TailwindCSS + shadcn-ready setup portion). The Manrope/Inter font loading and the folder skeleton come in plan 03; the placeholder routes and end-to-end verification come in plan 04.

Purpose: Plan 03 needs a working `cn()` import and a single canonical Tailwind entry point before it can wire `next/font` and finalize the layout. Validating shadcn's CLI here (rather than discovering a Tailwind-v4-vs-shadcn mismatch in Phase 3) is explicitly D-02's intent.

Output: One canonical `styles/globals.css` (Phase 2's `@theme` block lives here later), a shadcn-init'd `components.json` + `lib/utils.ts`, and Tailwind v4's PostCSS pipeline confirmed working.
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
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| developer host -> shadcn CLI -> npm registry | `pnpm dlx shadcn@latest init` downloads and executes the shadcn CLI script |
| shadcn-emitted code -> committed repo | `lib/utils.ts` and `components.json` are committed and become part of the production bundle |

## STRIDE Threat Register

severity_max: low

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering (supply chain) | `pnpm dlx shadcn@latest init` | mitigate | Pin to the `shadcn` package on the official npm registry (no scoped name typo, no GitHub URL). Per D-02, the init MUST produce ONLY `components.json` + `lib/utils.ts` — if the CLI tries to scaffold an example component (`button.tsx` etc.), it MUST be removed before commit (PATTERNS.md Convention 8). Committing `components.json` allows future audit. The `clsx` + `tailwind-merge` + `class-variance-authority` + `lucide-react` deps shadcn adds are widely-used, audited libraries — accepted into devDependencies/dependencies as shadcn emits them. |
| T-02-02 | Information Disclosure (CSS leaking dev tooling) | `frontend/web/styles/globals.css` | accept | Phase 1 keeps `globals.css` to `@import "tailwindcss";` plus a placeholder comment. No CSS variables, no design tokens, no environment-specific values. Phase 2 (DSGN-01..06) populates the `@theme` block with the design-reference tokens — at that point a separate threat model addresses token exposure. |
| T-02-03 | Tampering (config drift) | `frontend/web/components.json` | accept | shadcn-emitted config is committed verbatim. We do NOT hand-edit `aliases` or `tailwind.css` paths beyond what the init command writes. If the init defaults conflict with our `styles/globals.css` location, we re-run init with the correct path argument rather than hand-edit. |

**Note:** No high-severity threats. No `dangerouslySetInnerHTML`, no `eval`, no third-party runtime scripts loaded from CDN.
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Create canonical styles/globals.css and consolidate Tailwind entry point</name>
  <files>
    frontend/web/styles/globals.css,
    frontend/web/app/globals.css,
    frontend/web/app/layout.tsx,
    frontend/web/postcss.config.mjs
  </files>
  <read_first>
    frontend/web/app/layout.tsx (to see the existing `import "./globals.css"` line that create-next-app emitted),
    frontend/web/app/globals.css (to confirm what create-next-app generated — usually `@import "tailwindcss";` plus minimal CSS-vars and dark-mode support),
    frontend/web/postcss.config.mjs (to confirm Tailwind v4's PostCSS plugin is already wired by create-next-app),
    .planning/phases/01-foundation/01-CONTEXT.md (D-01 — Tailwind v4 CSS-first; Phase 1 keeps globals.css minimal; the `Claude's Discretion` "styles/ directory contents" item — exactly one globals.css imported in app/layout.tsx),
    .planning/phases/01-foundation/01-PATTERNS.md (the "styles/globals.css" section — what Phase 1 actually writes),
    .planning/phases/01-foundation/01-01-SUMMARY.md (to confirm whether create-next-app emitted app/globals.css),
    frontend/_design-reference/styles.css (lines 1-60 — for awareness only; do NOT copy content into Phase 1's globals.css; Phase 2 owns @theme tokens)
  </read_first>
  <action>
    Per D-01 and PATTERNS.md "Convention" for `styles/globals.css`, the canonical Tailwind entry point lives at `frontend/web/styles/globals.css`. There must be exactly ONE `globals.css` imported by `app/layout.tsx`.

    1. Create `frontend/web/styles/` directory (`mkdir -p frontend/web/styles`).

    2. Create **`frontend/web/styles/globals.css`** with this exact content (no more, no less — Phase 1 is deliberately minimal per D-01; Phase 2's DSGN-01..06 owns the `@theme` block):
       ```css
       @import "tailwindcss";

       /*
        * Phase 1 (FOUND-04): canonical Tailwind v4 entry point.
        * Phase 2 (DSGN-01..06) populates an `@theme { ... }` block here that
        * mirrors frontend/_design-reference/styles.css :root tokens
        * (--color-bg, --color-accent, --fs-16, --r-md, --rail-w, etc.).
        * Do NOT add design tokens in Phase 1 — they belong to Phase 2.
        */
       ```

    3. Delete `frontend/web/app/globals.css` (`rm frontend/web/app/globals.css`). Per CONTEXT.md Discretion ("exactly one globals.css is imported in app/layout.tsx"), we consolidate on `styles/globals.css` to match REQ FOUND-05's requirement that a `styles/` directory exists with the Tailwind entry inside it.

    4. Update **`frontend/web/app/layout.tsx`** — read the existing file, then change the import line from:
       ```ts
       import "./globals.css";
       ```
       to:
       ```ts
       import "@/styles/globals.css";
       ```
       Use the `@/*` path alias (configured in plan 01) so the import is location-agnostic. Leave every other part of `app/layout.tsx` untouched — plan 03 will rewrite the `<html>`/`<body>` and `next/font` wiring.

    5. **Do NOT modify `postcss.config.mjs`.** Confirm (read-only) that it contains `tailwindcss` (it should — create-next-app `--tailwind` emits it for Tailwind v4 as `@tailwindcss/postcss`). If it does not, the create-next-app scaffold did something unexpected and the executor should pause and report.

    6. **Do NOT create `tailwind.config.ts`** — per PATTERNS.md Convention 6, Tailwind v4 is CSS-first; all token authoring happens inside `globals.css` `@theme` (in Phase 2). If create-next-app shipped a `tailwind.config.ts`, delete it (it is a v3 leftover).
  </action>
  <verify>
    <automated>
      cd /home/aluno/Downloads/isn20261/frontend/web && \
      test -f styles/globals.css && \
      ! test -f app/globals.css && \
      ! test -f tailwind.config.ts && \
      ! test -f tailwind.config.js && \
      ! test -f tailwind.config.mjs && \
      grep -q '@import "tailwindcss"' styles/globals.css && \
      grep -q 'import "@/styles/globals.css"' app/layout.tsx && \
      grep -q "tailwindcss" postcss.config.mjs && \
      pnpm exec tsc --noEmit && \
      pnpm lint
    </automated>
  </verify>
  <acceptance_criteria>
    - `frontend/web/styles/globals.css` exists.
    - `frontend/web/styles/globals.css` first non-blank line is exactly `@import "tailwindcss";` (verifiable: `head -1 frontend/web/styles/globals.css` returns that line).
    - `frontend/web/styles/globals.css` does NOT contain `@theme` (Phase 2 owns it; verifiable: `grep -c "@theme" frontend/web/styles/globals.css` returns 0).
    - `frontend/web/styles/globals.css` does NOT contain any `--color-*`, `--fs-*`, `--r-*`, or `--rail-*` CSS variable (Phase 2 owns design tokens; verifiable: `grep -cE "^\s*--(color|fs|r|rail|tab|font)-" frontend/web/styles/globals.css` returns 0 — comments mentioning them are fine, real CSS declarations are not).
    - `frontend/web/app/globals.css` does NOT exist (deleted).
    - `frontend/web/tailwind.config.ts`, `frontend/web/tailwind.config.js`, `frontend/web/tailwind.config.mjs` — none exist (Tailwind v4 CSS-first per Convention 6).
    - `frontend/web/app/layout.tsx` contains the literal string `import "@/styles/globals.css"` (or single quotes — accept either).
    - `frontend/web/app/layout.tsx` does NOT contain `import "./globals.css"`.
    - `frontend/web/postcss.config.mjs` contains the literal string `tailwindcss` (the v4 PostCSS plugin).
    - `cd frontend/web && pnpm exec tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    Single canonical Tailwind v4 entry point lives at `frontend/web/styles/globals.css` and is imported by `app/layout.tsx` via the `@/*` alias. `app/globals.css` is gone, no `tailwind.config.*` file exists. Lint and tsc still clean.
  </done>
</task>

<task type="auto">
  <name>Task 2: Run shadcn init to produce components.json and lib/utils.ts (no example component)</name>
  <files>
    frontend/web/components.json,
    frontend/web/lib/utils.ts,
    frontend/web/package.json,
    frontend/web/pnpm-lock.yaml
  </files>
  <read_first>
    frontend/web/styles/globals.css (to confirm the path shadcn init must point at — set during interactive answers below),
    frontend/web/tsconfig.json (to confirm the `@/*` alias shadcn will write into components.json `aliases`),
    .planning/phases/01-foundation/01-CONTEXT.md (D-02 — shadcn init MUST produce components.json + lib/utils.ts; NO example component scaffolded; components/ stays empty in Phase 1),
    .planning/phases/01-foundation/01-PATTERNS.md (Convention 8 — components/ stays empty; the "components.json" section)
  </read_first>
  <action>
    Per D-02, run shadcn's official init CLI to produce `components.json` and `lib/utils.ts`.

    1. From `frontend/web/`, run shadcn init non-interactively where the CLI supports it. As of late 2025/2026 the canonical command is:

       ```bash
       cd /home/aluno/Downloads/isn20261/frontend/web && \
       pnpm dlx shadcn@latest init --yes --base-color neutral --css-variables
       ```

       If the CLI version installed does not accept `--yes` (older builds), fall back to interactive and answer:
       - Style: `default` (or whatever the CLI default is — does not affect Phase 1)
       - Base color: `neutral` (Phase 2 will replace with project tokens — neutral is the safest interim)
       - CSS variables: `yes` (matches D-01 CSS-first approach)
       - Global CSS file: `styles/globals.css` (NOT the default `app/globals.css` — we deleted that in Task 1)
       - Tailwind config: leave blank / accept "Tailwind v4 CSS-first detected" (no tailwind.config.ts exists per Convention 6)
       - Import alias for components: `@/components`
       - Import alias for utils: `@/lib/utils`
       - Use React Server Components: `yes` (Next 16 App Router default)

       The init will:
       - Create `frontend/web/components.json` with the alias config above.
       - Create `frontend/web/lib/utils.ts` containing the standard `cn()` helper:
         ```ts
         import { clsx, type ClassValue } from "clsx";
         import { twMerge } from "tailwind-merge";

         export function cn(...inputs: ClassValue[]) {
           return twMerge(clsx(inputs));
         }
         ```
       - Add `clsx`, `tailwind-merge`, `class-variance-authority`, and (depending on CLI version) `lucide-react` to `package.json` dependencies, updating `pnpm-lock.yaml`.
       - Possibly modify `styles/globals.css` to add shadcn's CSS-variable scaffold. **If it does**, remove the shadcn additions and revert `styles/globals.css` back to the exact two-block form Task 1 wrote — Phase 2 owns design tokens, not shadcn defaults. (This protects the Phase 1→Phase 2 handoff documented in PATTERNS.md.)

    2. **Per Convention 8 — `components/` stays empty in Phase 1.** If the shadcn CLI scaffolds an example component anywhere under `frontend/web/components/` (e.g., `components/ui/button.tsx`), delete it:
       ```bash
       cd /home/aluno/Downloads/isn20261/frontend/web && \
       find components -type f ! -name '.gitkeep' -delete 2>/dev/null || true
       find components -type d -empty -delete 2>/dev/null || true
       ```
       (Plan 03 will recreate `components/` with a `.gitkeep` for FOUND-05; we don't need to do that here.)

    3. Confirm `lib/utils.ts` exists and exports `cn`. Do NOT modify it.

    4. Confirm `components.json` exists. Do NOT hand-edit `aliases.css` — if shadcn wrote a wrong path (e.g., `app/globals.css`), re-run the init with the correct `Global CSS file` answer rather than hand-patching the JSON.
  </action>
  <verify>
    <automated>
      cd /home/aluno/Downloads/isn20261/frontend/web && \
      test -f components.json && \
      test -f lib/utils.ts && \
      grep -q "export function cn" lib/utils.ts && \
      grep -q "clsx" lib/utils.ts && \
      grep -q "tailwind-merge" lib/utils.ts && \
      grep -q '"clsx"' package.json && \
      grep -q '"tailwind-merge"' package.json && \
      head -1 styles/globals.css | grep -q '@import "tailwindcss"' && \
      [ "$(grep -c '@theme' styles/globals.css)" = "0" ] && \
      [ "$(find components -type f 2>/dev/null | grep -v '\.gitkeep$' | wc -l)" = "0" ] && \
      pnpm exec tsc --noEmit && \
      pnpm lint
    </automated>
  </verify>
  <acceptance_criteria>
    - `frontend/web/components.json` exists and parses as valid JSON (`node -e 'JSON.parse(require("fs").readFileSync("frontend/web/components.json"))'` exits 0).
    - `frontend/web/components.json` `aliases.utils` equals `"@/lib/utils"` (verifiable: `node -e 'const c=require("./frontend/web/components.json"); if(c.aliases.utils!=="@/lib/utils")process.exit(1)'`).
    - `frontend/web/components.json` `aliases.components` equals `"@/components"`.
    - `frontend/web/lib/utils.ts` exists and contains `export function cn` AND imports from both `clsx` AND `tailwind-merge`.
    - `frontend/web/package.json` `dependencies` (or `devDependencies`) contains BOTH `clsx` AND `tailwind-merge` (verifiable via `node -e 'const p=require("./frontend/web/package.json"); const a={...p.dependencies,...p.devDependencies}; if(!a.clsx||!a["tailwind-merge"])process.exit(1)'`).
    - `frontend/web/styles/globals.css` first line is still `@import "tailwindcss";` AND it still contains 0 occurrences of `@theme` (shadcn additions, if any, were reverted).
    - `frontend/web/components/` directory either does NOT exist OR contains zero `.tsx`/`.ts` files (only `.gitkeep` allowed; verifiable: `find frontend/web/components -type f 2>/dev/null | grep -v '\.gitkeep$' | wc -l` returns 0).
    - `frontend/web/tailwind.config.ts`, `.js`, `.mjs` — still none exist.
    - `cd frontend/web && pnpm exec tsc --noEmit` exits 0 (the new `lib/utils.ts` typechecks).
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    shadcn CLI has initialized — `components.json` written with the `@/*` aliases, `lib/utils.ts` with the standard `cn()` helper, `clsx` + `tailwind-merge` added to dependencies, lockfile updated. No example components were scaffolded; `components/` is empty (Phase 3 owns it). `styles/globals.css` remains the minimal Phase 1 form per D-01.
  </done>
</task>

</tasks>

<verification>
After both tasks:
- One Tailwind entry point exists at `frontend/web/styles/globals.css`, imported once by `app/layout.tsx` via `@/styles/globals.css`.
- No `tailwind.config.*` file exists (Tailwind v4 CSS-first per D-01 / Convention 6).
- shadcn primitives surface (`cn()`) is importable as `import { cn } from "@/lib/utils"` — Phase 3 components rely on this.
- `components/` is empty — Phase 3 owns the surface (Convention 8).
- `pnpm lint` and `pnpm exec tsc --noEmit` still exit 0.
- No design tokens leaked from shadcn defaults into globals.css (Phase 2's seam is preserved).
</verification>

<success_criteria>
- FOUND-04 (Tailwind + shadcn-ready setup portion) is satisfied: TailwindCSS v4 is installed and wired CSS-first, shadcn CLI ran successfully and produced its standard config + utility.
- The Phase 1→Phase 2 handoff seam is intact: Phase 2 will populate `@theme { ... }` inside the existing `frontend/web/styles/globals.css` without renaming or moving files.
- `components/` is empty (or absent) — Phase 3's `LAYT-01..05` will own the first real components.
- No design tokens, no hardcoded hex colors, no px font-sizes introduced (Phase 2 territory).
- No `dangerouslySetInnerHTML`, no `eval`, no third-party runtime CSS imports introduced.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-02-SUMMARY.md` capturing:
- Exact `shadcn` CLI version that ran (output of `pnpm dlx shadcn@latest --version` if available, else infer from the init log).
- The exact dependencies shadcn added (read from `package.json` diff vs plan 01's SUMMARY).
- Whether the shadcn CLI tried to scaffold a component (and was deleted) or correctly skipped it.
- Whether shadcn modified `styles/globals.css` (and was reverted) or correctly left it as Task 1's two-block form.
- Confirmation of the import alias `@/styles/globals.css` is in `app/layout.tsx`.
</output>
