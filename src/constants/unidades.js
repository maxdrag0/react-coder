import { modelosDe, tieneModelos, modeloPorId } from "./modelos.js";

/*
  Las tres formas en que se compra pirotecnia, y cuántas unidades trae cada
  una.

  El esquema bueno es `presentaciones`: un mapa donde la clave existe solo si
  el producto se vende así. Eso es lo que "activa" o "desactiva" el display y
  el bulto, y además guarda cuántas unidades entran.

  Los productos cargados a granel usan el esquema viejo
  (precioUnitario/precioDisplay/precioBulto), que NO dice cuántas unidades
  trae un display. Antes eso se deducía dividiendo precios, y estaba mal:
  un display de $15.000 con unidad a $8.000 daba "2 unidades" cuando traía 5.
  Un display es más barato por unidad —es el motivo para comprarlo— así que
  el ratio de precios nunca puede ser la cantidad.

  Ahora, cuando no se sabe, se devuelve null y la tienda no muestra ninguna
  cantidad. Es peor mostrar un número equivocado que no mostrar ninguno.

  Un producto puede además tener MODELOS (ver modelos.js), y entonces las
  presentaciones viven en cada modelo: el display de un mortero de 3 pulgadas
  no trae lo mismo que el de 5. Un producto con modelos no tiene precio
  propio; para la card está `rangoDesde`.
*/

export const UNIDADES = [
  { clave: "unitario", etiqueta: "Unidad", campo: "precioUnitario" },
  { clave: "display", etiqueta: "Display", campo: "precioDisplay" },
  { clave: "bulto", etiqueta: "Bulto", campo: "precioBulto" },
];

const esPrecio = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
const esCantidad = (v) => typeof v === "number" && Number.isInteger(v) && v > 1;

/*
  Del esquema viejo se descarta la presentación cuyo precio es igual al
  unitario. La carga a granel dejó el precio del display y del bulto repetido
  del unitario en buena parte del catálogo: son valores por defecto, no formas
  de comprar. Ofrecerlos mostraba dos opciones idénticas en el selector, y
  quien elegía "Display" pagaba una unidad mientras el pedido decía Display,
  así que se despachaba un display.
*/
const desdeEsquemaViejo = (item) => {
  const unitario = esPrecio(item.precioUnitario)
    ? item.precioUnitario
    : esPrecio(item.price)
      ? item.price
      : null;

  const presentaciones = {};
  if (unitario !== null)
    presentaciones.unitario = { precio: unitario, unidades: null };

  for (const u of UNIDADES) {
    if (u.clave === "unitario") continue;
    const precio = item[u.campo];
    if (!esPrecio(precio)) continue;
    if (unitario !== null && precio === unitario) continue;
    presentaciones[u.clave] = { precio, unidades: null };
  }

  return presentaciones;
};

const desdeMapa = (mapa) => {
  const presentaciones = {};

  for (const u of UNIDADES) {
    const p = mapa[u.clave];
    if (!p || !esPrecio(p.precio)) continue;
    presentaciones[u.clave] = {
      precio: p.precio,
      // La unidad no "trae" nada: ES una unidad.
      unidades:
        u.clave !== "unitario" && esCantidad(p.unidades) ? p.unidades : null,
    };
  }

  return presentaciones;
};

/**
 * Normaliza a un mapa de presentaciones, de cualquiera de los esquemas.
 *
 * Con modelos hay que elegir uno: sin eso devuelve vacío, porque "cuánto sale
 * un mortero" no tiene respuesta sin el tamaño. Un `modeloId` que ya no
 * existe también da vacío — pasa con un carrito viejo cuyo modelo se borró.
 *
 * @returns {Object<string, {precio: number, unidades: number|null}>}
 */
export const presentacionesDe = (item, modeloId = null) => {
  if (!item) return {};

  if (tieneModelos(item)) {
    const modelo = modeloPorId(item, modeloId);
    return modelo ? desdeMapa(modelo.presentaciones) : {};
  }

  return item.presentaciones
    ? desdeMapa(item.presentaciones)
    : desdeEsquemaViejo(item);
};

export const precioDe = (item, clave, modeloId = null) =>
  presentacionesDe(item, modeloId)[clave]?.precio ?? null;

/** Cuántas unidades trae, o null si el producto no lo dice. */
export const unidadesQueTrae = (item, clave, modeloId = null) =>
  presentacionesDe(item, modeloId)[clave]?.unidades ?? null;

/** Las formas de comprar que el dueño cargó, para este producto o modelo. */
export const unidadesDisponibles = (item, modeloId = null) => {
  const presentaciones = presentacionesDe(item, modeloId);
  return UNIDADES.filter((u) => presentaciones[u.clave]);
};

/*
  Las presentaciones de un producto: las suyas, o las de cada uno de sus
  modelos cuando los tiene.
*/
const juegosDePresentaciones = (item) =>
  tieneModelos(item)
    ? modelosDe(item).map((m) => desdeMapa(m.presentaciones))
    : [presentacionesDe(item)];

/* La más barata de un juego, con cuál es. El orden de UNIDADES desempata. */
const masBarata = (presentaciones) => {
  let mejor = null;
  for (const u of UNIDADES) {
    const p = presentaciones[u.clave];
    if (!p) continue;
    if (mejor === null || p.precio < mejor.precio) {
      mejor = { precio: p.precio, clave: u.clave };
    }
  }
  return mejor;
};

/**
 * El precio de ENTRADA: el más barato al que se puede comprar el producto,
 * sea la presentación que sea, y en qué presentación es.
 *
 * Antes esto miraba solo el precio unitario, y eso daba por sentado que todo
 * se vende por unidad. Las bengalas de humo se venden por display y nada
 * más: con el unitario vacío, la card se quedaba SIN PRECIO y el producto se
 * caía del filtro de precios. Ahora la card puede decir "desde $15.250 el
 * display".
 *
 * `clave` sirve para nombrar la presentación cuando no es la unidad: decir
 * "desde $15.250" a secas haría pensar que es el precio de una.
 *
 * @returns {{min: number, max: number, clave: string}|null}
 */
export const rangoDesde = (item) => {
  if (!item) return null;

  const baratas = juegosDePresentaciones(item).map(masBarata).filter(Boolean);
  if (baratas.length === 0) return null;

  const min = Math.min(...baratas.map((b) => b.precio));
  const max = Math.max(...baratas.map((b) => b.precio));

  return { min, max, clave: baratas.find((b) => b.precio === min).clave };
};

/** El piso del rango. Lo usan los filtros y la exportación. */
export const precioMinimo = (item) => rangoDesde(item)?.min ?? null;
