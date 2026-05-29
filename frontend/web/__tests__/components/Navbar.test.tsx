import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Navbar } from "@/components/Navbar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/BrandMark", () => ({
  BrandMark: () => <span data-testid="brandmark" />,
}));

vi.mock("@/components/AccountMenu", () => ({
  AccountMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/lib/auth/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

const guestState = {
  isAuthenticated: false,
  isLoading: false,
  session: null,
  user: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

const loggedState = {
  isAuthenticated: true,
  isLoading: false,
  session: null,
  user: { email: "joao@example.com", sub: "user-1" },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

describe("Navbar — variant home (default)", () => {
  it("renderiza links Entrar e Criar conta para visitante", () => {
    mockUseAuth.mockReturnValue(guestState);
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /criar conta/i })).toHaveAttribute("href", "/register");
  });

  it("não renderiza Entrar/Criar conta quando autenticado", () => {
    mockUseAuth.mockReturnValue(loggedState);
    render(<Navbar />);
    expect(screen.queryByRole("link", { name: /entrar/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /criar conta/i })).toBeNull();
  });

  it("exibe saudação com nome do usuário autenticado", () => {
    mockUseAuth.mockReturnValue(loggedState);
    render(<Navbar />);
    expect(screen.getByText(/olá, joao/i)).toBeInTheDocument();
  });

  it("renderiza BrandMark com link para home", () => {
    mockUseAuth.mockReturnValue(guestState);
    render(<Navbar />);
    const brandLink = screen.getByRole("link", { name: /cinedica/i });
    expect(brandLink).toHaveAttribute("href", "/");
    expect(brandLink.querySelector("[data-testid='brandmark']")).toBeInTheDocument();
  });
});

describe("Navbar — variant mobile", () => {
  it("renderiza BrandMark e botão de notificações", () => {
    mockUseAuth.mockReturnValue(guestState);
    render(<Navbar variant="mobile" />);
    expect(screen.getByTestId("brandmark")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notificações/i })).toBeInTheDocument();
  });

  it("não renderiza links de auth na variante mobile", () => {
    mockUseAuth.mockReturnValue(guestState);
    render(<Navbar variant="mobile" />);
    expect(screen.queryByRole("link", { name: /entrar/i })).toBeNull();
  });
});
