import { UNIDADES } from "./unidades.js";

/*
  Cómo se nombra un renglón de pedido: en el carrito, en "mis pedidos" y en la
  tabla del panel.

  Vive en un solo lugar porque los tres lo escribían por su cuenta y el del
  panel se había quedado sin el modelo: tres bengalas de colores distintos se
  leían como tres renglones idénticos, y el dueño no podía saber qué preparar.
*/

/**
 * El nombre del producto.
 *
 * `name` es como lo escribía el panel viejo y sigue habiendo documentos así.
 * Devuelve texto vacío y nunca undefined: un undefined pintado en la tabla se
 * lee "undefined".
 */
export const nombreDeItem = (item) => item?.nombre || item?.name || "";

/**
 * Un renglón listo para mostrar: `2x Bengala de humo (Rojo, Display)`.
 *
 * El modelo va primero porque es lo que distingue un renglón de otro.
 *
 * La unidad se nombra SIEMPRE, incluida la suelta. Omitirla ahorraba una
 * palabra pero obligaba a quien prepara el pedido a saber que la ausencia
 * significa "de a uno": leer "2x Bengala" y tener que deducir si son dos
 * unidades o dos bultos es justo la duda que no puede existir.
 *
 * Se usa la etiqueta y no la clave: en la tabla decía "display" en minúscula,
 * que es el nombre interno del campo y no cómo se vende.
 */
export const renglonDe = (item) => {
  const unidad =
    UNIDADES.find((u) => u.clave === item?.unidad)?.etiqueta ?? null;

  const extras = [item?.modeloEtiqueta, unidad].filter(Boolean);
  const detalle = extras.length > 0 ? ` (${extras.join(", ")})` : "";

  return `${item?.cantidad}x ${nombreDeItem(item)}${detalle}`;
};
