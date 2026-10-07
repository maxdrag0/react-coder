/*
  Teléfono del comprador. Es el campo más importante del pedido: el negocio
  es "me llega la orden y te contacto", y sin número eso no se puede hacer.

  La validación es deliberadamente suelta. Rechazar un número válido es peor
  que aceptar uno raro, porque el dueño lo va a leer igual antes de llamar.
  Solo frena lo que no puede ser un teléfono.
*/

const MINIMO = 8; // un fijo del interior sin código de área
const MAXIMO = 15; // el máximo del estándar E.164

export const soloDigitos = (valor) => String(valor ?? "").replace(/\D/g, "");

export const esTelefonoValido = (valor) => {
  const d = soloDigitos(valor);
  return d.length >= MINIMO && d.length <= MAXIMO;
};

/** Mensaje para mostrar al lado del campo, o null si está bien. */
export const errorDeTelefono = (valor) => {
  const d = soloDigitos(valor);
  if (d.length === 0) {
    return "Necesitamos tu teléfono para coordinar el pedido.";
  }
  if (d.length < MINIMO) {
    return "Parece incompleto. Incluí el código de área, sin el 0.";
  }
  if (d.length > MAXIMO) {
    return "Son demasiados números, revisá si se repitió alguno.";
  }
  return null;
};

/*
  Un número local argentino de celular son 10 dígitos: código de área (2, 3 o
  4) más el abonado. Cuando vienen 12 es porque trae el 15 que se usa al
  marcar desde un fijo, y WhatsApp no lo quiere.

  El 15 se busca solo donde puede estar segun el largo del código de área, y
  se saca solo si el resultado queda en 10 digitos. Esa condición es lo que
  evita mutilar un número que casualmente contenga un 15.
*/
const sinQuince = (local) => {
  if (local.length !== 12) return local;
  for (const i of [2, 3, 4]) {
    if (local.slice(i, i + 2) === "15") {
      return local.slice(0, i) + local.slice(i + 2);
    }
  }
  return local;
};

/**
 * Número listo para un link de WhatsApp: 54 + 9 + área sin 0 + abonado sin 15.
 * @returns {string|null} solo dígitos, o null si el teléfono no sirve
 */
export const paraWhatsapp = (valor) => {
  if (!esTelefonoValido(valor)) return null;

  let d = soloDigitos(valor);

  if (d.startsWith("549")) return d;

  // Solo se saca el 54 si lo que queda alcanza para un número local: si no,
  // un local que empieza con 54 quedaría recortado.
  if (d.startsWith("54") && d.length - 2 >= 10) d = d.slice(2);

  d = d.replace(/^0+/, "");

  return `549${sinQuince(d)}`;
};
