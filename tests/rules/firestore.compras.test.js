import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntorno(); });
afterEach(async () => { await limpiar(env); });
afterAll(async () => { await env.cleanup(); });

function orden(uid, extra = {}) {
  return {
    buyer: { uid, name: "Ana", email: "ana@mail.com" },
    items: [{ codigo: "P1", cantidad: 2, precioUnitario: 4500 }],
    total: 9000,
    date: new Date().toISOString(),
    ...extra,
  };
}

async function sembrarCompra(id, uid) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `compras/${id}`), orden(uid));
  });
}

describe("compras - lectura", () => {
  it("permite leer su propio pedido", async () => {
    await sembrarCompra("c1", "ana");
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertSucceeds(getDoc(doc(ana.firestore(), "compras/c1")));
  });

  it("NIEGA leer el pedido de otro cliente", async () => {
    await sembrarCompra("c1", "ana");
    const beto = env.authenticatedContext("beto", { email: "beto@mail.com" });
    await assertFails(getDoc(doc(beto.firestore(), "compras/c1")));
  });

  it("NIEGA listar la colección entera siendo cliente", async () => {
    await sembrarCompra("c1", "ana");
    await sembrarCompra("c2", "beto");
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(getDocs(collection(ana.firestore(), "compras")));
  });

  it("permite que un admin lea cualquier pedido", async () => {
    await sembrarCompra("c1", "ana");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(getDoc(doc(admin.firestore(), "compras/c1")));
  });

  it("permite que un admin liste la colección entera (es el panel)", async () => {
    await sembrarCompra("c1", "ana");
    await sembrarCompra("c2", "beto");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(getDocs(collection(admin.firestore(), "compras")));
  });

  it("niega la lectura anónima", async () => {
    await sembrarCompra("c1", "ana");
    const anon = env.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "compras/c1")));
  });
});

describe("compras - creación", () => {
  it("permite crear un pedido propio con forma válida", async () => {
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertSucceeds(addDoc(collection(ana.firestore(), "compras"), orden("ana")));
  });

  it("NIEGA crear un pedido a nombre de otro uid", async () => {
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(addDoc(collection(ana.firestore(), "compras"), orden("beto")));
  });

  it("niega crear un pedido anónimo", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(addDoc(collection(anon.firestore(), "compras"), orden("ana")));
  });

  it("niega un pedido con items vacío", async () => {
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), orden("ana", { items: [] }))
    );
  });

  it("niega un pedido con total negativo", async () => {
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), orden("ana", { total: -500 }))
    );
  });

  it("niega un pedido con total que no es número", async () => {
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), orden("ana", { total: "9000" }))
    );
  });

  it("niega un pedido con más de 50 items", async () => {
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    const muchos = Array.from({ length: 51 }, (_, i) => ({
      codigo: `P${i}`, cantidad: 1, precioUnitario: 100,
    }));
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), orden("ana", { items: muchos }))
    );
  });
});

describe("compras - modificación", () => {
  it("NIEGA que un cliente borre su propio pedido", async () => {
    await sembrarCompra("c1", "ana");
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(deleteDoc(doc(ana.firestore(), "compras/c1")));
  });

  it("permite que un admin borre un pedido", async () => {
    await sembrarCompra("c1", "ana");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "compras/c1")));
  });
});

// --- Hallazgos de la revision final ---

describe("compras - forma del documento (Important 2 y 3)", () => {
  it("NIEGA un pedido sin date (quedaria invisible en el panel para siempre)", async () => {
    // obtenerTodasLasCompras ordena por date, y Firestore omite en silencio
    // los documentos que no tienen el campo del orderBy: el cliente ve
    // "compra exitosa" y Max nunca ve el pedido.
    const sinDate = orden("ana");
    delete sinDate.date;
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(addDoc(collection(ana.firestore(), "compras"), sinDate));
  });

  it("NIEGA un pedido con campos no declarados en el esquema", async () => {
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), orden("ana", { basura: "x".repeat(500 * 1024) }))
    );
  });

  it("NIEGA falsificar el email del comprador", async () => {
    // El subproyecto C va a mandar el mail del pedido a buyer.email.
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), {
        ...orden("ana"),
        buyer: { uid: "ana", name: "Ana", email: "victima@otrodominio.com" },
      })
    );
  });

  it("permite el pedido cuando buyer.email coincide con el del token", async () => {
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertSucceeds(addDoc(collection(ana.firestore(), "compras"), orden("ana")));
  });

  it("NIEGA el pedido si el token no trae email", async () => {
    // Solo usamos email/password y Google, que siempre traen email. Este test
    // documenta el limite: si se agrega un proveedor sin email (telefono,
    // anonimo), el checkout se rompe y hay que revisar esta regla.
    const sinEmail = env.authenticatedContext("ana");
    await assertFails(addDoc(collection(sinEmail.firestore(), "compras"), orden("ana")));
  });
});

describe("compras - aislamiento por otras formas de consulta (Important 9)", () => {
  it("NIEGA la consulta de grupo de coleccion", async () => {
    const { collectionGroup, getDocs: getD } = await import("firebase/firestore");
    await sembrarCompra("c1", "ana");
    const beto = env.authenticatedContext("beto", { email: "beto@mail.com" });
    await assertFails(getD(collectionGroup(beto.firestore(), "compras")));
  });

  it("NIEGA listar filtrando por el uid de otro", async () => {
    const { where, query } = await import("firebase/firestore");
    await sembrarCompra("c1", "ana");
    const beto = env.authenticatedContext("beto", { email: "beto@mail.com" });
    await assertFails(
      getDocs(query(collection(beto.firestore(), "compras"), where("buyer.uid", "==", "ana")))
    );
  });

  it("NIEGA listar ordenando sin filtrar por uid", async () => {
    const { orderBy, query } = await import("firebase/firestore");
    await sembrarCompra("c1", "ana");
    const beto = env.authenticatedContext("beto", { email: "beto@mail.com" });
    await assertFails(
      getDocs(query(collection(beto.firestore(), "compras"), orderBy("total", "desc")))
    );
  });

  it("permite listar filtrando por su propio uid", async () => {
    const { where, query } = await import("firebase/firestore");
    await sembrarCompra("c1", "ana");
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertSucceeds(
      getDocs(query(collection(ana.firestore(), "compras"), where("buyer.uid", "==", "ana")))
    );
  });
});
