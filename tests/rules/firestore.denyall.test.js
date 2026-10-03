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
  it("niega la lectura anónima de cualquier documento", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "products/p1")));
  });

  it("niega la escritura de un usuario autenticado en una colección no declarada", async () => {
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(
      setDoc(doc(cliente.firestore(), "coleccionInventada/x"), { a: 1 })
    );
  });
});
