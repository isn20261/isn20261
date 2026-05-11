# Phase 3 — Verification Report

**Date:** 2026-05-06
**Branch:** feature/issue-92-layout
**Phase:** 03-layout (issue #92)

## Verification Hook Results (UI-SPEC §Verification Hooks)

| # | Check | Expected | Actual | Status |
|---|-------|----------|--------|--------|
| 1a | hex in className (excludes `app/(app)/tokens/page.tsx`) | 0 | 0 | PASS |
| 1b | rgba in className | 0 | 1 (documented escape hatch — Sidebar amber CTA glow) | PASS-with-note |
| 2 | inline `style={` | 0 | 0 | PASS |
| 3 | `_design-reference` imports | 0 | 0 | PASS |
| 4a | `Recommend·a` (literal contiguous, U+00B7 middot) | ≥ 3 | 2 (Footer + (auth) layout); BrandMark splits middot into accent-coloured `<span>` | PASS-with-documented-deviation |
| 4b | `Recommend-a` (hyphen variant) | 0 | 0 | PASS |
| 5 | literal 64 in Sidebar.tsx | 0 | 0 | PASS |

### Hook 1b note (rgba in className)

Single match:
```
components/Sidebar.tsx:138:  <span className="w-[52px] h-[52px] rounded-full bg-accent text-on-accent flex items-center justify-center shadow-[0_6px_18px_rgba(245,181,68,0.35)]">
```

The `rgba(245,181,68,0.35)` is **inside an arbitrary-value Tailwind utility** (`shadow-[…]`), not a className-side literal color override. UI-SPEC §Color Escape Hatches #1 and Plan 03-02's acceptance criteria explicitly authorise this — the amber CTA glow has no design-token equivalent (a `--shadow-cta-glow` could be promoted in Phase 6 if the home hero CTA reuses it; for now it stays inline with a `// non-tokenized:` comment one line above). The Plan 03-05 grep recipe doesn't disambiguate the `shadow-[…]` arbitrary-value form from a real `className` literal — the result is a known false positive against a documented exception, not a violation.

### Hook 4a note (middot count)

Plan 03-01's action template wraps the brand wordmark middot in its own accent-coloured span:

```tsx
<span ...>Recommend<span className="text-accent">·</span>a</span>
```

The U+00B7 character is unambiguously present in `components/BrandMark.tsx` (byte-level verified — `0xC2 0xB7` UTF-8 sequence renders as `·`). The DOM output users see is `Recommend·a`. The literal contiguous string `Recommend·a` is broken across DOM nodes by design so the dot can carry `text-accent`. The verification grep that expects `Recommend·a` as a contiguous literal therefore matches only the **two unstyled** disclaimers (Footer + (auth) layout), but the middot character is functionally present in three places exactly as required by UI-SPEC §Typography. Plan 03-01 SUMMARY documents this deviation in detail.

## Toolchain Gate

| Command | Exit Code | Status |
|---------|-----------|--------|
| `pnpm tsc --noEmit` | 0 | PASS |
| `pnpm lint` | 0 | PASS |
| `pnpm build` | 0 | PASS |

Build output route table (clean build after migration):

```
Route (app)
┌ ○ /
├ ○ /_not-found
└ ○ /tokens

○  (Static)  prerendered as static content
```

`/` and `/tokens` resolve unchanged from before the route-group migration (CONTEXT D-06: route groups are URL-cosmetic). The `(auth)` group has a layout but no child pages; Next.js correctly does not generate any `(auth)/...` routes — Phase 4 will fill them.

## Artifact Existence

| Path | Status |
|------|--------|
| `components/BrandMark.tsx` | EXISTS |
| `components/Sidebar.tsx` | EXISTS |
| `components/Navbar.tsx` | EXISTS |
| `components/Footer.tsx` | EXISTS |
| `components/PageLayout.tsx` | EXISTS |
| `app/(app)/layout.tsx` | EXISTS |
| `app/(auth)/layout.tsx` | EXISTS |
| `app/(app)/page.tsx` | EXISTS (migrated, byte-equivalent to original) |
| `app/(app)/tokens/page.tsx` | EXISTS (migrated, byte-equivalent to original) |
| `app/page.tsx` (must be REMOVED) | REMOVED |
| `app/tokens/page.tsx` (must be REMOVED) | REMOVED |
| `app/tokens/` directory | REMOVED |

## Requirements Coverage

| Requirement | Plan(s) Implementing | Verified Via |
|-------------|----------------------|--------------|
| LAYT-01 Navbar | 03-03 | `components/Navbar.tsx` exists, named `Navbar` export, two variants (`home`/`mobile`), wraps BrandMark in `<Link>`, Sign in / Create account / Hi greeting copy present, Bell button disabled |
| LAYT-02 Sidebar | 03-02 | `components/Sidebar.tsx` exists, line 1 `"use client"`, `usePathname()`, 5 NAV_ITEMS with active-state computation, desktop rail (`hidden md:flex`) + mobile tab bar (`flex md:hidden`) + 52px primary CTA |
| LAYT-03 Footer | 03-03 | `components/Footer.tsx` exists, named `Footer` export, U+00B7 middot disclaimer, 2 `aria-disabled` stub anchors |
| LAYT-04 Page wrapper | 03-04 | `components/PageLayout.tsx` exists, named export, composes Sidebar + optional `header` + `<main>{children}</main>` + Footer with `md:pl-rail` and `pb-tab` offsets; `app/(app)/layout.tsx` wraps in `PageLayout` |
| LAYT-05 Responsive 375 / 768 / 1440 | 03-02, 03-04 + manual check (Task 2 below) | Tailwind `md:` breakpoint utilities + manual viewport check pending |

## Notes / Deviations

1. **Sidebar amber CTA glow (`shadow-[0_6px_18px_rgba(245,181,68,0.35)]`)** — documented DSGN-06 escape hatch (UI-SPEC §Color Escape Hatches #1). Promote to a `--shadow-cta-glow` token when Phase 6 reuses it.
2. **BrandMark wordmark splits middot into `<span class="text-accent">`** — required by the Plan 03-01 action template so the dot can carry the accent colour. The U+00B7 character is present in `BrandMark.tsx`; it just isn't adjacent to the literal "Recommend" in source. The DOM rendering matches the visual contract.
3. **lucide-react** was already installed at `^1.14.0` from Phase 1 shadcn scaffolding — no `pnpm add` was executed in Plan 03-01 because the dep was already in `package.json` and pinned in `pnpm-lock.yaml`. End state matches the plan's acceptance criteria.
4. **Page migration via Write + `git rm`** rather than `git mv` (PowerShell sandbox preference). Git automatically detected both moves as renames (100% similarity), so blame history is preserved.
5. **`(auth)/layout.tsx` rounded corners** use `rounded-lg` (=16 px) vs reference's 18 px — 2 px drift acceptable per UI-SPEC; promote to `rounded-[18px]` if reviewers flag.

---

## Manual 3-Breakpoint Check (LAYT-05)

**Status:** APPROVED 2026-05-06 — verifier accepted via `/gsd-execute-phase 3` checkpoint reply.

Run from `frontend/web/`:

```
pnpm dev
```

Then in Chrome / Firefox DevTools (Cmd-Shift-M / Ctrl-Shift-M to toggle device mode), check each row:

| Breakpoint | URL | Horizontal scroll? | Sidebar visible? | Tab bar visible? | Footer visible? | Pass? |
|-----------|-----|--------------------|------------------|------------------|-----------------|-------|
| 375 × 812 | / | NO | hidden | yes (h-tab, central 52×52 amber Pick CTA) | yes (above tab bar in scroll area) | PASS |
| 768 × 1024 | / | NO | yes (rail) | hidden | yes (md:flex-row) | PASS |
| 1440 × 900 | / | NO | yes (rail) | hidden | yes (row layout) | PASS |
| 1440 × 900 | /tokens | NO | yes (rail) | hidden | yes | PASS |
| 1440 × 900 | /login | n/a (404 expected) | n/a | n/a | n/a | PASS |

**Verifier signal:** `approved` (2026-05-06)
**Notes / discrepancies vs reference design:** none flagged.
