---
phase: 01-foundation
plan: 03
subsystem: ui
tags: [nextjs, fonts, next-font, manrope, inter, skeleton, gitkeep]

# Dependency graph
requires:
  - "01-01 (Next.js 16 scaffold at frontend/web/)"
  - "01-02 (styles/globals.css canonical entry point, lib/utils.ts cn() helper)"
provides:
  - "Complete frontend/web/ folder skeleton: app/, components/, lib/, lib/api/, public/, styles/"
  - "Manrope loaded via next/font/google as --font-display CSS variable on <html>"
  - "Inter loaded via next/font/google as --font-body CSS variable on <html>"
  - "lib/api/.gitkeep — empty Phase 4 seam (AUTH-04 fills with mock Cognito surface)"
  - "components/.gitkeep — empty Phase 3 seam (LAYT-01..05 owns first components)"
  - "Phase 1 -> Phase 2 handoff: var(--font-display) and var(--font-body) reachable on <html>"
affects:
  - "02-design-system (@theme block can now consume var(--font-display) and var(--font-body) without renaming)"
  - "03-app-shell (components/ seam ready for LAYT-01..05)"
  - "04-auth (lib/api/ seam ready for AUTH-04 mock Cognito surface)"

# Tech tracking
tech-stack:
  added:
    - "Manrope (next/font/google) — display font, CSS variable --font-display"
    - "Inter (next/font/google) — body font, CSS variable --font-body"
  patterns:
    - "next/font/google self-hosts fonts at build time — no runtime CDN fetch"
    - "Font CSS variables applied on <html> via .variable property concatenation"
    - ".gitkeep convention for empty directories that must persist in git"

key-files:
  created:
    - "frontend/web/lib/api/.gitkeep"
    - "frontend/web/components/.gitkeep"
  modified:
    - "frontend/web/app/layout.tsx (Geist replaced with Manrope+Inter; metadata updated)"

key-decisions:
  - "public/ already had create-next-app SVG assets (file.svg, globe.svg, next.svg, vercel.svg, window.svg) — no .gitkeep added (objective: only add .gitkeep to truly empty dirs)"
  - "lib/api/ uses .gitkeep (not lib/api/index.ts) — deliberate Phase 4 boundary; index.ts would be importable and invite pre-shaping the seam"
  - "Manrope weight array ['400','500','600','700'] — baseline for Phase 2 type scale; Phase 2 may extend to '800' for 64px display"
  - "Both font .variable classes on <html> (not <body>) — CSS vars resolve from root, compatible with any SSR/streaming pattern"

requirements-completed: [FOUND-04, FOUND-05]

# Metrics
duration: 8min
completed: 2026-05-06
---

# Phase 01 Plan 03: Skeleton and Fonts Summary

**Folder skeleton complete and Manrope+Inter wired via next/font/google as --font-display/--font-body CSS variables on <html>, replacing Geist — no CDN fonts, no _design-reference imports, lint and tsc clean**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-06
- **Completed:** 2026-05-06
- **Tasks:** 2 of 2
- **Files modified:** 2 created + 1 modified

## Accomplishments

- Created `frontend/web/lib/api/` with `.gitkeep` — preserves the Phase 4 empty seam (mock Cognito surface, AUTH-04)
- Created `frontend/web/components/` with `.gitkeep` — preserves the Phase 3 empty seam (LAYT-01..05)
- Confirmed `public/` already contains create-next-app assets (file.svg, globe.svg, next.svg, vercel.svg, window.svg) — no `.gitkeep` needed per plan instruction "add .gitkeep only to truly empty dirs"
- Rewrote `app/layout.tsx` replacing Geist fonts with Manrope (display) + Inter (body) via `next/font/google`
- CSS-variable names `--font-display` and `--font-body` mirror `frontend/_design-reference/styles.css:35-36` exactly so Phase 2's `@theme` block can consume them without renaming
- Preserved `import "@/styles/globals.css"` from plan 02
- Updated metadata title to "recommend-a" and description to "Movie recommendation app — coming soon."
- `pnpm exec tsc --noEmit` exits 0
- `pnpm lint` exits 0

