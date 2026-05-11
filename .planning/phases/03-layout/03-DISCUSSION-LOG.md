# Phase 3: Layout — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 03-layout
**Areas discussed:** Navbar/Sidebar mapping (interactive); Footer, Tablet behavior, Auth wrapper (defaulted to recommended per user instruction "go with what you recommend")

---

## Gray Area Selection

| Area | Description | Selected for deep-dive |
|------|-------------|-----------------------|
| Navbar/Sidebar mapping | Reference has DesktopRail + MobileTabBar + per-page top bar; #92 says Navbar+Sidebar — needs explicit mapping | ✓ |
| Footer (no reference equivalent) | Decide global footer shape | (defaulted) |
| Tablet (~768) behavior | Decide three-tier vs binary responsive | (defaulted) |
| Auth pages + wrapper composition | Route group vs single wrapper variant | (defaulted) |

**User instruction at selection time:** *"You can just go with what you recommend"* — applies to the three areas not explicitly selected for deep-dive.

---

## Navbar/Sidebar Mapping (deep-dive)

### Q1 — Sidebar items

| Option | Description | Selected |
|--------|-------------|----------|
| Map to actual app routes (Recommended) | Brand + Home, History, Recommendation, Watch Later, Preferences (5 nav icons matching the 5-slot mobile tab bar) | ✓ |
| Mirror reference literally | Reference's Search/Upcoming/Series/Films/Add — placeholder buttons no real route this milestone | |
| Hybrid | Real routes + 1–2 reference filler icons | |

**User's choice:** Map to actual app routes (Recommended) → captured in CONTEXT.md D-02.

### Q2 — Mobile sidebar transformation

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom tab bar (Recommended) | Sidebar hidden < 768 px; fixed bottom bar at `h-tab` (= 64 px). Mirrors reference MobileTabBar | ✓ |
| Hamburger drawer | Top-bar hamburger opens left drawer; diverges from reference | |
| Hidden + bottom CTA only | No sidebar and no tab bar at mobile — just floating Pick CTA | |

**User's choice:** Bottom tab bar (Recommended) → captured in CONTEXT.md D-01 + D-02.

### Q3 — Navbar role

| Option | Description | Selected |
|--------|-------------|----------|
| Slot the layout exposes (Recommended) | Wrapper has `header` slot; default null; pages opt in. Matches reference where home shows top bar but detail does not | ✓ |
| Global, always-rendered | Layout always renders the same Navbar; conflicts with reference detail screen | |
| Page-authored only | No Navbar in wrapper; pages inline their own — fails LAYT-01 reusability | |

**User's choice:** Slot the layout exposes (Recommended) → captured in CONTEXT.md D-03.

### Q4 — Active state

| Option | Description | Selected |
|--------|-------------|----------|
| `usePathname()` from next/navigation (Recommended) | Sidebar reads pathname client-side; zero per-page wiring; idiomatic Next.js App Router | ✓ |
| Active prop from page | Each page passes `activeRoute`; explicit but boilerplate | |

**User's choice:** `usePathname()` (Recommended) → captured in CONTEXT.md D-07.

---

## Defaulted Decisions (user-deferred to recommendation)

### Footer
**Defaulted to:** minimal in-flow disclaimer block (brand + literal `Recommend·a is a fictional concept design.` + About/Privacy stubs). Hidden on auth pages, visible elsewhere; flows above the mobile tab bar inside scrollable content. Captured in CONTEXT.md D-04.

### Tablet behavior
**Defaulted to:** two-tier responsive at Tailwind `md:` (768 px). No icon-only intermediate sidebar tier. Captured in CONTEXT.md D-05.

### Auth pages + wrapper composition
**Defaulted to:** Next.js App Router route groups — `(app)/layout.tsx` for full chrome and `(auth)/layout.tsx` for centered AuthShell. Both layouts authored in Phase 3; `(auth)` ships now even though `/login` `/register` land in Phase 4 (avoids a Phase-4 layout-shape decision). Captured in CONTEXT.md D-06.

---

## Claude's Discretion

See CONTEXT.md `<decisions>` § "Claude's Discretion" — eleven planner-call items including Sidebar internal split (one component vs two), avatar fallback, mobile-top-header rendering, bell wiring, footer-link stub form, PageLayout prop shape, `/tokens` route relocation, and `(app)/layout.tsx` server-vs-client default.

## Deferred Ideas

See CONTEXT.md `<deferred>` — bell wiring, real About/Privacy pages, three-tier tablet sidebar, hamburger drawer, Search/Upcoming/Series/Films placeholder routes, light theme, motion tokens, `--shadow-cta-glow`, `--color-rail-bg`, real auth in Navbar, `RequireAuth` wrapping.
