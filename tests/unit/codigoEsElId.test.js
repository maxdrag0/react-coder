import { describe, it, expect, vi, beforeEach } from "vitest";

/*
  EL BUG QUE CUBRE: el código del proveedor puede traer una barra ("2302/MI"),
  y una barra no es válida en el id de un documento de Firestore. Así que ese
  producto vive en el documento "2302-MI" y el CAMPO `codigo` conserva la
  barra.

  obtenerProductos armaba cada producto como `{codigo: doc.id, ...doc.data()}`,
  con el spread DESPUÉS: el campo de los datos pisaba al id del documento. La
  app entera recibía "2302/MI" y nunca "2302-MI".

  Lo que eso rompía, con cuatro productos reales del catálogo:

  - La card enlaza a `/product/${codigo}`, que daba "/product/2302/MI" —dos
    segmentos— contra una ruta "/product/:codigo" que toma uno. No matcheaba
    y caía en "Esta página no existe". Los cuatro productos eran invisibles.

  - Y si alguno hubiera llegado al carrito, el servidor arma la referencia con
    `collection("products").doc(codigo)`, que con la barra TIRA: una ruta de
    documento necesita una cantidad par de segmentos. El pedido entero se
    caía, con los demás productos adentro.

  El id del documento es la única identidad que sirve para leer, escribir y
  enlazar. Es el que tiene que ganar.
*/

const getDocs = vi.fn();
const getDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn((_db, _col, id) => ({ id })),
  getDoc: (...a) => getDoc(...a),
  getDocs: (...a) => getDocs(...a),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("../../src/utils/firebase", () => ({ db: {} }));

const { obtenerProductos, obtenerProductosPorCodigo } =
  await import("../../src/services/firebase/productosFirebase");

/* Así viene de Firestore: el documento se llama con guion y el campo guarda
   la barra, que es como lo escribe el proveedor. */
const DOCUMENTO = {
  id: "2302-MI",
  data: () => ({
    codigo: "2302/MI",
    nombre: "Torta Minerva",
    categoria: "Tortas",
  }),
};

beforeEach(() => {
  getDocs.mockReset().mockResolvedValue({ docs: [DOCUMENTO] });
  getDoc.mockReset().mockResolvedValue({ ...DOCUMENTO, exists: () => true });
});

describe("el código que recibe la app es el id del documento", () => {
  it("en el listado", async () => {
    const { items } = await obtenerProductos(null);
    expect(items[0].codigo).toBe("2302-MI");
  });

  it("en el detalle", async () => {
    const p = await obtenerProductosPorCodigo("2302-MI");
    expect(p.codigo).toBe("2302-MI");
  });

  it("sirve como un solo segmento de URL", async () => {
    /*
      La ruta es "/product/:codigo" y toma UN segmento. Con la barra el
      enlace quedaba partido en dos y caía en la página de no encontrado.
    */
    const { items } = await obtenerProductos(null);
    expect(items[0].codigo).not.toContain("/");
    expect(encodeURIComponent(items[0].codigo)).toBe(items[0].codigo);
  });

  it("sirve como id de documento de Firestore", async () => {
    // Una ruta de documento necesita una cantidad PAR de segmentos:
    // "products/2302/MI" son tres y la librería tira.
    const { items } = await obtenerProductos(null);
    expect(items[0].codigo.split("/")).toHaveLength(1);
  });

  it("no pierde el resto de los datos del producto", async () => {
    const { items } = await obtenerProductos(null);
    expect(items[0].nombre).toBe("Torta Minerva");
    expect(items[0].categoria).toBe("Tortas");
  });

  it("un producto sin barra en el código queda igual", async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: "1605", data: () => ({ codigo: "1605", nombre: "Candela" }) },
      ],
    });
    const { items } = await obtenerProductos(null);
    expect(items[0].codigo).toBe("1605");
  });
});
