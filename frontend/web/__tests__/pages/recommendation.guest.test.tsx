import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/recommendation",
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api/recommend.real", () => ({
  getRecommendationReal: vi.fn(),
  getRecommendationAnon: vi.fn(),
}));

vi.mock("@/lib/api/watch-later", () => ({
  addWatchLater: vi.fn(),
}));

vi.mock("@/lib/api/useApiErrorUx", () => ({
  useApiErrorUx: vi.fn(),
}));

vi.mock("@/components/SnackRecipeModal", () => ({
  SnackRecipeModal: () => null,
}));

import { useAuth } from "@/lib/auth/AuthContext";
import { getRecommendationReal, getRecommendationAnon } from "@/lib/api/recommend.real";
import RecommendationPage from "@/app/(app)/recommendation/page";

const mockUseAuth = vi.mocked(useAuth);
const mockGetReal = vi.mocked(getRecommendationReal);
const mockGetAnon = vi.mocked(getRecommendationAnon);

const MOVIE = {
  title: "Matrix",
  genre: "Sci-Fi",
  streamingServices: [{ name: "Netflix", image: "", url: "https://netflix.com" }],
};

function authState(isAuthenticated: boolean) {
  return {
    isAuthenticated,
    isLoading: false,
    session: null,
    user: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    completeGoogleSignIn: vi.fn(),
    signOut: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetReal.mockResolvedValue({ ok: true, data: MOVIE });
  mockGetAnon.mockResolvedValue({ ok: true, data: MOVIE });
});

describe("RecommendationPage — guest vs autenticado", () => {
  it("chama getRecommendationAnon para usuário não autenticado", async () => {
    mockUseAuth.mockReturnValue(authState(false));

    render(<RecommendationPage />);
    await waitFor(() => screen.getByText("Matrix"));

    expect(mockGetAnon).toHaveBeenCalledOnce();
    expect(mockGetReal).not.toHaveBeenCalled();
  });

  it("chama getRecommendationReal para usuário autenticado", async () => {
    mockUseAuth.mockReturnValue(authState(true));

    render(<RecommendationPage />);
    await waitFor(() => screen.getByText("Matrix"));

    expect(mockGetReal).toHaveBeenCalledOnce();
    expect(mockGetAnon).not.toHaveBeenCalled();
  });

  it("esconde botão Salvar para usuário não autenticado", async () => {
    mockUseAuth.mockReturnValue(authState(false));

    render(<RecommendationPage />);
    await waitFor(() => screen.getByText("Matrix"));

    expect(
      screen.queryByRole("button", { name: /salvar para assistir depois/i }),
    ).toBeNull();
  });

  it("exibe botão Salvar para usuário autenticado", async () => {
    mockUseAuth.mockReturnValue(authState(true));

    render(<RecommendationPage />);
    await waitFor(() => screen.getByText("Matrix"));

    expect(
      screen.getByRole("button", { name: /salvar para assistir depois/i }),
    ).toBeInTheDocument();
  });
});
