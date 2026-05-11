---
phase: 08
plan: 01
type: execute
depends_on: []
files_modified:
  - frontend/web/lib/api/recommend.ts                                    # add RATINGS export
  - frontend/web/components/Chip.tsx                                     # NEW generic toggle chip
  - frontend/web/components/SectionCard.tsx                              # NEW titled card with helper
  - frontend/web/app/(app)/(protected)/preferences/page.tsx              # replace Phase 5 stub with full screen
autonomous: true
requirements: [PREF-01, PREF-02, PREF-03, PREF-04, PREF-05]
---

<objective>
Replace the Phase 5 `/preferences` stub with the design-faithful preferences screen. Four titled cards: Streaming services (chips), Default mood (chips), Maximum age rating (chips), Account (email + password + sign-out rows). Lives inside `(app)/(protected)/` so the Phase 5 RequireAuth gate already covers PREF-02.

Per ROADMAP §"Phase 8 Notes": **read-only display this milestone — toggling chips updates local React state for visual feedback only, no persistence.** v2 (INTG-02) wires real Cognito user attributes via the seam.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md  §"Phase 8"
@.planning/codebase/ARCHITECTURE.md  §"preferences shape divergence" (genres / subscriptions / ageRating / humor)
@frontend/_design-reference/preferences.jsx
@frontend/_design-reference/data.jsx  §RATINGS
@frontend/web/lib/api/recommend.ts
@frontend/web/lib/auth/AuthContext.tsx
@frontend/web/app/(app)/(protected)/preferences/page.tsx
</context>

<tasks>

<task name="1: Add RATINGS to recommend module">
Edit `frontend/web/lib/api/recommend.ts`. Add after the MOODS export:

```ts
export const RATINGS = ["G", "PG", "PG-13", "R", "NC-17"] as const;
export type Rating = (typeof RATINGS)[number];
```

That's it — single addition, mirrors the reference `data.jsx:240`. Future filter UIs and the recommendation flow can both consume.
</task>

<task name="2: Generic Chip primitive">
Create `frontend/web/components/Chip.tsx`. Client Component (interactive — pressable buttons).

Props:
- `active?: boolean` (default false)
- `onClick?: () => void`
- `children: React.ReactNode`
- `aria-pressed` automatic from `active`

Visual:
- Inactive: `bg-surface border border-border text-text-secondary hover:border-border-strong hover:text-text-primary`
- Active: `bg-accent-soft border border-accent text-text-primary`
- Common: `inline-flex items-center gap-2 px-3 h-9 rounded-md text-13 font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`

Reusable for ServiceChip, MoodChip, RatingChip — they're all the same chip with different children. The page will compose them.

No DSGN-06 violations — pure tokens.
</task>

<task name="3: SectionCard primitive">
Create `frontend/web/components/SectionCard.tsx`. Server Component.

```tsx
type SectionCardProps = {
  title: string;
  helper?: string;
  children: React.ReactNode;
};
```

Visual: `bg-surface border border-border rounded-xl p-6` (24px padding from reference).
- Title: `font-display font-bold text-[17px] text-text-primary` (text-[17px] is the existing Phase 6+ escape hatch)
- Helper (if present): `text-13 text-text-secondary mt-1.5 mb-4`
- Children container: `mt-3.5` (no helper) or unset (with helper — already spaced)

DSGN-06 escape hatches:
- `text-[17px]` for title (already on the documented list)
</task>

<task name="4: /preferences full screen">
Replace `frontend/web/app/(app)/(protected)/preferences/page.tsx` entirely. Client Component (uses local state for chip toggles + `useAuth` for email/signOut).

