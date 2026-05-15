# Phase 14: Preferences Lambda Integration — Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 4 (1 new, 3 modified)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/web/lib/api/preferences.ts` (NEW) | service / api-seam | request-response (HTTP) | `frontend/web/lib/api/recommend.real.ts` | **exact** (same shape: thin wrappers over `apiGet` / `apiPost`, typed return) |
| `frontend/web/app/(app)/(protected)/preferences/page.tsx` (MOD) | route / client-page | mount-effect + event-handler | `frontend/web/lib/auth/AuthContext.tsx:53-65` (mount effect with cancellation) | partial (no analog in repo for "fetch-on-mount screen" pattern — Phase 14 establishes it; Phase 15 / 16 will mirror) |
| `frontend/web/lib/api/recommend.ts` (MOD) | typed mock + lookup tables | n/a (data only) | itself (existing exports `MOODS` / `STREAMING_SERVICES` / `RATINGS`) | **exact** (just append a `GENRES` export following the same `as const` pattern) |
| `frontend/web/components/SectionSkeleton.tsx` (NEW, may co-locate) | component (UI primitive) | n/a (presentational) | `frontend/web/components/SectionCard.tsx` | partial (no skeleton component exists yet; new pattern, but trivial Tailwind `animate-pulse` chips) |

---

## Pattern Assignments

### `frontend/web/lib/api/preferences.ts` (service / api-seam, request-response)

**Analog:** `frontend/web/lib/api/recommend.real.ts`

**Why this analog:** Both are the **typed function per Lambda endpoint** layer that sits between the generic `lib/api/client.ts` wrapper and the React component. Same import set (`apiGet` / `apiPost` / `Result` / `ApiError` from `@/lib/api/client`), same file-header docstring style, same one-line function body shape.

**File header docstring pattern** (`recommend.real.ts:1-15`):

```ts
/**
 * Phase 12 (FETCH-05 demonstrator) — Real recommendation Lambda call.
 *
 * Lives alongside the mock at `lib/api/recommend.ts`. Phase 12 ships this
 * function but does NOT swap the recommendation screen — Phase 13 does that
 * atomically...
 *
 * Endpoint: GET /api/v1/recommend (defined in __main__.py:321, JWT-authed).
 */
```

Copy: a 10-15-line header naming the phase + issue, listing the wire endpoints (GET + POST `/api/v1/preferences`), naming the Lambda source (`functions/preferences/preferences.py`), and noting kebab-case `age-rating` is intentional.

**Function body pattern** (`recommend.real.ts:20-22`):

```ts
export async function getRecommendationReal(): Promise<Result<Movie, ApiError>> {
  return apiGet<Movie>("/api/v1/recommend");
}
```

Phase 14 equivalent:

```ts
export async function getPreferences(): Promise<Result<Preferences, ApiError>> {
  return apiGet<Preferences>("/api/v1/preferences");
}

export async function putPreferences(
  patch: Partial<Preferences>,
): Promise<Result<null, ApiError>> {
  return apiPost<null>("/api/v1/preferences", patch);
}
```

**Type co-location pattern** (`auth.ts:30-36`):

```ts
export type Session = {
  AccessToken: string;
  IdToken: string;
  ...
};
```

Phase 14: co-locate the `Preferences` type in `preferences.ts` (not a separate `types.ts`). Repo convention is type-next-to-seam.

```ts
export type Preferences = {
  genres: readonly string[];
  subscriptions: readonly string[];
  "age-rating": string | null;
  humor: string | null;
};
```

The bracket-key `"age-rating"` is the wire format from the Lambda; ESLint's `quote-props` rule may protest but the value is the literal wire shape — keep it.

---

### `frontend/web/app/(app)/(protected)/preferences/page.tsx` (route / client-page, mount-effect + event-handlers)

**Analog:** `frontend/web/lib/auth/AuthContext.tsx:53-65` (mount effect with cancellation flag)

**Why this analog:** Both run an async call on mount, set state on resolution, and need cancellation on unmount. AuthContext's `useEffect` is the only in-repo precedent.

**Mount-effect with cancellation pattern** (`AuthContext.tsx:53-65`):

```ts
useEffect(() => {
  let cancelled = false;
  getSession().then((persisted) => {
    if (cancelled) return;
    if (persisted) setSession(persisted);
    setIsLoading(false);
  });
  return () => {
    cancelled = true;
  };
}, []);
```

Apply to preferences page:

