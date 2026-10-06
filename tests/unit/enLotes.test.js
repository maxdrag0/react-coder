import { describe, it, expect } from "vitest";
import { enLotes } from "../../src/utils/enLotes";

describe("enLotes", () => {
  it("devuelve un solo lote cuando entra todo", () => {
    expect(enLotes([1, 2, 3], 400)).toEqual([[1, 2, 3]]);
  });

  it("corta en lotes del tamaño pedido", () => {
    expect(enLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("no devuelve lotes vacíos cuando el total es múltiplo exacto", () => {
    expect(enLotes([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("con una lista vacía no devuelve ningún lote, así no se escribe de más", () => {
    expect(enLotes([], 400)).toEqual([]);
  });

  it("usa 400 por defecto, abajo del límite de 500 de Firestore", () => {
    const lotes = enLotes(Array.from({ length: 401 }, (_, i) => i));
    expect(lotes).toHaveLength(2);
    expect(lotes[0]).toHaveLength(400);
    expect(lotes[1]).toHaveLength(1);
  });
});