Structure:
```
<div max-w-[880px] mx-auto px-6 md:px-10 py-10 md:py-14>
  <p eyebrow>Account</p>
  <h1 display>Preferences</h1>
  <p subhead>Tune the recommendations. Changes save automatically.</p>

  <div flex flex-col gap-4 mt-8>
    <SectionCard title="Streaming services" helper="Only suggest things on services you actually have.">
      <div flex flex-wrap gap-2.5>
        {STREAMING_SERVICES.map → <Chip active onClick toggle>...</Chip>}
      </div>
    </SectionCard>

    <SectionCard title="Default mood" helper="What you usually want. You can override per recommendation.">
      <div flex flex-wrap gap-2>
        {MOODS.map → <Chip>{m.icon} {m.label}</Chip>}
      </div>
    </SectionCard>

    <SectionCard title="Maximum age rating" helper="We won't go beyond this.">
      <div flex flex-wrap gap-2>
        {RATINGS.map → <Chip active={r === rating} onClick={() => setRating(r)}>{r}</Chip>}
      </div>
    </SectionCard>

    <SectionCard title="Account">
      {/* Three rows separated by border-b border-border */}
      Email row:    label "Email" + email value + helper "Email changes require…" + Change button (right)
      Password row: label "Password" + "Last changed N months ago" + Change button (right)
      Sign out row: label "Sign out" + "You'll need to sign back in to see your queue." + Sign out button (right, danger style)
    </SectionCard>
  </div>
</div>
```

Defaults (matching reference):
- services: `["netflix", "prime", "mubi"]`
- moods: `["thoughtful", "chill"]`
- rating: `"R"`

Sign out:
- Calls `useAuth().signOut()` then `router.push("/login")`
- Button visual: `text-danger border-danger/40 hover:bg-danger/10`

Email row:
- Email value: `useAuth().user?.email ?? "demo@example.com"` (the latter is just a fallback, but RequireAuth means user is always present)

Change buttons: visual only — `disabled` or no-op handler. Real flows are out of scope.

DSGN-06 escape hatches (each with `// non-tokenized` comment):
- Title size if not on Phase 2 scale (use `text-[36px]` per reference, between 28 and 40 — note inline)
- Eyebrow recipe (already documented)
- max-w-[880px] (already documented)
</task>

</tasks>

<verification>
After all tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` exit 0
- `/preferences` route still in static prerender list
- Manual smoke (boot `pnpm dev`):
  1. **PREF-02**: visit `/preferences` while signed-out → redirected to `/login?from=%2Fpreferences` (Phase 5 RequireAuth gate)
  2. **PREF-01**: sign in, then `/preferences` → see eyebrow "Account", title "Preferences", subhead, four titled cards with chips and account rows
  3. **PREF-03**: at 375 / 768 / 1440 — content column max-w-880 centers, padding scales, chips wrap, no horizontal scroll
  4. **PREF-04**: theme tokens only — `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'app/(app)/(protected)/preferences/' 'components/Chip.tsx' 'components/SectionCard.tsx'` returns 0 hits
  5. **PREF-05**: defaults render selected (services Netflix/Prime/Mubi highlighted, moods Thoughtful/Chill highlighted, rating R highlighted)
  6. Click a chip → visual toggle (no persistence; navigate away + back resets to defaults)
  7. Click Sign out → redirects to /login, AccountMenu state cleared
  8. Email value reflects the signed-in user's email-prefix (full email shown in the row)
</verification>

<scope-cuts>
- **Persistence** of chip selections — explicitly out of scope per ROADMAP. The seam swap to Cognito user attributes is a v2 concern.
- **Change Email / Change Password buttons** — visual only, no flow. The reference shows them but doesn't define their interaction.
- **Genres / Humor sections** — ARCHITECTURE.md mentions these as backend-implementation fields but the design reference's `preferences.jsx` shows mood chips (which map to "humor" loosely) and doesn't show a genres section. Match the design, not the backend schema, this milestone.
</scope-cuts>

<success_criteria>
1. /preferences renders the design-faithful screen with all four cards.
2. Unauth visitors get redirected (Phase 5 gate validated on a real screen).
3. Sign out from inside the page works and clears the session.
4. Theme tokens only.
5. tsc / lint / build green.
</success_criteria>
