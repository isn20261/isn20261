---
phase: 01-foundation
plan: 04
subsystem: ui
tags: [nextjs, routes, app-router, verification, build, font-cdn-check]

# Dependency graph
requires:
  - "01-01 (Next.js 16 scaffold at frontend/web/)"
  - "01-02 (styles/globals.css, lib/utils.ts cn() helper)"
  - "01-03 (folder skeleton, Manrope+Inter via next/font/google in app/layout.tsx)"
provides:
  - "Root / route (app/page.tsx) — Phase 1 placeholder with recommend-a text (FOUND-06)"
  - "Second /tokens route (app/tokens/page.tsx) — proves App Router multi-route wiring (FOUND-07)"
  - "pnpm build succeeds with zero fonts.googleapis.com references in .next/ output"
  - "Full Phase 1 quality gate passed: lint, tsc, build, dev-server smoke test"
  - "Phase 1 contract complete — all 7 FOUND requirements satisfied"
affects:
  - "02-design-system (Phase 2 DSGN-05 fills app/tokens/page.tsx in place — file path locked)"
  - "06-home (Phase 6 HOME-01..05 replaces app/page.tsx in place — file path locked)"

# Tech tracking
tech-stack:
  added:
    - "next/link — used for internal navigation in both route files (satisfies @next/next/no-html-link-for-pages ESLint rule)"
  patterns:
    - "App Router server components (no 'use client' directive) for static placeholder pages"
    - "next/link for all internal navigation — required by ESLint next/core-web-vitals ruleset"
    - "pnpm build produces self-hosted font files under .next/static/media/ — zero CDN references"

key-files:
  created:
    - "frontend/web/app/tokens/page.tsx"
  modified:
    - "frontend/web/app/page.tsx (replaced create-next-app default with Phase 1 placeholder)"

key-decisions:
  - "Used next/link instead of <a href> for internal navigation — auto-fixed to satisfy @next/next/no-html-link-for-pages ESLint rule (Rule 1 deviation)"
  - "Both routes are server components (no 'use client') — static JSX only, no Tailwind classes per PATTERNS.md Convention 4"
  - "No additional routes created — exactly 2 page.tsx files in app/ (Convention 7)"
  - "Task 2 (verification) produces no source file changes — all verification is run-only"

requirements-completed: [FOUND-03, FOUND-06, FOUND-07]

# Metrics
duration: 12min
completed: 2026-05-05
---

# Phase 01 Plan 04: Routes and Verification Summary

**/ and /tokens placeholder routes authored, pnpm build succeeds, dev server boots both routes at HTTP 200, and .next/ contains zero fonts.googleapis.com references — Phase 1 contract fully closed**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-05
- **Completed:** 2026-05-05
- **Tasks:** 2 of 2
- **Files modified:** 1 created + 1 modified

## Accomplishments

### Task 1: Create the two placeholder routes

