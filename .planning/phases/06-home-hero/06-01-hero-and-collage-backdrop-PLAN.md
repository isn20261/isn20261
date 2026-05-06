---
phase: 06
plan: 01
type: execute
depends_on: []
files_modified:
  - frontend/web/components/HomeBackdrop.tsx                # NEW
  - frontend/web/components/HeroCTA.tsx                     # NEW
  - frontend/web/app/(app)/page.tsx                         # replace placeholder with hero
  - frontend/web/app/(app)/recommendation/page.tsx          # NEW stub so CTA link resolves
autonomous: true
requirements: [HOME-01, HOME-02, HOME-03, HOME-04, HOME-05]
---

<objective>
Ship the design-faithful home/hero screen at `/` using the **collage** backdrop variant. The hero is the same for logged-in and logged-out users; the CTA below the hero forks (signup nudge for logged-out, plain spacing for logged-in this phase). The CTA navigates to `/recommendation`, which lands at a stub Server Component so the link resolves until Phase 7 fills it in.

Responsive at 3 breakpoints: ~375px (mobile, single-column, full-width CTA), ~768px (tablet, same as mobile up to lg), 1440px (desktop, max-width container, taller hero block).
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md  §"Phase 6"
@frontend/_design-reference/home.jsx
@frontend/web/app/(app)/layout.tsx
@frontend/web/app/(app)/page.tsx
@frontend/web/components/Navbar.tsx
@frontend/web/components/PageLayout.tsx
@frontend/web/lib/auth/AuthContext.tsx
</context>

<scope-cuts>
The reference home (`frontend/_design-reference/home.jsx`) includes two below-the-hero features that this plan **deliberately defers**:

1. **FilterBar** — mood chips + streaming-service chips below the CTA (`home.jsx:75-107`). Doesn't affect the recommendation flow this milestone (no actual filtering logic exists). Defer to Phase 7 where it has a real role on the recommendation result.
2. **MovieRail** for logged-in (`home.jsx:181-183`) — "Continue from your watch later" + "Recently recommended". Both depend on a `MovieCard` primitive and a mock dataset that Phase 7 (RecoResult) will introduce naturally; absorbing them here would balloon scope. Phase 7 will round-trip and add the rails to the logged-in home as a small follow-up.

If the reviewer pushes back on these cuts, they ship as Plan 06-02.
</scope-cuts>

<tasks>

<task name="1: /recommendation stub page">
Create `frontend/web/app/(app)/recommendation/page.tsx` as a Server Component placeholder so the home CTA's link resolves. Mirror the `/preferences` Phase 5 stub style — minimal heading + a one-line note that Phase 7 fills it in.

```tsx
export default function RecommendationPage() {
  return (
    <div className="p-10">
      <h1 className="font-display text-28 font-semibold text-text-primary">Recommendation</h1>
      <p className="text-text-secondary text-14 mt-2">Phase 7 (RECO-01..04) will fill this page.</p>
    </div>
  );
}
```

Public route — does NOT live inside `(protected)`. The recommendation flow is intentionally usable by signed-out users.
</task>

<task name="2: HomeBackdrop (collage variant)">
Create `frontend/web/components/HomeBackdrop.tsx`. Client Component (uses `next/image`).

Requirements:
- Absolute-positioned backdrop, `inset: 0`, behind the hero content (`z-0`).
- Renders 8 movie posters in a 4-column grid (2 rows of 4), `gap-2`, with the grid extended `-inset-[8%]` so posters bleed past the viewport edge.
- Posters are blurred (`blur-3xl`) and slightly saturated (`saturate-110`) at `opacity-55`.
- A radial-gradient overlay layer on top: dark center (~55%), darker mid (~92%), pure bg at edges. This is the vignette that pulls focus to the hero.
- Use `next/image` with `unoptimized` (since the source URLs are placeholder service) OR plain `<img>` with `loading="lazy"`. Both fine — pick whichever is cleanest with the lint config.
- Use `picsum.photos` seeded URLs for posters: `https://picsum.photos/seed/recommend-a-1/320/460` through `…recommend-a-8/320/460`. Cheap, no auth, deterministic per seed, dark-feel works under blur.

DSGN-06 escape hatches expected:
- The radial gradient: pre-existing accent colors aren't expressive enough for the multi-stop radial. Use Tailwind v4 arbitrary value: `bg-[radial-gradient(ellipse_90%_80%_at_50%_40%,rgba(10,10,11,0.55)_0%,rgba(10,10,11,0.92)_70%,var(--color-bg)_100%)]`. The `var(--color-bg)` reference is acceptable per AGENTS.md (it's the CSS variable, not a hex literal in the className). The `rgba(10,10,11,…)` literals ARE the bg-color expressed at different opacities — these need a `// non-tokenized:` comment, since we don't have a `--color-bg-vignette` token. Document them as the third Phase-6-introduced escape hatch.
- Optional: film grain overlay. Skip it this phase — it's a `<div className="grain">` in the reference but we don't have that utility class yet, and adding it would push us into a token authoring conversation. Add to Phase 6.5 if reviewer asks.
</task>

<task name="3: HeroCTA component">
Create `frontend/web/components/HeroCTA.tsx`. Client Component.

```tsx
"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function HeroCTA() {
  return (
    <Link
      href="/recommendation"
      className="inline-flex items-center justify-center gap-2 min-w-[280px] md:min-w-[320px] h-[60px] md:h-[76px] px-8 rounded-md bg-accent hover:bg-accent-hover text-on-accent font-display font-semibold text-16 md:text-[17px] tracking-[-0.01em] shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_18px_48px_rgba(245,181,68,0.35),0_4px_14px_rgba(245,181,68,0.4)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      <Sparkles size={20} />
      Pick a movie for me
    </Link>
  );
}
```

