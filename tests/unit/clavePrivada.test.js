import { describe, it, expect } from "vitest";
import { normalizarClave } from "../../api/_lib/clavePrivada.js";

const CUERPO = "MIIEvQIBADANBg";
const REAL = `-----BEGIN PRIVATE KEY-----\n${CUERPO}\n-----END PRIVATE KEY-----\n`;
const PEGADA = `-----BEGIN PRIVATE KEY-----\\n${CUERPO}\\n-----END PRIVATE KEY-----\\n`;

describe("normalizarClave", () => {
  it("convierte los \\n literales en saltos reales", () => {
    // Es como queda al pegar el JSON del service account en Vercel.
    expect(normalizarClave(PEGADA)).toBe(REAL);
  });

  it("deja igual una clave que ya tiene saltos reales", () => {
    // Vercel normaliza distinto segun como se pegue, asi que las dos formas
    // tienen que andar sin que haya que acordarse de cual era.
    expect(normalizarClave(REAL)).toBe(REAL);
  });

  it("saca las comillas si alguien pego el valor con ellas", () => {
    expect(normalizarClave(`"${PEGADA}"`)).toBe(REAL);
  });

  it("devuelve cadena vacia si no hay nada", () => {
    expect(normalizarClave(undefined)).toBe("");
    expect(normalizarClave("")).toBe("");
    expect(normalizarClave(null)).toBe("");
  });
});
