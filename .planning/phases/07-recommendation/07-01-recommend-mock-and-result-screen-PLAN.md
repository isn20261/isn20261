---
phase: 07
plan: 01
type: execute
depends_on: []
files_modified:
  - frontend/web/lib/api/recommend.ts                                # NEW mock seam + dataset
  - frontend/web/components/MovieCard.tsx                            # NEW reusable card
  - frontend/web/components/ServiceBadge.tsx                         # NEW where-to-watch tile
  - frontend/web/app/(app)/recommendation/page.tsx                   # replace stub with full screen
autonomous: true
requirements: [RECO-01, RECO-02, RECO-03, RECO-04]
---

<objective>
Replace the Phase 6 `/recommendation` stub with the design-faithful result screen. Render a poster backdrop, eyebrow ("✦ We think you'll like this one"), title, metadata strip (match%, year, rating, runtime, genres), synopsis, action buttons (Watch on {service}, Save, Recommend another), where-to-watch service tiles, cast/director, and a "Similar films" rail using a reusable MovieCard primitive. All data sourced from a mocked `lib/api/recommend.ts` module shaped like a future Cognito-backed Lambda response (so v2 INTG-02 swap is one provider replacement).

Responsive at 3 breakpoints — backdrop tall on mobile (~360px), short on desktop (~560px); content padding scales; metadata wraps; similar rail horizontal-scrolls on all sizes.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md  §"Phase 7"
@.planning/codebase/ARCHITECTURE.md  §"cross-Lambda imports" (anti-pattern — recommend module stays self-contained)
@frontend/_design-reference/detail.jsx
@frontend/_design-reference/data.jsx
@frontend/_design-reference/shared.jsx  §"MovieCard"
@frontend/web/app/(app)/recommendation/page.tsx
@frontend/web/components/PageLayout.tsx
</context>

<tasks>

<task name="1: Mock recommend module + dataset">
Create `frontend/web/lib/api/recommend.ts`. Self-contained — does NOT import from `@/lib/api/auth`. Mirrors what a future `recommend` Lambda response would shape like (RECO-04).

Exports:
- `Movie` type (id, title, year, runtime, rating, match, genres[], director, cast[], synopsis, services[], posterSeed, backdropSeed, mood[]).
- `Service` type (`{ name: string; kind: "included" | "rent" | "buy" }`).
- `MOVIES`: a frozen array of 12 mocked movies copied from `_design-reference/data.jsx:4-214`.
- `posterUrl(movie, w, h)` and `backdropUrl(movie, w, h)` helpers using the same picsum seeds from the reference (`https://picsum.photos/seed/ra-p-{posterSeed}/{w}/{h}` and `ra-b-{backdropSeed}`).
- `getRecommendation()`: returns a random movie from MOVIES — async, ~250ms simulated latency (mirrors mock auth seam pattern). This is the function callers use.
- `getSimilar(movie)`: returns up to 6 movies excluding the input one (synchronous helper).
- `STREAMING_SERVICES` and `MOODS` arrays (copy from reference data.jsx) — exported so future filter UIs (deferred from Phase 6) can reuse.

