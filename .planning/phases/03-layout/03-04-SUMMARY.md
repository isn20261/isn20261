---
plan: 03-04
phase: 03-layout
status: complete
date: 2026-05-06
---

# Plan 03-04 — PageLayout + route groups + page migration — Summary

## Files

| Path | Action |
|------|--------|
| `frontend/web/components/PageLayout.tsx` | created (Server Component) |
| `frontend/web/app/(app)/layout.tsx` | created (default-export route-group layout) |
| `frontend/web/app/(auth)/layout.tsx` | created (default-export route-group layout, AuthShell card) |
| `frontend/web/app/(app)/page.tsx` | created (verbatim copy of old `app/page.tsx`) |
| `frontend/web/app/(app)/tokens/page.tsx` | created (verbatim copy of old `app/tokens/page.tsx`) |
| `frontend/web/app/page.tsx` | deleted (migrated into `(app)`) |
| `frontend/web/app/tokens/page.tsx` | deleted (migrated into `(app)`) |
| `frontend/web/app/tokens/` | directory removed |
| `frontend/web/app/layout.tsx` | unchanged (root layout untouched) |

`git mv` was not available in PowerShell sandbox; the migration used Write+`git rm`. Content of both migrated pages is byte-equivalent to the originals (Phase-1 placeholder copy preserved on `(app)/page.tsx`; full Phase-2 token gallery — `COLORS`, `TYPE_SCALE`, swatches, all sections — preserved on `(app)/tokens/page.tsx`).

## Build / Toolchain

| Command | Exit |
|---------|------|
| `pnpm tsc --noEmit` | 0 |
| `pnpm lint` | 0 |
| `pnpm build` | 0 |

`pnpm build` route table:

```
Route (app)
┌ ○ /
├ ○ /_not-found
└ ○ /tokens

○  (Static)  prerendered as static content
```

URLs `/` and `/tokens` confirmed unchanged after migration (route group `(app)` is URL-cosmetic per CONTEXT D-06). The `(auth)` group has a layout file but no child pages yet — Next.js does not generate any `/auth/...` routes, which is the expected Phase-3 state (Phase 4 ships `/login` + `/register`).

## Verification

| Check | Result |
|-------|--------|
| `components/PageLayout.tsx` exists, no `"use client"` | yes (Server Component) |
| `export function PageLayout` count | 1 |
| `export default` in PageLayout.tsx | 0 |
| `from '@/components/Sidebar'` in PageLayout.tsx | 1 |
| `from '@/components/Footer'` in PageLayout.tsx | 1 |
| `md:pl-rail` in PageLayout.tsx | 1 |
| `pb-tab` in PageLayout.tsx | 1 |
| Literal `64px` / `width: 64` / `height: 64` in PageLayout.tsx | 0 |
| `app/(app)/layout.tsx` `export default function AppGroupLayout` | 1 |
| `app/(auth)/layout.tsx` `export default function AuthGroupLayout` | 1 |
| `(auth) layout` middot disclaimer `Recommend·a is a fictional concept design.` | present |
| `(auth) layout` imports Sidebar / Footer | 0 / 0 |
| `(auth) layout` imports BrandMark | 1 |
| `app/page.tsx` removed | yes |
| `app/tokens/page.tsx` removed | yes |
| `app/tokens/` directory removed | yes |

## DSGN-06 Escape Hatches in `(auth)/layout.tsx`

| Token / Class | Comment |
|---------------|---------|
| `w-[min(420px,calc(100%-40px))]` | size primitive: card max-width 420px with 20px gutters at <420px viewports |
| `bg-surface/75` | approximation: stands in for reference rgba(20,20,22,.75) |
| `rounded-lg` (=16px) vs reference 18px | 2px drift acceptable per UI-SPEC; promote to `rounded-[18px]` if reviewers flag |

PageLayout itself uses no escape hatches — pure Phase 2 tokens (`bg-bg`, `text-text-primary`, `font-body`, `md:pl-rail`, `pb-tab`).

## Notes

- The `(app)/layout.tsx` is intentionally lean — pages opt into a Navbar by including `<Navbar />` in their JSX (CONTEXT D-Discretion). Phase 6 home page will pass it; detail screens skip it.
- `PageLayout`'s `header` prop is `ReactNode | undefined`; it renders before `<main>`. When `undefined`, the JSX `{header}` simply renders nothing.
- `(auth)/layout.tsx` does NOT compose Sidebar or global Footer — the AuthShell has its own internal disclaimer below the centered card.
- The Phase-2 tokens gallery is allowed to contain hex/rgba literals as inline JSX text content per UI-SPEC §Verification Hooks #1 (which excludes `app/(app)/tokens/page.tsx` from the lint grep). The migration preserves this content verbatim.
- After the migration, the stale `.next/` cache had to be cleared once before the new build picked up the route changes. The committed state is clean.