## next/font/google Call Signatures

```ts
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

Applied on `<html>`:
```tsx
<html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`}>
```

## public/ Status

`public/` contained 5 files seeded by `create-next-app`:
- `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`

No `.gitkeep` was added — per the plan, `.gitkeep` is only for truly empty directories.

## lib/api/ Status

`lib/api/` contains exactly one file: `.gitkeep`

Reason for `.gitkeep` over `lib/api/index.ts`:
- An `index.ts` exporting `export {}` would be importable, which could invite premature Phase 4 work
- `.gitkeep` is a literal "do not put code here yet" marker — enforces the Phase 4 boundary

## <html> className Confirmation

Both font variable classes are applied:
```tsx
className={`${fontDisplay.variable} ${fontBody.variable}`}
```
This means both `--font-display` and `--font-body` are declared on `<html>` and resolve in any descendant element.

## Quality Gates

- `pnpm exec tsc --noEmit` — exits 0 (strict + noUncheckedIndexedAccess clean)
- `pnpm lint` — exits 0 (ESLint flat config clean)
- `grep -c 'fonts.googleapis.com' frontend/web/app/layout.tsx` — 0 (no CDN references)
- `grep -c '_design-reference' frontend/web/app/layout.tsx` — 0 (no forbidden imports)
- `grep -c 'dangerouslySetInnerHTML' frontend/web/app/layout.tsx` — 0 (no XSS vectors)
- `grep -c 'Geist' frontend/web/app/layout.tsx` — 0 (Geist fully removed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create folder skeleton with .gitkeep markers** - `84060b7` (feat)
2. **Task 2: Wire Manrope + Inter via next/font/google in app/layout.tsx** - `993952c` (feat)

## Deviations from Plan

None — plan executed exactly as written.

- `public/` already had create-next-app assets (expected per plan's conditional logic: "If create-next-app already seeded `public/` with files ... leave them alone and skip the `.gitkeep`")

## Known Stubs

None — this plan wires infrastructure (fonts + skeleton). No UI stubs, no placeholder data, no hardcoded display values.

## Threat Flags

None. Threat mitigations T-03-01 through T-03-04 all confirmed:
- T-03-01: `next/font/google` used exclusively (zero `fonts.googleapis.com` references in source)
- T-03-02: Layout uses static JSX only — no `dangerouslySetInnerHTML`, no `eval`, no `<script>`
- T-03-03: Zero `_design-reference` imports in any file modified by this plan
- T-03-04: `lib/api/` contains only `.gitkeep` — no pre-shaped Phase 4 surface

## Self-Check: PASSED

Files verified:
- `frontend/web/lib/api/.gitkeep` — FOUND
- `frontend/web/components/.gitkeep` — FOUND
- `frontend/web/app/layout.tsx` — FOUND (Manrope+Inter wired, Geist removed)
- `frontend/web/styles/globals.css` — FOUND (from plan 02, untouched)
- `frontend/web/lib/utils.ts` — FOUND (from plan 02, untouched)
- All 6 required directories exist: app/, components/, lib/, lib/api/, public/, styles/

Commits verified:
- 84060b7 (Task 1 skeleton) — verified in git log
- 993952c (Task 2 fonts) — verified in git log

## Next Phase Readiness

- Plan 04 (placeholder routes + build verification) has `app/layout.tsx` with font wiring locked — can add `app/page.tsx` placeholder text and `app/tokens/page.tsx` and run `pnpm build` + grep `.next/` for `fonts.googleapis.com`
- Phase 2 (Design System) can write `@theme { --font-display: var(--font-display); --font-body: var(--font-body); }` in `styles/globals.css` without any renaming
- Phase 3 (Layout) has empty `components/` seam ready
- Phase 4 (Auth) has empty `lib/api/` seam ready

---
*Phase: 01-foundation*
*Completed: 2026-05-06*
