import { describe, it, expect } from "vitest";
import { validarPassword } from "@/utils/validarPassword";

describe("validarPassword", () => {
  it("rechaza 7 caracteres", () => {
    expect(validarPassword("1234567")).toBeTruthy();
  });

  it("ACEPTA exactamente 8 caracteres", () => {
    // Review Focus #5: un `>` en lugar de `>=` rechaza una contraseña válida.
    expect(validarPassword("12345678")).toBeNull();
  });

  it("acepta 9 caracteres", () => {
    expect(validarPassword("123456789")).toBeNull();
  });

  it("rechaza una cadena vacía", () => {
    expect(validarPassword("")).toBeTruthy();
  });

  it("rechaza undefined sin explotar", () => {
    expect(validarPassword(undefined)).toBeTruthy();
  });

  it("devuelve un mensaje en castellano que menciona el mínimo", () => {
    expect(validarPassword("abc")).toContain("8");
  });

  it("no cuenta los espacios de los extremos como caracteres válidos", () => {
    expect(validarPassword("  abc   ")).toBeTruthy();
  });
});