```ts
const [prefs, setPrefs] = useState<Preferences | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<ApiError | null>(null);
useApiErrorUx(error);

useEffect(() => {
  let cancelled = false;
  getPreferences().then((res) => {
    if (cancelled) return;
    if (!res.ok) {
      setError(res.error);
      setIsLoading(false);
      return;
    }
    setPrefs(res.data);
    setIsLoading(false);
  });
  return () => {
    cancelled = true;
  };
}, []);
```

**Optimistic toggle pattern** (NEW — no exact in-repo analog; closest is the React state update in `preferences/page.tsx:46-50` `toggleSet` helper):

```ts
const inFlight = useRef<Set<keyof Preferences>>(new Set());

async function commit<K extends keyof Preferences>(
  field: K,
  next: Preferences[K],
  prevSnapshot: Preferences,
) {
  if (!prefs) return;
  // Optimistic UI
  setPrefs({ ...prefs, [field]: next });
  // Dedup: skip if a request for this field is already mid-flight
  if (inFlight.current.has(field)) return;
  inFlight.current.add(field);
  const res = await putPreferences({ [field]: next } as Partial<Preferences>);
  inFlight.current.delete(field);
  if (!res.ok) {
    setPrefs(prevSnapshot); // rollback
    setError(res.error);
  }
}
```

**Why `useRef<Set>` for in-flight dedup:** mutable, no re-render churn. Concurrency: if a 2nd toggle on the same field arrives mid-flight, we drop it — the request that's mid-flight will overwrite with stale data. Acceptable for chip toggles (user can't change faster than the request returns in practice). If we hit a race in practice, upgrade to `Map<field, AbortController>` and abort + replay.

**Component composition** — keep the existing `Chip` + `SectionCard` usage. The 4 existing sections (Streaming services / Default mood / Maximum age rating / Account) gain:
- One new section above Streaming services: **"Favorite genres"** (chips driven by new `GENRES` const).
- "Default mood" → "Humor" (chips become single-select).
- Renames: `services` → `subscriptions`, `moods` → `humor`, `rating` → `ageRating` (local identifier; wire is `"age-rating"`).

**Skeleton state pattern** (NEW):

```tsx
{isLoading ? (
  <div className="flex flex-wrap gap-2.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-9 w-24 rounded-md bg-surface-2 animate-pulse" />
    ))}
  </div>
) : (
  <div className="flex flex-wrap gap-2.5">
    {/* real chips */}
  </div>
)}
```

Inline this per SectionCard or extract a `<ChipsSkeleton count={5} />` component — planner picks based on duplication count.

---

### `frontend/web/lib/api/recommend.ts` (typed mock + lookup tables, data only)

**Analog:** itself — existing `STREAMING_SERVICES` / `MOODS` / `RATINGS` exports at `recommend.ts:257-282`.

**Existing pattern** (`recommend.ts:257-281`):

```ts
export const STREAMING_SERVICES = [
  { id: "netflix", name: "Netflix", glyph: "N" },
  ...
] as const;

export const MOODS = [
  { id: "chill", label: "Chill", icon: "◐" },
  ...
] as const;

export const RATINGS = ["G", "PG", "PG-13", "R", "NC-17"] as const;
```

Append `GENRES` in the same block:

```ts
export const GENRES = [
  { id: "drama", label: "Drama" },
  { id: "mystery", label: "Mystery" },
  { id: "romance", label: "Romance" },
  { id: "sci-fi", label: "Sci-Fi" },
  { id: "action", label: "Action" },
  { id: "comedy", label: "Comedy" },
  { id: "adventure", label: "Adventure" },
  { id: "crime", label: "Crime" },
  { id: "horror", label: "Horror" },
  { id: "thriller", label: "Thriller" },
] as const;
```

**Source of the genre list:** `Array.from(new Set(MOVIES.flatMap(m => m.genres))).sort()` from the existing `MOVIES` dataset gives the genres actually present in the mock. Choose between (a) hand-curated list above (matches what users likely expect: ~10 popular cinematic genres), (b) derived-from-MOVIES list (might miss "Adventure" / "Horror" depending on movie selection). Recommend (a) — predictable + curated.

**Type:** mirror MOODS shape (`{ id, label }`) for chip-render symmetry. The wire stores genre `id` strings (`"drama"`, etc.), the chip renders `label` (`"Drama"`). Match `recommend.ts` MOODS exactly.

---

### `frontend/web/components/SectionSkeleton.tsx` or inline skeleton (component, presentational)

**Analog:** No direct in-repo skeleton component exists. Closest is the spinner-style icon swap in `app/(auth)/login/page.tsx:submit-button` (per Phase 4 decision log).

**Match quality:** partial — Phase 14 introduces the skeleton pattern; Phases 15 / 16 inherit it.

