import { describe, it, expect } from "vitest";
import {
  UNIDADES,
  presentacionesDe,
  precioDe,
  unidadesQueTrae,
  unidadesDisponibles,
  rangoUnitario,
  precioMinimo,
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

// ---------------------------------------------------------------------------
// Modelos: cada uno con sus propias presentaciones.
// ---------------------------------------------------------------------------

const CON_MODELOS = {
  codigo: "M100",
  modelos: [
    {
      id: "tres",
      etiqueta: "3 pulgadas",
      presentaciones: {
        unitario: { precio: 8000 },
        display: { precio: 15000, unidades: 5 },
      },
    },
    {
      id: "cinco",
      etiqueta: "5 pulgadas",
      presentaciones: { unitario: { precio: 20000 } },
    },
  ],
};

describe("presentacionesDe con modelos", () => {
  it("devuelve las del modelo elegido", () => {
    expect(presentacionesDe(CON_MODELOS, "tres").display).toEqual({
      precio: 15000,
      unidades: 5,
    });
  });

  it("devuelve vacío si hay modelos y no se eligió ninguno", () => {
    // "Cuanto sale un mortero" no tiene respuesta sin el tamaño. La card
    // muestra un rango, que se calcula aparte.
    expect(presentacionesDe(CON_MODELOS)).toEqual({});
  });

  it("devuelve vacío si el modelo pedido no existe", () => {
    // Pasa con un carrito viejo: el modelo se borro del producto.
    expect(presentacionesDe(CON_MODELOS, "borrado")).toEqual({});
  });

  it("ignora el modelo en un producto que no tiene modelos", () => {
    // Asi los 323 del catalogo siguen andando pase lo que pase.
    expect(presentacionesDe(VIEJO, "cualquiera").unitario.precio).toBe(270);
  });
});

describe("precioDe y unidadesDisponibles con modelos", () => {
  it("el precio sale del modelo", () => {
    expect(precioDe(CON_MODELOS, "unitario", "tres")).toBe(8000);
    expect(precioDe(CON_MODELOS, "unitario", "cinco")).toBe(20000);
  });

  it("sin modelo elegido no hay precio", () => {
    expect(precioDe(CON_MODELOS, "unitario")).toBeNull();
  });

  it("cada modelo ofrece sus propias presentaciones", () => {
    expect(unidadesDisponibles(CON_MODELOS, "tres").map((u) => u.clave)).toEqual([
      "unitario",
      "display",
    ]);
    expect(unidadesDisponibles(CON_MODELOS, "cinco").map((u) => u.clave)).toEqual([
      "unitario",
    ]);
  });

  it("la cantidad tambien es por modelo", () => {
    expect(unidadesQueTrae(CON_MODELOS, "display", "tres")).toBe(5);
    expect(unidadesQueTrae(CON_MODELOS, "display", "cinco")).toBeNull();
  });
});

describe("rangoUnitario", () => {
  it("con modelos da el minimo y el maximo entre todos", () => {
    // Es lo que la card necesita para decir "desde $8.000".
    expect(rangoUnitario(CON_MODELOS)).toEqual({ min: 8000, max: 20000 });
  });

  it("sin modelos da el precio del producto en los dos extremos", () => {
    expect(rangoUnitario(VIEJO)).toEqual({ min: 270, max: 270 });
  });

  it("devuelve null si no hay ningun precio", () => {
    expect(rangoUnitario({ nombre: "sin precio" })).toBeNull();
    expect(rangoUnitario(null)).toBeNull();
  });

  it("ignora un modelo que no tiene precio unitario", () => {
    const mixto = {
      modelos: [
        { id: "a", etiqueta: "A", presentaciones: { unitario: { precio: 500 } } },
        { id: "b", etiqueta: "B", presentaciones: { bulto: { precio: 90000 } } },
      ],
    };
    expect(rangoUnitario(mixto)).toEqual({ min: 500, max: 500 });
  });
});

describe("precioMinimo", () => {
  it("es el piso del rango, que es lo que usan los filtros", () => {
    expect(precioMinimo(CON_MODELOS)).toBe(8000);
    expect(precioMinimo(VIEJO)).toBe(270);
    expect(precioMinimo({ nombre: "sin precio" })).toBeNull();
  });
});
