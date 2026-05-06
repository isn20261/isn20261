---
phase: 02-design-system
plan: 01
status: complete
started: 2026-05-05
completed: 2026-05-05
commit: bc06550
requirements_closed: [DSGN-01, DSGN-02, DSGN-03, DSGN-04]
---

# Plan 02-01 Summary: Tailwind v4 @theme block + @layer base reset

## What was built

Authored the Tailwind v4 `@theme` block in `frontend/web/styles/globals.css` mirroring every token from `frontend/_design-reference/styles.css:5-50` verbatim (D-02), plus a `@layer base` block carrying the reference's reset rules (styles.css:53-86, sans `#root`).

## Token mirror table

| Reference token | @theme namespace | Tailwind utility |
|---|---|---|
| `--color-bg: #0a0a0b` | `--color-bg` | `bg-bg` |
| `--color-surface: #131316` | `--color-surface` | `bg-surface` |
| `--color-surface-elevated: #1c1c20` | `--color-surface-elevated` | `bg-surface-elevated` |
| `--color-surface-2: #232328` | `--color-surface-2` | `bg-surface-2` |
| `--color-border: #2a2a30` | `--color-border` | `border-border` |
| `--color-border-strong: #3a3a42` | `--color-border-strong` | `border-border-strong` |
| `--color-text-primary: #f5f5f6` | `--color-text-primary` | `text-text-primary` |
| `--color-text-secondary: #a4a4ad` | `--color-text-secondary` | `text-text-secondary` |
| `--color-text-muted: #6c6c76` | `--color-text-muted` | `text-text-muted` |
| (alias) | `--color-primary` | `text-primary` |
| (alias) | `--color-secondary` | `text-secondary` |
| (alias) | `--color-muted` | `text-muted` |
| `--color-accent: #f5b544` | `--color-accent` | `bg-accent` |
| `--color-accent-hover: #ffc560` | `--color-accent-hover` | `bg-accent-hover` |
| `--color-accent-soft: rgba(245,181,68,0.12)` | `--color-accent-soft` | `bg-accent-soft` |
| `--color-on-accent: #1a1305` | `--color-on-accent` | `text-on-accent` |
| `--color-success: #4ade80` | `--color-success` | `text-success` |
| `--color-warning: #f59e0b` | `--color-warning` | `text-warning` |
| `--color-danger: #f87171` | `--color-danger` | `text-danger` |
| `--fs-12..64` | `--text-12..64` | `text-12` .. `text-64` |
| `--font-display` | `--font-display` | `font-display` |
| `--font-body` | `--font-body` | `font-body` |
| `--r-sm..xl` | `--radius-sm..xl` | `rounded-sm` .. `rounded-xl` |
| `--shadow-md/lg` | `--shadow-md/lg` | `shadow-md` / `shadow-lg` |
| `--rail-w: 64px` | `--spacing-rail` | `w-rail` / `h-rail` |
| `--tab-h: 64px` | `--spacing-tab` | `w-tab` / `h-tab` |

## Grep gate results

| Assertion | Expected | Actual |
|---|---|---|
| `--color-*` declarations | 19 | 19 |
| `--text-*` declarations | 7 | 7 |
| `--font-*` declarations | 2 | 2 |
| `--radius-*` declarations | 4 | 4 |
| `--shadow-*` declarations | 2 | 2 |
| `--spacing-*` declarations | 2 | 2 |
| `@theme` block count | 1 | 1 |
| `@layer base` block count | 1 | 1 |

## Build verification

- `pnpm build` exit code: 0
- Compiled successfully (Next.js 16.2.4 Turbopack)
- No `Error:`, `Unknown at-rule`, or `Cannot resolve` in build output

## Key files

- **Modified:** `frontend/web/styles/globals.css` — `@theme` block (non-inline) + `@layer base` reset

## Deviations from plan

None.

## Notes

- DSGN-05 (visual demo) ships in plan 02-02
- DSGN-06 (author rule + final verification) ships in plan 02-03
- No `tailwind.config.ts` created (D-01 honored)
