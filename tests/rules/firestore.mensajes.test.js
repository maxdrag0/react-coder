import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntorno(); });
afterEach(async () => { await limpiar(env); });
afterAll(async () => { await env.cleanup(); });

const MENSAJE = {
  nombre: "Ana",
  email: "ana@mail.com",
  mensaje: "Quiero consultar por una torta de 100 tiros",
  date: new Date().toISOString(),
  leido: false,
};

async function sembrarMensaje(id) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `mensajes/${id}`), MENSAJE);
  });
}

describe("mensajes", () => {
  it("permite que un visitante anónimo deje un mensaje", async () => {
    const anon = env.unauthenticatedContext();
    await assertSucceeds(addDoc(collection(anon.firestore(), "mensajes"), MENSAJE));
  });

  it("niega un mensaje de más de 2000 caracteres", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(
      addDoc(collection(anon.firestore(), "mensajes"), {
        ...MENSAJE,
        mensaje: "x".repeat(2001),
      })
    );
  });

  it("niega un mensaje cuyo cuerpo no es string", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(
      addDoc(collection(anon.firestore(), "mensajes"), { ...MENSAJE, mensaje: 42 })
    );
  });

  it("NIEGA que un cliente autenticado lea los mensajes", async () => {
    await sembrarMensaje("m1");
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(getDoc(doc(cliente.firestore(), "mensajes/m1")));
  });

  it("permite que un admin lea los mensajes", async () => {
    await sembrarMensaje("m1");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(getDoc(doc(admin.firestore(), "mensajes/m1")));
  });

  it("permite que un admin marque un mensaje como leído", async () => {
    await sembrarMensaje("m1");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(updateDoc(doc(admin.firestore(), "mensajes/m1"), { leido: true }));
  });

  it("NIEGA que un cliente borre un mensaje", async () => {
    await sembrarMensaje("m1");
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(deleteDoc(doc(cliente.firestore(), "mensajes/m1")));
  });

  it("permite que un admin borre un mensaje", async () => {
    await sembrarMensaje("m1");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "mensajes/m1")));
  });
});

describe("catch-all sigue cerrado", () => {
  it("niega escribir en una colección no declarada, incluso siendo admin", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      setDoc(doc(admin.firestore(), "coleccionInventada/x"), { a: 1 })
    );
  });

  it("niega leer una colección no declarada, incluso siendo admin", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(getDoc(doc(admin.firestore(), "coleccionInventada/x")));
  });
});
