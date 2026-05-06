# Phase 3: Layout — Context

**Gathered:** 2026-05-05
**Status:** Ready for planning
**Source:** Issue #92 acceptance criteria (user-supplied) + ROADMAP §"Phase 3"

<domain>
## Phase Boundary

Build the four chrome components — **Navbar** (top bar), **Sidebar** (left rail), **Footer**, and the **page layout wrapper** that composes them — as reusable React components in `frontend/web/components/`. The wrapper exposes a content slot every screen phase (4–10) plugs into, so screen phases never re-implement chrome. Components author fresh (no JSX import from `_design-reference/`), consume design values exclusively through Tailwind theme variables (no hex/px in className, no `style={{ }}` for tokenized properties — AGENTS.md DSGN-06), and match the reference at the three locked breakpoints (~375 / ~768 / 1440). Implements LAYT-01..05 (issue #92).

**User-stated intent (issue #92 verbatim):**
> Objetivo: Implementar componentes principais da aplicação (header, sidebar, footer, wrapper do layout das páginas).
> Checklist: Navbar, Sidebar, Footer, Layout wrapper das páginas.
> Critério de aceite: Utilização dos componentes citados.

**Reference reality:** `_design-reference/` does NOT have a single global "Navbar" or "Footer" component. It has:
- `DesktopRail` (`shared.jsx:32-90`) — 64px left vertical rail with brand + 6 icon nav buttons + user avatar at bottom.
- `MobileTabBar` (`shared.jsx:93-138`) — 64px bottom bar with 5 items including a primary central "Pick" CTA.
- A per-page top bar inside the main content (visible on home, hidden on detail / auth) — brand + greeting/auth controls.
- `AuthShell` (`auth.jsx:3-35`) — entirely separate centered-card chrome for `/login`, `/register`, `/forgot`. Has a small `footer` prop at the bottom of the card containing the disclaimer text "Recommend·a is a fictional concept design."

Phase 3 maps the issue #92 vocabulary onto these primitives (see `<decisions>` D-01..D-04).

**Not in this phase:** Actual screen content (Phases 6–10), `lib/api/` mocks (Phase 4), auth context / `RequireAuth` (Phase 5 — Phase 3 only ships the chrome containers, not the auth state they read), routing for `/login` `/register` (Phase 4), shadcn primitives beyond `cn()` already in `lib/utils.ts` (Phase 4+ pulls in shadcn Button etc. as needed), light theme (out of milestone), motion / animation tokens (out of milestone), notifications / bell wiring (post-v1).

</domain>

<decisions>
## Implementation Decisions

### Component Identity & Reference Mapping

- **D-01: Sidebar = DesktopRail-style left rail (desktop+) ↔ MobileTabBar (mobile).** A single conceptual "primary navigation" component with two responsive surfaces:
  - **Desktop (≥ 768 px):** fixed left vertical rail at `w-rail` (= 64 px from Phase 2 `--rail-w`) — brand mark at top, 5 route icons in the middle stack, user avatar at the bottom. Active item shows a 3 px amber bar on the left edge (matches `shared.jsx:69-72`).
  - **Mobile (< 768 px):** rail is hidden; a fixed bottom tab bar at `h-tab` (= 64 px from Phase 2 `--tab-h`) takes its place — 5 items with a primary central CTA. Page wrapper adds `pb-tab` (= 64 px) so content clears the bar.
  - Implementation note: planner picks whether this is one `<Sidebar>` component with internal responsive branching (Tailwind `hidden md:flex` on the rail, `flex md:hidden` on the tab bar) OR two siblings (`<DesktopSidebar>` + `<MobileTabBar>`) the wrapper composes. Either is acceptable; both must consume `w-rail` / `h-tab` tokens, not literal `64px`.

- **D-02: Sidebar items map to actual app routes** — not the reference's placeholder icons. Five route entries (matches the 5-slot mobile tab bar):
  | Slot | Route | Icon | Notes |
  |------|-------|------|-------|
  | 1 | `/` | Home | Always present |
  | 2 | `/history` | History (clock) | Protected (Phase 5 wires) |
  | 3 | `/recommendation` | **Pick** — primary CTA on mobile (sparkle icon, central, amber filled) | Plain icon button on desktop sidebar |
  | 4 | `/watch-later` | Bookmark | Protected |
  | 5 | `/preferences` | User / Settings | Protected |

  Brand mark renders at the top of the desktop rail (not in the tab bar). User avatar / fallback `<User>` icon renders at the bottom of the desktop rail (clickable → `/preferences`); on mobile, the "Me" slot in the tab bar plays the same role.

- **D-03: Navbar = layout-slot top-bar component.** A reusable `<Navbar>` component lives in `components/`, but the **layout wrapper renders it via a `header` slot** (default `null`) — so home/dashboard pages opt in with `<PageLayout header={<Navbar variant="home" />}>` while detail / settings pages omit it (matches reference: home shows top bar, detail does not). The Navbar's contents are: brand mark on the left + right-side affordances (logged-in: bell stub + greeting "Hi, {name}"; logged-out: "Sign in" / "Create account" buttons that link to `/login` / `/register`). Auth state in Phase 3 is mocked: `loggedIn` is a prop the page passes (Phase 5 swaps in real auth context). This satisfies LAYT-01 (Navbar is a real reusable component) without forcing a top bar on screens the reference design doesn't show one on.

- **D-04: Footer = minimal in-flow disclaimer block** at the bottom of the content area, not a fixed bar. Renders the brand mark + the line `Recommend·a is a fictional concept design.` (taken verbatim from `auth.jsx:86`) + two no-op text-link stubs (`About`, `Privacy`) using `text-text-muted` tokens. Component lives in `components/Footer.tsx`. The page layout wrapper composes it after the content slot. Hidden on auth pages (route group, see D-06). Visible on desktop and tablet; on mobile, the tab bar already occupies the bottom 64 px, but the footer flows above it inside the scrollable content — no overlap.

### Responsive Strategy

- **D-05: Two-tier responsive — mobile vs desktop, breakpoint at Tailwind `md` (= 768 px).** No icon-only intermediate sidebar tier. Below 768 px the chrome is mobile (top per-page header if rendered + bottom tab bar); from 768 px up it is desktop (left rail). At the milestone target widths (~375 / ~768 / 1440) this gives: 375 → mobile chrome, 768 → desktop chrome (rail visible at the breakpoint exactly), 1440 → desktop chrome. ROADMAP success criterion #3 ("sidebar collapses or transforms appropriately on mobile") is satisfied. Tailwind's default `md:` modifier is the gate (`md:` = `min-width: 768px`).

### Wrapper Composition & Auth Routes

- **D-06: Two layout wrappers via Next.js App Router route groups.**
  - `app/(app)/layout.tsx` — full chrome: `<PageLayout>` composing `<Sidebar>` (with internal mobile-tab-bar branching from D-01) + a `header` slot rendering the Navbar (D-03) + the page content slot (`children`) + `<Footer>` (D-04). All real screens (`/`, `/recommendation`, `/history`, `/watch-later`, `/preferences`) live under this group. Phase 1's existing `app/page.tsx` and `app/tokens/page.tsx` migrate **into the `(app)` group** as part of Phase 3 so the layout actually wraps them.
  - `app/(auth)/layout.tsx` — minimal chrome: centered card on the page background, no rail, no tab bar, no header slot, the AuthShell-style disclaimer at the bottom of the card. `/login`, `/register` (Phase 4) will live under this group.

  Route groups are cosmetic to URLs (`(app)` and `(auth)` do not appear in pathname), so the URL surface is unchanged. Phase 3 creates `(app)/layout.tsx`, `(auth)/layout.tsx` (the auth-route layout file shipped now even though the auth pages themselves land in Phase 4 — this avoids a Phase 4 layout-shape decision), and the AuthShell-equivalent component (`components/AuthShell.tsx` or inlined into `(auth)/layout.tsx` — planner picks).

  The root `app/layout.tsx` (Phase 1) keeps the `<html>` + font-variable wiring and renders `{children}`; route-group layouts nest under it.

### Routing & Active State

- **D-07: Sidebar active item is computed via `usePathname()` from `next/navigation`.** No `activeRoute` prop; pages do not need to wire anything. The sidebar component is therefore a Client Component (`"use client"`) so it can call `usePathname()`. Active match is exact for `/`, prefix-match for the other four routes (so `/recommendation/123` would still highlight Recommendation if Phase 7 nests). The wrapper itself stays a Server Component; only the Sidebar (and likely Navbar's user-controls, if Phase 5 wires real auth context) opts into client.

### Icons & Brand Mark

- **D-08: Icons via `lucide-react`.** shadcn standard, already a transitive concern through `components.json` config. Phase 3 installs `lucide-react`, picks the equivalents of the reference icons (`Home`, `Clock` for History, `Sparkles` for the Pick CTA, `Bookmark`, `User`/`Settings`, `Search` if used as a placeholder, `Bell` for the Navbar bell stub). No bespoke SVGs except the brand mark. Sizes use Tailwind `w-*`/`h-*` utilities — no inline `size={20}`-style props for sizing primitives controlled by tokens (lucide accepts a `size` prop, which is fine — it does not violate DSGN-06 because icon-internal sizing is not a design token).

- **D-09: BrandMark is a fresh component** at `components/BrandMark.tsx` — re-authored, not copied from `_design-reference/shared.jsx:4-29`. The SVG `rect` + path geometry is the design (the visual is the spec); it is re-typed in TS/JSX without importing from `_design-reference/`. Uses `var(--color-accent)` / `var(--color-accent-hover)` / `var(--color-on-accent)` via the Tailwind `text-accent` / `bg-accent-hover` / `text-on-accent` utilities (or via `currentColor` + a wrapper class) — not literal hex.

### Component File Layout

- **D-10: Layout components live flat in `components/`** (no nested `components/layout/` subdir for now). Files: `Navbar.tsx`, `Sidebar.tsx`, `Footer.tsx`, `PageLayout.tsx`, `BrandMark.tsx`. `components/ui/` stays reserved for shadcn primitives (Phase 4+ may populate). Rationale: at five files, a folder is overhead; future organization can group later. shadcn-generated primitives keep their default `components/ui/` placement when they appear.

### Claude's Discretion

The planner may pick defensible defaults for the following — surfacing them creates churn:

- **Exact lucide-react version** — install latest at execution time; pin in `pnpm-lock.yaml`.
- **`Sidebar` internal split** — single component with `hidden md:flex` / `md:hidden` branches OR two siblings (`<DesktopSidebar>` + `<MobileTabBar>`) the wrapper composes. Either is acceptable as long as `components/Sidebar.tsx` is the public entry point so LAYT-02 reads cleanly in PR.
- **Active-item match strategy** — exact for `/`, prefix-match (`pathname.startsWith(href)`) for all other routes. If the planner wants `===` everywhere, fine — Phase 7+ deep routes don't exist yet so no observable difference at Phase 3 ship time.
- **User avatar fallback content** — initials placeholder ("JR" in the reference) vs. `<User>` lucide icon when logged out. Planner picks; both are acceptable. No real auth in Phase 3 — the avatar can be a static SVG circle for now.
- **Mobile top-of-page header** — reference home has a small "BrandMark + bell" header above the hero on mobile. Phase 3 does not need to render this globally; if a page wants it, it can include `<Navbar variant="mobile" />` itself or render an inline header in its content. Layout wrapper does not force a mobile top bar.
- **Bell button behavior** — non-functional this milestone (no notifications system). Render the icon, no onClick wiring beyond what the planner deems harmless. Bell wiring is a deferred idea.
- **Footer link targets** — `About` / `Privacy` are no-op anchor stubs (`href="#"` + `aria-disabled` or a non-clickable span styled like a link). They are placeholders to occupy the footer surface, not real routes.
- **PageLayout prop shape** — recommended: `{ header?: ReactNode; children: ReactNode }`. Planner may add `footer?: ReactNode` if a screen needs to override the default footer (none currently does). Avoid adding `<Sidebar>` as a prop — sidebar is unconditional in the `(app)` wrapper.
- **Tokens demo route migration** — Phase 1's `/tokens` page is currently outside any route group. Phase 3 either (a) moves it into `(app)/tokens/page.tsx` so it gets the chrome, or (b) keeps it at `app/tokens/page.tsx` (no chrome — pure token gallery). Recommend (a) so the chrome is exercised by an existing page. Planner picks.
- **Whether `(app)/layout.tsx` itself is a Client Component** — should default to a Server Component. Sidebar (which needs `usePathname`) is the client surface. Navbar's user-state piece may need `"use client"` later; Phase 3's mock-auth Navbar can accept a `loggedIn` prop and stay server-renderable, deferring the client boundary.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Design Source of Truth (read line-by-line, do not paraphrase)
- `frontend/_design-reference/shared.jsx` §`DesktopRail` (lines 32–90) — left-rail anatomy: width, brand position, button sizing (44×44, `rounded-md`), active indicator (3 px accent bar at left edge, lines 69–72), hover behavior, avatar styling.
- `frontend/_design-reference/shared.jsx` §`MobileTabBar` (lines 93–138) — bottom tab anatomy: 5-column grid, primary central CTA (52×52 amber circle, lines 113–122), label sizing, blur background.
- `frontend/_design-reference/shared.jsx` §`BrandMark` (lines 4–29) — brand SVG geometry; Phase 3 re-authors fresh per CLAUDE.md rule 2.
- `frontend/_design-reference/home.jsx` §`HomeDesktop` lines 126–209 — desktop top-bar pattern (brand + greeting/auth), shows the `paddingLeft: 'var(--rail-w)'` content offset (line 133).
- `frontend/_design-reference/home.jsx` §`HomeMobile` lines 212–264 — mobile top-bar pattern, `paddingBottom: 'var(--tab-h)'` content offset (line 217).
- `frontend/_design-reference/detail.jsx` lines 141–161 — confirms detail screen renders rail/tab-bar but no top-bar (D-03 motivation).
- `frontend/_design-reference/auth.jsx` lines 1–35 — `AuthShell` anatomy: centered card, `footer` slot with disclaimer "Recommend·a is a fictional concept design." (line 86 is the literal disclaimer string).
- `frontend/_design-reference/styles.css` — token values (already mirrored in Phase 2; Phase 3 only consumes via Tailwind utilities).

### Project & Roadmap
- `.planning/PROJECT.md` — milestone scope, hard rules (theme vars only, no JSX imports from `_design-reference/`).
- `.planning/ROADMAP.md` §"Phase 3: Layout" — 4 success criteria, GitHub issue #92 mapping, note that `--rail-w` / `--tab-h` flow from Phase 2 tokens.
- `.planning/REQUIREMENTS.md` §"Layout (issue #92)" — LAYT-01..05 atomic requirements.
- `.planning/STATE.md` — Phase 02 closed, Phase 03 next.
- `CLAUDE.md` (root) — milestone hard rules, especially rule #2 (no JSX import from `_design-reference/`) and rule #5 (branching).

### Hard Author Rule (DSGN-06)
- `frontend/web/AGENTS.md` (loaded into Claude context via `frontend/web/CLAUDE.md`) — theme-vars-only rule. No hex/rgba in className, no `style={{ }}` for token properties (color, font-size, padding, margin, width, height, border-radius, box-shadow). The verification grep recipe is in AGENTS.md "How to verify before pushing" — Phase 3 PR review must run it.

### Prior-Phase Handoffs
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 D-01 (Tailwind v4 CSS-first), D-02 (`components/` empty until Phase 3 — Phase 3 is the first occupant), D-03 (existing `app/page.tsx` and `app/tokens/page.tsx` placeholders).
- `.planning/phases/01-foundation/01-04-SUMMARY.md` — final Phase 1 state.
- `.planning/phases/02-design-system/02-CONTEXT.md` — Phase 2 D-01..D-08 — esp. D-05 (`w-rail` / `h-tab` utilities exist via `--spacing-rail` / `--spacing-tab`) and D-07 (DSGN-06 author rule).
- `.planning/phases/02-design-system/02-03-SUMMARY.md` — final Phase 2 state, AGENTS.md location.
- `frontend/web/styles/globals.css` — `@theme` block to confirm utility names available (Phase 3 must not extend tokens; only consume).
- `frontend/web/app/layout.tsx` — root layout to extend (Phase 3 adds route-group layouts; the existing `<html>` + font-variable wiring stays untouched).
- `frontend/web/app/page.tsx` — Phase 1 root placeholder; Phase 3 may relocate into `(app)/page.tsx`.
- `frontend/web/app/tokens/page.tsx` — Phase 2 tokens gallery; Phase 3 may relocate into `(app)/tokens/page.tsx`.
- `frontend/web/components.json` — shadcn config (cn() ready); Phase 3 does not run shadcn add yet.
- `frontend/web/lib/utils.ts` — `cn()` helper.

### Next.js App Router Documentation
- `frontend/web/node_modules/next/dist/docs/` (per AGENTS.md "Read the relevant guide before writing code") — esp. App Router route groups (`(group)` syntax), nested layouts, `usePathname` hook, server vs client component boundary. Planner / executor must consult before authoring `(app)/layout.tsx` and `(auth)/layout.tsx`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`lib/utils.ts` `cn()`** — class-merging helper (clsx + tailwind-merge). Phase 3 components use `cn(...)` for conditional/active states (sidebar item highlight, etc.).
- **Tailwind utilities from Phase 2** — `bg-bg`, `bg-surface`, `bg-surface-elevated`, `border-border`, `border-border-strong`, `text-primary`, `text-secondary`, `text-muted`, `bg-accent`, `bg-accent-hover`, `bg-accent-soft`, `text-on-accent`, `font-display`, `font-body`, `text-12..text-64`, `rounded-sm/md/lg/xl`, `shadow-md`, `shadow-lg`, `w-rail`, `h-tab`. All Phase 3 visuals must be expressible as combinations of these — if a token is missing, the planner stops and surfaces it (do not author a new token in Phase 3 unless explicitly approved).
- **`--font-display` / `--font-body` CSS variables** on `<html>` from Phase 1 — reachable via Tailwind `font-display` / `font-body`.

### Established Patterns
- **CSS-first Tailwind v4** (no `tailwind.config.ts`) — additions to the `@theme` block, if they were ever needed, would go in `styles/globals.css`. Phase 3 should not need any.
- **Server Components by default** (Phase 1 PATTERNS.md Convention 4); only opt into `"use client"` when a hook (`usePathname`, `useState`, `useEffect`) requires it.
- **Internal navigation uses `next/link`** (Phase 1 D — required by `@next/next/no-html-link-for-pages` ESLint rule). Sidebar items must be `<Link>` not `<a>` or `<button>`.

### Integration Points
- **`app/layout.tsx`** (Phase 1) renders `<html>` + body + `{children}` with font variables. Route-group layouts (`(app)/layout.tsx`, `(auth)/layout.tsx`) nest under it. The root layout is NOT modified by Phase 3.
- **`app/page.tsx` and `app/tokens/page.tsx`** are Phase 1 / Phase 2 outputs. Phase 3 either leaves them at the root (no chrome) or relocates them into `app/(app)/` so they pick up the layout wrapper. Recommended: relocate so the wrapper is exercised on a real existing page before screen phases land.
- **`components/`** is empty (Phase 1 D-02). Phase 3 introduces the first 5 component files (D-10).

### Creative Options the Architecture Enables
- Tailwind v4 `[data-active=true]` selector pattern works in `@theme`-extended utilities — sidebar items can use `data-active` on the `<Link>` and a class like `data-[active=true]:bg-surface-elevated data-[active=true]:text-text-primary`, avoiding a `cn()` call. Either the data-attribute pattern or `cn()` is acceptable.
- Next.js parallel routes / intercepting routes are NOT used — overkill for this layout.
- React Server Components for the wrapper means no JS hydration cost for the chrome shell on screens that don't have client-only sub-components beyond the Sidebar's `usePathname` consumer.

</code_context>

<specifics>
## Specific Ideas

- **Reference disclaimer string** is the literal `Recommend·a is a fictional concept design.` (`auth.jsx:86`) — uses a middot (`·`) between "Recommend" and "a", not a hyphen. Footer must use the middot character verbatim. The brand mark also uses the middot in the spelled-out wordmark (`shared.jsx:25`).
- **Active sidebar indicator** is a 3 px-wide vertical amber bar at the left edge of the active button (`shared.jsx:69-72`: `position: 'absolute', left: -10, top: 8, bottom: 8, width: 3, background: 'var(--color-accent)'`). The `-10 px` left offset positions it outside the rail's inner padding — Phase 3 must replicate visually using `bg-accent` + Tailwind positioning utilities.
- **Mobile primary CTA shadow** is a glow: `boxShadow: '0 6px 18px rgba(245,181,68,.35)'` (`shared.jsx:118`). This is NOT a tokenized shadow (Phase 2 only ships `--shadow-md`/`--shadow-lg`). Either (a) the planner promotes this to a `--shadow-cta-glow` token in Phase 3 (would extend Phase 2's surface — request approval first), or (b) uses Tailwind's arbitrary-value syntax `shadow-[0_6px_18px_rgba(245,181,68,0.35)]`, which is the cleanest escape hatch since the value is a one-off. Recommended: option (b), one inline arbitrary value, document why in the Sidebar component file.
- **Backdrop blur on rail/tab-bar** — reference uses `backdropFilter: 'blur(12px)'` (rail) and `'blur(14px)'` (tab bar). Tailwind utilities `backdrop-blur-md` / `backdrop-blur-lg` are close (12 px / 16 px); use them rather than authoring exact-px arbitrary values. Acceptable approximation.
- **Rail background** is `rgba(8,8,9,.7)` (`shared.jsx:44`) — slightly darker than the page bg `#0a0a0b`. Phase 2 does NOT have a token for this exact value. Use `bg-bg/80` or similar Tailwind opacity utility on top of `bg-bg`, OR ship the `--color-rail-bg` token. Recommended: `bg-bg/70` is closest without extending tokens.

</specifics>

<deferred>
## Deferred Ideas

- **Bell / notifications system** — bell icon renders in the Navbar variant for logged-in state, but with no functionality. Real notifications are post-v1.
- **About / Privacy real pages** — Footer link stubs are no-op placeholders this milestone. Real legal pages are post-v1.
- **Tablet (~768) icon-only sidebar tier** — rejected for Phase 3 (D-05). If product later wants a labeled-sidebar/icon-sidebar/no-sidebar three-tier behavior, that's its own ticket.
- **Hamburger drawer at mobile** — rejected for Phase 3 (D-01). Reference mobile pattern is the bottom tab bar.
- **Search route / Upcoming / Series / Films** — reference rail had these as placeholders; Phase 3 trims to real app routes (D-02). If product adds a Search screen later, the sidebar grows by one slot.
- **Light theme** — out of milestone (Phase 2 deferred).
- **Motion / transition tokens** — out of milestone (Phase 2 deferred). Sidebar hover transitions in Phase 3 use one-off durations inline (`transition-colors`), promoted to tokens only if duplicated 3+ times across screen phases.
- **Token: `--shadow-cta-glow` for the mobile primary CTA glow** — using Tailwind arbitrary value as the workaround (D-spec note). Promote to a token if the same glow appears on Phase 6 hero CTA.
- **Token: `--color-rail-bg` for the slightly-darker rail background `rgba(8,8,9,.7)`** — using `bg-bg/70` opacity approximation. Promote if the rendered output drifts visibly against reference at PR review.
- **Real auth state in Navbar** — Phase 3 ships Navbar with a `loggedIn: boolean` prop (mock); Phase 5 swaps the prop for `useAuth()` context. Caller currently passes the boolean; downstream replacement is a one-import change.
- **`RequireAuth` wrapper around `(app)` group's protected routes** — Phase 5 concern, not Phase 3. Phase 3's `(app)/layout.tsx` does NOT redirect — it just renders chrome.

</deferred>

---

*Phase: 03-layout*
*Context gathered: 2026-05-05*
