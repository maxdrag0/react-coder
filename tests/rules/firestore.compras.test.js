import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, addDoc } from "firebase/firestore";
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

describe("compras - creación: cerrada al cliente", () => {
  /*
    Las ordenes las crea api/orden.js con el Admin SDK, que saltea las reglas.
    El cliente NO puede crearlas, y eso es lo que impide que mande un pedido
    con el total que quiera: verificar el total desde las reglas es imposible,
    porque exigiria un get() por producto del carrito y Firestore topea en 10
    accesos a documentos por evaluacion.

    Antes habia diez casos validando la forma del documento (date obligatorio,
    total numerico, maximo de items, email del token). Se fueron con el
    create: con la puerta cerrada todos pasaban por la misma razon y ninguno
    probaba ya la regla que decia probar.
  */
  it("NIEGA que un cliente cree un pedido, incluso con la forma correcta", async () => {
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(addDoc(collection(ana.firestore(), "compras"), orden("ana")));
  });

  it("NIEGA que un cliente cree un pedido con un id elegido por el", async () => {
    // addDoc genera el id; setDoc lo elige. Los dos tienen que estar cerrados,
    // porque el servidor usa el id de idempotencia y un cliente podria querer
    // pisar un pedido existente.
    const ana = env.authenticatedContext("ana", { email: "ana@mail.com" });
    await assertFails(
      setDoc(doc(ana.firestore(), "compras/elegido-por-el-cliente"), orden("ana"))
    );
  });

  it("NIEGA la creacion anonima", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(addDoc(collection(anon.firestore(), "compras"), orden("ana")));
  });

  it("NIEGA que un admin cree un pedido desde el cliente", async () => {
    // El panel no crea pedidos: los crea el servidor. Si el admin pudiera,
    // habria dos caminos de creacion y uno sin validar.
    const admin = env.authenticatedContext("max", {
      email: "max@mail.com",
      admin: true,
    });
    await assertFails(addDoc(collection(admin.firestore(), "compras"), orden("max")));
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
