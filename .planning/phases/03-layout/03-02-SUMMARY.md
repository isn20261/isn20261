---
plan: 03-02
phase: 03-layout
status: complete
date: 2026-05-06
---

# Plan 03-02 — Sidebar — Summary

## Files

| Path | Action | Lines |
|------|--------|-------|
| `frontend/web/components/Sidebar.tsx` | created (Client Component) | ~165 |

## Verification

| Check | Expected | Actual |
|-------|----------|--------|
| Line 1 is `"use client";` | yes | yes |
| `usePathname()` calls | ≥ 1 | 1 |
| `lucide-react` imports | 1 | 1 (Home, Clock, Sparkles, Bookmark, User) |
| `w-rail` / `h-tab` references | ≥ 1 each | both present |
| Literal `64px` / `width: 64` / `height: 64` | 0 | 0 |
| Inline `style={` | 0 | 0 |
| `_design-reference` imports | 0 | 0 |
| Hex/rgba in className (excludes shadow-[…] arbitrary value) | 0 | 0 |
| `aria-label` occurrences | ≥ 6 | 6 |
| `// non-tokenized:` comments | ≥ 5 | 6 |
| `pnpm tsc --noEmit` exit | 0 | 0 |
| `pnpm lint` exit | 0 | 0 |

## Escape Hatches Used (each preceded by `// non-tokenized:` comment)

1. `bg-bg/70` — desktop rail backdrop, approximation of reference rgba(8,8,9,.7)
2. `bg-bg/90` — mobile tab bar backdrop (more opaque than rail)
3. `-left-2.5 w-[3px]` — active sidebar indicator bar geometry
4. `w-[52px] h-[52px]` — mobile Pick CTA circle (52×52 px primitive, no Tailwind core scale step)
5. `shadow-[0_6px_18px_rgba(245,181,68,0.35)]` — amber CTA glow (UI-SPEC §Color Escape Hatch #1)
6. `text-[10px]` — mobile tab label font-size (below Phase 2 type scale)

(Plus `// TODO Phase 5:` comment on the desktop avatar's `JR` initials placeholder.)

## Routes

5 routes defined in `NAV_ITEMS`: `/` (exact), `/history`, `/recommendation` (primary CTA), `/watch-later`, `/preferences`.
Active match: exact for `/`, prefix for the other four.
Mobile primary CTA does NOT carry an `active` style — always amber per UI-SPEC §Interaction Contracts.

## Notes

- Single Client Component renders both desktop rail (`hidden md:flex`) and mobile tab bar (`flex md:hidden`) — CONTEXT D-01.
- `loggedIn` prop defaults to `false`; controls only the bottom avatar's href and fallback content. Phase 5 swaps for `useAuth()` at the page level.
- Bell on mobile is part of Navbar, not Sidebar — so no Bell here.
