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

const errorCon = (code, mensaje, extra = {}) => {
  const e = new Error(mensaje);
  e.code = code;
  Object.assign(e, extra);
  return e;
};

export const enviarOrden = async ({ items, telefono }) => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw errorCon("sin-sesion", "Tenes que iniciar sesion.");

  const respuesta = await fetch(RUTA, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      // Un uuid por intento: si el cliente reintenta, el servidor sobrescribe
      // el mismo documento en vez de crear dos pedidos iguales.
      idempotencia: crypto.randomUUID(),
      items,
      ...(telefono ? { telefono } : {}),
    }),
  });

  const cuerpo = await respuesta.json().catch(() => ({}));

  if (respuesta.ok) return cuerpo;

  if (respuesta.status === 409) {
    throw errorCon("carrito-desactualizado", "El carrito esta desactualizado.", {
      problemas: cuerpo.problemas ?? [],
    });
  }

  if (respuesta.status === 422) {
    throw errorCon("sin_telefono", "Necesitamos tu telefono para coordinar el pedido.");
  }

  throw errorCon("error-servidor", cuerpo.error ?? "No se pudo registrar el pedido.");
};
