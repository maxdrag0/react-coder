import { modelosDe, modeloPorId } from "./modelos.js";

/*
  Fotos de un producto.

  El producto tiene una LISTA (`fotos`) y cada modelo puede tener UNA propia
  (`foto`). Es lo que piden las bengalas: una foto por color, y además varias
  fotos generales del producto.

  Los productos del esquema viejo tienen una sola foto en `fotoUrl` (y el
  panel escribia `image` en paralelo con el mismo valor), asi que eso se
  sigue leyendo y no hay migracion.
*/

const esUrl = (v) => typeof v === "string" && v.trim() !== "";

/** Saca vacias, repetidas y lo que no sea texto. */
const limpiar = (lista) => [...new Set(lista.filter(esUrl))];

/**
 * Las fotos a mostrar.
 *
 * Con un modelo elegido que tiene foto propia, es esa y solo esa: el cliente
 * eligio el rojo y tiene que ver el rojo. Si ese modelo no tiene foto, caen
 * las del producto.
 *
 * @returns {string[]}
 */
export const fotosDe = (item, modeloId = null) => {
  if (!item) return [];

  const modelo = modeloPorId(item, modeloId);
  if (esUrl(modelo?.foto)) return [modelo.foto];

  if (Array.isArray(item.fotos)) return limpiar(item.fotos);

  return limpiar([item.fotoUrl]);
};

/**
 * La foto para la card. Si el producto no tiene ninguna propia pero sus
 * modelos sí, usa la primera que encuentre: la card tiene que mostrar algo.
 *
 * @returns {string|null}
 */
export const portadaDe = (item) => {
  const propias = fotosDe(item);
  if (propias.length > 0) return propias[0];

  const deModelo = modelosDe(item).find((m) => esUrl(m.foto));
  return deModelo?.foto ?? null;
};
