import { describe, it, expect } from "vitest";
import {
  cruzarConCatalogo,
  presentacionesVivas,
  accionDe,
  idDeCodigo,
  variacion,
} from "@/constants/cruzarLista";

const deLaLista = (extra = {}) => ({
  id: "1605",
  codigo: "1605",
  nombre: "CANDELA DE 5 TIROS - perlas de colores surtidos PUNTO AUSTRAL",
  categoria: "Candelas",
  pUnidad: 380,
  pDisplay: 2280,
  pBulto: 273600,
  porDisplay: 6,
  porBulto: 720,
  avisos: [],
  ...extra,
});

const publicado = (extra = {}) => ({
  _id: "1605",
  nombre: "Candela De 5 Tiros",
  categoria: "Candelas",
  presentaciones: {
    unitario: { precio: 1500 },
    display: { precio: 15000, unidades: 6 },
    bulto: null,
  },
  ...extra,
});

describe("presentacionesVivas", () => {
  it("devuelve solo lo que tiene precio", () => {
    expect(presentacionesVivas(publicado())).toEqual({
      unitario: { precio: 1500 },
      display: { precio: 15000, unidades: 6 },
    });
  });

  it("con modelos toma el precio del modelo, no el del producto", () => {
    /*
      Un producto con modelos tiene el precio del producto en null a
      propósito: vive en cada modelo. Mirar el del producto diría "no vende
      nada" de algo que sí se vende.
    */
    const conModelos = publicado({
      presentaciones: { unitario: null, display: null, bulto: null },
      modelos: [
        {
          etiqueta: "Rojo",
          presentaciones: {
            unitario: { precio: 8000 },
            display: { precio: 20000, unidades: 5 },
          },
        },
      ],
    });
    expect(presentacionesVivas(conModelos)).toEqual({
      unitario: { precio: 8000 },
      display: { precio: 20000, unidades: 5 },
    });
  });

  it("un producto sin nada no rompe", () => {
    expect(presentacionesVivas({})).toEqual({});
    expect(presentacionesVivas(null)).toEqual({});
  });
});

describe("cruzarConCatalogo: encontrar lo que ya existe", () => {
  it("cruza por código", () => {
    const { filas } = cruzarConCatalogo([deLaLista()], [publicado()]);
    expect(filas[0].web.id).toBe("1605");
    expect(filas[0].web.nombre).toBe("Candela De 5 Tiros");
  });

  it("cruza aunque uno use barra y el otro guion", () => {
    // El PDF escribe "2302/AR" y la base "2302-AR".
    const { filas } = cruzarConCatalogo(
      [deLaLista({ codigo: "2302/AR", nombre: "TORTA ARTEMISA 16 T" })],
      [publicado({ _id: "2302-AR", nombre: "Torta Artemisa" })],
    );
    expect(filas[0].web.id).toBe("2302-AR");
  });

  it("cruza por nombre cuando el código no coincide", () => {
    const { filas } = cruzarConCatalogo(
      [deLaLista({ codigo: "1699", nombre: "CANDELA DE 100 TIROS SURTIDOS" })],
      [publicado({ _id: "1690", nombre: "Candela de 100 Tiros" })],
    );
    expect(filas[0].web.id).toBe("1690");
  });

  it("ignora las palabras de unión al comparar nombres", () => {
    /*
      "Bengala de humo" contra "BENGALA HUMO": ese "de" de más alcanzaba
      para que no cruzaran, y es el mismo producto.
    */
    const { filas } = cruzarConCatalogo(
      [deLaLista({ codigo: "250", nombre: "BENGALA HUMO - FUMIGENO COLOR" })],
      [publicado({ _id: "H0002", nombre: "Bengala de humo" })],
    );
    expect(filas[0].web.id).toBe("H0002");
  });

  it("no cruza dos filas con el mismo producto publicado", () => {
    // Si una fila ya se lo llevó, la siguiente es un producto distinto.
    const { filas } = cruzarConCatalogo(
      [
        deLaLista({ codigo: "A", nombre: "CANDELA DE 5 TIROS GRANDE" }),
        deLaLista({ codigo: "B", nombre: "CANDELA DE 5 TIROS CHICA" }),
      ],
      [publicado({ _id: "X", nombre: "Candela De 5 Tiros" })],
    );
    expect(filas.filter((f) => f.web).length).toBe(1);
  });

  it("el cruce por código gana sobre el cruce por nombre", () => {
    /*
      La fila 4257 ("MORTERO 2 REVOLUCION DE ESTRUENDO") contiene el nombre
      del producto publicado 237,1 ("Mortero 2"), que tiene su propia fila en
      la lista. Resolviendo fila por fila, 4257 se quedaba con ese producto
      antes de que llegara la suya: la comparación de precios salía contra el
      producto equivocado, y actualizar habría tocado el equivocado.
    */
    const { filas } = cruzarConCatalogo(
      [
        deLaLista({
          codigo: "4257",
          nombre: "MORTERO 2 REVOLUCION DE ESTRUENDO",
        }),
        deLaLista({ codigo: "237,1", nombre: "MORTERO 2 TRUENO NACIONAL" }),
      ],
      [publicado({ _id: "237,1", nombre: "Mortero 2" })],
    );
    expect(filas[0].web).toBeNull();
    expect(filas[1].web.id).toBe("237,1");
  });

  it("no inventa cruces con nombres cortos", () => {
    const { filas } = cruzarConCatalogo(
      [deLaLista({ codigo: "Z", nombre: "CAÑA ROJA" })],
      [publicado({ _id: "Y", nombre: "Caña" })],
    );
    expect(filas[0].web).toBeNull();
  });
});

