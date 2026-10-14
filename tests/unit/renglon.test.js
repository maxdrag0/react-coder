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
  it("la cantidad, el nombre y la unidad", () => {
    expect(renglonDe(BASE)).toBe("1x Bengala de humo (Unidad)");
  });

  it("NOMBRA EL MODELO: es lo unico que distingue un renglon de otro", () => {
    /*
      Tres bengalas de colores distintos se leian como tres renglones
      identicos, en el carrito y en el panel. El dueno no podia saber que
      preparar y el comprador no sabia si habia elegido bien.
    */
    expect(renglonDe({ ...BASE, modeloEtiqueta: "Rojo" })).toBe(
      "1x Bengala de humo (Rojo, Unidad)",
    );
  });

  it("NOMBRA LA UNIDAD SUELTA, no solo el display y el bulto", () => {
    /*
      Omitirla ahorraba una palabra pero obligaba a quien prepara el pedido a
      saber que la ausencia significa "de a uno". Leer "2x Bengala" y tener
      que deducir si son dos unidades o dos bultos es la duda que no puede
      existir cuando hay que armar la caja.
    */
    expect(renglonDe({ ...BASE, unidad: "unitario" })).toMatch(/(Unidad)/);
  });

  it("usa la etiqueta y no la clave interna", () => {
    // En la tabla del panel decia "display", en minuscula: es el nombre del
    // campo, no como se vende.
    expect(renglonDe({ ...BASE, unidad: "display" })).toBe(
      "1x Bengala de humo (Display)",
    );
  });

  it("el bulto tambien", () => {
    expect(renglonDe({ ...BASE, unidad: "bulto" })).toBe(
      "1x Bengala de humo (Bulto)",
    );
  });

  it("modelo y unidad juntos, en ese orden", () => {
    expect(
      renglonDe({ ...BASE, modeloEtiqueta: "Rojo", unidad: "bulto" }),
    ).toBe("1x Bengala de humo (Rojo, Bulto)");
  });

  it("multiplica bien", () => {
    expect(renglonDe({ ...BASE, cantidad: 12 })).toBe(
      "12x Bengala de humo (Unidad)",
    );
  });

  it("un renglon viejo SIN unidad no inventa una", () => {
    // Los pedidos de antes de las presentaciones no tienen el campo. Poner
    // "(Unidad)" ahi seria afirmar algo que el pedido no dice.
    expect(renglonDe({ nombre: "Petardo", cantidad: 2 })).toBe("2x Petardo");
  });

  it("una unidad desconocida no se pinta", () => {
    expect(renglonDe({ ...BASE, unidad: "caja" })).toBe("1x Bengala de humo");
  });

  it("un pedido viejo con name sigue legible", () => {
    expect(
      renglonDe({ name: "Petardo", cantidad: 2, unidad: "unitario" }),
    ).toBe("2x Petardo (Unidad)");
  });
});
