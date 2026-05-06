---
phase: 10
plan: 01
type: execute
depends_on: []
files_modified:
  - frontend/web/lib/api/watch-later.ts                              # NEW localStorage-backed seam
  - frontend/web/app/(app)/recommendation/page.tsx                   # wire Save button to seam
  - frontend/web/app/(app)/(protected)/watch-later/page.tsx          # NEW screen
autonomous: true
requirements: [WTCL-01, WTCL-02, WTCL-03, WTCL-04, WTCL-05]
---

<objective>
Ship the Watch Later screen at `/watch-later` (inside `(app)/(protected)/`). Adds a localStorage-backed mock seam so the Save toggle on `/recommendation` actually persists across navigations and shows up here. Header with item count + "Surprise me from this list" CTA. Grid of MovieCard tiles with hover-X delete. Empty state via the Phase 9 EmptyState primitive.

Final phase of the milestone — after this merges, the milestone is closed.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md  §"Phase 10"
@.planning/codebase/ARCHITECTURE.md  §"Watch-later schema nests title — anti-pattern"
@frontend/_design-reference/history-queue.jsx  §QueueScreen
@frontend/web/lib/api/recommend.ts
@frontend/web/lib/api/auth.ts            (storage pattern reference)
@frontend/web/app/(app)/recommendation/page.tsx
@frontend/web/components/MovieCard.tsx
@frontend/web/components/EmptyState.tsx
</context>

<tasks>

<task name="1: Mock watch-later seam (localStorage-backed)">
Create `frontend/web/lib/api/watch-later.ts`. Self-contained — imports `MOVIES` and `Movie` from `@/lib/api/recommend`, no auth import.

Storage: `recommend-a.watch-later` localStorage key. Stores a JSON array of movie IDs only (denormalized). The `getWatchLater()` function joins with MOVIES at read time.

Per ARCHITECTURE.md note: the real backend nests `title` inside the array entry (anti-pattern). The mock keeps just the ID — a single denormalization that v2 maps to the backend's nested shape via the seam.

Exports:
```ts
export const WATCH_LATER_KEY = "recommend-a.watch-later" as const;

export function getWatchLater(): readonly Movie[];
// Read IDs from localStorage, join with MOVIES, drop any unknown IDs.

export function addToWatchLater(movieId: string): void;
// Idempotent — no duplicates.

export function removeFromWatchLater(movieId: string): void;

export function isInWatchLater(movieId: string): boolean;

export function reorderWatchLater(nextIds: readonly string[]): void;
// Phase 10 ships without drag-to-reorder UI; the seam still exposes it
// so Phase 10.x or v2 can wire it without changing the module shape.

export function watchLaterCount(): number;
```

Defensive guards on every read/write: `typeof window === "undefined"` short-circuit, `try/catch` around JSON.parse, reject non-array shapes.

Pattern matches `lib/api/auth.ts` Phase 4 module — same defensive style.
</task>

<task name="2: Wire /recommendation Save button through the seam">
Edit `frontend/web/app/(app)/recommendation/page.tsx`. Two changes:

1. Replace the local `useState(saved)` toggle with `isInWatchLater(movie.id)` reads + `addToWatchLater(movie.id)` / `removeFromWatchLater(movie.id)` calls.
2. The visual stays the same (Bookmark / BookmarkCheck swap). On every render, reflect the persisted state for the current movie. When the user clicks "Recommend another" and we replace the movie, the new movie's saved state is read fresh.

Use `useEffect` + a small refresh counter (or `useSyncExternalStore` for proper subtree reactivity), OR simpler: a state mirror that re-syncs on movie change.

Lean approach:
```ts
const [saved, setSaved] = useState(false);
useEffect(() => { setSaved(isInWatchLater(movie.id)); }, [movie.id]);

function toggleSave() {
  if (saved) {
    removeFromWatchLater(movie.id);
    setSaved(false);
  } else {
    addToWatchLater(movie.id);
    setSaved(true);
  }
}
```

Optional polish: add a tiny toast `"Saved to watch later"` / `"Removed from watch later"` — defer if it adds bulk.
</task>

<task name="3: /watch-later full screen">
Create `frontend/web/app/(app)/(protected)/watch-later/page.tsx`. Client Component.

State: `useState<readonly Movie[]>` initialized from `getWatchLater()` in a `useEffect` (avoid SSR/client mismatch on the empty array).

