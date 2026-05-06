---
phase: 01-foundation
plan: 02
subsystem: ui
tags: [tailwind, shadcn, css, globals, utils]

# Dependency graph
requires:
  - "01-01 (Next.js 16 scaffold at frontend/web/)"
provides:
  - "Single canonical Tailwind v4 entry point at frontend/web/styles/globals.css"
  - "shadcn CLI initialized: components.json + lib/utils.ts with cn() helper"
  - "Phase 1→Phase 2 handoff seam: styles/globals.css reserved for @theme block (Phase 2)"
  - "Phase 3 cn() surface: import { cn } from '@/lib/utils' is ready"
affects:
  - "02-design-system (@theme block in styles/globals.css; Phase 2 populates tokens)"
  - "03-app-shell (components/ surface; lib/utils.ts cn() available)"
  - "04-auth (lib/api/ mock surface; cn() importable)"

# Tech tracking
tech-stack:
  added:
    - "clsx ^2.1.1"
    - "tailwind-merge ^3.5.0"
    - "class-variance-authority ^0.7.1"
    - "lucide-react ^1.14.0"
    - "@base-ui/react ^1.4.1"
    - "tw-animate-css ^1.4.0"
    - "shadcn ^4.7.0 (CLI + runtime)"
  patterns:
    - "Tailwind v4 CSS-first: single globals.css at styles/globals.css, no tailwind.config.ts"
    - "shadcn @/* import aliases: @/components, @/lib/utils"
    - "components/ stays empty in Phase 1 (Phase 3 owns first components)"

key-files:
  created:
    - "frontend/web/styles/globals.css"
    - "frontend/web/components.json"
    - "frontend/web/lib/utils.ts"
  modified:
    - "frontend/web/app/layout.tsx (import updated to @/styles/globals.css)"
    - "frontend/web/package.json (clsx, tailwind-merge, cva, lucide-react added)"
    - "frontend/web/pnpm-lock.yaml (lockfile updated)"
  deleted:
    - "frontend/web/app/globals.css (create-next-app default, replaced by styles/globals.css)"

key-decisions:
  - "shadcn CLI 4.7.0 used with --defaults flag (--base-color not supported in this version)"
  - "shadcn-emitted button.tsx deleted per Convention 8 (components/ stays empty)"
  - "shadcn modifications to styles/globals.css reverted to Phase 1 minimal form (D-01)"
  - "components.json written with tailwind.css: styles/globals.css (correct canonical path)"
  - "shadcn added @base-ui/react and tw-animate-css as dependencies (accepted per threat model T-02-01)"

# Metrics
duration: 12min
completed: 2026-05-06
---

# Phase 01 Plan 02: Tailwind + shadcn Init Summary

**Tailwind v4 consolidated to single canonical entry at styles/globals.css; shadcn 4.7.0 initialized with components.json + lib/utils.ts cn() helper, components/ kept empty per Convention 8**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-06T00:24:07Z
- **Completed:** 2026-05-06
- **Tasks:** 2 of 2
- **Files modified:** 3 created + 3 modified + 1 deleted

## Accomplishments

