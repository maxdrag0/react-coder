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
 * Un renglón listo para mostrar: `2x Bengala de humo (Rojo, display)`.
 *
 * El modelo va primero porque es lo que distingue un renglón de otro. La
 * unidad suelta no se nombra: es el caso normal y nombrarla sería ruido en
 * todos los renglones para distinguir los pocos que no lo son.
 */
export const renglonDe = (item) => {
  const extras = [
    item?.modeloEtiqueta,
    item?.unidad && item.unidad !== "unitario" ? item.unidad : null,
  ].filter(Boolean);

  const detalle = extras.length > 0 ? ` (${extras.join(", ")})` : "";

  return `${item?.cantidad}x ${nombreDeItem(item)}${detalle}`;
};
