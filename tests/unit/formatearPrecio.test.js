import { describe, it, expect } from "vitest";
import { formatearPrecio } from "@/utils/formatearPrecio";

describe("formatearPrecio", () => {
  it("usa punto como separador de miles", () => {
    expect(formatearPrecio(4500)).toBe("$4.500");
  });

  it("formatea cientos de miles", () => {
    expect(formatearPrecio(390000)).toBe("$390.000");
  });

  it("formatea un número chico sin separador", () => {
    expect(formatearPrecio(270)).toBe("$270");
  });

  it("no muestra decimales", () => {
    expect(formatearPrecio(4500.75)).toBe("$4.501");
  });

  it("devuelve null para null, para no renderizar nada", () => {
    expect(formatearPrecio(null)).toBeNull();
  });

  it("devuelve null para undefined", () => {
    expect(formatearPrecio(undefined)).toBeNull();
  });

  it("devuelve null para cero (un precio de 0 no es un precio)", () => {
    expect(formatearPrecio(0)).toBeNull();
  });

  it("devuelve null para un string", () => {
    expect(formatearPrecio("4500")).toBeNull();
  });
});
