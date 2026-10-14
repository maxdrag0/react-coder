import { auth } from "@/utils/firebase";

/*
  Cliente de la API de ordenes.

  Manda codigos, cantidades y el precio que el cliente TIENE A LA VISTA. Nunca
  el total: ese lo calcula el servidor leyendo el catalogo, que es todo el
  punto del subproyecto.

  El `precioVisto` solo sirve para que el servidor pueda decir QUE cambio y de
  cuanto a cuanto.
*/

const RUTA = "/api/orden";

const MENSAJE_SIN_RED =
  "No pudimos conectarnos. Revisá tu conexión y volvé a intentar.";

const errorCon = (code, mensaje, extra = {}) => {
  const e = new Error(mensaje);
  e.code = code;
  Object.assign(e, extra);
  return e;
};

export const enviarOrden = async ({ items, telefono, idempotencia }) => {
  /*
    La idempotencia la elige quien manda el pedido, no esta funcion. Generarla
    aca daba una distinta por llamada, y entonces no deduplicaba nada: un
    reintento despues de una respuesta perdida creaba un segundo pedido igual.
  */
  if (!idempotencia) {
    throw errorCon("sin-idempotencia", "Falta el identificador del intento.");
  }

  let token;
  try {
    token = await auth.currentUser?.getIdToken();
  } catch {
    throw errorCon("sin-red", MENSAJE_SIN_RED);
  }
  if (!token) throw errorCon("sin-sesion", "Tenes que iniciar sesion.");

  let respuesta;
  try {
    respuesta = await fetch(RUTA, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        idempotencia,
        items,
        ...(telefono ? { telefono } : {}),
      }),
    });
  } catch {
    /*
      fetch solo rechaza cuando no hubo respuesta: sin red, DNS caido, o el
      pedido cortado a mitad. El mensaje del navegador viene en ingles y es
      tecnico, y el cliente no tiene por que leer "Failed to fetch".
    */
    throw errorCon("sin-red", MENSAJE_SIN_RED);
  }

  const cuerpo = await respuesta.json().catch(() => ({}));

  if (respuesta.ok) return cuerpo;

  if (respuesta.status === 409) {
    throw errorCon(
      "carrito-desactualizado",
      "El carrito esta desactualizado.",
      {
        problemas: cuerpo.problemas ?? [],
      },
    );
  }

  if (respuesta.status === 422) {
    throw errorCon(
      "sin_telefono",
      "Necesitamos tu telefono para coordinar el pedido.",
    );
  }

  throw errorCon(
    "error-servidor",
    cuerpo.error ?? "No se pudo registrar el pedido.",
  );
};
