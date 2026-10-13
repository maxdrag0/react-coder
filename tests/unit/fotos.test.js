import { describe, it, expect } from "vitest";
import { fotosDe, portadaDe } from "../../src/constants/fotos";

const URL_A = "https://ejemplo.test/a.jpg";
const URL_B = "https://ejemplo.test/b.jpg";
const URL_C = "https://ejemplo.test/c.jpg";

describe("fotosDe: esquema nuevo", () => {
  it("devuelve la lista del producto", () => {
    expect(fotosDe({ fotos: [URL_A, URL_B] })).toEqual([URL_A, URL_B]);
  });

  it("descarta las vacías y los duplicados", () => {
    // Una url repetida mostraria la misma foto dos veces en la galeria.
    expect(fotosDe({ fotos: [URL_A, "", URL_A, null, URL_B] })).toEqual([URL_A, URL_B]);
  });

  it("descarta lo que no sea texto", () => {
    expect(fotosDe({ fotos: [URL_A, 42, {}, []] })).toEqual([URL_A]);
  });
});

describe("fotosDe: esquema viejo", () => {
  it("lee fotoUrl", () => {
    // Los 323 productos del catalogo tienen una sola foto en este campo.
    expect(fotosDe({ fotoUrl: URL_A })).toEqual([URL_A]);
  });

  it("lee image", () => {
    expect(fotosDe({ image: URL_A })).toEqual([URL_A]);
  });

  it("no duplica cuando fotoUrl e image son la misma", () => {
    // El panel escribe las dos en paralelo con el mismo valor.
    expect(fotosDe({ fotoUrl: URL_A, image: URL_A })).toEqual([URL_A]);
  });

  it("prefiere la lista nueva si están las dos", () => {
    expect(fotosDe({ fotos: [URL_B], fotoUrl: URL_A })).toEqual([URL_B]);
  });

  it("devuelve vacío si no hay ninguna", () => {
    expect(fotosDe({ fotoUrl: "" })).toEqual([]);
    expect(fotosDe({})).toEqual([]);
    expect(fotosDe(null)).toEqual([]);
  });
});

describe("fotosDe: por modelo", () => {
  const conModelos = {
    fotos: [URL_A],
    modelos: [
      {
        id: "rojo",
        etiqueta: "Rojo",
        foto: URL_B,
        presentaciones: { unitario: { precio: 100 } },
      },
      {
        id: "verde",
        etiqueta: "Verde",
        presentaciones: { unitario: { precio: 100 } },
      },
    ],
  };

  it("usa la foto del modelo elegido", () => {
    // Es el caso de las bengalas: una foto por color.
    expect(fotosDe(conModelos, "rojo")).toEqual([URL_B]);
  });

  it("cae en las del producto si el modelo no tiene foto propia", () => {
    expect(fotosDe(conModelos, "verde")).toEqual([URL_A]);
  });

  it("sin modelo elegido muestra las del producto", () => {
    expect(fotosDe(conModelos)).toEqual([URL_A]);
  });

  it("ignora un modelo que no existe", () => {
    expect(fotosDe(conModelos, "borrado")).toEqual([URL_A]);
  });
});

describe("portadaDe", () => {
  it("es la primera foto del producto", () => {
    expect(portadaDe({ fotos: [URL_A, URL_B] })).toBe(URL_A);
  });

  it("cae en la foto de un modelo si el producto no tiene ninguna", () => {
    // Un producto con modelos puede tener foto solo en cada modelo: la card
    // igual tiene que mostrar algo.
    const soloModelos = {
      modelos: [
        { id: "a", etiqueta: "A", presentaciones: { unitario: { precio: 1 } } },
        { id: "b", etiqueta: "B", foto: URL_C, presentaciones: { unitario: { precio: 1 } } },
      ],
    };
    expect(portadaDe(soloModelos)).toBe(URL_C);
  });

  it("devuelve null si no hay ninguna foto en ningún lado", () => {
    expect(portadaDe({ nombre: "sin fotos" })).toBeNull();
    expect(portadaDe(null)).toBeNull();
  });
});
