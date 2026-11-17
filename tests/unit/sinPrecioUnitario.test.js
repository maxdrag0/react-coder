import { describe, it, expect } from "vitest";
import {
  rangoDesde,
  precioMinimo,
  unidadesDisponibles,
} from "@/constants/unidades";
import {
  aFirestore,
  aFormulario,
  PRODUCTO_VACIO,
} from "@/pages/Admin/mapearProducto";

/*
  Hay productos que no se venden por unidad: las bengalas de humo se venden
  por display y nada mas.

  Antes el unitario era obligatorio —el formulario lo pedia y
  presentacionesDeFormulario lo escribia siempre— y la unica salida era
  poner 0. Eso funcionaba a medias: la tienda descarta cualquier precio que
  no sea mayor a cero, asi que dejaba de ofrecer "Unidad"... y tambien
  dejaba la card SIN PRECIO, porque el precio de la card salia unicamente
  del unitario. Y el producto se caia del filtro de precios.

  Ahora el precio de entrada es el mas barato que se pueda comprar, sea la
  presentacion que sea.
*/

const soloDisplay = {
  codigo: "250",
  nombre: "Bengala de humo",
  presentaciones: {
    unitario: null,
    display: { precio: 15250, unidades: 5 },
    bulto: null,
  },
};

const conUnidad = {
  codigo: "1605",
  nombre: "Candela",
  presentaciones: {
    unitario: { precio: 380 },
    display: { precio: 2280, unidades: 6 },
    bulto: null,
  },
};

describe("rangoDesde: el precio de entrada", () => {
  it("es el unitario cuando se vende por unidad", () => {
    expect(rangoDesde(conUnidad)).toEqual({
      min: 380,
      max: 380,
      clave: "unitario",
    });
  });

  it("es el del display cuando no hay precio por unidad", () => {
    // Esto es lo que antes devolvía null y dejaba la card muda.
    expect(rangoDesde(soloDisplay)).toEqual({
      min: 15250,
      max: 15250,
      clave: "display",
    });
  });

  it("con modelos, recorre todos y da el rango", () => {
    const conModelos = {
      codigo: "250",
      modelos: [
        {
          id: "rojo",
          etiqueta: "Rojo",
          presentaciones: { display: { precio: 15250, unidades: 5 } },
        },
        {
          id: "azul",
          etiqueta: "Azul",
          presentaciones: { display: { precio: 18000, unidades: 5 } },
        },
      ],
    };
    expect(rangoDesde(conModelos)).toEqual({
      min: 15250,
      max: 18000,
      clave: "display",
    });
  });

  it("sin ningún precio sigue devolviendo null", () => {
    expect(rangoDesde({ codigo: "X", presentaciones: {} })).toBeNull();
    expect(rangoDesde(null)).toBeNull();
  });
});

describe("precioMinimo: lo que usa el filtro de precios", () => {
  it("cuenta el producto que solo se vende por display", () => {
    // Antes daba null y el producto quedaba fuera del filtro por completo.
    expect(precioMinimo(soloDisplay)).toBe(15250);
  });

  it("sigue dando el unitario cuando lo hay", () => {
    expect(precioMinimo(conUnidad)).toBe(380);
  });
});

describe("unidadesDisponibles", () => {
  it("no ofrece la unidad si no tiene precio", () => {
    expect(unidadesDisponibles(soloDisplay).map((u) => u.clave)).toEqual([
      "display",
    ]);
  });
});

describe("el formulario del panel", () => {
  const form = (extra = {}) => ({
    ...PRODUCTO_VACIO,
    codigo: "250",
    name: "Bengala de humo",
    category: "Bengalas",
    ...extra,
  });

  it("dejar el precio por unidad vacío no crea la presentación", () => {
    /*
      Es la forma de decir "esto no se vende por unidad". Antes no existía:
      el campo era obligatorio y la única salida era poner 0.
    */
    const datos = aFirestore(
      form({
        price: "",
        presentaciones: {
          display: { activa: true, precio: "15250", unidades: "5" },
        },
      }),
    );
    expect(datos.presentaciones.unitario).toBeNull();
    expect(datos.presentaciones.display).toEqual({
      precio: 15250,
      unidades: 5,
    });
  });

  it("la clave unitaria viaja igual, en null", () => {
    // Si se omitiera, el merge profundo de Firestore conservaría el precio
    // por unidad que estaba guardado y el producto seguiría vendiéndose así.
    const datos = aFirestore(form({ price: "" }));
    expect("unitario" in datos.presentaciones).toBe(true);
    expect(datos.presentaciones.unitario).toBeNull();
  });

  it("un cero también significa que no se vende por unidad", () => {
    const datos = aFirestore(form({ price: "0" }));
    expect(datos.presentaciones.unitario).toBeNull();
  });

  it("sigue guardando el precio cuando lo hay", () => {
    const datos = aFirestore(form({ price: "380" }));
    expect(datos.presentaciones.unitario).toEqual({ precio: 380 });
  });

  it("al reabrirlo, el campo queda vacío y no en cero", () => {
    // Un 0 en el campo invita a dejarlo, y un 0 guardado es un precio que
    // la tienda descarta en silencio.
    expect(aFormulario(soloDisplay).price).toBe("");
  });
});