- Created `frontend/web/styles/` directory and canonical `styles/globals.css` with `@import "tailwindcss"` and Phase 2 placeholder comment
- Deleted `frontend/web/app/globals.css` (create-next-app default), consolidating to a single Tailwind entry point
- Updated `frontend/web/app/layout.tsx` import from `"./globals.css"` to `"@/styles/globals.css"` (location-agnostic via @/* alias)
- Confirmed `postcss.config.mjs` already has `@tailwindcss/postcss` — no changes needed
- No `tailwind.config.ts` exists or was created (Tailwind v4 CSS-first, Convention 6)
- Ran `pnpm dlx shadcn@latest init --defaults` (shadcn 4.7.0) producing `components.json` and `lib/utils.ts`
- Deleted `components/ui/button.tsx` scaffolded by shadcn CLI (Convention 8 — components/ stays empty)
- Reverted `styles/globals.css` to minimal Phase 1 form after shadcn modified it with its default preset
- `pnpm exec tsc --noEmit` and `pnpm lint` both exit 0

## shadcn CLI Details

- **Version:** shadcn 4.7.0 (resolved from `pnpm dlx shadcn@latest`)
- **Invocation:** `pnpm dlx shadcn@latest init --defaults`
  - Note: `--base-color` flag not supported in this version (error: "unknown option '--base-color'"). Used `--defaults` instead.
  - `--defaults` selected: template=next, preset=base-nova (Lucide/Geist defaults)
- **CSS path written to components.json:** `styles/globals.css` (correct — matches canonical location)
- **Aliases in components.json:** `@/components` and `@/lib/utils` (correct)

## New Dependencies Added by shadcn

| Package | Version |
|---------|---------|
| clsx | ^2.1.1 |
| tailwind-merge | ^3.5.0 |
| class-variance-authority | ^0.7.1 |
| lucide-react | ^1.14.0 |
| @base-ui/react | ^1.4.1 |
| tw-animate-css | ^1.4.0 |
| shadcn | ^4.7.0 |

All packages added to `dependencies` (not devDependencies) by the shadcn CLI. These are widely-used, audited libraries — accepted per T-02-01 in the plan threat model.

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate Tailwind entry to styles/globals.css** - `35c63de` (feat)
2. **Task 2: Run shadcn init — components.json + lib/utils.ts** - `17d23a1` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] shadcn CLI --base-color flag not supported**
- **Found during:** Task 2
- **Issue:** `pnpm dlx shadcn@latest init --yes --base-color neutral --css-variables` failed with "unknown option '--base-color'"; the flag was removed in shadcn 4.x
- **Fix:** Used `--defaults` flag instead, which selects base-nova preset (neutral equivalent). The key outputs (components.json, lib/utils.ts, correct aliases, correct CSS path) are identical
- **Impact:** None — the base color preset is replaced entirely by Phase 2 design tokens anyway

**2. [Convention 8] shadcn CLI scaffolded components/ui/button.tsx**
- **Found during:** Task 2
- **Expected:** Plan and Convention 8 state components/ stays empty in Phase 1
- **Fix:** Deleted `components/ui/button.tsx` and removed empty `components/ui/` directory
- **Result:** `find frontend/web/components -type f 2>/dev/null | grep -v '\.gitkeep$' | wc -l` returns 0

**3. [D-01] shadcn CLI modified styles/globals.css with default preset**
- **Found during:** Task 2
- **Issue:** shadcn `--defaults` injected `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, `@custom-variant dark`, `@theme inline` block with 30+ color/radius variables, and `:root`/`.dark` CSS variable declarations
- **Fix:** Reverted `styles/globals.css` to exact Phase 1 minimal form (`@import "tailwindcss"` + Phase 2 placeholder comment). Plan explicitly anticipates this scenario and requires revert.
- **Result:** `grep -c '@theme' styles/globals.css` returns 0; first line is `@import "tailwindcss";`

## Known Stubs

None — Plan 02 installs infrastructure only. No UI components, no data sources, no display logic.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes. The `shadcn dlx` fetch is covered by T-02-01 in the plan threat model. `lib/utils.ts` is a pure utility (string manipulation only). `components.json` is a config file with no runtime security surface.

## Self-Check: PASSED

Files verified:
- `frontend/web/styles/globals.css` — FOUND (first line: `@import "tailwindcss";`, 0 occurrences of `@theme`)
- `frontend/web/app/globals.css` — CORRECTLY ABSENT (deleted)
- `frontend/web/components.json` — FOUND (valid JSON, aliases.utils=@/lib/utils, aliases.components=@/components)
- `frontend/web/lib/utils.ts` — FOUND (contains `export function cn`, imports clsx and tailwind-merge)
- `frontend/web/app/layout.tsx` — FOUND (contains `import "@/styles/globals.css"`, no old `./globals.css`)
- `frontend/web/components/` — EMPTY (no .tsx files)
- No `tailwind.config.ts/js/mjs` files

Commits verified:
- 35c63de (Task 1 styles/globals.css consolidation) — verified in git log
- 17d23a1 (Task 2 shadcn init) — verified in git log

Quality gates:
- `pnpm exec tsc --noEmit` — exits 0
- `pnpm lint` — exits 0

## Next Phase Readiness

- Plan 03 (app-shell) has a working `cn()` import: `import { cn } from "@/lib/utils"` is ready
- `styles/globals.css` is the established single Tailwind entry point — Plan 03's `app/layout.tsx` rewrite will add `next/font` Manrope/Inter wiring without changing the CSS import path
- Phase 2's `@theme` seam is preserved: `styles/globals.css` contains no tokens — Phase 2 populates them
- `components/` is empty — Phase 3 (LAYT-01..05) owns the first components

---
*Phase: 01-foundation*
*Completed: 2026-05-06*
