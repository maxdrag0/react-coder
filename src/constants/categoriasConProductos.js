import { CATEGORIES } from "./categories.js";
import { seMuestra } from "./estadoProducto.js";

/*
  Las categorías que la tienda puede ofrecer: las que tienen al menos un
  producto a la vista.

  Vive aparte de `categories.js` porque eso es la lista fija de nombres
  válidos —la que llena el selector del panel— y esto es lo que hay cargado
  en cada momento, que sale del catálogo.

  EL BUG QUE ARREGLA: el panel de filtros listaba las dieciséis categorías de
  la constante, estuvieran cargadas o no. De dieciséis se usan menos de la
  mitad, así que la mayoría de las opciones llevaban a "No encontramos nada".
  Una opción que no devuelve nada no es un filtro, es un camino cortado.

  La comparación ignora mayúsculas por la misma razón que la consulta de
  Firestore pregunta por `[categoria, categoria.toUpperCase()]`: parte del
  catálogo quedó con la categoría en mayúsculas.
*/

const TODAS = Object.values(CATEGORIES);

// toLowerCase y no toLocaleLowerCase: en turco la I mayúscula baja a una
// "ı" sin punto, y ahí "TORTAS" dejaría de coincidir con "Tortas". Comparar
// claves no depende del idioma del navegador; ordenar sí, y para eso queda
// localeCompare.
const normalizar = (valor) =>
  String(valor ?? "")
    .trim()
    .toLowerCase();

/** El nombre lindo de la categoría: el de la constante si existe. */
const canonica = (valor) => {
  const clave = normalizar(valor);
  // Sin esto, un producto sin categoria entraba como la categoria
  // "undefined": String(undefined) es una cadena, no vacio.
  if (clave === "") return "";
  return TODAS.find((c) => normalizar(c) === clave) ?? String(valor).trim();
};

/**
 * Si dos categorías son la misma. Vacío no es igual a vacío: un producto sin
 * categoría no pertenece a ninguna.
 */
export const mismaCategoria = (a, b) => {
  const uno = normalizar(a);
  return uno !== "" && uno === normalizar(b);
};

/**
 * Los productos de una categoría. Sin categoría devuelve todo, igual que la
 * consulta de la tienda, que en ese caso no filtra nada.
 */
export const deLaCategoria = (items = [], categoria) =>
  categoria
    ? items.filter((p) => mismaCategoria(p?.categoria, categoria))
    : [...items];

/**
 * @param {Array} items el catálogo, con ocultos y todo
 * @param {string} [elegida] la categoría de la URL: se conserva aunque esté
 *   vacía, para que el panel pueda marcarla como activa y no quede ninguna
 *   opción seleccionada mientras la cabecera muestra ese nombre.
 */
export const categoriasConProductos = (items = [], elegida = null) => {
  const vistas = new Map();

  for (const p of items ?? []) {
    if (!seMuestra(p)) continue;
    const nombre = canonica(p?.categoria);
    if (!nombre) continue;
    vistas.set(normalizar(nombre), nombre);
  }

  if (elegida && normalizar(elegida)) {
    const nombre = canonica(elegida);
    vistas.set(normalizar(nombre), nombre);
  }

  return [...vistas.values()].sort((a, b) => a.localeCompare(b));
};
