import { describe, it, expect, vi, beforeEach } from "vitest";

/*
  Si no se puede leer el recargo, la tienda tiene que seguir mostrando los
  productos con los precios de lista.

  Esto NO es hipotético: el documento `config/precios` vive detrás de una
  regla nueva, y entre que se deploya el código y se deployan las reglas hay
  una ventana donde esa lectura está denegada. Si en esa ventana el catálogo
  quedara vacío, la tienda se cae por un número que ni siquiera está cargado
  todavía.
*/

const getDoc = vi.fn();
const obtenerProductos = vi.fn();
const obtenerProductosPorCodigo = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...a) => ({ ruta: a.slice(1).join("/") }),
  getDoc: (...a) => getDoc(...a),
  setDoc: vi.fn(),
}));

vi.mock("../../src/utils/firebase", () => ({ db: {} }));

vi.mock("../../src/services/firebase/productosFirebase", () => ({
  obtenerProductos: (...a) => obtenerProductos(...a),
  obtenerProductosPorCodigo: (...a) => obtenerProductosPorCodigo(...a),
  crearProducto: vi.fn(),
}));

vi.mock("../../src/services/firebase/comprasFirebase", () => ({
  obtenerTodasLasCompras: vi.fn(),
}));

vi.mock("../../src/services/firebase/contactoFirebase", () => ({
  crearContacto: vi.fn(),
  obtenerMensajes: vi.fn(),
  marcarMensajeComoLeido: vi.fn(),
  eliminarMensaje: vi.fn(),
}));

const PRODUCTO = {
  codigo: "A12",
  nombre: "Torta 100 tiros",
  presentaciones: { unitario: { precio: 8000 } },
};

const negado = () => {
  const e = new Error("Missing or insufficient permissions.");
  e.code = "permission-denied";
  return e;
};

beforeEach(() => {
  vi.resetModules();
  getDoc.mockReset();
  obtenerProductos
    .mockReset()
    .mockResolvedValue({ items: [PRODUCTO], lastVisibleDoc: null });
  obtenerProductosPorCodigo.mockReset().mockResolvedValue(PRODUCTO);
});

describe("obtenerRecargo cuando la lectura falla", () => {
  it("devuelve cero en vez de tirar", async () => {
    getDoc.mockRejectedValue(negado());
    const { obtenerRecargo } =
      await import("../../src/services/firebase/configFirebase");
    await expect(obtenerRecargo()).resolves.toBe(0);
  });

  it("devuelve cero si el documento no existe todavía", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    const { obtenerRecargo } =
      await import("../../src/services/firebase/configFirebase");
    await expect(obtenerRecargo()).resolves.toBe(0);
  });
});

describe("el catálogo sobrevive a un recargo ilegible", () => {
  it("el listado devuelve los productos con el precio de lista", async () => {
    getDoc.mockRejectedValue(negado());
    const { firebase } = await import("../../src/services/firebase/index.js");

    const pagina = await firebase.obtenerProductos(null, null, 100);
    expect(pagina.items).toHaveLength(1);
    expect(pagina.items[0].presentaciones.unitario.precio).toBe(8000);
  });

  it("el detalle devuelve el producto", async () => {
    getDoc.mockRejectedValue(negado());
    const { firebase } = await import("../../src/services/firebase/index.js");

    const p = await firebase.obtenerProductosPorCodigo("A12");
    expect(p.nombre).toBe("Torta 100 tiros");
  });

  it("conserva lastVisibleDoc, que es lo que pagina", async () => {
    // Sin esto el catálogo trae la primera página y se queda ahí.
    getDoc.mockRejectedValue(negado());
    obtenerProductos.mockResolvedValue({
      items: [PRODUCTO],
      lastVisibleDoc: { marca: "cursor" },
    });
    const { firebase } = await import("../../src/services/firebase/index.js");

    const pagina = await firebase.obtenerProductos(null, null, 100);
    expect(pagina.lastVisibleDoc).toEqual({ marca: "cursor" });
  });

  it("una página vacía no rompe", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    obtenerProductos.mockResolvedValue({ items: [], lastVisibleDoc: null });
    const { firebase } = await import("../../src/services/firebase/index.js");

    await expect(firebase.obtenerProductos(null, null, 100)).resolves.toEqual({
      items: [],
      lastVisibleDoc: null,
    });
  });
});
