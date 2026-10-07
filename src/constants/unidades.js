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

const desdeEsquemaNuevo = (item) => {
  const presentaciones = {};

  for (const u of UNIDADES) {
    const p = item.presentaciones[u.clave];
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
 * Normaliza cualquiera de los dos esquemas a un mapa de presentaciones.
 * @returns {Object<string, {precio: number, unidades: number|null}>}
 */
export const presentacionesDe = (item) => {
  if (!item) return {};
  return item.presentaciones
    ? desdeEsquemaNuevo(item)
    : desdeEsquemaViejo(item);
};

export const precioDe = (item, clave) => presentacionesDe(item)[clave]?.precio ?? null;

/** Cuántas unidades trae, o null si el producto no lo dice. */
export const unidadesQueTrae = (item, clave) =>
  presentacionesDe(item)[clave]?.unidades ?? null;

/** Las formas de comprar que el dueño cargó para este producto. */
export const unidadesDisponibles = (item) => {
  const presentaciones = presentacionesDe(item);
  return UNIDADES.filter((u) => presentaciones[u.clave]);
};
