import { renglonDe } from "@/constants/renglon";
import { formatearPrecio } from "@/utils/formatearPrecio";
import { paraWhatsapp } from "@/utils/telefono";

/*
  El mensaje con el que se abre el chat de un pedido.

  El panel es desde donde se atiende: se toca el teléfono del cliente y
  arranca la conversación. Escribir "hola, te escribo por tu pedido de..."
  una vez por pedido es trabajo que la página puede hacer sola, y de paso
  evita mandarle a una persona el pedido de otra.

  Va como texto sugerido, no enviado: WhatsApp lo deja escrito en el campo y
  quien atiende decide si lo manda así o lo cambia.

  UN RENGLÓN POR PRODUCTO. Todo seguido en un párrafo no se puede leer de un
  vistazo, y lo que se hace con este mensaje es justamente repasar el pedido
  con el cliente antes de prepararlo.
*/

// Más que esto llena la pantalla del chat y tapa lo que se quiere decir.
const MAX_RENGLONES = 6;

const SALTO = "\n";

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

/** Un renglón por producto, y el sobrante resumido en el último. */
const listaDe = (items = []) => {
  const renglones = items.slice(0, MAX_RENGLONES).map(renglonDe);
  const resto = items.length - renglones.length;
  if (resto > 0) renglones.push(`y ${resto} más`);
  return renglones.map((r) => `- ${r}`);
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

  /*
    Cada renglón se arma solo si hay con qué, y los vacíos se descartan: un
    pedido viejo o incompleto tiene que dar un mensaje más corto, nunca uno
    con "undefined" adentro ni con dos puntos colgando sin lista debajo.
  */
  const encabezado = [
    nombre ? `Hola ${nombre}!` : "Hola!",
    `Te escribo por tu pedido de pirotecnia${fecha ? ` del ${fecha}` : ""}`,
  ].join(" ");

  return [
    lista.length > 0 ? `${encabezado}:` : `${encabezado}.`,
    ...lista,
    total ? `Total ${total}` : null,
    "¿Coordinamos el pago y el envío?",
  ]
    .filter(Boolean)
    .join(SALTO);
};

/**
 * Link para abrir el chat con el texto ya escrito.
 *
 * encodeURIComponent deja los saltos de línea como %0A, que es lo que hace
 * que la lista llegue en renglones y no todo pegado.
 *
 * @returns {string|null} null si el teléfono no sirve para WhatsApp
 */
export const linkDeWhatsapp = (telefono, mensaje = "") => {
  const numero = paraWhatsapp(telefono);
  if (!numero) return null;

  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
};
