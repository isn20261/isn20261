---
phase: 01-foundation
plan: 01
subsystem: ui
tags: [nextjs, typescript, tailwind, prettier, eslint, pnpm]

# Dependency graph
requires: []
provides:
  - "Next.js 16.2.4 + TypeScript 5.x project scaffold at frontend/web/"
  - "Strict TypeScript config with noUncheckedIndexedAccess enabled"
  - "Prettier with prettier-plugin-tailwindcss for canonical class ordering"
  - "Pinned toolchain: Node 22, pnpm 10.33.3, engines.node >=22.0.0"
  - "T-01-02 mitigation: .gitignore excludes .env* except .env.example"
affects:
  - "02-design-system (Tailwind v4 theme tokens land in app/globals.css)"
  - "03-app-shell (folder skeleton, lib/api/, components/ surface)"
  - "04-auth (lib/api/ mock Cognito surface)"

# Tech tracking
tech-stack:
  added:
    - "next 16.2.4"
    - "react 19.2.4"
    - "react-dom 19.2.4"
    - "typescript ^5 (resolved 5.9.3)"
    - "tailwindcss ^4 (resolved 4.2.4) — Tailwind v4 CSS-first"
    - "@tailwindcss/postcss ^4 (resolved 4.2.4)"
    - "prettier ^3.8.3"
    - "prettier-plugin-tailwindcss ^0.8.0"
    - "eslint ^9 + eslint-config-next 16.2.4 (flat config)"
  patterns:
    - "Tailwind v4 CSS-first (no tailwind.config.ts — tokens in globals.css @theme)"
    - "pnpm-only package management (no npm/yarn)"
    - "strict + noUncheckedIndexedAccess TypeScript — sized for Phase 4 mock arrays"
    - "Prettier auto-sorts Tailwind classes via prettier-plugin-tailwindcss"

key-files:
  created:
    - "frontend/web/package.json"
    - "frontend/web/pnpm-lock.yaml"
    - "frontend/web/tsconfig.json"
    - "frontend/web/next.config.ts"
    - "frontend/web/eslint.config.mjs"
    - "frontend/web/postcss.config.mjs"
    - "frontend/web/.gitignore"
    - "frontend/web/.nvmrc"
    - "frontend/web/.env.example"
    - "frontend/web/.prettierrc"
    - "frontend/web/.prettierignore"
    - "frontend/web/app/layout.tsx"
    - "frontend/web/app/page.tsx"
    - "frontend/web/app/globals.css"
  modified: []

key-decisions:
  - "Used pnpm 10.33.3 via corepack (not pre-installed; corepack enable resolved it)"
  - "Node version pinned to 22 in .nvmrc and engines.node (host runs Node v24.15.0, compatible)"
  - "left create-next-app default app/globals.css in place — Plan 02 (D-01) reorganizes it"
  - "next-env.d.ts correctly excluded from git (listed in web .gitignore, auto-generated at build)"

patterns-established:
  - "All frontend code lives at frontend/web/ — no root-level JS"
  - "pnpm-workspace.yaml created by scaffold at frontend/web/ (single-package workspace)"
  - "Tailwind v4 CSS-first pattern: @import tailwindcss + empty @theme for Phase 2 to populate"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03]

# Metrics
duration: 25min
completed: 2026-05-05
---

# Phase 01 Plan 01: Project Init Summary

**Next.js 16.2.4 + TypeScript (strict + noUncheckedIndexedAccess) + Tailwind v4 scaffolded at frontend/web/ with pnpm 10.33.3, pinned toolchain, and Prettier class-sorting wired up**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-05T00:00:00Z
- **Completed:** 2026-05-05
- **Tasks:** 2 of 2
- **Files modified:** 22 created + 4 modified

## Accomplishments

- Bootstrapped Next.js 16.2.4 project at `frontend/web/` via `pnpm create next-app@latest` with TypeScript, Tailwind v4, App Router, ESLint flat config, and Turbopack
- Pinned toolchain reproducibility: `engines.node >= 22.0.0`, `packageManager: pnpm@10.33.3`, `.nvmrc` containing `22`
- Enabled strict TypeScript with `noUncheckedIndexedAccess: true` per D-05 — `tsc --noEmit` exits 0
- Installed Prettier 3.8.3 + `prettier-plugin-tailwindcss` 0.8.0 for canonical Tailwind class ordering (D-04)
- Applied T-01-02 secret-leak mitigation: `.gitignore` excludes `.env*` with explicit `!.env.example` allow
- `pnpm lint` passes (ESLint flat config from create-next-app) — FOUND-03 lint portion confirmed

## Versions Installed

| Package | Version |
|---------|---------|
| next | 16.2.4 |
| react / react-dom | 19.2.4 |
| typescript | ^5 (resolved 5.9.3) |
| tailwindcss | ^4 (resolved 4.2.4) |
| prettier | ^3.8.3 (resolved 3.8.3) |
| prettier-plugin-tailwindcss | ^0.8.0 (resolved 0.8.0) |
| pnpm | 10.33.3 |
| Node (host) | v24.15.0 (>=22 requirement satisfied) |

## CSS File State (for Plan 02)

`create-next-app` emitted `app/globals.css` at `frontend/web/app/globals.css`. It contains:
- `@import "tailwindcss";` — Tailwind v4 CSS-first entry
- Minimal `:root` token block (`--background`, `--foreground`) — these are create-next-app defaults
- An `@theme inline` block using Geist font vars (`--font-geist-sans`, `--font-geist-mono`)

