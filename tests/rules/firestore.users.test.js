import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntorno(); });
afterEach(async () => { await limpiar(env); });
afterAll(async () => { await env.cleanup(); });

async function sembrarUsuario(uid, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `users/${uid}`), data);
  });
}

const PERFIL = { name: "Ana", email: "ana@mail.com", telefono: "11-2222-3333" };

describe("users - lectura", () => {
  it("permite leer su propio perfil", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertSucceeds(getDoc(doc(ana.firestore(), "users/ana")));
  });

  it("niega leer el perfil de otro usuario", async () => {
    await sembrarUsuario("ana", PERFIL);
    const otro = env.authenticatedContext("beto");
    await assertFails(getDoc(doc(otro.firestore(), "users/ana")));
  });

  it("permite que un admin lea cualquier perfil", async () => {
    await sembrarUsuario("ana", PERFIL);
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(getDoc(doc(admin.firestore(), "users/ana")));
  });

  it("niega la lectura anónima", async () => {
    await sembrarUsuario("ana", PERFIL);
    const anon = env.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "users/ana")));
  });
});

describe("users - creación en el registro", () => {
  it("permite crear su propio perfil sin el campo role", async () => {
    const ana = env.authenticatedContext("ana");
    await assertSucceeds(setDoc(doc(ana.firestore(), "users/ana"), PERFIL));
  });

  it("NIEGA crear el perfil incluyendo role (ni siquiera role: buyer)", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(
      setDoc(doc(ana.firestore(), "users/ana"), { ...PERFIL, role: "buyer" })
    );
  });

  it("NIEGA crear el perfil con role: admin", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(
      setDoc(doc(ana.firestore(), "users/ana"), { ...PERFIL, role: "admin" })
    );
  });

  it("niega crear el perfil de otro uid", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(setDoc(doc(ana.firestore(), "users/beto"), PERFIL));
  });
});

describe("users - escalada de privilegios", () => {
  it("NIEGA que un usuario se ponga role: admin en su propio perfil", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertFails(updateDoc(doc(ana.firestore(), "users/ana"), { role: "admin" }));
  });

  it("NIEGA tocar role aunque se cambien otros campos a la vez", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertFails(
      updateDoc(doc(ana.firestore(), "users/ana"), {
        telefono: "11-9999-0000",
        role: "admin",
      })
    );
  });

  it("permite editar campos del perfil que no son role", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertSucceeds(
      updateDoc(doc(ana.firestore(), "users/ana"), { telefono: "11-9999-0000" })
    );
  });

  it("permite que el admin corrija un dato del perfil de un cliente (soporte)", async () => {
    await sembrarUsuario("ana", PERFIL);
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(
      updateDoc(doc(admin.firestore(), "users/ana"), { telefono: "11-5555-6666" })
    );
  });

  it("NIEGA que un usuario borre su perfil", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertFails(deleteDoc(doc(ana.firestore(), "users/ana")));
  });
});

// --- Hallazgos de la revision final (Important 9) ---

describe("users - aislamiento por otras formas de consulta", () => {
  it("NIEGA listar la coleccion users entera", async () => {
    const { collection, getDocs } = await import("firebase/firestore");
    await sembrarUsuario("ana", PERFIL);
    const beto = env.authenticatedContext("beto");
    await assertFails(getDocs(collection(beto.firestore(), "users")));
  });

  it("NIEGA escribir role por setDoc con merge", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertFails(
      setDoc(doc(ana.firestore(), "users/ana"), { role: "admin" }, { merge: true })
    );
  });

  it("NIEGA escribir en una subcoleccion del perfil", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertFails(setDoc(doc(ana.firestore(), "users/ana/privado/x"), { a: 1 }));
  });
});
