# Phase 1: Foundation - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Bootstrap a Next.js 16 + TypeScript + Tailwind v4 project at `frontend/web/`. The project must boot locally (`pnpm dev`), lint clean (`pnpm lint`, `tsc --noEmit` strict), expose the canonical folder skeleton (`app/`, `components/`, `lib/`, `lib/api/`, `public/`, `styles/`), load Manrope + Inter via `next/font`, and route between two pages (`/` and `/tokens`). Implements REQ FOUND-01..FOUND-07 (issue #90).

**Not in this phase:** Tailwind theme tokens (Phase 2 / DSGN-01..06), shadcn primitives beyond `cn()` (Phase 3 / LAYT-01..05), any UI design beyond placeholder pages (Phase 3+), `lib/api/` contents (Phase 4 / AUTH-04+), tests (out of milestone scope), CI workflows (out of milestone scope).

</domain>

<decisions>
## Implementation Decisions

### Tooling Stack

- **D-01:** Tailwind CSS **v4** (CSS-first config via `@theme` directive in `globals.css`). Phase 1 ships a minimal `globals.css` containing only `@import "tailwindcss";` and the base layer reset. Phase 2 (DSGN-01..06) populates the `@theme` block to mirror `frontend/_design-reference/styles.css` token names verbatim (`--color-bg`, `--color-accent`, `--fs-16`, `--r-md`, `--rail-w`, etc.). Rationale: v4's CSS-first model is a natural mirror of the reference's `:root` CSS-variable approach — Phase 2 can copy tokens in 1:1 without a parallel `tailwind.config.ts` definition.

### shadcn / Component Primitives

- **D-02:** Phase 1 runs `pnpm dlx shadcn@latest init` (or whichever Tailwind v4-compatible shadcn CLI version is current at install time). The init must produce `components.json` and `lib/utils.ts` with the `cn()` helper. **No example component is scaffolded** in Phase 1 — `components/` stays empty. Phase 3 (Layout) generates the first real primitive when it owns the `components/` surface. Rationale: validates the shadcn ↔ Tailwind v4 wiring end-to-end during Phase 1 instead of discovering a CLI/config mismatch in Phase 3.

### Routing / Pages

- **D-03:** Phase 1 ships exactly two routes:
  1. `/` — root placeholder page (`app/page.tsx`) with minimal "recommend-a — coming soon" text. Phase 6 (HOME-01..05) replaces this entirely.
  2. `/tokens` — placeholder page (`app/tokens/page.tsx`) with "Design tokens — populated in Phase 2" text. Phase 2's DSGN-05 ("tokens demo route") fills the **existing** page rather than creating a new route. Creates a clean Phase 1 → Phase 2 handoff seam.

### Code Style & Linting

