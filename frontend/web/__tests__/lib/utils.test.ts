import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("retorna string vazia sem argumentos", () => {
    expect(cn()).toBe("");
  });

  it("concatena classes simples", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignora valores falsy (false, undefined, null)", () => {
    expect(cn("base", false && "hidden", undefined, null, "visible")).toBe(
      "base visible"
    );
  });

  it("resolve conflito Tailwind — último vence", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("resolve conflito Tailwind com classe condicional", () => {
    expect(cn("text-red-500", true && "text-blue-500")).toBe("text-blue-500");
  });

  it("aceita array de classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});
