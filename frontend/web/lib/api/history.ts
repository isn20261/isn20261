/**
 * Phase 9 (HIST-01..05, issue #98) — typed history seam, seeded locally.
 *
 * Self-contained module shaped like a future `getHistory` Lambda response.
 * Phase 15 will swap `getHistory()` for a live Lambda fetch and the local
 * `MOVIES_SEED` constant below dies naturally at that point — every other
 * consumer keeps working unchanged. Decoupled from `@/lib/api/auth` per
 * ARCHITECTURE.md anti-pattern note.
 *
 * Display labels (when, mood) are pre-formatted in the seed; the v2 swap
 * will compute relative-time strings from real `recommendedAt` ISO
 * timestamps.
 *
 * Phase 13 note: `MOVIES_SEED` previously lived in `lib/api/recommend.ts`
 * as a shared dataset. Phase 13 retired that dataset from the
 * recommendation code path. The history screen still needs seed data to
 * render until Phase 15 wires the real history Lambda, so the 10 entries
 * this file actually references have been inlined here as a non-exported
 * local constant. The shape stays driven by `type Movie` from
 * `@/lib/api/recommend`.
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
] as const;

export type HistoryEntry = {
  id: string;
  movie: Movie;
  when: string;
  mood: string;
};

export type HistoryGroup = {
  label: string;
  entries: readonly HistoryEntry[];
};

const FETCH_LATENCY_MS = 250;

function entry(movie: Movie | undefined, when: string, mood: string): HistoryEntry {
  if (!movie) {
    throw new Error("history seed references a movie outside MOVIES_SEED bounds");
  }
  return {
    id: `${movie.id}-${when.replace(/\s+/g, "-").toLowerCase()}`,
    movie,
    when,
    mood,
  };
}

const GROUPS: readonly HistoryGroup[] = [
  {
    label: "Today",
    entries: [
      entry(MOVIES_SEED[0], "2h ago", "Thoughtful"),
      entry(MOVIES_SEED[1], "8h ago", "Thoughtful"),
    ],
  },
  {
    label: "Yesterday",
    entries: [
      entry(MOVIES_SEED[2], "Sat 9:14 PM", "Chill"),
      entry(MOVIES_SEED[3], "Sat 9:14 PM", "Funny"),
    ],
  },
  {
    label: "Last week",
    entries: [
      entry(MOVIES_SEED[4], "Tue", "Intense"),
      entry(MOVIES_SEED[5], "Wed", "Romantic"),
      entry(MOVIES_SEED[6], "Fri", "Adventurous"),
    ],
  },
  {
    label: "Earlier",
    entries: [
      entry(MOVIES_SEED[7], "Apr 2", "Nostalgic"),
      entry(MOVIES_SEED[8], "Mar 28", "Thoughtful"),
      entry(MOVIES_SEED[9], "Mar 17", "Scary"),
    ],
  },
] as const;

export async function getHistory(): Promise<readonly HistoryGroup[]> {
  await new Promise((resolve) => setTimeout(resolve, FETCH_LATENCY_MS));
  return GROUPS;
}
