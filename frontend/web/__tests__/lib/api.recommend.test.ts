import { describe, it, expect } from "vitest";
import { posterUrl, backdropUrl, type Movie } from "@/lib/api/recommend";

const movie: Movie = {
  id: "tt0133093",
  title: "The Matrix",
  year: 1999,
  runtime: "2h 16m",
  rating: "R",
  match: 92,
  genres: ["action", "sci-fi"],
  director: "The Wachowskis",
  cast: ["Keanu Reeves", "Laurence Fishburne"],
  synopsis: "A hacker discovers the true nature of reality.",
  services: [],
  posterSeed: 42,
  backdropSeed: 99,
  mood: ["intense"],
};

describe("posterUrl", () => {
  it("usa dimensões default (360x540)", () => {
    expect(posterUrl(movie)).toBe(
      "https://picsum.photos/seed/ra-p-42/360/540"
    );
  });

  it("usa dimensões customizadas", () => {
    expect(posterUrl(movie, 200, 300)).toBe(
      "https://picsum.photos/seed/ra-p-42/200/300"
    );
  });

  it("usa o posterSeed correto do filme", () => {
    const other = { ...movie, posterSeed: 7 };
    expect(posterUrl(other)).toContain("ra-p-7");
  });
});

describe("backdropUrl", () => {
  it("usa dimensões default (1600x900)", () => {
    expect(backdropUrl(movie)).toBe(
      "https://picsum.photos/seed/ra-b-99/1600/900"
    );
  });

  it("usa dimensões customizadas", () => {
    expect(backdropUrl(movie, 800, 450)).toBe(
      "https://picsum.photos/seed/ra-b-99/800/450"
    );
  });

  it("usa o backdropSeed correto do filme", () => {
    const other = { ...movie, backdropSeed: 5 };
    expect(backdropUrl(other)).toContain("ra-b-5");
  });
});
