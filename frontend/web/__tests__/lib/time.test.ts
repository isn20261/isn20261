import { describe, it, expect } from "vitest";
import { sameDay, relativeTime } from "@/lib/time";

const NOW = new Date("2025-06-15T12:00:00Z");

describe("sameDay", () => {
  it("retorna true para datas no mesmo dia UTC", () => {
    expect(sameDay(new Date("2025-01-15T00:00:00Z"), new Date("2025-01-15T23:59:59Z"))).toBe(true);
  });

  it("retorna false para dias diferentes", () => {
    expect(sameDay(new Date("2025-01-15T00:00:00Z"), new Date("2025-01-16T00:00:00Z"))).toBe(false);
  });

  it("retorna false para meses diferentes", () => {
    expect(sameDay(new Date("2025-01-15T00:00:00Z"), new Date("2025-02-15T00:00:00Z"))).toBe(false);
  });
});

describe("relativeTime", () => {
  it("retorna string vazia para ISO inválido", () => {
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });

  it('retorna "Agora mesmo" para 0 minutos atrás', () => {
    expect(relativeTime("2025-06-15T12:00:00Z", NOW)).toBe("Agora mesmo");
  });

  it('retorna "há Xm" para minutos atrás no mesmo dia', () => {
    expect(relativeTime("2025-06-15T11:30:00Z", NOW)).toBe("há 30m");
  });

  it('retorna "há Xh" para horas atrás no mesmo dia', () => {
    expect(relativeTime("2025-06-15T09:00:00Z", NOW)).toBe("há 3h");
  });

  it('retorna "Ontem" para o dia anterior', () => {
    expect(relativeTime("2025-06-14T12:00:00Z", NOW)).toBe("Ontem");
  });

  it("retorna nome abreviado do dia para esta semana", () => {
    const result = relativeTime("2025-06-12T12:00:00Z", NOW);
    expect(result).toBeTruthy();
    expect(result).not.toBe("Ontem");
    expect(result).not.toMatch(/^\d/);
  });

  it("retorna data (mês + dia) para datas mais antigas que 7 dias", () => {
    const result = relativeTime("2025-05-01T12:00:00Z", NOW);
    expect(result).toBeTruthy();
    expect(result).toMatch(/\d/);
  });
});
