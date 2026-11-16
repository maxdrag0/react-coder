import { describe, it, expect, vi, beforeEach } from "vitest";

/*
  EL BUG QUE CUBRE, y es destructivo: renombrar un producto escribe el
  documento nuevo y borra el viejo, en un batch para que sea atómico.

  Pero "2302/MI" y "2302-MI" son EL MISMO documento: refDe() cambia la barra
  por guion, así que los dos refs apuntan a products/2302-MI. En ese caso el
  batch hace set y después delete sobre el mismo ref, y el delete gana: el
  producto desaparece.

  Se llegaba ahí sin hacer nada raro. El panel decide renombrar comparando
  los textos crudos, y "2302/MI" !== "2302-MI" es verdadero, así que
  corregirle el código a uno de esos cuatro productos —escribirlo como el
  panel ahora lo muestra— entraba por el camino de mover.
*/

const getDoc = vi.fn();
const setDoc = vi.fn();
const batchSet = vi.fn();
const batchDelete = vi.fn();
const commit = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}` })),
  getDoc: (...a) => getDoc(...a),
  getDocs: vi.fn(),
  setDoc: (...a) => setDoc(...a),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: (...a) => batchSet(...a),
    delete: (...a) => batchDelete(...a),
    commit: (...a) => commit(...a),
  })),
}));

vi.mock("../../src/utils/firebase", () => ({ db: {} }));

const { renombrarProducto } =
  await import("../../src/services/firebase/productosFirebase");

const PRODUCTO = { nombre: "Torta Minerva", categoria: "Tortas" };

beforeEach(() => {
  getDoc.mockReset().mockResolvedValue({ exists: () => false });
  setDoc.mockReset().mockResolvedValue(undefined);
  batchSet.mockReset();
  batchDelete.mockReset();
  commit.mockReset().mockResolvedValue(undefined);
});

describe("renombrar hacia el mismo documento", () => {
  it("no borra nada", async () => {
    await renombrarProducto("2302/MI", "2302-MI", PRODUCTO);
    expect(batchDelete).not.toHaveBeenCalled();
  });

  it("guarda el producto igual", async () => {
    await renombrarProducto("2302/MI", "2302-MI", PRODUCTO);
    expect(setDoc).toHaveBeenCalled();
    expect(setDoc.mock.calls[0][0].path).toBe("products/2302-MI");
    expect(setDoc.mock.calls[0][1]).toEqual(PRODUCTO);
  });

  it("no dice que el código está ocupado", async () => {
    /*
      El chequeo de ocupado busca el documento destino, que es el que se está
      editando: se encontraba a sí mismo y avisaba "ya existe un producto con
      ese código", que era mentira.
    */
    getDoc.mockResolvedValue({ exists: () => true });
    await expect(
      renombrarProducto("2302/MI", "2302-MI", PRODUCTO),
    ).resolves.toBeUndefined();
  });
});

describe("renombrar hacia otro documento", () => {
  it("sigue moviendo: escribe el nuevo y borra el viejo", async () => {
    await renombrarProducto("2302-MI", "2302-XX", PRODUCTO);
    expect(batchSet.mock.calls[0][0].path).toBe("products/2302-XX");
    expect(batchDelete.mock.calls[0][0].path).toBe("products/2302-MI");
    expect(commit).toHaveBeenCalled();
  });

  it("sigue frenando si el código nuevo ya está ocupado", async () => {
    getDoc.mockResolvedValue({ exists: () => true });
    await expect(
      renombrarProducto("2302-MI", "1605", PRODUCTO),
    ).rejects.toMatchObject({ code: "codigo-ocupado" });
    expect(commit).not.toHaveBeenCalled();
  });
});
