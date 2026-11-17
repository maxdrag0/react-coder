import { describe, it, expect } from "vitest";
import {
  categoriasConProductos,
  mismaCategoria,
  deLaCategoria,
} from "@/constants/categoriasConProductos";
import { ACTIVO, SIN_STOCK, OCULTO } from "@/constants/estadoProducto";

const prod = (categoria, estado = ACTIVO) => ({
  codigo: `${categoria}-${estado}`,
  categoria,
  estado,
});

describe("categoriasConProductos", () => {
  it("solo devuelve las categorías que tienen algo para mostrar", () => {
    /*
      EL BUG: el panel de filtros ofrecía las 16 categorías de la constante,
      estuvieran o no cargadas. Elegir una vacía llevaba a "No encontramos
      nada": una opción que no devuelve nada no es un filtro.
    */
    const catalogo = [prod("Tortas"), prod("Bengalas")];
    expect(categoriasConProductos(catalogo)).toEqual(["Bengalas", "Tortas"]);
  });

  it("deja afuera la categoría cuyos productos están todos ocultos", () => {
    const catalogo = [prod("Tortas"), prod("Morteros", OCULTO)];
    expect(categoriasConProductos(catalogo)).toEqual(["Tortas"]);
  });

  it("deja afuera la categoría sin ningún producto", () => {
    expect(categoriasConProductos([])).toEqual([]);
  });

  it("incluye la categoría que solo tiene productos sin stock", () => {
    // Sin stock SE VE en la tienda: entra, se mira y no se puede comprar.
    // Esconder el filtro dejaría esos productos inalcanzables.
    expect(categoriasConProductos([prod("Volcanes", SIN_STOCK)])).toEqual([
      "Volcanes",
    ]);
  });

  it("junta las variantes en mayúsculas bajo el nombre canónico", () => {
    // Parte del catálogo quedó con la categoría en mayúsculas, y por eso la
    // consulta de la tienda pregunta por las dos formas.
    const catalogo = [prod("TORTAS"), prod("Tortas")];
    expect(categoriasConProductos(catalogo)).toEqual(["Tortas"]);
  });

  it("no repite ni ordena al azar", () => {
    const catalogo = [prod("Tortas"), prod("Bengalas"), prod("Tortas")];
    expect(categoriasConProductos(catalogo)).toEqual(["Bengalas", "Tortas"]);
  });

  it("ignora el producto sin categoría", () => {
    const catalogo = [{ codigo: "1" }, { codigo: "2", categoria: "   " }];
    expect(categoriasConProductos(catalogo)).toEqual([]);
  });

  it("conserva la categoría elegida aunque esté vacía", () => {
    // Si no, al entrar a /products/Varios con Varios vacía el panel no
    // marcaba ninguna opción como activa y la cabecera decía "Varios".
    expect(categoriasConProductos([prod("Tortas")], "Varios")).toEqual([
      "Tortas",
      "Varios",
    ]);
  });

  it("no duplica la categoría elegida cuando además tiene productos", () => {
    expect(categoriasConProductos([prod("Tortas")], "Tortas")).toEqual([
      "Tortas",
    ]);
  });

  it("muestra la categoría que no está en la constante pero sí en el catálogo", () => {
    // Derivarlas del catálogo y no de la constante: si alguien cargó algo en
    // una categoría vieja, el filtro es el único camino hasta ese producto.
    expect(categoriasConProductos([prod("Cohetes")])).toEqual(["Cohetes"]);
  });

  it("no explota sin catálogo", () => {
    expect(categoriasConProductos(undefined)).toEqual([]);
  });
});

describe("mismaCategoria", () => {
  it("compara ignorando mayúsculas y espacios", () => {
    expect(mismaCategoria("TORTAS", "Tortas")).toBe(true);
    expect(mismaCategoria(" Tortas ", "Tortas")).toBe(true);
  });

  it("distingue categorías distintas", () => {
    expect(mismaCategoria("Tortas", "Morteros")).toBe(false);
  });

  it("nada no es igual a nada", () => {
    // Un producto sin categoría no pertenece a ninguna.
    expect(mismaCategoria(undefined, undefined)).toBe(false);
    expect(mismaCategoria("", "Tortas")).toBe(false);
  });
});

describe("deLaCategoria", () => {
  it("filtra como lo hacía la consulta de Firestore", () => {
    const catalogo = [prod("Tortas"), prod("TORTAS"), prod("Morteros")];
    expect(deLaCategoria(catalogo, "Tortas")).toHaveLength(2);
  });

  it("sin categoría devuelve todo el catálogo", () => {
    const catalogo = [prod("Tortas"), prod("Morteros")];
    expect(deLaCategoria(catalogo, null)).toHaveLength(2);
  });
});