- **D-04:** Prettier is installed with `prettier-plugin-tailwindcss` for canonical Tailwind class ordering. The plugin auto-sorts class strings to the canonical Tailwind order on every save / pre-commit run. Pairs with the "theme variables only" rule (CLAUDE.md hard rule #4) once Phase 2 lands — keeps PR diffs in screen phases (4–10) free of class-order noise.
- **D-05:** `tsconfig.json` enables **`strict: true` PLUS `noUncheckedIndexedAccess: true`**. The extra flag catches `array[i]` returning `T` instead of `T | undefined` — relevant once `lib/api/` mock arrays appear in Phase 4. Other strictness flags (`noImplicitOverride`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`) are **deliberately NOT enabled** in Phase 1 — `exactOptionalPropertyTypes` regularly fights React / Next types and would create unjustified friction.

### Claude's Discretion

The planner is free to pick defensible defaults for the following — none of them materially change Phase 1's outcome and surfacing them would be churn:

- **Exact Next.js minor version** — install whatever `pnpm create next-app@latest --typescript --tailwind --app --src-dir=false --turbopack --import-alias='@/*'` resolves to at execution time, then commit `pnpm-lock.yaml` for reproducibility.
- **Node version** — pin to the latest LTS supported by Next 16 (Node 20.9+ or Node 22.x). Express via `package.json#engines.node` and `.nvmrc`. Default to Node 22 LTS unless that combination is broken at install time.
- **pnpm version** — pin via `package.json#packageManager` (e.g., `"packageManager": "pnpm@<exact-version>"`). Use whatever `pnpm -v` reports on the install host.
- **ESLint config style** — use whatever `create-next-app` ships in Next 16 (flat-config `eslint.config.mjs` is the expected default). Do not hand-roll a custom config.
- **`.gitignore`** — standard `create-next-app` output (`.next/`, `node_modules/`, `*.log`, `.env*` except `.env.example`).
- **`.env.example`** — empty placeholder file (or a single comment line). Cognito / Lambda env vars are added in Phase 4+ when the mock-vs-real seam appears.
- **`lib/api/` keep-strategy** — directory must exist after Phase 1 (FOUND-05). Use either `lib/api/.gitkeep` OR a stub `lib/api/index.ts` exporting `export {}` — planner picks. Keep it deliberately empty; Phase 4 fills it.
- **`styles/` directory contents** — `styles/globals.css` is the canonical location for the Tailwind import. Whether `app/globals.css` is also kept (Next.js default) or removed in favor of `styles/globals.css` is a planner call as long as exactly one globals.css is imported in `app/layout.tsx`.
- **Manrope + Inter loading** — use `next/font/google` for both, attach `font-display` and `font-body` via CSS variable on `<html>` so Phase 2 can wire them into the `@theme` block. Subsets: `latin`. Weights: include 400/500/600/700 minimum (Phase 2 may extend). No Google Fonts CDN at runtime (CLAUDE.md rule).
- **Manrope/Inter CSS-variable names** — use `--font-display` and `--font-body` to match `_design-reference/styles.css` so Phase 2 inherits without renaming.
- **TypeScript path alias** — `@/*` (Next.js default).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Roadmap
- `.planning/PROJECT.md` — milestone scope, core value, locked decisions table, constraints
- `.planning/ROADMAP.md` §"Phase 1: Foundation" — phase goal, success criteria, GitHub issue mapping
- `.planning/REQUIREMENTS.md` §"Foundation (issue #90)" — FOUND-01..07 atomic requirements (REQ-IDs that must be covered by plans)
- `CLAUDE.md` — milestone hard rules (frontend lives at `frontend/web/`, no `_design-reference/` JSX imports, theme-vars-only after Phase 2, 1-phase = 1-issue = 1-branch = 1-PR convention)
- `frontend/github-context.md` — original GitHub issue text (#88 parent + #90 sub-issue)

### Visual Design Source of Truth
- `frontend/_design-reference/styles.css` — CSS-variable definitions Phase 2 will mirror. Relevant to Phase 1 only as the source for font names (Manrope display, Inter body) loaded via `next/font` in FOUND-04.

### Backend / Codebase Context (read-only this milestone)
- `.planning/codebase/STACK.md` §"Frontend Stack" — explicit "frontend not yet established" status; confirms greenfield
- `.planning/codebase/CONCERNS.md` — pre-existing backend bugs explicitly out of scope this milestone

### State / History
- `.planning/STATE.md` — current phase, deferred items, blockers list

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/_design-reference/styles.css`: Token shape Phase 1 inherits implicitly — fonts named `Manrope` (display) and `Inter` (body) under CSS variables `--font-display` and `--font-body`. Phase 1 loads both via `next/font/google` and exposes them under the same CSS-variable names so Phase 2 can `@theme` them in without rewiring.
- `frontend/_design-reference/Recommend-a.html`: Pulls fonts from `fonts.googleapis.com` directly. **Anti-pattern for `frontend/web/`** — CLAUDE.md rule explicitly forbids the Google Fonts CDN at runtime; use `next/font` instead.

### Established Patterns
- Repo-level package management: backend uses `uv` (Python). Frontend stack is independent — `pnpm` only inside `frontend/web/`. No shared lockfile or workspace.
- Repo-level git layout: `.planning/` carries GSD artifacts; `frontend/_design-reference/` is throwaway design source; `frontend/web/` is the new production frontend home.

### Integration Points
- `frontend/web/lib/api/` is the **single mock-vs-real seam** for the milestone. Phase 1 creates the directory empty; Phase 4 (AUTH-04) fills it with the mock Cognito surface; v2 INTG-01 swaps the provider for the real Cognito SDK. Anything implementing this directory in Phase 1 beyond an empty directory leaks scope into Phase 4.
- `frontend/web/styles/globals.css` is the single Tailwind entry point and the eventual home of the Phase 2 `@theme` block.
- `frontend/web/app/tokens/page.tsx` is the placeholder Phase 2 (DSGN-05) replaces in place.

</code_context>

<specifics>
## Specific Ideas

- **Token name mirroring (Phase 2 setup):** Phase 1 should expose Manrope/Inter as CSS variables named `--font-display` and `--font-body` so Phase 2 can write `@theme { --font-display: var(--font-display); ... }` without renaming. Match `_design-reference/styles.css` lines 33-34 verbatim where possible.
- **Two-route smoke test:** ROADMAP success criteria #1 + #2 specifically require BOTH `/` rendering AND a second route navigating successfully. The plan must have a verification task that does both — not just one.
- **Strict-mode / noUncheckedIndexedAccess interaction:** When `lib/api/` mocks are added in Phase 4, any array access (`mockUsers[0]`) will be `T | undefined`. Phase 1 doesn't write that code, but the tsconfig is sized for it.
- **No Google Fonts CDN at runtime** — explicit ROADMAP success criterion #4 ("Manrope + Inter are loaded via `next/font` (no Google Fonts CDN at runtime)"). Verifying this means grep'ing the built output for `fonts.googleapis.com` and asserting zero hits.

</specifics>

<deferred>
## Deferred Ideas

- **ESLint rule blocking hardcoded hex/px in `app/` and `components/`** — DSGN-06 (Phase 2 / Design System) territory. Could be enforced via stylelint, a custom ESLint rule, or a regex pre-commit grep. Phase 1 does not implement this.
- **Test runner setup** (Vitest / Jest / Playwright / RTL) — out of v1 milestone scope per `.planning/REQUIREMENTS.md`. If introduced later, prefer Vitest (Vite-aligned, ESM-native, fast) and Playwright (E2E across the 3 breakpoints).
- **CI workflows** (GitHub Actions for `pnpm lint` + `tsc --noEmit` on every PR into `frontend`) — out of v1 milestone scope. Worth raising at milestone-end / before final `frontend → main` PR.
- **`pnpm` workspace setup** — the repo has a Python backend (`uv`) and now a frontend at `frontend/web/`. A pnpm workspace at the repo root is unnecessary while there's only one JS package; revisit if a second one (e.g. an `e2e/` package) appears.
- **Husky / lint-staged pre-commit hooks** — nice-to-have but not required by FOUND-01..07. Phase 1 omits.
- **Storybook / Ladle** — useful for Phase 3 (Layout) onward but not justified in Phase 1.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-05-04*
