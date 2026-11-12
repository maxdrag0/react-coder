import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/*
  EL BUG QUE CUBRE: la unificación de nombres borró `category`, `name`,
  `description` e `image` de los documentos, pero la consulta del catálogo
  siguió filtrando por `category`. Resultado: entrar a cualquier categoría
  devolvía CERO productos —salvo las dos que todavía tenían el campo viejo— y
  sin ningún error a la vista, porque obtenerProductos atrapa la excepción y
  devuelve una lista vacía.

  La tienda estuvo así casi un mes.
*/

const where = vi.fn((campo, op, valor) => ({ campo, op, valor }));
const getDocs = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocs: (...a) => getDocs(...a),
  orderBy: vi.fn((c) => ({ orderBy: c })),
  query: vi.fn((ref, ...cs) => ({ ref, cs })),
  where: (...a) => where(...a),
  limit: vi.fn((n) => ({ limit: n })),
  startAfter: vi.fn((c) => ({ startAfter: c })),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("../../src/utils/firebase", () => ({ db: {} }));

const { obtenerProductos } =
  await import("../../src/services/firebase/productosFirebase");

beforeEach(() => {
  where.mockClear();
  getDocs.mockReset().mockResolvedValue({ docs: [] });
});

describe("obtenerProductos: el filtro por categoría", () => {
  it("filtra por el campo canónico, no por el que se borró", async () => {
    await obtenerProductos("Tortas");
    expect(where).toHaveBeenCalledTimes(1);
    expect(where.mock.calls[0][0]).toBe("categoria");
  });

  it("acepta la categoría en mayúsculas, que es como quedó parte del catálogo", async () => {
    await obtenerProductos("Tortas");
    expect(where.mock.calls[0][2]).toEqual(["Tortas", "TORTAS"]);
  });

  it("sin categoría no filtra nada", async () => {
    await obtenerProductos(null);
    expect(where).not.toHaveBeenCalled();
  });
});

const archivosDe = (dir) => {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosDe(ruta));
    else if (/\.(jsx?|mjs)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
};

describe("ninguna consulta filtra por un campo que ya no existe", () => {
  /*
    Una consulta contra un campo borrado no tira error: devuelve cero
    documentos. Por eso esto se detecta mirando el código y no esperando a
    que algo falle.
  */
  const BORRADOS = [
    "name",
    "category",
    "description",
    "image",
    "price",
    "precioUnitario",
    "precioDisplay",
    "precioBulto",
  ];

  it("ni en src/ ni en api/", () => {
    const culpables = [];
    for (const ruta of [...archivosDe("src"), ...archivosDe("api")]) {
      const fuente = readFileSync(ruta, "utf8");
      for (const campo of BORRADOS) {
        const re = new RegExp(`(where|orderBy)\\(\\s*["']${campo}["']`);
        if (re.test(fuente)) culpables.push(`${ruta}: ${campo}`);
      }
    }
    expect(culpables).toEqual([]);
  });
});