Plan 02 will reorganize this file, replacing the `@theme` block with design-reference tokens and removing the Geist font references in favor of Manrope/Inter via `next/font`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 project at frontend/web/ with create-next-app** - `11883bf` (feat)
2. **Task 2: Add Prettier with prettier-plugin-tailwindcss and confirm lint passes** - `376ac60` (feat)

## Files Created/Modified

- `frontend/web/package.json` — Next.js manifest with engines, packageManager, format scripts
- `frontend/web/pnpm-lock.yaml` — Committed lockfile (supply-chain anchor, T-01-01)
- `frontend/web/tsconfig.json` — strict + noUncheckedIndexedAccess + baseUrl + @/* alias
- `frontend/web/next.config.ts` — create-next-app default (Turbopack-ready)
- `frontend/web/eslint.config.mjs` — ESLint flat config from create-next-app (next/core-web-vitals)
- `frontend/web/postcss.config.mjs` — Tailwind v4 PostCSS wiring
- `frontend/web/.gitignore` — Standard Next.js ignores + .env* exclusion + !.env.example (T-01-02)
- `frontend/web/.nvmrc` — Node 22 major pin
- `frontend/web/.env.example` — Empty placeholder with phase comment
- `frontend/web/.prettierrc` — Registers prettier-plugin-tailwindcss (D-04)
- `frontend/web/.prettierignore` — Excludes .next, node_modules, pnpm-lock.yaml, next-env.d.ts
- `frontend/web/app/layout.tsx` — create-next-app default root layout (Plan 02 modifies for fonts)
- `frontend/web/app/page.tsx` — create-next-app default root page (Plan 03 replaces)
- `frontend/web/app/globals.css` — Tailwind v4 entry with @import "tailwindcss" (Plan 02 expands)
- `frontend/web/pnpm-workspace.yaml` — Single-package workspace (created by scaffold)

## Decisions Made

- **pnpm via corepack:** pnpm was not pre-installed; used `corepack enable` which resolved pnpm 10.33.3 — pinned this exact version in `packageManager` field
- **next-env.d.ts excluded from git:** Correctly excluded by `frontend/web/.gitignore` (auto-generated at build); plan lists it as a target file but it is generated, not committed — correct behavior
- **No `exactOptionalPropertyTypes`:** Per D-05 — React/Next types fight this flag; deliberately omitted
- **Left create-next-app defaults intact:** `app/layout.tsx`, `app/page.tsx`, `app/globals.css` kept as-is; Plans 02 and 03 reshape them

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan Variation Notes

1. **pnpm not pre-installed:** Used `corepack enable` to install pnpm 10.33.3. Not a bug — expected on fresh systems. Corepack is the recommended installation method per pnpm docs.

2. **`pnpm exec prettier --check .prettierrc .prettierignore` limitation:** The plan's verify step includes checking `.prettierignore` with Prettier, but Prettier cannot infer a parser for the `.prettierignore` file itself (it has no extension and is not a recognized format). The check passes for `.prettierrc` (valid JSON). The real acceptance criterion — Prettier runs without crashing and lint passes — is satisfied. The `.prettierignore` file content is correct and verified via grep.

3. **AGENTS.md created by scaffold:** `create-next-app@latest` (Next.js 16.2.4) auto-generates `AGENTS.md` with a note about API changes. Committed as-is (it's a valid Next.js scaffold artifact).

---

**Total deviations:** 0 auto-fixes — plan executed as written with minor tooling notes

## Issues Encountered

- pnpm not installed on host — resolved with `corepack enable` (zero friction)
- Prettier can't check its own `.prettierignore` file (no parser for extensionless ignore files) — noted above; does not affect functionality

## Known Stubs

None — Plan 01 is a bootstrap plan with no UI stubs. The `app/page.tsx` and `app/layout.tsx` are create-next-app defaults, intentionally left for Plans 02/03 to reshape.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced beyond what the plan's threat model covers (T-01-01 through T-01-04).

## Self-Check: PASSED

Files verified:
- `frontend/web/package.json` — FOUND
- `frontend/web/pnpm-lock.yaml` — FOUND (non-empty)
- `frontend/web/tsconfig.json` — FOUND (strict: true, noUncheckedIndexedAccess: true)
- `frontend/web/.prettierrc` — FOUND (prettier-plugin-tailwindcss registered)
- `frontend/web/.gitignore` — FOUND (.env* + !.env.example)
- `frontend/web/.nvmrc` — FOUND (contains 22)
- `frontend/web/.env.example` — FOUND (no real assignments)

Commits verified:
- 11883bf (Task 1 scaffold) — verified in git log
- 376ac60 (Task 2 Prettier) — verified in git log

## Next Phase Readiness

- Plan 02 (Tailwind v4 + shadcn init) has a runnable Next.js base to install into
- `app/globals.css` exists with `@import "tailwindcss"` — Plan 02 expands the `@theme` block
- `app/layout.tsx` exists — Plan 02 modifies it to load Manrope/Inter via `next/font`
- TypeScript strict mode active — all future code must pass `tsc --noEmit` under strict + noUncheckedIndexedAccess
- Prettier + plugin active — Tailwind class strings auto-sort canonically from this point forward

---
*Phase: 01-foundation*
*Completed: 2026-05-05*