Plain TS — no React, no localStorage. Pure data + helper functions. No hex literals (data fields don't carry colors).
</task>

<task name="2: MovieCard primitive">
Create `frontend/web/components/MovieCard.tsx`. Client Component (uses hover state).

Props:
- `movie: Movie` (required)
- `width?: number` (default 168), `height?: number` (default 252) — pass-through size primitives
- `onClick?: () => void` — optional, makes card a button-like

Behavior:
- Renders a card with the poster image (next/image or `<img>` w/ eslint-disable, same picsum-via-`posterUrl` source).
- Bottom 50% has a black-to-transparent gradient overlay for legibility.
- Hover: card lifts (translate-y -3px) and shadow deepens — Tailwind transition.
- Below the card (within the same wrapper), a 2-line metadata strip: title (text-14 font-medium) + meta (text-12 text-text-muted: year + match%).
- The hover-action overlay from the reference (`shared.jsx:190-200`) — defer; out of scope for this plan, just the static card with hover lift.

Responsive: width prop is the responsibility of callers; the card itself doesn't break — fluid on flex children. Width via inline `style` is forbidden; instead use Tailwind arbitrary `w-[Npx]` derived from a passed prop. Or just hardcode the sizes used in this plan and lift the prop later.

DSGN-06 escape hatches expected:
- `w-[168px]`, `w-[160px]`, `h-[240px]`, etc. — card size primitives, document inline.
- Bottom gradient overlay: `bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,transparent_50%)]` — inline rgba justifications.
</task>

<task name="3: ServiceBadge primitive">
Create `frontend/web/components/ServiceBadge.tsx`. Server Component (pure JSX, no hooks).

Renders the where-to-watch tile from `detail.jsx:3-24`:
- Outer: 8px×12px padding, `rounded-md`, `bg-surface border border-border`.
- 32×32 left square: `rounded-md bg-surface-2`, font-display, font-extrabold text-12 text-text-primary, centered initial of service name.
- Right column: name (text-13 font-semibold) + kind label (text-10 uppercase tracking-[0.06em], color-coded: success for included, text-muted otherwise).

Props: `{ service: Service }`. No interaction.
</task>

<task name="4: /recommendation page composition">
Replace `frontend/web/app/(app)/recommendation/page.tsx` entirely. Must be a Client Component (uses `useState` for the picked movie + saved toggle, `getRecommendation()` on mount + on "Recommend another").

Composition (top to bottom):
1. **Backdrop layer** (absolute, top-0, full-width, h-[360px] mobile / h-[560px] md+): `<img src={backdropUrl(movie, 1800, 1000)} />` covering the area, with two stacked linear-gradient overlays for legibility (top-down + left-right):
   - `linear-gradient(to_bottom, rgba(10,10,11,0.3)_0%, rgba(10,10,11,0.1)_30%, rgba(10,10,11,0.7)_70%, var(--color-bg)_100%)`
   - `linear-gradient(to_right, rgba(10,10,11,0.85)_0%, rgba(10,10,11,0.2)_60%)`
2. **Header column** (relative, padded: pt-[220px] mobile / pt-[280px] md+, px-6 mobile / px-14 md+, max-w-[880px]):
   - Eyebrow `✦  We think you'll like this one` (text-accent, eyebrow recipe)
   - Title (font-display text-40 md:text-64 font-extrabold tracking-[-0.03em] leading-[0.98])
   - Metadata strip (flex flex-wrap gap-[14px] mt-4, text-13 text-text-secondary):
     - Match% (text-accent text-14)
     - Year
     - Rating in a small bordered box (border-border-strong rounded-sm px-1.5 py-0.5 text-11 font-semibold)
     - Runtime
     - Genres joined by ` · ` (text-text-muted)
   - Synopsis (mt-6, text-15 md:text-[17px] leading-[1.55] text-text-primary, max-w-[640px])
   - Actions row (flex flex-wrap gap-2.5 mb-8):
     - **Primary**: `Watch on {movie.services[0].name}` with Play icon (h-12, bg-accent, text-on-accent)
     - **Secondary**: `Save to watch later` / `Saved` toggle with Bookmark icon (h-12, bg-surface-2 border border-border)
     - **Ghost**: `Recommend another` with RefreshCw icon (h-12, transparent + border)
   - Where-to-watch row: eyebrow `Where to watch` + flex-wrap of `<ServiceBadge>` tiles
3. **Cast/Director grid** (px-6 md:px-14 mb-9 max-w-[880px], grid-cols-1 md:grid-cols-[160px_1fr] gap-6):
   - Director: eyebrow + name (text-14 font-semibold)
   - Cast: eyebrow + names joined by ` · ` (text-14 text-text-secondary leading-[1.6])
4. **Similar films rail** (px-6 md:px-14 pb-14):
   - Heading "Similar films" (font-display text-20 font-bold)
   - `flex gap-3 overflow-x-auto no-scrollbar` of `<MovieCard movie={m} width={150} height={224}>` for `getSimilar(movie)`

Behavior:
- On mount: call `getRecommendation()`, set state with the result. Show a skeleton (h-[560px] bg-surface-2 animate-pulse) while loading.
- "Recommend another" button: re-runs `getRecommendation()`, replaces state.
- "Save to watch later" / "Saved": pure local toggle state — Phase 10 wires the actual list.

Eyebrow class — define once locally (or as a small inline helper):
`text-12 font-medium tracking-[0.18em] uppercase text-text-muted`

`no-scrollbar` utility: needed for the rail. Add a one-line `.no-scrollbar { scrollbar-width: none; }` in `styles/globals.css` if missing — or use Tailwind v4 arbitrary `[scrollbar-width:none]`. Cheaper inline.

DSGN-06 escape hatches expected (each gets a `// non-tokenized` comment):
- Backdrop heights: `h-[360px]`, `md:h-[560px]`
- Header padding-top: `pt-[220px]`, `md:pt-[280px]`
- Container width: `max-w-[880px]`, `max-w-[640px]`
- The two linear-gradient backdrop overlays
- Title leading: `leading-[0.98]`
- Body text-[17px] (already in the Phase 6 escape-hatch list)
- Eyebrow tracking-[0.18em] (already)
- ServiceBadge tile sizes: 32×32, etc.
- MovieCard sizes
- Bordered rating chip: `text-11`, `px-1.5 py-0.5`
</task>

</tasks>

<verification>
After all tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` exit 0
- The `/recommendation` route is in the static prerender list
- Manual smoke (boot `pnpm dev`):
  1. **RECO-01**: visit `/recommendation` (signed-in or out) → see a random movie's backdrop, title, year, rating, runtime, genres, match%, synopsis, action buttons, where-to-watch tiles, cast/director, similar-films rail
  2. **RECO-02**: at 375 / 768 / 1440 — backdrop height steps up, content padding scales, metadata strip wraps without overflow, similar-films rail horizontal-scrolls
  3. **RECO-03**: `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'app/(app)/recommendation/' 'components/MovieCard.tsx' 'components/ServiceBadge.tsx' 'lib/api/recommend.ts'` returns 0 hits
  4. **RECO-04**: `lib/api/recommend.ts` exports `Movie` type with the fields a future Lambda response would carry; `getRecommendation()` is the single async entry point that v2 swaps to a real `fetch('/api/recommend')` call
  5. Click "Recommend another" → page re-renders with a different movie (1-in-12 chance of repeating, fine)
  6. Click "Save to watch later" → label flips to "Saved"; click again → flips back
</verification>

<scope-cuts>
- **Hover action overlay** on MovieCard (`shared.jsx:190-200` showing inline play / save buttons on poster hover) — defer to Phase 10 or post-milestone polish.
- **Persistence of "Saved"** — Phase 10 introduces the watch-later list and wires this button into it. This phase: pure local toggle.
- **Real similar-films logic** — `getSimilar()` returns the next 6 movies in the array; not actual genre-matching. Mocks just need to look populated.
- **FilterBar carry-over** from Phase 6 — still deferred. The mood/service chips have a real role on the recommendation FLOW (input filters before pick), not the result page. Phase 8 or post-milestone.
</scope-cuts>

<success_criteria>
1. /recommendation renders a full design-faithful result screen with mocked data.
2. Clicking "Recommend another" rolls a new random movie.
3. The recommend module shape lets a future Lambda swap be one-provider.
4. Theme tokens only — no hex literals, no inline `style={`.
5. tsc / lint / build green.
6. Responsive at 3 breakpoints.
</success_criteria>
