import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => {
  env = await montarEntorno();
});

afterEach(async () => {
  await limpiar(env);
});

afterAll(async () => {
  await env.cleanup();
});

describe("default deny", () => {
  // Usa una colección NO declarada a propósito: las colecciones con regla
  // propia (products, promociones) sí son legibles, y eso es correcto.
  // Lo que este archivo prueba es que lo no declarado nace cerrado.
  it("niega la lectura anónima de una colección no declarada", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "coleccionInventada/x")));
  });

  it("niega la escritura de un usuario autenticado en una colección no declarada", async () => {
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(
      setDoc(doc(cliente.firestore(), "coleccionInventada/x"), { a: 1 })
    );
  });
});