**Decision for planner:**
- **Option A — inline skeleton inside `preferences/page.tsx`** (~10 lines). Cheap, no new file.
- **Option B — extract `<ChipsSkeleton count={N} />` to `components/`** (~15 lines). Slightly cleaner; Phase 15 (history) and Phase 16 (watch-later) reuse it.

Recommend **B** — Phase 15 has a list-of-rows skeleton (different shape, won't reuse), but Phase 16 watch-later is chips-style and will. Two reuse sites = worth extracting.

**Tokens:** `bg-surface-2` and `animate-pulse` only — no hex, no px-values. DSGN-06 compliant.

---

## Shared Patterns

### Typed function per Lambda endpoint
**Source:** `frontend/web/lib/api/recommend.real.ts`
**Apply to:** any new `lib/api/{endpoint}.ts` file. One file per Lambda; functions consume `apiGet` / `apiPost`; return `Promise<Result<T, ApiError>>`.

### Mount-effect with cancellation flag
**Source:** `frontend/web/lib/auth/AuthContext.tsx:53-65` (and 12-PATTERNS.md §"Mount-effect with cancellation flag")
**Apply to:** any client-component that fetches on mount.

```ts
useEffect(() => {
  let cancelled = false;
  asyncCall().then((data) => {
    if (cancelled) return;
    setState(data);
  });
  return () => { cancelled = true; };
}, []);
```

### `useApiErrorUx` consumption
**Source:** `frontend/web/lib/api/useApiErrorUx.ts` + 12-PATTERNS.md
**Apply to:** any client-component holding an `ApiError | null` state.

```ts
const [error, setError] = useState<ApiError | null>(null);
useApiErrorUx(error);
```

The hook fires toast side-effects on `error` change. Component renders inline fallback UI for `error.kind === "validation"` if it has form fields (preferences doesn't — chips can't be invalid).

### Optimistic mutation with in-flight dedup
**Source:** new this phase (no in-repo analog)
**Apply to:** Phase 16 (watch-later) — same pattern, different field shape.

```ts
const inFlight = useRef<Set<Field>>(new Set());

async function commit(field, next, prev) {
  setState(next);
  if (inFlight.current.has(field)) return;
  inFlight.current.add(field);
  const res = await put(...);
  inFlight.current.delete(field);
  if (!res.ok) setState(prev);
}
```

### Append-to-existing-const-block (data only)
**Source:** `frontend/web/lib/api/recommend.ts:257-281`
**Apply to:** `GENRES` constant. New `as const` block alongside MOODS / STREAMING_SERVICES.

### Tokenized className-only (DSGN-06)
**Source:** `frontend/web/AGENTS.md` (loaded at session start), `frontend/web/components/Chip.tsx`
**Apply to:** every new section in `preferences/page.tsx` and the skeleton component. Existing escape hatches in `preferences/page.tsx:14-18` (max-w-[880px], text-[36px], tracking-[0.18em]) are already documented; do not introduce new ones.

---

## No Analog Found

| File / Concern | Reason | Planner Guidance |
|----------------|--------|------------------|
| Skeleton UX | No skeleton component in repo (Phases 6–10 all rendered mocks instantly). | Author trivially with `bg-surface-2` + `animate-pulse`. DSGN-06 compliant. |
| In-flight request dedup | No fetch calls in repo yet (Phase 12 only shipped the wrapper, no consumers). | Author with `useRef<Set>` for the simple case. Upgrade to `Map<field, AbortController>` only if races are observed. |

---

## Metadata

**Analog search scope:**
- `frontend/web/lib/api/` (auth, client, recommend, recommend.real, useApiErrorUx)
- `frontend/web/lib/auth/` (AuthContext)
- `frontend/web/app/(app)/(protected)/preferences/page.tsx` (current state)
- `frontend/web/components/` (Chip, SectionCard, RequireAuth)
- `functions/preferences/preferences.py` (wire format truth)

**Files scanned (read in full or targeted):** 9

**Key takeaways for planner:**
1. `preferences.ts` is a structural twin of `recommend.real.ts` — same slot, same pattern. Author from the template.
2. The mount-effect cancellation pattern is the AuthContext pattern, lifted into the page component.
3. The optimistic-with-rollback + in-flight-dedup pattern is new this phase; Phase 16 (watch-later) will mirror it.
4. `GENRES` slots cleanly into the existing data-block in `recommend.ts`; no new file needed for lookup tables.
5. Skeleton component is a small DSGN-06-compliant primitive; extract to `components/ChipsSkeleton.tsx` for Phase 16 reuse.

**Pattern extraction date:** 2026-05-14
