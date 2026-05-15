/**
 * Phase 10 (WTCL-01..05, issue #99) — typed watch-later seam, seeded locally.
 *
 * localStorage-backed (key: `recommend-a.watch-later`) so the Save button
 * on /recommendation persists across navigations and the /watch-later
 * screen reads the same state.
 *
 * Stores a denormalized list of movie IDs only. `getWatchLater()` joins
 * with the local `MOVIES_SEED` constant at read time. Per ARCHITECTURE.md
 * the real backend nests `title` inside the array entry — the seam
 * translates between shapes when Phase 16 wires the real Lambda. The
 * local seed dies naturally at that point.
 *
 * Defensive guards on every read/write — typeof window check (SSR-safe),
 * try/catch around JSON.parse, reject non-array shapes.
 *
 * Phase 13 note: `MOVIES_SEED` previously lived in `lib/api/recommend.ts`
 * as a shared dataset. Phase 13 retired that dataset from the
 * recommendation code path. The watch-later screen still needs seed data
 * to look up IDs against until Phase 16 wires the real watch-later
 * Lambda, so the entries this file references have been inlined here as
 * a non-exported local constant. The shape stays driven by `type Movie`
 * from `@/lib/api/recommend`.
 */

import { type Movie } from "@/lib/api/recommend";

