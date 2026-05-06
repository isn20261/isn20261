---
phase: 09
plan: 01
type: execute
depends_on: []
files_modified:
  - frontend/web/lib/api/history.ts                                       # NEW mock seam
  - frontend/web/components/HistoryRow.tsx                                # NEW row primitive
  - frontend/web/components/EmptyState.tsx                                # NEW shared (Phase 10 reuses)
  - frontend/web/app/(app)/(protected)/history/page.tsx                   # NEW screen
autonomous: true
requirements: [HIST-01, HIST-02, HIST-03, HIST-04, HIST-05]
---

<objective>
Ship the History screen at `/history` (inside `(app)/(protected)/`). Lists past recommendations grouped by time period (Today / Yesterday / Last week / Earlier). Each row shows poster thumb (60×90), title, when + mood + match%, and three actions (View, Bookmark, Delete). Mock seam (`lib/api/history.ts`) is shaped like a future Lambda response so v2 swap is one provider replacement.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md  §"Phase 9"
@frontend/_design-reference/history-queue.jsx
@frontend/web/lib/api/recommend.ts
@frontend/web/app/(app)/(protected)/preferences/page.tsx
</context>

<tasks>

<task name="1: Mock history module">
Create `frontend/web/lib/api/history.ts`. Self-contained — does NOT import from auth. Imports `MOVIES`, `Movie` from `@/lib/api/recommend`.

Exports:
- `HistoryEntry` type:
  ```ts
  type HistoryEntry = {
    id: string;          // unique entry ID (e.g. `${movieId}-${timestamp}`)
    movie: Movie;        // denormalized for display; v2 backend may join
    when: string;        // pre-formatted display label (e.g. "2h ago")
    mood: string;        // mood active when recommended
  };
  ```
- `HistoryGroup` type:
  ```ts
  type HistoryGroup = { label: string; entries: readonly HistoryEntry[] };
  ```
- `getHistory()`: async (~250ms latency), returns `readonly HistoryGroup[]`. 4 groups (Today / Yesterday / Last week / Earlier). 10 entries total. Uses `MOVIES.slice(...)` to seed. The display labels (when, mood) match the reference verbatim.

Pure data + helpers. No localStorage. v2 swap point: replace getHistory with a real fetch.
</task>

<task name="2: HistoryRow primitive">
Create `frontend/web/components/HistoryRow.tsx`. Client Component (uses local hover/state for delete).

Props:
- `entry: HistoryEntry`
- `onDelete?: (id: string) => void` — optional; called on delete click
- `onView?: () => void` — optional; called on poster/View click (defaults to navigate to /recommendation)

Visual (from reference `history-queue.jsx:33-63`):
- Outer: `flex items-center gap-4 p-3.5 rounded-xl bg-surface border border-border hover:border-border-strong transition-colors duration-150`
- Poster: `w-15 h-[90px] rounded-md object-cover shrink-0 cursor-pointer` (60×90)
- Middle column: `flex-1 min-w-0`
  - Title: `text-15 font-semibold text-text-primary mb-1 truncate`
  - Meta row: `text-12 text-text-muted flex flex-wrap gap-2.5 items-center`
    - Clock icon + when
    - 2px dot separator
    - "Mood: {mood}"
    - 2px dot separator
    - Match%: `text-accent text-12`
- Actions cluster: `flex gap-1.5 shrink-0`
  - View: text button (ghost)
  - Bookmark: 32×32 icon button (secondary)
  - Trash: 32×32 icon button (ghost, text-text-muted)

