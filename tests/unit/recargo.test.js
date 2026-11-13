import { describe, it, expect } from "vitest";
import {
  SIN_RECARGO,
  precioConRecargo,
  conRecargo,
  recargoValido,
} from "../../src/constants/recargo.js";

/*
  El catálogo guarda los precios de la lista del proveedor. Lo que ve el
  cliente es ese precio más un recargo, un solo porcentaje para todo.

  La invariante que cuidan estos tests: el recargo se aplica sobre los precios
  y NO toca ninguna otra cosa del producto. Si tocara, el panel —que lee
  crudo— y la tienda dejarían de hablar del mismo producto.
*/

const producto = (extra = {}) => ({
  codigo: "202",
  nombre: "Petardo Rompeportones",
  categoria: "Petardos",
  presentaciones: {
    unitario: { precio: 1000 },
    display: { precio: 5000, unidades: 5 },
    bulto: { precio: 10000, unidades: 50 },
  },
  modelos: [],
  ...extra,
});

describe("precioConRecargo", () => {
  it("suma el porcentaje", () => {
    expect(precioConRecargo(1000, 100)).toBe(2000);
    expect(precioConRecargo(5000, 50)).toBe(7500);
    expect(precioConRecargo(10000, 10)).toBe(11000);
  });

  it("sin recargo devuelve el mismo precio", () => {
    expect(precioConRecargo(1310, SIN_RECARGO)).toBe(1310);
  });

  it("redondea para arriba al múltiplo de cien", () => {
    /*
      Es la misma cuenta que la planilla del dueño:
      =MULTIPLO.SUPERIOR(precio * factor; 100)

      Un 35% sobre 1310 da 1768,50. Redondear para abajo sería regalar plata
      en cada venta, y a los $10 deja precios como $1.770, que en una lista
      de pirotecnia se leen como un error de carga.
    */
    expect(precioConRecargo(1310, 35)).toBe(1800);
    expect(precioConRecargo(999, 1)).toBe(1100);
    expect(precioConRecargo(380, 120)).toBe(900);
  });

  it("deja quieto lo que ya es múltiplo de cien", () => {
    // Los ejemplos del dueño: 1000 al 100%, 5000 al 50%, 10000 al 10%.
    expect(precioConRecargo(1000, 100)).toBe(2000);
    expect(precioConRecargo(5000, 50)).toBe(7500);
    expect(precioConRecargo(10000, 10)).toBe(11000);
  });

  it("no inventa precio donde no hay", () => {
    expect(precioConRecargo(null, 100)).toBeNull();
    expect(precioConRecargo(0, 100)).toBeNull();
    expect(precioConRecargo(undefined, 100)).toBeNull();
  });

  it("un recargo que no es un número se trata como cero", () => {
    expect(precioConRecargo(1000, undefined)).toBe(1000);
    expect(precioConRecargo(1000, null)).toBe(1000);
    expect(precioConRecargo(1000, "mucho")).toBe(1000);
    expect(precioConRecargo(1000, -50)).toBe(1000);
  });
});

describe("conRecargo: el producto entero", () => {
  it("recarga las tres presentaciones", () => {
    const p = conRecargo(producto(), 100);
    expect(p.presentaciones).toEqual({
      unitario: { precio: 2000 },
      display: { precio: 10000, unidades: 5 },
      bulto: { precio: 20000, unidades: 50 },
    });
  });

  it("conserva las unidades que trae cada presentación", () => {
    const p = conRecargo(producto(), 37);
    expect(p.presentaciones.display.unidades).toBe(5);
    expect(p.presentaciones.bulto.unidades).toBe(50);
  });

  it("la presentación en null sigue en null", () => {
    // Si desapareciera, el merge profundo de Firestore la resucitaría.
    const p = conRecargo(
      producto({
        presentaciones: {
          unitario: { precio: 1000 },
          display: null,
          bulto: null,
        },
      }),
      50,
    );
    expect("display" in p.presentaciones).toBe(true);
    expect(p.presentaciones.display).toBeNull();
  });

  it("recarga el precio de cada modelo", () => {
    const p = conRecargo(
      producto({
        presentaciones: { unitario: null, display: null, bulto: null },
        modelos: [
          {
            id: "rojo",
            etiqueta: "Rojo",
            foto: "https://x/r.jpg",
            presentaciones: {
              unitario: { precio: 3050 },
              display: { precio: 15250, unidades: 5 },
              bulto: null,
            },
          },
        ],
      }),
      100,
    );
    expect(p.modelos[0].presentaciones.unitario).toEqual({ precio: 6100 });
    expect(p.modelos[0].presentaciones.display).toEqual({
      precio: 30500,
      unidades: 5,
    });
    expect(p.modelos[0].foto).toBe("https://x/r.jpg");
    expect(p.modelos[0].id).toBe("rojo");
  });

  it("no toca nada que no sea un precio", () => {
    const antes = producto({
      marca: "Punto Austral",
      estado: "activo",
      compras: 7,
      fotos: ["a"],
    });
    const p = conRecargo(antes, 100);
    expect(p.codigo).toBe(antes.codigo);
    expect(p.nombre).toBe(antes.nombre);
    expect(p.categoria).toBe(antes.categoria);
    expect(p.marca).toBe("Punto Austral");
    expect(p.estado).toBe("activo");
    expect(p.compras).toBe(7);
    expect(p.fotos).toEqual(["a"]);
  });

  it("no modifica el producto que recibe", () => {
    // El panel lee crudo del mismo lugar: mutar acá le cambiaría los precios
    // al formulario de edición.
    const antes = producto();
    conRecargo(antes, 100);
    expect(antes.presentaciones.unitario.precio).toBe(1000);
  });

  it("con recargo cero devuelve los mismos precios", () => {
    const p = conRecargo(producto(), SIN_RECARGO);
    expect(p.presentaciones.unitario.precio).toBe(1000);
  });

  it("un producto sin presentaciones no rompe", () => {
    expect(() => conRecargo({ codigo: "X" }, 100)).not.toThrow();
    expect(conRecargo({ codigo: "X" }, 100).codigo).toBe("X");
  });

  it("null entra y null sale", () => {
    expect(conRecargo(null, 100)).toBeNull();
  });
});

describe("recargoValido", () => {
  it("acepta cero y porcentajes positivos", () => {
    expect(recargoValido(0)).toBe(0);
    expect(recargoValido(100)).toBe(100);
    expect(recargoValido(37.5)).toBe(37.5);
  });

  it("descarta lo que no sirve y cae en cero", () => {
    /*
      Cero es el valor seguro: muestra el precio de lista. Un recargo
      inventado cobraría de más, y uno negativo regalaría el producto.
    */
    expect(recargoValido(-10)).toBe(0);
    expect(recargoValido("mucho")).toBe(0);
    expect(recargoValido(null)).toBe(0);
    expect(recargoValido(undefined)).toBe(0);
    expect(recargoValido(Infinity)).toBe(0);
  });

  it("topea en 1000%", () => {
    // Un cero de más al tipear no multiplica el catálogo por cien.
    expect(recargoValido(5000)).toBe(1000);
  });
});
