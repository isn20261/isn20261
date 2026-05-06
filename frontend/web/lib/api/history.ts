/**
 * Phase 9 (HIST-01..05, issue #98) — typed mock history seam.
 *
 * Self-contained module shaped like a future `getHistory` Lambda response.
 * v2 (INTG-02) replaces `getHistory()` with a real fetch — every other
 * consumer keeps working unchanged. Decoupled from `@/lib/api/auth` per
 * ARCHITECTURE.md anti-pattern note.
 *
 * Display labels (when, mood) are pre-formatted in the mock; v2 will
 * compute relative-time strings from real `recommendedAt` ISO timestamps.
 */

import { MOVIES, type Movie } from "@/lib/api/recommend";

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
    throw new Error("history seed references a movie outside MOVIES bounds");
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
      entry(MOVIES[0], "2h ago", "Thoughtful"),
      entry(MOVIES[1], "8h ago", "Thoughtful"),
    ],
  },
  {
    label: "Yesterday",
    entries: [
      entry(MOVIES[2], "Sat 9:14 PM", "Chill"),
      entry(MOVIES[3], "Sat 9:14 PM", "Funny"),
    ],
  },
  {
    label: "Last week",
    entries: [
      entry(MOVIES[4], "Tue", "Intense"),
      entry(MOVIES[5], "Wed", "Romantic"),
      entry(MOVIES[6], "Fri", "Adventurous"),
    ],
  },
  {
    label: "Earlier",
    entries: [
      entry(MOVIES[7], "Apr 2", "Nostalgic"),
      entry(MOVIES[8], "Mar 28", "Thoughtful"),
      entry(MOVIES[9], "Mar 17", "Scary"),
    ],
  },
] as const;

export async function getHistory(): Promise<readonly HistoryGroup[]> {
  await new Promise((resolve) => setTimeout(resolve, FETCH_LATENCY_MS));
  return GROUPS;
}
