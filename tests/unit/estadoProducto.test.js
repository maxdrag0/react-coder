import { describe, it, expect } from "vitest";
import {
  ESTADOS,
  ACTIVO,
  SIN_STOCK,
  OCULTO,
  estadoDe,
  seMuestra,
  sePuedeComprar,
  etiquetaDe,
} from "../../src/constants/estadoProducto";

describe("estadoDe", () => {
  it("trata un producto sin el campo como activo, así los 321 del catálogo no necesitan migración", () => {
    expect(estadoDe({ codigo: "1" })).toBe(ACTIVO);
  });

  it("lee el estado cuando está", () => {
    expect(estadoDe({ estado: OCULTO })).toBe(OCULTO);
    expect(estadoDe({ estado: SIN_STOCK })).toBe(SIN_STOCK);
  });

  it("cae en activo ante un estado que no reconoce, en vez de esconder el producto", () => {
    // Un dato raro en la base no debe hacer desaparecer mercadería.
    expect(estadoDe({ estado: "cualquier-cosa" })).toBe(ACTIVO);
    expect(estadoDe({ estado: null })).toBe(ACTIVO);
    expect(estadoDe({ estado: "" })).toBe(ACTIVO);
  });

  it("no explota con un producto nulo", () => {
    expect(estadoDe(null)).toBe(ACTIVO);
    expect(estadoDe(undefined)).toBe(ACTIVO);
  });
});

describe("seMuestra", () => {
  it("muestra el activo", () => {
    expect(seMuestra({ estado: ACTIVO })).toBe(true);
  });

  it("muestra el sin stock: la idea es que lo vean y pregunten", () => {
    expect(seMuestra({ estado: SIN_STOCK })).toBe(true);
  });

  it("esconde el oculto", () => {
    expect(seMuestra({ estado: OCULTO })).toBe(false);
  });
});

describe("sePuedeComprar", () => {
  it("deja comprar el activo", () => {
    expect(sePuedeComprar({ estado: ACTIVO })).toBe(true);
  });

  it("NO deja comprar el sin stock, que es todo el punto de ese estado", () => {
    expect(sePuedeComprar({ estado: SIN_STOCK })).toBe(false);
  });

  it("NO deja comprar el oculto, aunque alguien llegue por URL directa", () => {
    // El detalle del producto se abre por /product/:codigo sin pasar por el
    // listado, así que ocultarlo del catálogo no alcanza.
    expect(sePuedeComprar({ estado: OCULTO })).toBe(false);
  });
});

describe("ESTADOS", () => {
  it("expone los tres para armar el selector del panel", () => {
    expect(ESTADOS.map((e) => e.clave)).toEqual([ACTIVO, SIN_STOCK, OCULTO]);
    ESTADOS.forEach((e) => expect(typeof e.etiqueta).toBe("string"));
  });

  it("etiquetaDe devuelve el texto que ve el admin", () => {
    expect(etiquetaDe(SIN_STOCK)).toBe("Sin stock");
    expect(etiquetaDe(OCULTO)).toBe("Oculto");
    expect(etiquetaDe(ACTIVO)).toBe("Activo");
  });
});