Notes on escape hatches (DSGN-06 — each gets a `// non-tokenized:` comment in the file):
- `min-w-[280px]` / `min-w-[320px]` — primary CTA width primitives, not in spacing scale
- `h-[60px]` / `h-[76px]` — primary CTA height primitives (above the existing `h-14` = 56px). Reference uses 76px desktop, 60px mobile.
- `text-[17px]` — between Phase 2 type-scale steps (16 / 20). Reference: `home.jsx:66`.
- The `shadow-[…]` chain — three composed shadows for the amber CTA glow + inset highlight. Pre-Phase-2 this was three escape hatches; consolidate into one arbitrary-value shadow per Phase 2 token-authoring rule.
</task>

<task name="4: Compose hero into /page.tsx">
Replace `frontend/web/app/(app)/page.tsx` entirely. Must be a Client Component (uses `useAuth()` to fork the post-hero block AND uses HomeBackdrop / HeroCTA which are Client).

Layout (single render tree, responsive across breakpoints — no separate desktop/mobile components, just Tailwind responsive utilities):

```
<section relative w-full min-h-screen overflow-hidden>
  <HomeBackdrop />               <!-- absolute, behind everything -->
  <Navbar variant="home" />      <!-- relative, z-10 -->  (Phase 3 chrome opt-in)
  <main relative z-10 flex flex-col items-center text-center px-6 md:px-10 pt-10 md:pt-20 pb-16 gap-7>
    <p eyebrow>Tonight, on the couch</p>
    <h1 display-lg max-w-[880px]>
      One button. <span text-accent>One movie</span>.<br />
      Decided.
    </h1>
    <p body-lg max-w-[560px]>
      Stop scrolling for forty minutes. We'll pick something good for you in three seconds.
    </p>
    <HeroCTA />
  </main>
  {!isAuthenticated && <SignupNudge />}    <!-- below hero, padded, max-w-container -->
</section>
```

`SignupNudge` is a small inline component (no separate file) for the bottom card on the logged-out branch:
- Bordered card, rounded-2xl, `bg-[linear-gradient(135deg,rgba(245,181,68,0.06),rgba(255,255,255,0.02))]` (escape hatch — document)
- Title `Save what catches your eye.` (font-display, font-bold, text-20)
- Body `Sign up and we'll remember every recommendation, build a watch later queue, and learn what you actually love.` (text-text-secondary, text-14)
- Two CTAs at right: `Sign in` (ghost link to /login) and `Create account` (primary link to /register)
- At mobile, stacks vertically; at md+, horizontal split

Eyebrow class — define inline:
- `text-12 font-medium tracking-[0.18em] uppercase text-text-muted` (escape hatch: tracking-[0.18em] for letter-spacing widget, log it)

Display heading:
- `font-display text-40 md:text-64 font-extrabold tracking-[-0.03em] leading-[1.05] md:leading-[1.02]` — sizes from Phase 2 scale, the leading is an escape hatch (document)

Body lg:
- `text-text-secondary text-14 md:text-[17px] leading-[1.5]` — text-[17px] is the escape hatch (already noted in HeroCTA task)

The `<Navbar variant="home" />` opt-in is Phase 3's contract — the (app) layout doesn't render Navbar globally, pages opt in. Mobile renders the `mobile` variant: per `home.jsx:215-225` mobile uses just BrandMark + Bell. We'll handle this with Tailwind: render `<Navbar variant="home" />` at md+ and `<Navbar variant="mobile" />` below md, OR (cleaner) extend Navbar to be responsive internally. For lean: render both with `hidden md:flex` and `flex md:hidden` wrappers. (Or accept that Phase 3's `variant` prop needs a "responsive" mode — defer that refactor.)

For SIMPLICITY: just render `<Navbar variant="home" />` always. Phase 3's home variant works at all breakpoints — the chrome already collapses correctly via the existing layout.
</task>

</tasks>

<verification>
After all tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` exit 0
- The new route list shows: `/`, `/forgot`, `/login`, `/preferences` (protected), `/recommendation`, `/register`, `/tokens`, `/_not-found`
- Manual smoke (boot `pnpm dev`):
  1. **HOME-01**: visit `/` while logged-out → see eyebrow, display heading, body, primary CTA, signup nudge card; backdrop is the blurred poster collage
  2. **HOME-02**: same at 375 / 768 / 1440 — heading size step-up at md+, CTA full-width on mobile, no horizontal scroll
  3. **HOME-03**: click "Pick a movie for me" → URL goes to `/recommendation`, stub renders
  4. **HOME-04**: visit `/` while logged-in → hero renders the same; signup nudge does NOT render; chrome greeting in Navbar reflects the email-prefix
  5. **HOME-05**: `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'app/(app)/page.tsx' 'components/HomeBackdrop.tsx' 'components/HeroCTA.tsx'` returns 0 hits — no hex literals in any new home file
</verification>

<success_criteria>
1. `/` renders the collage-backdrop hero at all 3 breakpoints, matching the reference composition.
2. CTA navigates to `/recommendation` (stub renders).
3. Logged-out visitors see the signup nudge below the hero; logged-in visitors do not.
4. No hex literals or inline `style={` props in new home files (DSGN-06).
5. tsc / lint / build green.
</success_criteria>
