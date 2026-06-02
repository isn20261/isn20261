import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequireAuth } from "@/components/RequireAuth";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/history",
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/lib/auth/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

beforeEach(() => {
  mockReplace.mockClear();
});

describe("RequireAuth", () => {
  it("renderiza children quando autenticado", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("renderiza placeholder com aria-busy enquanto carrega", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    const { container } = render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(screen.queryByText("Conteúdo protegido")).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("não renderiza children quando isLoading=true mesmo autenticado", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: true,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(screen.queryByText("Conteúdo protegido")).toBeNull();
  });

  it("redireciona para /login?from=<path> quando não autenticado", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(mockReplace).toHaveBeenCalledWith("/login?from=%2Fhistory");
  });

  it("não redireciona quando autenticado", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
