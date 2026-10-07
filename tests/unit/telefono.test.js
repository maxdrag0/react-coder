import { describe, it, expect } from "vitest";
import {
  soloDigitos,
  esTelefonoValido,
  errorDeTelefono,
  paraWhatsapp,
} from "../../src/utils/telefono";

describe("soloDigitos", () => {
  it("limpia los formatos con los que la gente escribe su número", () => {
    expect(soloDigitos("11 2345-6789")).toBe("1123456789");
    expect(soloDigitos("(011) 2345 6789")).toBe("01123456789");
    expect(soloDigitos("+54 9 11 2345-6789")).toBe("5491123456789");
  });

  it("no explota con nada", () => {
    expect(soloDigitos("")).toBe("");
    expect(soloDigitos(null)).toBe("");
    expect(soloDigitos(undefined)).toBe("");
  });
});

describe("esTelefonoValido", () => {
  // La validación es suelta a propósito: rechazar un número válido es peor
  // que aceptar uno raro, porque el dueño lo va a mirar igual antes de
  // llamar. Solo frena lo que no puede ser un teléfono.
  it("acepta un celular argentino escrito de varias formas", () => {
    expect(esTelefonoValido("1123456789")).toBe(true);
    expect(esTelefonoValido("11 2345-6789")).toBe(true);
    expect(esTelefonoValido("+54 9 11 2345 6789")).toBe(true);
    expect(esTelefonoValido("0351 155 123456")).toBe(true);
  });

  it("acepta un fijo del interior, que es más corto", () => {
    expect(esTelefonoValido("2954 123456")).toBe(true);
    expect(esTelefonoValido("35112345")).toBe(true);
  });

  it("rechaza lo que no alcanza a ser un teléfono", () => {
    expect(esTelefonoValido("1234567")).toBe(false);
    expect(esTelefonoValido("123")).toBe(false);
    expect(esTelefonoValido("")).toBe(false);
    expect(esTelefonoValido(null)).toBe(false);
  });

  it("rechaza algo tan largo que es un error de tipeo", () => {
    expect(esTelefonoValido("1234567890123456")).toBe(false);
  });

  it("rechaza texto sin dígitos suficientes", () => {
    expect(esTelefonoValido("llamame al celu")).toBe(false);
    expect(esTelefonoValido("no tengo")).toBe(false);
  });
});

describe("errorDeTelefono", () => {
  it("no dice nada si está bien", () => {
    expect(errorDeTelefono("11 2345-6789")).toBeNull();
  });

  it("pide el número cuando está vacío, en vez de decir que es inválido", () => {
    expect(errorDeTelefono("")).toMatch(/necesitamos|ingres/i);
  });

  it("explica qué pasa cuando es corto, sin hablar de dígitos mínimos", () => {
    const mensaje = errorDeTelefono("123");
    expect(mensaje).not.toBeNull();
    expect(mensaje).toMatch(/completo|c[oó]digo de [aá]rea/i);
  });
});

describe("paraWhatsapp", () => {
  // El dueño contacta por WhatsApp, así que el panel va a linkear directo.
  it("arma el número con el código de país", () => {
    expect(paraWhatsapp("11 2345-6789")).toBe("5491123456789");
  });

  it("no duplica el 54 si ya lo trae", () => {
    expect(paraWhatsapp("+54 9 11 2345 6789")).toBe("5491123456789");
    expect(paraWhatsapp("5491123456789")).toBe("5491123456789");
  });

  it("saca el 0 del código de área y el 15 del celular, que WhatsApp no usa", () => {
    expect(paraWhatsapp("011 15 2345 6789")).toBe("5491123456789");
    expect(paraWhatsapp("0351 15 5123456")).toBe("5493515123456");
  });

  it("devuelve null si el número no sirve", () => {
    expect(paraWhatsapp("123")).toBeNull();
    expect(paraWhatsapp("")).toBeNull();
  });
});
