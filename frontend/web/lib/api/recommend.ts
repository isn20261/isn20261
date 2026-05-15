/**
 * Shared movie types and URL helpers consumed by the Phase 6–10 screens
 * and their components. The recommendation fetch surface itself lives in
 * `./recommend.real.ts` (Phase 13, INTG-RECO-01/02) — this module no
 * longer holds a recommendation fetch path or a hand-written movie
 * dataset.
 *
 * Keep-list consumers (these files import the exports below):
 * - app/(app)/(protected)/preferences/page.tsx — MOODS, RATINGS,
 *   STREAMING_SERVICES, type Rating.
 * - app/(app)/(protected)/watch-later/page.tsx — type Movie.
 * - components/MovieCard.tsx — posterUrl, type Movie.
 * - components/HistoryRow.tsx — posterUrl.
 * - components/ServiceBadge.tsx — type Service.
 * - lib/api/history.ts — type Movie (seeds its own local dataset
 *   pending Phase 15 live-Lambda swap).
 * - lib/api/watch-later.ts — type Movie (seeds its own local dataset
 *   pending Phase 16 live-Lambda swap).
 *
 * Decoupled from `@/lib/api/auth` per ARCHITECTURE.md anti-pattern note.
 */

export type Service = {
  name: string;
  kind: "included" | "rent" | "buy";
};

export type Movie = {
  id: string;
  title: string;
  year: number;
  runtime: string;
  rating: string;
  match: number;
  genres: readonly string[];
  director: string;
  cast: readonly string[];
  synopsis: string;
  services: readonly Service[];
  posterSeed: number;
  backdropSeed: number;
  mood: readonly string[];
};

export const STREAMING_SERVICES = [
  { id: "netflix", name: "Netflix", glyph: "N" },
  { id: "prime", name: "Prime", glyph: "P" },
  { id: "max", name: "Max", glyph: "M" },
  { id: "disney", name: "Disney+", glyph: "D+" },
  { id: "apple", name: "Apple TV+", glyph: "tv+" },
  { id: "hulu", name: "Hulu", glyph: "h" },
  { id: "mubi", name: "Mubi", glyph: "M." },
  { id: "paramount", name: "Paramount+", glyph: "P+" },
  { id: "shudder", name: "Shudder", glyph: "S" },
  { id: "criterion", name: "Criterion", glyph: "C" },
] as const;

export const MOODS = [
  { id: "chill", label: "Chill", icon: "◐" },
  { id: "intense", label: "Intense", icon: "◆" },
  { id: "funny", label: "Funny", icon: "◑" },
  { id: "romantic", label: "Romantic", icon: "♡" },
  { id: "thoughtful", label: "Thoughtful", icon: "◇" },
  { id: "adventurous", label: "Adventurous", icon: "▲" },
  { id: "scary", label: "Scary", icon: "✕" },
  { id: "nostalgic", label: "Nostalgic", icon: "◌" },
] as const;

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

export const RATINGS = ["G", "PG", "PG-13", "R", "NC-17"] as const;
export type Rating = (typeof RATINGS)[number];

export const posterUrl = (m: Movie, w = 360, h = 540): string =>
  `https://picsum.photos/seed/ra-p-${m.posterSeed}/${w}/${h}`;

export const backdropUrl = (m: Movie, w = 1600, h = 900): string =>
  `https://picsum.photos/seed/ra-b-${m.backdropSeed}/${w}/${h}`;
