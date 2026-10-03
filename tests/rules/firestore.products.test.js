import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntorno(); });
afterEach(async () => { await limpiar(env); });
afterAll(async () => { await env.cleanup(); });

// Siembra saltándose las reglas, para tener algo que leer.
async function sembrar(coleccion, id, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `${coleccion}/${id}`), data);
  });
}

describe("products", () => {
  it("permite la lectura anónima (el catálogo es público)", async () => {
    await sembrar("products", "p1", { name: "Torta 100 tiros", price: 4500 });
    const anon = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(anon.firestore(), "products/p1")));
  });

  it("niega la escritura anónima", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(setDoc(doc(anon.firestore(), "products/p1"), { price: 1 }));
  });

  it("niega la escritura de un cliente autenticado sin el claim admin", async () => {
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(setDoc(doc(cliente.firestore(), "products/p1"), { price: 1 }));
  });

  it("niega que un cliente se declare admin con un claim que no es booleano", async () => {
    const falso = env.authenticatedContext("cliente1", { admin: "true" });
    await assertFails(setDoc(doc(falso.firestore(), "products/p1"), { price: 1 }));
  });

  it("permite que un admin cree un producto", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(
      setDoc(doc(admin.firestore(), "products/p1"), { name: "Torta", price: 4500 })
    );
  });

  it("permite que un admin borre un producto", async () => {
    await sembrar("products", "p1", { name: "Torta" });
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "products/p1")));
  });
});

describe("promociones", () => {
  it("permite la lectura anónima", async () => {
    await sembrar("promociones", "promo1", { codigo: "VERANO", descuento: 10 });
    const anon = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(anon.firestore(), "promociones/promo1")));
  });

  it("niega que un cliente cree una promoción", async () => {
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(
      setDoc(doc(cliente.firestore(), "promociones/promo1"), { descuento: 99 })
    );
  });

  it("permite que un admin cree una promoción", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(
      setDoc(doc(admin.firestore(), "promociones/promo1"), { codigo: "VERANO", descuento: 10 })
    );
  });
});
