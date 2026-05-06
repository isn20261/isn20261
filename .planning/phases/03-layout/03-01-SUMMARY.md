---
plan: 03-01
phase: 03-layout
status: complete
date: 2026-05-06
---

# Plan 03-01 — lucide-react + BrandMark — Summary

## Files

| Path | Action |
|------|--------|
| `frontend/web/package.json` | unchanged (lucide-react@^1.14.0 already in dependencies) |
| `frontend/web/pnpm-lock.yaml` | unchanged (lucide-react@1.14.0(react@19.2.4) already locked) |
| `frontend/web/components/BrandMark.tsx` | created (Server Component, ~50 lines) |
| `frontend/web/components/.gitkeep` | deleted (directory now non-empty) |

## lucide-react

Already installed as a direct dep at `^1.14.0`, locked at `lucide-react@1.14.0(react@19.2.4)` in `pnpm-lock.yaml`. No `pnpm add` was needed — the dep was added during shadcn scaffolding in Phase 1 (Plan 01-02 SUMMARY confirms `components.json` was configured at Phase 1; the lockfile entry persisted from that). Acceptance grep `grep -q '"lucide-react"' package.json` and `grep -q '/lucide-react' pnpm-lock.yaml` both exit 0.

## Verification — BrandMark

| Check | Result |
|-------|--------|
| `head -1 components/BrandMark.tsx` starts with `"use client"` | NO (Server Component, expected) |
| `export function BrandMark` count | 1 |
| `export default` count | 0 |
| Imports from `_design-reference` | 0 |
| Hex/rgba in className | 0 |
| `style={{` props | 0 |
| `// non-tokenized:` comments | 4 (3 SVG color escape hatches + `text-[18px]`) |
| `pnpm tsc --noEmit` exit | 0 |
| `pnpm lint` exit | 0 |

## DSGN-06 Escape Hatches Used

All inside `components/BrandMark.tsx`, each preceded by an inline comment:

1. `<stop stopColor="var(--color-accent)" />` — `// non-tokenized: SVG <stop stopColor> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches`
2. `<stop stopColor="var(--color-accent-hover)" />` — same comment block (above)
3. `<rect ... fill="url(#ra-bg)" />` referencing the gradient — `// non-tokenized: SVG <rect fill> can't be reached by Tailwind`
4. `<path ... fill="var(--color-on-accent)" />` — `// non-tokenized: SVG <path fill> can't be reached by Tailwind`
5. `text-[18px]` on the wordmark span — `// non-tokenized: brand-mark wordmark size 18px is outside the Phase 2 type scale (12/14/16/20/28/40/64) — see UI-SPEC §Typography`

## Middot (U+00B7)

The U+00B7 character is present in `BrandMark.tsx` line ~50: `Recommend<span className="text-accent">·</span>a` (verified via byte-level inspection — single `·` byte at U+00B7).

**Acceptance-criterion deviation (documented):** The plan's action template wraps the middot in its own `<span class="text-accent">` so the dot can carry the brand accent color. This means the contiguous literal `Recommend·a` is **never adjacent** in the source — `git grep -nF 'Recommend·a' -- 'frontend/web/components/BrandMark.tsx'` returns 0 hits even though the U+00B7 character is unambiguously present and is rendered between "Recommend" and "a" at runtime.

The DOM output (what the user sees) IS `Recommend·a`. The verification will satisfy hook #4a (≥ 3 hits across all chrome files) via the Footer disclaimer text and the `(auth)/layout.tsx` disclaimer text — both of which keep `Recommend·a` contiguous because they are not styled per-character. This deviation is intrinsic to the action template (which the executor was told to "do not deviate" from).

## Notes

- No `"use client"` directive — Server Component (acceptance criterion #3).
- Named export only — no `export default`.
- The `var(--color-*)` references inside SVG attributes are the documented DSGN-06 escape hatch per UI-SPEC §Color Escape Hatches.
- `text-[18px]` is the documented typography exception.
- No hex/rgba in className, no inline `style={{ }}`.
