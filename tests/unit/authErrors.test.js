import { describe, it, expect } from "vitest";
import { mensajeDeError, mensajeDeErrorDeReset } from "@/constants/authErrors";

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

describe("mensajeDeErrorDeReset", () => {
  it("devuelve null para auth/user-not-found (no revela si la cuenta existe)", () => {
    // Review Focus #4: null significa "mostrar la confirmación genérica".
    expect(mensajeDeErrorDeReset("auth/user-not-found")).toBeNull();
  });

  it("devuelve null para un código desconocido (ante la duda, no filtrar)", () => {
    expect(mensajeDeErrorDeReset("auth/vaya-a-saber")).toBeNull();
  });

  it("devuelve null para undefined", () => {
    expect(mensajeDeErrorDeReset(undefined)).toBeNull();
  });

  it("SÍ avisa cuando el email tiene formato inválido", () => {
    // Important 4: tragarlo y decir "te enviamos un link" deja a la persona
    // esperando un mail que nunca se pidió.
    expect(mensajeDeErrorDeReset("auth/invalid-email")).toMatch(/formato válido/i);
  });

  it("SÍ avisa cuando falta el email", () => {
    expect(mensajeDeErrorDeReset("auth/missing-email")).toMatch(/escribí tu email/i);
  });

  it("SÍ avisa cuando se cae la red", () => {
    expect(mensajeDeErrorDeReset("auth/network-request-failed")).toMatch(/conexión/i);
  });

  it("SÍ avisa cuando hay demasiados intentos", () => {
    expect(mensajeDeErrorDeReset("auth/too-many-requests")).toMatch(/intento/i);
  });

  it("ningún mensaje que devuelve menciona la existencia de la cuenta", () => {
    const codigos = [
      "auth/invalid-email", "auth/missing-email",
      "auth/network-request-failed", "auth/too-many-requests",
    ];
    for (const c of codigos) {
      expect(mensajeDeErrorDeReset(c)).not.toMatch(/no (existe|est[aá] registrad)/i);
    }
  });
});
