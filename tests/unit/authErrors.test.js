import { describe, it, expect } from "vitest";
import { mensajeDeError } from "@/constants/authErrors";

describe("mensajeDeError", () => {
  it("explica que el email ya está en uso", () => {
    // Review Focus #3: hoy muestra "Error al registrarse. Inténtalo de nuevo."
    // y la persona reintenta con los mismos datos para siempre.
    const mensaje = mensajeDeError("auth/email-already-in-use");
    expect(mensaje).toMatch(/ya/i);
    expect(mensaje).not.toMatch(/int[eé]ntalo de nuevo/i);
  });

  it("explica que la contraseña es débil", () => {
    expect(mensajeDeError("auth/weak-password")).toMatch(/contrase/i);
  });

  it("explica que el email es inválido", () => {
    expect(mensajeDeError("auth/invalid-email")).toMatch(/email|correo/i);
  });

  it("no revela si una cuenta existe al fallar el login", () => {
    // Review Focus #4: mensajes distintos convierten el login en un
    // detector de cuentas. Los tres códigos dan el MISMO texto.
    const a = mensajeDeError("auth/user-not-found");
    const b = mensajeDeError("auth/wrong-password");
    const c = mensajeDeError("auth/invalid-credential");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("avisa de demasiados intentos", () => {
    expect(mensajeDeError("auth/too-many-requests")).toMatch(/intento/i);
  });

  it("da un mensaje genérico ante un código desconocido", () => {
    expect(mensajeDeError("auth/algo-que-no-existe")).toBeTruthy();
  });

  it("no explota con undefined", () => {
    expect(mensajeDeError(undefined)).toBeTruthy();
  });
});
