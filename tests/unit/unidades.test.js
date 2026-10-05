import { describe, it, expect } from "vitest";
import {
  precioDe,
  multiplicadorDe,
  unidadesDisponibles,
} from "@/constants/unidades";

// Caso real del catálogo: 178 de 323 productos tienen precioDisplay igual al
// unitario, y 48 tienen precioBulto igual al unitario. Son valores por
// defecto, no unidades de compra distintas.
const DUPLICADO = {
  precioUnitario: 14900,
  precioDisplay: 14900,
  precioBulto: 238400,
};

const COMPLETO = {
  precioUnitario: 270,
  precioDisplay: 27000,
  precioBulto: 270000,
};

const SIN_PRECIO = { precioUnitario: 0, precioDisplay: 0, precioBulto: 0 };

describe("unidadesDisponibles", () => {
  it("ofrece las tres cuando los tres precios son distintos", () => {
    expect(unidadesDisponibles(COMPLETO).map((u) => u.clave)).toEqual([
      "unitario",
      "display",
      "bulto",
    ]);
  });

  it("NO ofrece el display cuando su precio es igual al unitario", () => {
    // Si no, el selector muestra dos opciones idénticas y quien elige
    // "Display" recibe —y paga— una unidad, pero el pedido dice Display.
    expect(unidadesDisponibles(DUPLICADO).map((u) => u.clave)).toEqual([
      "unitario",
      "bulto",
    ]);
  });

  it("devuelve lista vacía si el producto no tiene ningún precio", () => {
    expect(unidadesDisponibles(SIN_PRECIO)).toEqual([]);
  });

  it("acepta el esquema viejo con price", () => {
    expect(unidadesDisponibles({ price: 500 }).map((u) => u.clave)).toEqual([
      "unitario",
    ]);
  });
});

describe("precioDe", () => {
  it("devuelve el precio del nivel pedido", () => {
    expect(precioDe(COMPLETO, "bulto")).toBe(270000);
  });

  it("devuelve null cuando el nivel no tiene precio", () => {
    expect(precioDe({ precioUnitario: 100 }, "bulto")).toBeNull();
  });

  it("devuelve null cuando price del esquema viejo es 0", () => {
    // El panel escribe Number("") === 0 cuando el campo queda vacío. Sin la
    // guarda, el selector ofrecía una opción con el precio en blanco.
    expect(precioDe({ price: 0 }, "unitario")).toBeNull();
  });

  it("devuelve null cuando price es NaN", () => {
    expect(precioDe({ price: NaN }, "unitario")).toBeNull();
  });

  it("devuelve null con un producto undefined", () => {
    expect(precioDe(undefined, "unitario")).toBeNull();
  });
});

describe("multiplicadorDe", () => {
  it("calcula cuántas unidades trae un bulto", () => {
    expect(multiplicadorDe(COMPLETO, "bulto")).toBe(1000);
  });

  it("devuelve null para la unidad", () => {
    expect(multiplicadorDe(COMPLETO, "unitario")).toBeNull();
  });

  it("devuelve null cuando el precio es el mismo que el unitario", () => {
    expect(multiplicadorDe(DUPLICADO, "display")).toBeNull();
  });
});
