import { describe, it, expect } from "vitest";
import { nombreDeItem, renglonDe } from "@/constants/renglon";

const BASE = { nombre: "Bengala de humo", cantidad: 1, unidad: "unitario" };

describe("nombreDeItem", () => {
  it("usa nombre", () => {
    expect(nombreDeItem({ nombre: "Torta" })).toBe("Torta");
  });

  it("cae a name, que es como lo escribia el panel viejo", () => {
    expect(nombreDeItem({ name: "Torta" })).toBe("Torta");
  });

  it("nombre le gana a name cuando estan los dos", () => {
    expect(nombreDeItem({ nombre: "Torta", name: "viejo" })).toBe("Torta");
  });

  it("sin ninguno devuelve texto vacio, no undefined", () => {
    // Un undefined pintado en la tabla del panel se lee "undefined".
    expect(nombreDeItem({})).toBe("");
    expect(nombreDeItem(null)).toBe("");
  });
});

describe("renglonDe", () => {
  it("la cantidad y el nombre", () => {
    expect(renglonDe(BASE)).toBe("1x Bengala de humo");
  });

  it("NOMBRA EL MODELO: es lo unico que distingue un renglon de otro", () => {
    /*
      Tres bengalas de colores distintos se leian como tres renglones
      identicos, en el carrito y en el panel. El dueno no podia saber que
      preparar y el comprador no sabia si habia elegido bien.
    */
    expect(renglonDe({ ...BASE, modeloEtiqueta: "Rojo" })).toBe(
      "1x Bengala de humo (Rojo)",
    );
  });

  it("nombra la unidad cuando no es la suelta", () => {
    expect(renglonDe({ ...BASE, unidad: "display" })).toBe(
      "1x Bengala de humo (display)",
    );
  });

  it("modelo y unidad juntos, en ese orden", () => {
    expect(
      renglonDe({ ...BASE, modeloEtiqueta: "Rojo", unidad: "bulto" }),
    ).toBe("1x Bengala de humo (Rojo, bulto)");
  });

  it("la unidad suelta no se nombra: es el caso normal", () => {
    expect(renglonDe({ ...BASE, unidad: "unitario" })).not.toMatch(/unitario/);
  });

  it("multiplica bien", () => {
    expect(renglonDe({ ...BASE, cantidad: 12 })).toBe("12x Bengala de humo");
  });

  it("un pedido viejo con name y sin modelo sigue legible", () => {
    expect(
      renglonDe({ name: "Petardo", cantidad: 2, unidad: "unitario" }),
    ).toBe("2x Petardo");
  });
});
