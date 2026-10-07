import { describe, it, expect } from "vitest";
import {
  modelosDe,
  tieneModelos,
  modeloPorId,
  idDeEtiqueta,
  idLibre,
} from "../../src/constants/modelos";

const CON_MODELOS = {
  codigo: "M100",
  nombre: "Mortero",
  modelos: [
    {
      id: "3-pulgadas",
      etiqueta: '3 pulgadas',
      presentaciones: { unitario: { precio: 8000 }, display: { precio: 15000, unidades: 5 } },
    },
    {
      id: "4-pulgadas",
      etiqueta: "4 pulgadas",
      presentaciones: { unitario: { precio: 12000 } },
    },
  ],
};

const SIN_MODELOS = { codigo: "A1", nombre: "Petardo", precioUnitario: 300 };

describe("modelosDe", () => {
  it("devuelve los modelos normalizados", () => {
    expect(modelosDe(CON_MODELOS).map((m) => m.id)).toEqual([
      "3-pulgadas",
      "4-pulgadas",
    ]);
  });

  it("devuelve vacío para un producto sin modelos", () => {
    // Es el caso de los 323 del catalogo: nada tiene que cambiar para ellos.
    expect(modelosDe(SIN_MODELOS)).toEqual([]);
    expect(modelosDe({ modelos: [] })).toEqual([]);
  });

  it("no explota con nada", () => {
    expect(modelosDe(null)).toEqual([]);
    expect(modelosDe({ modelos: "no soy un array" })).toEqual([]);
  });

  it("descarta un modelo sin id o sin etiqueta", () => {
    // Un modelo sin id no se puede poner en el carrito, y sin etiqueta no se
    // puede elegir: mostrarlo seria ofrecer algo incomprable.
    const sucio = {
      modelos: [
        { id: "ok", etiqueta: "Rojo", presentaciones: { unitario: { precio: 10 } } },
        { etiqueta: "Sin id", presentaciones: {} },
        { id: "sin-etiqueta", presentaciones: {} },
      ],
    };
    expect(modelosDe(sucio).map((m) => m.id)).toEqual(["ok"]);
  });

  it("descarta un modelo sin ningún precio", () => {
    const sucio = {
      modelos: [
        { id: "a", etiqueta: "Rojo", presentaciones: { unitario: { precio: 10 } } },
        { id: "b", etiqueta: "Verde", presentaciones: {} },
      ],
    };
    expect(modelosDe(sucio).map((m) => m.id)).toEqual(["a"]);
  });

  it("descarta ids repetidos, que romperían la clave del carrito", () => {
    const sucio = {
      modelos: [
        { id: "x", etiqueta: "Uno", presentaciones: { unitario: { precio: 10 } } },
        { id: "x", etiqueta: "Dos", presentaciones: { unitario: { precio: 20 } } },
      ],
    };
    expect(modelosDe(sucio)).toHaveLength(1);
    expect(modelosDe(sucio)[0].etiqueta).toBe("Uno");
  });
});

describe("tieneModelos", () => {
  it("distingue los dos tipos de producto", () => {
    expect(tieneModelos(CON_MODELOS)).toBe(true);
    expect(tieneModelos(SIN_MODELOS)).toBe(false);
  });
});

describe("modeloPorId", () => {
  it("encuentra el modelo", () => {
    expect(modeloPorId(CON_MODELOS, "4-pulgadas").etiqueta).toBe("4 pulgadas");
  });

  it("devuelve null si no está", () => {
    // Pasa con un carrito viejo: el modelo se borro del producto.
    expect(modeloPorId(CON_MODELOS, "borrado")).toBeNull();
    expect(modeloPorId(SIN_MODELOS, "cualquiera")).toBeNull();
    expect(modeloPorId(CON_MODELOS, null)).toBeNull();
  });
});

describe("idDeEtiqueta", () => {
  // El id va en la clave del carrito y en el pedido, asi que tiene que ser
  // estable y legible. Se genera una vez y NO cambia si se edita la etiqueta.
  it("hace un slug legible", () => {
    expect(idDeEtiqueta("3 pulgadas")).toBe("3-pulgadas");
    expect(idDeEtiqueta("Rojo")).toBe("rojo");
  });

  it("saca los acentos y la ñ", () => {
    expect(idDeEtiqueta("Pequeño")).toBe("pequeno");
    expect(idDeEtiqueta("Múltiple")).toBe("multiple");
  });

  it("colapsa separadores y recorta", () => {
    expect(idDeEtiqueta("  3,5   cm  ")).toBe("3-5-cm");
    expect(idDeEtiqueta('5" grande')).toBe("5-grande");
  });

  it("devuelve null si no queda nada usable", () => {
    expect(idDeEtiqueta("")).toBeNull();
    expect(idDeEtiqueta("   ")).toBeNull();
    expect(idDeEtiqueta("!!!")).toBeNull();
    expect(idDeEtiqueta(null)).toBeNull();
  });
});

describe("idLibre", () => {
  it("usa el slug cuando está libre", () => {
    expect(idLibre("Rojo", ["verde"])).toBe("rojo");
  });

  it("agrega un número cuando está ocupado", () => {
    expect(idLibre("Rojo", ["rojo"])).toBe("rojo-2");
    expect(idLibre("Rojo", ["rojo", "rojo-2"])).toBe("rojo-3");
  });

  it("cae en un id genérico si la etiqueta no da slug", () => {
    expect(idLibre("!!!", [])).toBe("modelo-1");
    expect(idLibre("!!!", ["modelo-1"])).toBe("modelo-2");
  });
});
