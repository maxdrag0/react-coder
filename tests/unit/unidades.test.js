import { describe, it, expect } from "vitest";
import {
  UNIDADES,
  presentacionesDe,
  precioDe,
  unidadesQueTrae,
  unidadesDisponibles,
} from "../../src/constants/unidades";

// Esquema nuevo: el dueño dice si se vende así, a cuánto y cuántas trae.
const NUEVO = {
  presentaciones: {
    unitario: { precio: 8000 },
    display: { precio: 15000, unidades: 5 },
    bulto: { precio: 140000, unidades: 50 },
  },
};

// Esquema viejo: 323 productos del catálogo están así.
const VIEJO = { precioUnitario: 270, precioDisplay: 2700, precioBulto: 270000 };

describe("presentacionesDe: los dos esquemas", () => {
  it("usa el esquema nuevo cuando está", () => {
    expect(presentacionesDe(NUEVO).display).toEqual({ precio: 15000, unidades: 5 });
  });

  it("arma las presentaciones desde el esquema viejo", () => {
    const p = presentacionesDe(VIEJO);
    expect(p.unitario.precio).toBe(270);
    expect(p.display.precio).toBe(2700);
    expect(p.bulto.precio).toBe(270000);
  });

  it("el esquema viejo no sabe cuántas unidades trae, y lo dice", () => {
    // Es el bug que arregla esto: antes se deducía del ratio de precios.
    expect(presentacionesDe(VIEJO).display.unidades).toBeNull();
  });

  it("no explota con nada", () => {
    expect(presentacionesDe(null)).toEqual({});
    expect(presentacionesDe({})).toEqual({});
  });
});

describe("unidadesQueTrae: la cantidad es un dato, no un cálculo", () => {
  it("devuelve lo que el dueño cargó", () => {
    expect(unidadesQueTrae(NUEVO, "display")).toBe(5);
    expect(unidadesQueTrae(NUEVO, "bulto")).toBe(50);
  });

  it("NO deduce la cantidad del ratio de precios", () => {
    // 15000 / 8000 redondeaba a 2 y el display trae 5. Un display es más
    // barato por unidad: el ratio nunca puede ser la cantidad.
    expect(unidadesQueTrae(NUEVO, "display")).not.toBe(2);
  });

  it("devuelve null cuando no se sabe, en vez de inventar un número", () => {
    expect(unidadesQueTrae(VIEJO, "display")).toBeNull();
    expect(unidadesQueTrae(VIEJO, "bulto")).toBeNull();
  });

  it("la unidad no trae nada: ES una unidad", () => {
    expect(unidadesQueTrae(NUEVO, "unitario")).toBeNull();
  });

  it("ignora una cantidad que no tiene sentido", () => {
    const raro = {
      presentaciones: { display: { precio: 100, unidades: 0 } },
    };
    expect(unidadesQueTrae(raro, "display")).toBeNull();
  });
});

describe("unidadesDisponibles: lo que el dueño decidió vender", () => {
  it("ofrece solo las presentaciones cargadas", () => {
    const soloUnidad = { presentaciones: { unitario: { precio: 500 } } };
    expect(unidadesDisponibles(soloUnidad).map((u) => u.clave)).toEqual(["unitario"]);
  });

  it("con las tres cargadas ofrece las tres, en orden", () => {
    expect(unidadesDisponibles(NUEVO).map((u) => u.clave)).toEqual([
      "unitario",
      "display",
      "bulto",
    ]);
  });

  it("sacar el display del producto lo saca de la tienda", () => {
    // Asi se "desactiva" una presentacion: no esta en el mapa.
    const sinDisplay = {
      presentaciones: { unitario: { precio: 8000 }, bulto: { precio: 140000 } },
    };
    expect(unidadesDisponibles(sinDisplay).map((u) => u.clave)).toEqual([
      "unitario",
      "bulto",
    ]);
  });

  it("en el esquema viejo descarta la presentación con el precio repetido", () => {
    // 171 productos tienen precioDisplay igual al unitario: es un valor por
    // defecto de la carga, no una forma de comprar. Ofrecerlo mostraba dos
    // opciones identicas, y quien elegia Display pagaba una unidad.
    const duplicado = { precioUnitario: 500, precioDisplay: 500, precioBulto: 50000 };
    expect(unidadesDisponibles(duplicado).map((u) => u.clave)).toEqual([
      "unitario",
      "bulto",
    ]);
  });

  it("sin ningún precio no ofrece nada", () => {
    expect(unidadesDisponibles({ nombre: "sin precio" })).toEqual([]);
  });

  it("acepta el campo `price` del esquema mas viejo todavia", () => {
    expect(unidadesDisponibles({ price: 500 }).map((u) => u.clave)).toEqual([
      "unitario",
    ]);
  });
});

describe("precioDe", () => {
  it("lee el precio de la presentación", () => {
    expect(precioDe(NUEVO, "display")).toBe(15000);
    expect(precioDe(VIEJO, "bulto")).toBe(270000);
  });

  it("devuelve null si esa presentación no se vende", () => {
    expect(precioDe({ precioUnitario: 100 }, "bulto")).toBeNull();
  });

  it("descarta un precio en cero, que es lo que escribe un campo vacío", () => {
    expect(precioDe({ price: 0 }, "unitario")).toBeNull();
    expect(precioDe({ presentaciones: { unitario: { precio: 0 } } }, "unitario")).toBeNull();
  });

  it("descarta un precio que no es un número", () => {
    expect(precioDe({ price: NaN }, "unitario")).toBeNull();
  });

  it("no explota sin producto", () => {
    expect(precioDe(undefined, "unitario")).toBeNull();
  });
});

describe("UNIDADES", () => {
  it("mantiene las tres y su orden, que es el de mayor a menor cantidad", () => {
    expect(UNIDADES.map((u) => u.clave)).toEqual(["unitario", "display", "bulto"]);
  });
});
