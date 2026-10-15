import { describe, it, expect } from "vitest";
import { LEGADOS, aplicarPlan, planDe } from "../../scripts/precios.mjs";
import { products } from "../../src/constants/products.js";
import { presentacionesDe } from "../../src/constants/unidades.js";

/*
  Los precios sueltos (price, precioUnitario, precioDisplay, precioBulto) son
  el esquema de antes de las presentaciones. La migración los convierte en un
  mapa `presentaciones` y los borra.

  LA INVARIANTE: ningún precio que la tienda muestre hoy puede cambiar. La
  migración mueve de lugar, no corrige. Por eso el plan deriva con el MISMO
  módulo que usa la tienda, y el último describe lo prueba contra el catálogo
  entero.
*/

// El mismo aplicador que usa el seed, para que el test cubra ese camino.
const aplicar = (datos) => aplicarPlan(datos, planDe(datos));

describe("planDe: derivar las presentaciones", () => {
  it("construye el mapa a partir de los campos sueltos", () => {
    const plan = planDe({
      precioUnitario: 270,
      precioDisplay: 27000,
      precioBulto: 270000,
    });

    expect(plan.asignar).toEqual({
      presentaciones: {
        unitario: { precio: 270, unidades: null },
        display: { precio: 27000, unidades: null },
        bulto: { precio: 270000, unidades: null },
      },
    });
  });

  it("borra los cuatro campos sueltos", () => {
    const plan = planDe({
      price: 270,
      precioUnitario: 270,
      precioDisplay: 27000,
      precioBulto: 270000,
    });
    expect(plan.borrar.sort()).toEqual([...LEGADOS].sort());
  });

  it("lee `price` cuando no hay `precioUnitario`", () => {
    // El panel viejo escribia el unitario en `price`.
    const plan = planDe({ price: 500 });
    expect(plan.asignar.presentaciones.unitario).toEqual({
      precio: 500,
      unidades: null,
    });
  });

  it("descarta la presentación con el precio repetido del unitario", () => {
    /*
      La carga a granel dejó el display y el bulto repetidos del unitario en
      buena parte del catálogo: son valores por defecto, no formas de comprar,
      y la tienda ya los ignora. Migrarlos los volveria comprables.
    */
    const plan = planDe({ precioUnitario: 500, precioDisplay: 500 });
    expect(plan.asignar.presentaciones).toEqual({
      unitario: { precio: 500, unidades: null },
    });
  });

  it("no deja presentaciones vacías en un producto sin precio", () => {
    // Escribir `presentaciones: {}` no agrega nada y deja un campo que no
    // dice nada. El producto queda como está: sin precio.
    const plan = planDe({ precioUnitario: 0, precioDisplay: null });
    expect(plan.asignar).toEqual({});
    expect(plan.borrar.sort()).toEqual(["precioDisplay", "precioUnitario"]);
  });
});

describe("planDe: lo que NO deriva", () => {
  it("un producto que ya tiene presentaciones solo pierde los sueltos", () => {
    const plan = planDe({
      presentaciones: { unitario: { precio: 8000 } },
      precioUnitario: 8000,
    });
    expect(plan.asignar).toEqual({});
    expect(plan.borrar).toEqual(["precioUnitario"]);
  });

  it("un producto con modelos no recibe presentaciones propias", () => {
    /*
      Con modelos el precio vive en cada modelo: "cuánto sale un mortero" no
      tiene respuesta sin el tamaño. Derivar un precio de producto haria que
      la card muestre uno que no se puede comprar.
    */
    const plan = planDe({
      precioUnitario: 7690,
      modelos: [
        {
          id: "3",
          etiqueta: "3 pulgadas",
          presentaciones: { unitario: { precio: 7690 } },
        },
        {
          id: "5",
          etiqueta: "5 pulgadas",
          presentaciones: { unitario: { precio: 20400 } },
        },
      ],
    });
    expect(plan.asignar).toEqual({});
    expect(plan.borrar).toEqual(["precioUnitario"]);
  });

  it("un producto ya limpio no genera cambios", () => {
    const plan = planDe({
      presentaciones: { unitario: { precio: 8000 } },
      nombre: "Torta",
    });
    expect(plan.hayCambios).toBe(false);
    expect(plan.borrar).toEqual([]);
  });

  it("deja en paz los campos que no son precios", () => {
    expect(planDe({ codigo: "A12", stock: 100 }).hayCambios).toBe(false);
  });
});

describe("planDe: discrepancias", () => {
  it("avisa cuando el suelto no coincide con lo que la tienda muestra", () => {
    /*
      No frena la migración: la tienda lee `presentaciones` desde que existen,
      asi que el suelto nunca se mostró y borrarlo no cambia ningun precio.
      Pero si alguien lo editó a mano esperando que aplicara, tiene que verlo.
    */
    const plan = planDe({
      presentaciones: { unitario: { precio: 8000 } },
      precioUnitario: 270,
    });
    expect(plan.discrepancias).toEqual([
      { campo: "precioUnitario", suelto: 270, muestra: 8000 },
    ]);
    expect(plan.borrar).toEqual(["precioUnitario"]);
  });

  it("un suelto nulo o cero no es una discrepancia", () => {
    // El panel escribe null en los campos que no aplican: es ruido, no un dato.
    const plan = planDe({
      presentaciones: { unitario: { precio: 8000 } },
      precioUnitario: null,
      precioDisplay: 0,
    });
    expect(plan.discrepancias).toEqual([]);
  });

  it("avisa del suelto que la tienda no usa en un producto con modelos", () => {
    const plan = planDe({
      precioUnitario: 7690,
      modelos: [
        {
          id: "3",
          etiqueta: "3",
          presentaciones: { unitario: { precio: 100 } },
        },
      ],
    });
    expect(plan.discrepancias).toEqual([
      { campo: "precioUnitario", suelto: 7690, muestra: null },
    ]);
  });
});

describe("la invariante, contra el catálogo entero", () => {
  /*
    323 productos del esquema viejo, con todas sus rarezas reales: display
    repetido del unitario, bultos en cero, precios ausentes. Si la migración
    cambia un solo precio de los que la tienda muestra, esto falla.
  */
  it("no cambia un solo precio que la tienda muestre", () => {
    for (const producto of products) {
      const antes = presentacionesDe(producto);
      const despues = presentacionesDe(aplicar(producto));
      expect(despues).toEqual(antes);
    }
  });

  it("deja el catálogo entero sin un solo campo suelto", () => {
    for (const producto of products) {
      const despues = aplicar(producto);
      for (const campo of LEGADOS) {
        expect(campo in despues).toBe(false);
      }
    }
  });
});