describe("cruzarConCatalogo: lo que arranca marcado", () => {
  it("marca exactamente lo que el producto vende hoy", () => {
    const { filas } = cruzarConCatalogo([deLaLista()], [publicado()]);
    expect(filas[0].pre).toEqual({
      unidad: true,
      display: true,
      bulto: false,
    });
  });

  it("lo que no está publicado arranca sin marcar", () => {
    const { filas } = cruzarConCatalogo([deLaLista()], []);
    expect(filas[0].pre).toEqual({
      unidad: false,
      display: false,
      bulto: false,
    });
  });

  it("no marca una presentación que la lista no cotiza", () => {
    // Está publicado con display, pero la lista nueva no le pone precio.
    const { filas } = cruzarConCatalogo(
      [deLaLista({ pDisplay: null })],
      [publicado()],
    );
    expect(filas[0].pre.display).toBe(false);
  });
});

describe("cruzarConCatalogo: lo publicado que la lista no trae", () => {
  it("lo devuelve aparte en vez de ignorarlo", () => {
    const { sinCruce } = cruzarConCatalogo(
      [deLaLista()],
      [publicado(), publicado({ _id: "H0001", nombre: "Lata de humo" })],
    );
    expect(sinCruce.map((f) => f.id)).toEqual(["H0001"]);
  });
});

describe("accionDe", () => {
  const publicadosPorId = new Map([["1605", { id: "1605" }]]);
  const nada = { unidad: false, display: false, bulto: false, borrar: false };

  it("sin nada elegido no hace nada", () => {
    const fila = { web: { id: "1605" } };
    expect(accionDe(fila, { ...nada, codigo: "1605" }, publicadosPorId)).toBe(
      "nada",
    );
  });

  it("elegido y publicado es actualizar", () => {
    const fila = { web: { id: "1605" } };
    expect(
      accionDe(
        fila,
        { ...nada, unidad: true, codigo: "1605" },
        publicadosPorId,
      ),
    ).toBe("actualizar");
  });

  it("elegido y sin publicar es crear", () => {
    expect(
      accionDe(
        { web: null },
        { ...nada, unidad: true, codigo: "999" },
        publicadosPorId,
      ),
    ).toBe("crear");
  });

  it("cambiarle el código a uno publicado es renombrar", () => {
    // El código ES el id del documento: cambiarlo lo mueve de lugar.
    const fila = { web: { id: "1605" } };
    expect(
      accionDe(
        fila,
        { ...nada, unidad: true, codigo: "1699" },
        publicadosPorId,
      ),
    ).toBe("renombrar");
  });

  it("escribirle el código de uno que existe lo convierte en actualización", () => {
    /*
      Es la forma de atar a mano los que la lista escribe con una errata: la
      acción se recalcula contra el código actual, no contra el cruce que se
      hizo al leer el archivo.
    */
    expect(
      accionDe(
        { web: null },
        { ...nada, unidad: true, codigo: "1605" },
        publicadosPorId,
      ),
    ).toBe("actualizar");
  });

  it("borrar solo aplica a lo que existe", () => {
    expect(
      accionDe(
        { web: { id: "1605" } },
        { ...nada, borrar: true },
        publicadosPorId,
      ),
    ).toBe("borrar");
    expect(
      accionDe({ web: null }, { ...nada, borrar: true }, publicadosPorId),
    ).toBe("nada");
  });
});

describe("idDeCodigo y variacion", () => {
  it("la barra no sirve como id de documento", () => {
    expect(idDeCodigo("0001/20")).toBe("0001-20");
    expect(idDeCodigo("  1605 ")).toBe("1605");
  });

  it("la variación dice cuánto hay que mover el precio", () => {
    expect(variacion(1000, 1500)).toBe(50);
    expect(variacion(1500, 380)).toBe(-75);
    expect(variacion(null, 380)).toBeNull();
  });
});