- Replaced `frontend/web/app/page.tsx` (create-next-app default) with Phase 1 placeholder containing `recommend-a — coming soon` text
- Created `frontend/web/app/tokens/page.tsx` with `Design tokens — populated in Phase 2` text
- Both routes are Next.js App Router server components (no `"use client"` directive)
- Both use `next/link` for internal navigation (required by ESLint `@next/next/no-html-link-for-pages` rule)
- Neither route contains `dangerouslySetInnerHTML`, `eval(`, or `<script>` (XSS-free)
- Neither route imports from `_design-reference/` (CLAUDE.md hard rule #2)
- `pnpm lint` exits 0 and `pnpm exec tsc --noEmit` exits 0

### Task 2: End-to-end verification

All Phase 1 ROADMAP success criteria verified and passed:

1. `pnpm dev` boots in **196ms** — `/` and `/tokens` both return HTTP 200
2. `/tokens` renders — App Router multi-route wiring proven
3. `pnpm lint` exits 0, `pnpm exec tsc --noEmit` exits 0 (strict + noUncheckedIndexedAccess)
4. All 6 required directories exist; Manrope+Inter via `next/font` (zero CDN references in `.next/`)

## pnpm build Output

```
▲ Next.js 16.2.4 (Turbopack)

Route (app)
┌ ○ /
├ ○ /_not-found
└ ○ /tokens

○  (Static)  prerendered as static content
```

Both `/` and `/tokens` appear in the route table as static prerendered pages.

## Font CDN Grep Results

### .next/ output check (ROADMAP success criterion #4 — load-bearing for FOUND-06/07)

```
grep -r "fonts.googleapis.com" .next/ | wc -l
```

**Result: 0**

Zero matches. Manrope and Inter are fully self-hosted under `.next/static/media/` via `next/font/google` build-time download. The Google Fonts CDN is never contacted at runtime.

### Source tree defensive check

```
grep -rE "fonts\.googleapis\.com|fonts\.gstatic\.com" app components lib styles | wc -l
```

**Result: 0**

Zero matches. No source file references either CDN domain.

## Dev Server Smoke Test

- **Boot time:** 196ms to Ready
- **Log location:** `/tmp/recommend-a-dev.log`

### HTTP Status Codes

| Route | HTTP Status |
|-------|-------------|
| `http://localhost:3000/` | **200** |
| `http://localhost:3000/tokens` | **200** |

### Body Content Verification

| Route | Grep target | Count |
|-------|-------------|-------|
| `http://localhost:3000/` | `recommend-a` | **1** |
| `http://localhost:3000/tokens` | `Design tokens` | **1** |

### Dev Server Cleanup

Dev server stopped cleanly. No orphan `next dev` processes confirmed via `ps aux | grep next`.

## Folder Skeleton (FOUND-05 Final Assertion)

```
ls -d app components lib lib/api public styles
```

All six directories present:
- `app/` — App Router root
- `components/` — Phase 3 seam (empty, `.gitkeep`)
- `lib/` — utilities (lib/utils.ts)
- `lib/api/` — Phase 4 seam (empty, `.gitkeep`)
- `public/` — static assets (create-next-app SVGs)
- `styles/` — Tailwind entry point (`globals.css`)

## Quality Gates (Final Phase 1 State)

| Check | Command | Result |
|-------|---------|--------|
| TypeScript strict | `pnpm exec tsc --noEmit` | PASS (exit 0) |
| ESLint | `pnpm lint` | PASS (exit 0) |
| Production build | `pnpm build` | PASS (exit 0) |
| Font CDN in .next/ | `grep -r fonts.googleapis.com .next/ \| wc -l` | **0** |
| Font CDN in source | `grep -rE fonts.googleapis.com\|fonts.gstatic.com ... \| wc -l` | **0** |
| Dev server boots | `pnpm dev` within 10s | PASS (196ms) |
| / returns 200 | `curl -w %{http_code} localhost:3000/` | **200** |
| /tokens returns 200 | `curl -w %{http_code} localhost:3000/tokens` | **200** |
| / body contains text | `grep -c recommend-a` | **1** |
| /tokens body contains text | `grep -c "Design tokens"` | **1** |
| Folder skeleton | `ls -d app components lib lib/api public styles` | PASS |
| No orphan dev process | `ps aux \| grep next` | CLEAN |

## ROADMAP Phase 1 Success Criteria — Final Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `pnpm dev` boots and root route `/` renders | PASS — HTTP 200, body contains `recommend-a` |
| 2 | Second route `/tokens` renders — App Router wiring proven | PASS — HTTP 200, body contains `Design tokens` |
| 3 | `pnpm lint` exits 0 AND `tsc --noEmit` exits 0 under strict | PASS — both exit 0 |
| 4 | Folder skeleton present; Manrope+Inter via `next/font` (no CDN) | PASS — all 6 dirs, 0 CDN hits in .next/ |

**All 4 Phase 1 ROADMAP success criteria are met.**

## Task Commits

1. **Task 1: Author / and /tokens placeholder routes** - `7ade9b8` (feat)

Task 2 produced no source file changes (verification only — no commit needed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced `<a href>` with `<Link href>` for internal navigation**

- **Found during:** Task 1 (lint check)
- **Issue:** `app/tokens/page.tsx` initially used `<a href="/">` which triggers ESLint error `@next/next/no-html-link-for-pages` — Next.js requires `<Link>` from `next/link` for internal page navigation
- **Fix:** Replaced `<a href="/tokens">` in `app/page.tsx` and `<a href="/">` in `app/tokens/page.tsx` with `<Link href="...">` importing `next/link`
- **Files modified:** `frontend/web/app/page.tsx`, `frontend/web/app/tokens/page.tsx`
- **Commit:** `7ade9b8` (included in the task commit — fixed before committing)

## Known Stubs

- `frontend/web/app/page.tsx` — Phase 1 placeholder root route. Phase 6 (HOME-01..05, issue #95) replaces this entirely with the home/hero screen. This is an intentional placeholder, not a bug.
- `frontend/web/app/tokens/page.tsx` — Phase 1 placeholder tokens route. Phase 2 (DSGN-05, issue #91) fills this file in place with color swatches, type samples, radii, and shadows. This is an intentional placeholder, not a bug.

Both stubs are load-bearing Phase 1 artifacts required by D-03 and FOUND-06/07 — they prevent Phase 1's goal from being blocked (the goal IS these placeholder routes).

## Threat Flags

None. Threat mitigations T-04-01 through T-04-04 all confirmed:
- T-04-01: `grep -r fonts.googleapis.com .next/ | wc -l` = 0 (zero CDN references in build output)
- T-04-02: Neither page contains `dangerouslySetInnerHTML`, `eval(`, or `<script>` (verified by grep)
- T-04-03: Neither page contains `_design-reference` (verified by grep)
- T-04-04: Dev server boots within 10 seconds (booted in 196ms)

## Phase 1 Complete — Ready for PR into `frontend` branch

All 7 FOUND requirements are satisfied across Plans 01–04:

| REQ | Description | Plan | Status |
|-----|-------------|------|--------|
| FOUND-01 | Next.js 16 + TypeScript project at frontend/web/ | 01-01 | DONE |
| FOUND-02 | Strict TypeScript (strict + noUncheckedIndexedAccess) | 01-01 | DONE |
| FOUND-03 | pnpm lint exits 0 (ESLint flat config + Prettier) | 01-01, 01-04 | DONE |
| FOUND-04 | Tailwind v4 CSS-first + shadcn init (components.json + cn()) | 01-02, 01-03 | DONE |
| FOUND-05 | Folder skeleton: app/, components/, lib/, lib/api/, public/, styles/ | 01-03 | DONE |
| FOUND-06 | pnpm dev boots, root / renders | 01-04 | DONE |
| FOUND-07 | Second route /tokens renders (App Router multi-route wiring) | 01-04 | DONE |

Branch `feature/issue-90-foundation` is ready for PR into `frontend` per CLAUDE.md hard rule #5.

## Self-Check: PASSED

Files verified:
- `frontend/web/app/page.tsx` — FOUND (contains `recommend-a`, `export default function`, `href="/tokens"`)
- `frontend/web/app/tokens/page.tsx` — FOUND (contains `Design tokens`, `export default function`, `href="/"`)
- `.planning/phases/01-foundation/01-04-SUMMARY.md` — this file

Commits verified:
- `7ade9b8` (Task 1 routes) — verified in git log

---
*Phase: 01-foundation*
*Completed: 2026-05-05*
