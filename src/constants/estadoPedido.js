/*
  Estado de un pedido, siguiendo el proceso real: entra, lo llamás, te paga,
  se lo lleva. "Cancelado" para los que se caen.

  Un pedido sin el campo cuenta como `nuevo`, así que los pedidos que ya
  entraron no necesitan migración. Y un valor que no se reconoce también cae
  en `nuevo`: un pedido que desaparece de la vista es una venta perdida, así
  que ante la duda aparece como pendiente de atender.
*/

export const NUEVO = "nuevo";
export const CONTACTADO = "contactado";
export const PAGADO = "pagado";
export const ENTREGADO = "entregado";
export const CANCELADO = "cancelado";

export const ESTADOS_PEDIDO = [
  { clave: NUEVO, etiqueta: "Nuevo" },
  { clave: CONTACTADO, etiqueta: "Contactado" },
  { clave: PAGADO, etiqueta: "Pagado" },
  { clave: ENTREGADO, etiqueta: "Entregado" },
  { clave: CANCELADO, etiqueta: "Cancelado" },
];

// Los que ya terminaron y no piden nada. El resto cuenta para el contador
// de la pestaña del panel.
const CERRADOS = new Set([ENTREGADO, CANCELADO]);

const CLAVES = new Set(ESTADOS_PEDIDO.map((e) => e.clave));

export const estadoDePedido = (pedido) => {
  const estado = pedido?.estado;
  return CLAVES.has(estado) ? estado : NUEVO;
};

export const etiquetaDePedido = (clave) =>
  ESTADOS_PEDIDO.find((e) => e.clave === clave)?.etiqueta ?? "Nuevo";

/** Si todavía pide atención del dueño. */
export const estaAbierto = (pedido) => !CERRADOS.has(estadoDePedido(pedido));
