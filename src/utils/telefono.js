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
  /*
    Lo último: que sirva para WhatsApp. El teléfono es por donde se atiende
    el pedido, así que un número que no se puede convertir no es un dato,
    es un pedido que no se puede coordinar. Acá SÍ se exige el código de
    área: sin él no se puede llamar desde afuera del pueblo ni abrir un
    chat.
  */
  if (paraWhatsapp(valor) === null) {
    return "Escribilo con el código de área y el número, sin el 0 ni el 15. Por ejemplo: 11 2233 4455.";
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

const LARGO_LOCAL = 10; // código de área + abonado

/*
  El número LOCAL: área + abonado, sin el 54, sin el 9 de los celulares, sin
  el 0 del área y sin el 15 del abonado.

  Cada prefijo se saca solo si lo que queda alcanza para un número local.
  Esa condición es lo que evita recortar un número que casualmente empiece
  con 54 o con 9.
*/
const localDe = (valor) => {
  let d = soloDigitos(valor).replace(/^0+/, "");

  if (d.startsWith("54") && d.length - 2 >= LARGO_LOCAL) d = d.slice(2);

  /*
    EL BUG QUE ARREGLA: alguien escribió "9 11 2233 4455", que es como se
    escribe un celular para el exterior. Sin sacar ese 9, el link quedaba
    549 + 91122334455 = 54991122334455, con el nueve repetido, y WhatsApp
    respondía que el número no existe.
  */
  if (d.startsWith("9") && d.length - 1 >= LARGO_LOCAL) d = d.slice(1);

  // "54 011 ..." deja el cero del área adentro.
  return sinQuince(d.replace(/^0+/, ""));
};

/**
 * Número listo para un link de WhatsApp: 54 + 9 + área sin 0 + abonado sin 15.
 * @returns {string|null} solo dígitos, o null si el teléfono no sirve
 */
export const paraWhatsapp = (valor) => {
  const local = localDe(valor);
  return local.length === LARGO_LOCAL ? `549${local}` : null;
};