Layout (matches preferences/history rhythm):
```
<div max-w-[1100px] mx-auto px-6 md:px-10 py-10 md:py-14>
  <div flex items-end justify-between gap-5 mb-7 flex-wrap>
    <div>
      <p eyebrow>Library</p>
      <h1 display>Watch later</h1>
      <p subhead>
        <span text-text-primary font-semibold>{count} movies</span> saved.
      </p>
    </div>
    <Link href="/recommendation"
      className="primary-btn"
      onClick={surpriseMe}>
      <Sparkles /> Surprise me from this list
    </Link>
  </div>

  {loading ? <skeleton /> : items.length === 0 ? (
    <EmptyState
      title="Your queue is empty."
      body="Get a recommendation and save what catches your eye. Everything you save lives here."
      ctaLabel="Pick a movie for me"
      ctaHref="/"
    />
  ) : (
    <div className="grid gap-[18px] grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
      {items.map(m => (
        <div key={m.id} className="relative group">
          <button
            onClick={() => handleRemove(m.id)}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center"
            aria-label={`Remove ${m.title} from watch later`}
          >
            <X size={12} />
          </button>
          <MovieCard movie={m} width={168} height={252} />
        </div>
      ))}
    </div>
  )}
</div>
```

Behavior:
- "Surprise me from this list" — picks a random ID from current items, navigates to /recommendation. Phase 7's /recommendation re-rolls (not movie-id aware), so this is essentially "go to recommendation". Visual button works; we'll note in scope-cuts that targeted-movie viewing is v2.
- Hover X delete — calls `removeFromWatchLater(id)` and updates local state.

Drop the drag-to-reorder from the reference — out of scope this milestone (the seam exposes `reorderWatchLater` for future use).

DSGN-06 escape hatches:
- `max-w-[1100px]` — wider than other Library pages because of the grid (already a primitive)
- `gap-[18px]` — between the standard 16/20 step
- `grid-cols-[repeat(auto-fill,minmax(168px,1fr))]` — responsive grid recipe
- `text-[36px]` page title, `tracking-[0.18em]` eyebrow (already documented)
</task>

</tasks>

<verification>
After all tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` exit 0
- `/watch-later` route in static prerender list
- Manual smoke (`pnpm dev`):
  1. **WTCL-02 (gate)**: visit `/watch-later` while signed-out → redirected to `/login?from=%2Fwatch-later`
  2. **WTCL-01 (display empty)**: sign in (clear localStorage if needed), visit `/watch-later` → EmptyState renders with "Pick a movie for me" CTA → click → /
  3. Visit `/recommendation`, click Save → label flips to "Saved" with check icon
  4. Visit `/watch-later` → that movie appears in the grid
  5. Hover a tile → small X button appears top-right; click → tile disappears, count decrements
  6. **WTCL-01 (display populated)**: save 3+ movies via /recommendation re-rolls → /watch-later shows them in a responsive grid
  7. **WTCL-03 (responsive)**: at 375 / 768 / 1440 — grid reflows from 1 col → 2-3 cols → 5-6 cols, no horizontal scroll
  8. **WTCL-04 (tokens-only)**: `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'app/(app)/(protected)/watch-later/' 'lib/api/watch-later.ts'` returns 0 hits
  9. **WTCL-05 (persistence across reload)**: refresh `/watch-later` → list survives (localStorage-backed)
  10. Sign out + sign back in → list still there (`recommend-a.watch-later` is per-browser, not per-session — same as auth.ts pattern)
</verification>

<scope-cuts>
- **Drag-to-reorder** — reference shows it (`history-queue.jsx:140-172`); out of scope this milestone. Seam exposes `reorderWatchLater` for v2.
- **Toast on save/remove** — reference has it; deferred. The icon swap is the primary feedback.
- **"Surprise me" navigates to specific movie** — Phase 7's /recommendation doesn't take an ID. Button just goes to /recommendation (re-rolls). v2 swap when /recommendation/[id] lands.
- **Cross-tab sync** — if the user has two tabs open and saves in one, the other won't reflect. Acceptable for milestone.
</scope-cuts>

<success_criteria>
1. /watch-later renders the design-faithful screen — populated grid + empty state both work.
2. Save button on /recommendation persists through localStorage; /watch-later reads it.
3. Hover X removes from queue.
4. Phase 5 RequireAuth gate validated again.
5. Theme tokens only.
6. tsc / lint / build green.
7. Responsive at 3 breakpoints.
</success_criteria>
