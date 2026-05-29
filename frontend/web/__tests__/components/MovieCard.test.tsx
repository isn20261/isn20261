import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MovieCard } from "@/components/MovieCard";
import type { Movie } from "@/lib/api/recommend";

const movie: Movie = {
  id: "tt0133093",
  title: "The Matrix",
  year: 1999,
  runtime: "2h 16m",
  rating: "R",
  match: 92,
  genres: ["action", "sci-fi"],
  director: "The Wachowskis",
  cast: ["Keanu Reeves"],
  synopsis: "A hacker discovers the true nature of reality.",
  services: [],
  posterSeed: 42,
  backdropSeed: 99,
  mood: ["intense"],
};

describe("MovieCard", () => {
  it("renderiza o título do filme", () => {
    render(<MovieCard movie={movie} />);
    expect(screen.getByText("The Matrix")).toBeInTheDocument();
  });

  it("renderiza ano e percentual de compatibilidade", () => {
    render(<MovieCard movie={movie} />);
    expect(screen.getByText("1999 · 92% compatível")).toBeInTheDocument();
  });

  it("renderiza imagem com src gerado pelo posterSeed", () => {
    render(<MovieCard movie={movie} />);
    const img = document.querySelector("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("ra-p-42"));
  });

  it("não tem role=button quando onClick não é fornecido", () => {
    render(<MovieCard movie={movie} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("tem role=button e chama onClick quando fornecido", () => {
    const onClick = vi.fn();
    render(<MovieCard movie={movie} onClick={onClick} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("aplica CSS vars de largura e altura customizadas", () => {
    const { container } = render(
      <MovieCard movie={movie} width={200} height={300} />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--ra-card-w")).toBe("200px");
    expect(root.style.getPropertyValue("--ra-card-h")).toBe("300px");
  });

  it("usa dimensões default 168x252", () => {
    const { container } = render(<MovieCard movie={movie} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--ra-card-w")).toBe("168px");
    expect(root.style.getPropertyValue("--ra-card-h")).toBe("252px");
  });

  it("card interativo tem tabIndex=0", () => {
    render(<MovieCard movie={movie} onClick={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "0");
  });
});
