import { describe, it, expect, vi, beforeEach } from "vitest";
import { idDeCodigo, mismoDocumento } from "@/constants/codigoProducto";

/*
  Los cuatro productos cuyo código del proveedor trae una barra ("2302/MI")
  viven en un documento con guion ("2302-MI"), porque la barra parte la ruta
  de Firestore en segmentos y "products/2302/MI" son tres, que no es un
  documento.

  Estos tests cubren los dos lugares donde eso todavía rompía después de
  arreglar la lectura del catálogo.
*/

describe("idDeCodigo", () => {
  it("cambia la barra por guion", () => {
    expect(idDeCodigo("2302/MI")).toBe("2302-MI");
    expect(idDeCodigo("0001/20")).toBe("0001-20");
  });

  it("es idempotente: un id ya hecho queda igual", () => {
    // Se aplica sin saber de dónde viene el valor, así que tiene que poder
    // aplicarse dos veces sin cambiar el resultado.
    expect(idDeCodigo(idDeCodigo("2302/MI"))).toBe("2302-MI");
    expect(idDeCodigo("1605")).toBe("1605");
  });

  it("reconoce dos escrituras del mismo documento", () => {
    expect(mismoDocumento("2302/MI", "2302-MI")).toBe(true);
    expect(mismoDocumento("2302/MI", "2302/AR")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// El pedido
// ---------------------------------------------------------------------------

const verifyIdToken = vi.fn();
const getAll = vi.fn();
const set = vi.fn();
const getPerfil = vi.fn();
const getConfig = vi.fn();
const docDeColeccion = vi.fn();

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n) => ({ __incremento: n }) },
}));

vi.mock("../../api/_lib/firebaseAdmin.js", () => ({
  auth: { verifyIdToken: (...a) => verifyIdToken(...a) },
  db: {
    getAll: (...a) => getAll(...a),
    batch: () => ({ update: vi.fn(), commit: vi.fn().mockResolvedValue() }),
    collection: (nombre) => ({
      doc: (id) => {
        docDeColeccion(nombre, id);
        /*
          El SDK real TIRA acá si el id tiene una barra: una ruta de
          documento necesita una cantidad par de segmentos y
          "products/2302/MI" son tres. El mock lo reproduce, porque si
          aceptara cualquier string el bug pasaría desapercibido —que es
          exactamente lo que estaba pasando.
        */
        if (String(id).includes("/")) {
          throw new Error(
            `Value for argument "documentPath" must point to a document, but was "${id}".`,
          );
        }
        return {
          id,
          set: (...a) => set(...a),
          get: (...a) =>
            nombre === "config" ? getConfig(...a) : getPerfil(...a),
        };
      },
    }),
  },
}));

const { default: handler } = await import("../../api/orden.js");

const PRODUCTO = {
  codigo: "2302/MI",
  nombre: "Torta Minerva",
  estado: "activo",
  presentaciones: { unitario: { precio: 13900 } },
};

const respuesta = () => {
  const r = { codigo: null, cuerpo: null };
  r.status = (c) => ((r.codigo = c), r);
  r.json = (b) => ((r.cuerpo = b), r);
  return r;
};

const pedidoCon = (codigo) => ({
  method: "POST",
  headers: { authorization: "Bearer token" },
  body: {
    idempotencia: "uuid-1",
    items: [
      {
        codigo,
        unidad: "unitario",
        modelo: null,
        cantidad: 1,
        precioVisto: 13900,
      },
    ],
  },
});

beforeEach(() => {
  verifyIdToken.mockReset().mockResolvedValue({
    uid: "ana",
    email: "ana@mail.com",
    name: "Ana",
    email_verified: true,
  });
  // Firestore devuelve el documento con su id, que es el saneado.
  getAll
    .mockReset()
    .mockResolvedValue([{ exists: true, id: "2302-MI", data: () => PRODUCTO }]);
  set.mockReset().mockResolvedValue(undefined);
  // El perfil completo: sin direccion el pedido no entra, y este archivo
  // es sobre el codigo con barra, no sobre el envio.
  getPerfil.mockReset().mockResolvedValue({
    exists: true,
    data: () => ({
      telefono: "1123456789",
      direccion: "San Martín 742",
      ciudad: "Córdoba",
    }),
  });
  getConfig.mockReset().mockResolvedValue({ exists: false });
  docDeColeccion.mockReset();
});

describe("un carrito con el código viejo, con barra", () => {
  /*
    No es hipotético: el carrito vive en localStorage. Alguien que lo armó
    antes del arreglo tiene "2302/MI" guardado y lo manda tal cual. El
    arreglo del catálogo no lo alcanza.
  */
  it("no voltea el pedido", async () => {
    const res = respuesta();
    await handler(pedidoCon("2302/MI"), res);
    expect(res.codigo).toBe(201);
  });

  it("nunca le pasa una barra a Firestore", async () => {
    /*
      El documento se pide más de una vez —para cotizar y para el contador de
      más vendidos—, así que lo que importa no es cuántas veces sino que
      NINGUNA lleve la barra: con una sola que la lleve, tira y se cae todo.
    */
    await handler(pedidoCon("2302/MI"), respuesta());
    const ids = docDeColeccion.mock.calls
      .filter(([coleccion]) => coleccion === "products")
      .map(([, id]) => id);

    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id === "2302-MI")).toBe(true);
  });

  it("guarda el renglón con el id del documento", async () => {
    // Si guardara la barra, el pedido quedaría apuntando a algo que no se
    // puede volver a leer.
    const res = respuesta();
    await handler(pedidoCon("2302/MI"), res);
    expect(set.mock.calls.at(-1)[0].items[0].codigo).toBe("2302-MI");
  });

  it("cotiza igual que con el código nuevo", async () => {
    const conBarra = respuesta();
    await handler(pedidoCon("2302/MI"), conBarra);
    const conGuion = respuesta();
    await handler(pedidoCon("2302-MI"), conGuion);
    expect(conBarra.cuerpo.total).toBe(conGuion.cuerpo.total);
  });
});