DSGN-06 escape hatches expected:
- `w-15 h-[90px]` poster thumb size (60×90 is below the spacing scale's standard step 16/20/24)
- 2×2px dot separators (`w-0.5 h-0.5 rounded-full bg-current`)
- `text-15` body — between Phase 2 steps (14/16); could just use `text-14` to avoid the escape hatch
- Action button widths `w-8` (32px) for icon-only buttons
</task>

<task name="3: EmptyState primitive">
Create `frontend/web/components/EmptyState.tsx`. Server Component.

Props:
- `title: string`
- `body: string`
- `ctaLabel?: string`
- `ctaHref?: string` (if both provided, renders a Link CTA)

Visual:
- Centered column inside a `bg-surface border border-border rounded-xl p-10 md:p-14 text-center`
- Title (`font-display text-20 font-bold text-text-primary`)
- Body (`text-14 text-text-secondary mt-2 max-w-[480px] mx-auto`)
- CTA (if provided): primary-style Link, `mt-6 inline-flex items-center gap-2 px-5 h-12 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold`

Reusable: Phase 10 (Watch Later) calls this with the queue-empty copy.
</task>

<task name="4: /history full screen">
Create `frontend/web/app/(app)/(protected)/history/page.tsx`. Client Component (`useState` for the list, `useEffect` for the initial fetch, `useRouter` for view navigation).

Layout (follows preferences page rhythm):
```
<div max-w-[920px] mx-auto px-6 md:px-10 py-10 md:py-14>
  <p eyebrow>Library</p>
  <h1 display>History</h1>
  <p subhead>Every recommendation we've served you, with the mood and filters you had on.</p>

  {loading ? <skeleton /> : groups.length === 0 ? <EmptyState ... /> : (
    <div flex flex-col gap-8 mt-8>
      {groups.map(g => (
        <section key={g.label}>
          <h2 group-label>{g.label}</h2>
          <div flex flex-col gap-2>
            {g.entries.map(e => <HistoryRow ... onDelete={...} onView={...} />)}
          </div>
        </section>
      ))}
    </div>
  )}
</div>
```

Group label visual:
- `font-display font-bold text-14 text-text-secondary tracking-[0.02em] mb-3.5`
- DSGN-06 note: tracking-[0.02em] is the reference recipe

Behavior:
- Fetch history via `getHistory()` on mount → set state
- Local delete: filter the entry out of the in-memory state (visual feedback only; no persistence)
- View: `router.push('/recommendation')` — re-rolls a new recommendation (Phase 7 doesn't take a movie ID; that's a v2 concern)
- If after deletes all groups are empty, render the `<EmptyState>` with copy `"Your history is empty."` + body `"Recommendations you've gotten will show up here."` + CTA `"Pick a movie for me"` → href `/`

Apply `animate-fade-up [animation-delay:60ms]` to the section list (Phase 7's animation utilities) for a small entrance polish.
</task>

</tasks>

<verification>
After all tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` exit 0
- `/history` route in static prerender list
- Manual smoke (`pnpm dev`):
  1. **HIST-02 (gate)**: visit `/history` while signed-out → redirected to `/login?from=%2Fhistory`
  2. **HIST-01 (display)**: sign in → `/history` shows 4 groups (Today / Yesterday / Last week / Earlier) with 10 total rows, each with poster + title + meta strip + 3 action buttons
  3. **HIST-03 (responsive)**: at 375 / 768 / 1440 — column max-w-920 centers, padding scales, meta row wraps cleanly, no horizontal scroll
  4. **HIST-04 (tokens-only)**: `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'app/(app)/(protected)/history/' 'components/HistoryRow.tsx' 'components/EmptyState.tsx' 'lib/api/history.ts'` returns 0 hits
  5. **HIST-05 (empty state)**: delete all 10 rows → EmptyState renders with the "Pick a movie for me" CTA → click navigates to /
  6. Click View on any row → navigates to /recommendation (re-rolls)
  7. Click Bookmark icon → no-op (visual placeholder, Phase 10 will wire if needed)
</verification>

<scope-cuts>
- **Real "View" with movie ID**: Phase 7's /recommendation doesn't take an ID. Routing /recommendation/[id] is a v2 concern. Click navigates to /recommendation which re-rolls — acceptable for milestone.
- **Bookmark persistence**: Phase 10 owns the watch-later list. The button is visual only here.
- **Delete persistence**: local filter only, page reload restores the full list. Mock seam stays static.
- **Filters / search**: not in the reference design. Skip.
</scope-cuts>

<success_criteria>
1. /history renders the design-faithful screen with grouped rows.
2. Phase 5 RequireAuth gate redirects unauth visitors.
3. Empty state appears when all rows deleted.
4. Theme tokens only.
5. tsc / lint / build green.
6. Responsive at 3 breakpoints.
</success_criteria>
