import { modelosDe, tieneModelos, modeloPorId } from "./modelos";

/*
  Las tres formas en que se compra pirotecnia, y cuántas unidades trae cada
  una.

  El esquema bueno es `presentaciones`: un mapa donde la clave existe solo si
  el producto se vende así. Eso es lo que "activa" o "desactiva" el display y
  el bulto, y además guarda cuántas unidades entran.

  Los 323 productos cargados usan el esquema viejo
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
  propio; para la card está `rangoUnitario`.
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
  unitario: 171 productos tienen `precioDisplay` repetido y 45 el bulto. Son
  valores por defecto de la carga, no formas de comprar. Ofrecerlos mostraba
  dos opciones idénticas en el selector, y quien elegía "Display" pagaba una
  unidad mientras el pedido decía Display, así que se despachaba un display.
*/
const desdeEsquemaViejo = (item) => {
  const unitario = esPrecio(item.precioUnitario)
    ? item.precioUnitario
    : esPrecio(item.price)
      ? item.price
      : null;

  const presentaciones = {};
  if (unitario !== null) presentaciones.unitario = { precio: unitario, unidades: null };

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
      unidades: u.clave !== "unitario" && esCantidad(p.unidades) ? p.unidades : null,
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

  return item.presentaciones ? desdeMapa(item.presentaciones) : desdeEsquemaViejo(item);
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

/**
 * El precio unitario más bajo y más alto del producto, mirando todos sus
 * modelos. Es lo que la card necesita para decir "desde $8.000" y lo que usan
 * los filtros de precio, que no pueden elegir un modelo por su cuenta.
 *
 * @returns {{min: number, max: number}|null}
 */
export const rangoUnitario = (item) => {
  if (!item) return null;

  const precios = tieneModelos(item)
    ? modelosDe(item)
        .map((m) => desdeMapa(m.presentaciones).unitario?.precio)
        .filter((p) => p !== undefined)
    : [presentacionesDe(item).unitario?.precio].filter((p) => p !== undefined);

  if (precios.length === 0) return null;

  return { min: Math.min(...precios), max: Math.max(...precios) };
};

/** El piso del rango. Lo usan los filtros y la exportación. */
export const precioMinimo = (item) => rangoUnitario(item)?.min ?? null;
