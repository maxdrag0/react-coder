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

/*
  Lo mismo, pero con modelos: las bengalas de humo vienen en seis colores y
  se venden por display.

  EL BUG: modelosDeFormulario descartaba el modelo sin precio por unidad
  —`if (!etiqueta || precio === null) continue`—, asi que la unica salida era
  poner 0, igual que antes. Y si el campo quedaba vacio, el modelo
  DESAPARECIA al guardar, sin aviso: seis colores cargados a mano se iban en
  silencio.
*/
describe("modelos que no se venden por unidad", () => {
  const conUnModelo = (modelo) => ({
    ...PRODUCTO_VACIO,
    codigo: "B100",
    name: "Bengala de humo",
    category: "Bengalas",
    conModelos: true,
    modelos: [{ id: null, temporal: "t1", ...modelo }],
  });

  const soloDisplay = {
    etiqueta: "Rojo",
    precio: "",
    presentaciones: {
      display: { activa: true, precio: "12000", unidades: "6" },
    },
  };

  it("guarda el modelo que solo tiene precio por display", () => {
    const { modelos } = aFirestore(conUnModelo(soloDisplay));
    expect(modelos).toHaveLength(1);
    expect(modelos[0].etiqueta).toBe("Rojo");
  });

  it("no le inventa un precio por unidad", () => {
    const { modelos } = aFirestore(conUnModelo(soloDisplay));
    expect(modelos[0].presentaciones.unitario).toBeNull();
    expect(modelos[0].presentaciones.display.precio).toBe(12000);
  });

  it("le genera su identificador igual", () => {
    // El id es lo que ata el modelo a los carritos y a los pedidos.
    const { modelos } = aFirestore(conUnModelo(soloDisplay));
    expect(typeof modelos[0].id).toBe("string");
    expect(modelos[0].id.length).toBeGreaterThan(0);
  });

  it("la tienda ofrece el display y NO la unidad", () => {
    const producto = aFirestore(conUnModelo(soloDisplay));
    const claves = unidadesDisponibles(producto, producto.modelos[0].id).map(
      (u) => u.clave,
    );
    expect(claves).toEqual(["display"]);
  });

  it("la card muestra el precio del display", () => {
    const producto = aFirestore(conUnModelo(soloDisplay));
    expect(rangoDesde(producto)).toMatchObject({
      min: 12000,
      clave: "display",
    });
  });

  it("sigue descartando el modelo que no tiene NINGUN precio", () => {
    // Sin ningun precio no se puede ni elegir ni comprar: eso no cambia.
    const { modelos } = aFirestore(
      conUnModelo({ etiqueta: "Verde", precio: "", presentaciones: {} }),
    );
    expect(modelos).toHaveLength(0);
  });

  it("sigue descartando el modelo sin nombre", () => {
    const { modelos } = aFirestore(
      conUnModelo({ ...soloDisplay, etiqueta: "  " }),
    );
    expect(modelos).toHaveLength(0);
  });

  it("el que se vende de las dos formas no cambia", () => {
    const { modelos } = aFirestore(
      conUnModelo({
        etiqueta: "Azul",
        precio: "2500",
        presentaciones: {
          display: { activa: true, precio: "12000", unidades: "6" },
        },
      }),
    );
    expect(modelos[0].presentaciones.unitario).toEqual({ precio: 2500 });
    expect(modelos[0].presentaciones.display.precio).toBe(12000);
  });

  it("y el formulario lo vuelve a mostrar vacio, no en cero", () => {
    // Si al reabrir apareciera 0, guardar de nuevo escribiria 0 y volveriamos
    // al problema de antes.
    const guardado = aFirestore(conUnModelo(soloDisplay));
    const form = aFormulario({ ...guardado, codigo: "B100" });
    expect(form.modelos[0].precio).toBe("");
    expect(form.modelos[0].presentaciones.display.precio).toBe(12000);
  });
});
