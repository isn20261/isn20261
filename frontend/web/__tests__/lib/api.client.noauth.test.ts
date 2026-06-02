import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/api/auth", () => ({
  getSession: vi.fn(),
}));

import { apiGetNoAuth } from "@/lib/api/client";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test");
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("apiGetNoAuth", () => {
  it("faz fetch sem Authorization header", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ title: "Filme" }), { status: 200 }),
    );

    await apiGetNoAuth("/api/v1/recommend_anon");

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers?.Authorization).toBeUndefined();
  });

  it("retorna data com sucesso em 200", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ title: "Aleatório" }), { status: 200 }),
    );

    const result = await apiGetNoAuth<{ title: string }>("/api/v1/recommend_anon");

    expect(result).toEqual({ ok: true, data: { title: "Aleatório" } });
  });

  it("retorna erro server em não-2xx", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "erro" }), { status: 500 }),
    );

    const result = await apiGetNoAuth("/api/v1/recommend_anon");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("server");
  });
});