const MOVIES_SEED: readonly Movie[] = [
  {
    id: "m1",
    title: "The Long Quiet",
    year: 2024,
    runtime: "2h 14m",
    rating: "R",
    match: 96,
    genres: ["Drama", "Mystery"],
    director: "Aria Volkov",
    cast: ["Jonas Reeve", "Mira Asante", "Cole Tanaka", "Petra Lin"],
    synopsis:
      "A reclusive sound engineer agrees to record one final album in a remote mountain chalet, where every silence begins to sound more dangerous than the last.",
    services: [
      { name: "Mubi", kind: "included" },
      { name: "Apple TV", kind: "rent" },
    ],
    posterSeed: 1011,
    backdropSeed: 1043,
    mood: ["thoughtful", "intense"],
  },
  {
    id: "m2",
    title: "Neon Hours",
    year: 2023,
    runtime: "1h 48m",
    rating: "PG-13",
    match: 91,
    genres: ["Romance", "Drama"],
    director: "Lila Okonkwo",
    cast: ["Sara Vance", "Ezra Park", "Noor Halim"],
    synopsis:
      "Two strangers spend forty-eight hours wandering a city that refuses to sleep, trading lies that slowly become a kind of truth.",
    services: [
      { name: "Prime", kind: "included" },
      { name: "Hulu", kind: "included" },
    ],
    posterSeed: 1025,
    backdropSeed: 1062,
    mood: ["romantic", "chill"],
  },
  {
    id: "m3",
    title: "Cold Iron",
    year: 2022,
    runtime: "2h 31m",
    rating: "R",
    match: 88,
    genres: ["Thriller", "Crime"],
    director: "Marcus Reid",
    cast: ["Daniel Yusef", "Hana Bright", "Tom Vance"],
    synopsis:
      "A retired courier is pulled back for one impossible delivery across a fracturing border in the dead of winter.",
    services: [
      { name: "Max", kind: "included" },
      { name: "Apple TV", kind: "buy" },
    ],
    posterSeed: 1031,
    backdropSeed: 1074,
    mood: ["intense", "adventurous"],
  },
  {
    id: "m4",
    title: "Soft Landing",
    year: 2025,
    runtime: "1h 36m",
    rating: "PG",
    match: 84,
    genres: ["Comedy"],
    director: "June Wells",
    cast: ["Ana Pell", "Ravi Mehta"],
    synopsis:
      "A flight attendant on her last shift before retirement tries to land a plane, a marriage, and her dignity — in that order.",
    services: [{ name: "Netflix", kind: "included" }],
    posterSeed: 1041,
    backdropSeed: 1082,
    mood: ["funny", "chill"],
  },
  {
    id: "m5",
    title: "Halfway House",
    year: 2024,
    runtime: "1h 59m",
    rating: "R",
    match: 79,
    genres: ["Horror"],
    director: "Sam Voss",
    cast: ["Iris Cole", "Kai Andersen"],
    synopsis:
      "Six former addicts move into a recovery home where the building itself seems to be running its own program.",
    services: [
      { name: "Shudder", kind: "included" },
      { name: "Prime", kind: "rent" },
    ],
    posterSeed: 1051,
    backdropSeed: 1084,
    mood: ["scary", "intense"],
  },
  {
    id: "m6",
    title: "Where the Field Ends",
    year: 2021,
    runtime: "2h 02m",
    rating: "PG-13",
    match: 82,
    genres: ["Drama"],
    director: "Theo Park",
    cast: ["Min Jeong", "Owen Ash", "Cleo Bauer"],
    synopsis:
      "Three siblings return to the family farm to bury their father — and find a stranger waiting in the kitchen.",
    services: [{ name: "Mubi", kind: "included" }],
    posterSeed: 1062,
    backdropSeed: 1080,
    mood: ["thoughtful", "nostalgic"],
  },
  {
    id: "m7",
    title: "Saturday at the Marina",
    year: 2023,
    runtime: "1h 41m",
    rating: "PG-13",
    match: 87,
    genres: ["Romance", "Comedy"],
    director: "Pippa Hale",
    cast: ["Eva Brandt", "Luca Romero"],
    synopsis:
      "An estranged couple meets for one last lunch, and ends up borrowing a stranger's sailboat.",
    services: [
      { name: "Prime", kind: "included" },
      { name: "Apple TV", kind: "rent" },
    ],
    posterSeed: 1071,
    backdropSeed: 1075,
    mood: ["romantic", "chill"],
  },
  {
    id: "m8",
    title: "Glass Republic",
    year: 2022,
    runtime: "2h 22m",
    rating: "R",
    match: 93,
    genres: ["Sci-Fi", "Drama"],
    director: "Nina Hart",
    cast: ["Adrien Voss", "Yui Tanaka", "Sam Ord"],
    synopsis:
      "In a city under permanent surveillance, a translator discovers a pattern in what the cameras choose not to record.",
    services: [{ name: "Max", kind: "included" }],
    posterSeed: 1084,
    backdropSeed: 1083,
    mood: ["thoughtful", "intense"],
  },
  {
    id: "m9",
    title: "Drift",
    year: 2025,
    runtime: "1h 52m",
    rating: "PG-13",
    match: 89,
    genres: ["Adventure"],
    director: "Sven Holm",
    cast: ["Maya Cole", "Jin Park"],
    synopsis:
      "A failed expedition leader gets one last chance to cross the strait — with the daughter of his oldest rival.",
    services: [{ name: "Disney+", kind: "included" }],
    posterSeed: 1043,
    backdropSeed: 1052,
    mood: ["adventurous"],
  },
  {
    id: "m10",
    title: "Anywhere But Here",
    year: 2020,
    runtime: "1h 44m",
    rating: "PG-13",
    match: 86,
    genres: ["Drama"],
    director: "Rin Asaki",
    cast: ["Bea Holt", "Eli Trent"],
    synopsis:
      "A teenager with a faulty heart spends one summer cataloguing everything she might miss.",
    services: [{ name: "Apple TV+", kind: "included" }],
    posterSeed: 1056,
    backdropSeed: 1066,
    mood: ["nostalgic", "thoughtful"],
  },
  {
    id: "m11",
    title: "Last Light at Pyrite",
    year: 2024,
    runtime: "2h 06m",
    rating: "R",
    match: 90,
    genres: ["Western", "Drama"],
    director: "Cole Reyes",
    cast: ["Jude Marsh", "Tilly Brown"],
    synopsis:
      "A widowed sheriff and a deserter share an empty mining town for a single night, neither willing to draw first.",
    services: [{ name: "Mubi", kind: "included" }],
    posterSeed: 1073,
    backdropSeed: 1059,
    mood: ["intense", "thoughtful"],
  },
  {
    id: "m12",
    title: "Honey, Slowly",
    year: 2023,
    runtime: "1h 32m",
    rating: "PG-13",
    match: 81,
    genres: ["Comedy", "Romance"],
    director: "Ada Levine",
    cast: ["Reni Yu", "Tom Friel"],
    synopsis:
      "A beekeeper in Slovenia and a translator from Lyon try to write a cookbook — in three languages, none shared.",
    services: [{ name: "Hulu", kind: "included" }],
    posterSeed: 1080,
    backdropSeed: 1064,
    mood: ["chill", "romantic"],
  },
] as const;

export const WATCH_LATER_KEY = "recommend-a.watch-later" as const;

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(WATCH_LATER_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeIds(ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(ids));
}

export function getWatchLater(): readonly Movie[] {
  const ids = readIds();
  const lookup = new Map(MOVIES_SEED.map((m) => [m.id, m] as const));
  return ids
    .map((id) => lookup.get(id))
    .filter((m): m is Movie => m !== undefined);
}

export function isInWatchLater(movieId: string): boolean {
  return readIds().includes(movieId);
}

export function addToWatchLater(movieId: string): void {
  const ids = readIds();
  if (ids.includes(movieId)) return; // idempotent
  writeIds([...ids, movieId]);
}

export function removeFromWatchLater(movieId: string): void {
  const ids = readIds();
  if (!ids.includes(movieId)) return;
  writeIds(ids.filter((id) => id !== movieId));
}

export function reorderWatchLater(nextIds: readonly string[]): void {
  // Phase 10 ships without drag-to-reorder UI; seam stays available for v2.
  const valid = new Set(MOVIES_SEED.map((m) => m.id));
  writeIds(nextIds.filter((id) => valid.has(id)));
}

export function watchLaterCount(): number {
  return readIds().length;
}
