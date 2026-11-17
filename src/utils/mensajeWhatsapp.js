import { renglonDe } from "@/constants/renglon";
import { formatearPrecio } from "@/utils/formatearPrecio";
import { paraWhatsapp } from "@/utils/telefono";

/*
  El mensaje con el que se abre el chat de un pedido.

  El panel es desde donde se atiende: se toca el teléfono del cliente y
  arranca la conversación. Escribir a mano "hola, te escribo por tu pedido
  de..." una vez por pedido es trabajo que la página puede hacer sola, y de
  paso evita mandarle a una persona el pedido de otra.

  Va como texto sugerido, no enviado: WhatsApp lo deja escrito en el campo y
  quien atiende decide si lo manda así o lo cambia.
*/

// Más que esto llena la pantalla del chat y tapa lo que se quiere decir.
const MAX_RENGLONES = 6;

const primerNombre = (completo) =>
  String(completo ?? "")
    .trim()
    .split(" ")[0];

const fechaCorta = (iso) => {
  const fecha = new Date(iso ?? "");
  return Number.isNaN(fecha.getTime())
    ? null
    : fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
};

const listaDe = (items = []) => {
  const renglones = items.slice(0, MAX_RENGLONES).map(renglonDe);
  const resto = items.length - renglones.length;
  if (resto > 0) renglones.push(`y ${resto} más`);
  return renglones.join(", ");
};

/**
 * @param {object} pedido el documento de `compras`
 * @returns {string} el texto sugerido, siempre legible aunque falten datos
 */
export const mensajeDePedido = (pedido) => {
  const nombre = primerNombre(pedido?.buyer?.name);
  const fecha = fechaCorta(pedido?.date);
  const lista = listaDe(pedido?.items);
  const total = formatearPrecio(pedido?.total);

  // Cada parte se arma solo si hay con qué: un pedido viejo o incompleto
  // tiene que dar un mensaje más corto, nunca uno con "undefined" adentro.
  const partes = [
    nombre ? `Hola ${nombre}! ` : "Hola! ",
    `Te escribo por tu pedido de pirotecnia${fecha ? ` del ${fecha}` : ""}`,
    lista ? `: ${lista}` : "",
    total ? `. Total ${total}` : "",
    ". ¿Coordinamos el pago y el envío?",
  ];

  return partes.join("").replace(/\s+/g, " ").trim();
};

/**
 * Link para abrir el chat con el texto ya escrito.
 * @returns {string|null} null si el teléfono no sirve para WhatsApp
 */
export const linkDeWhatsapp = (telefono, mensaje = "") => {
  const numero = paraWhatsapp(telefono);
  if (!numero) return null;

  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
};
