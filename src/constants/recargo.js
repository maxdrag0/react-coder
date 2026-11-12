/*
  El recargo: un solo porcentaje sobre todos los precios de todos los
  productos.

  El catálogo guarda lo que dice la lista del proveedor. Lo que ve el cliente
  es ese precio más el recargo, y el porcentaje se edita en el panel. Guardar
  el precio de lista y no el de venta tiene una ventaja concreta: cuando llega
  la lista del año que viene se reemplaza tal cual, sin recalcular márgenes
  producto por producto.

  DÓNDE SE APLICA. En la fachada `services.firebase`, que es por donde lee la
  tienda, y en api/orden.js, que es por donde cotiza el servidor. El panel de
  administración importa directo de productosFirebase y por eso sigue viendo
  los precios de lista, que son los que edita.

  Eso NO es una convención que haya que recordar: son dos caminos de import
  distintos, y hay un test que falla si alguien los junta.

  POR QUÉ IMPORTA QUE LOS DOS APLIQUEN LO MISMO: cuando se manda un pedido, el
  servidor recalcula el total para que el navegador no pueda inventarlo. Si la
  tienda mostrara el precio con recargo y el servidor cotizara sin él, todos
  los pedidos fallarían con "tu carrito está desactualizado" y nadie podría
  comprar.
*/

/** Mostrar el precio de lista tal cual. Es el valor seguro ante cualquier duda. */
export const SIN_RECARGO = 0;

/*
  Un cero de más al tipear no tiene que multiplicar el catálogo por cien.
  1000% es absurdo y a la vez bien lejos de cualquier margen real.
*/
const TECHO = 1000;

/**
 * Normaliza lo que venga de la base o del formulario.
 *
 * Cae en cero ante cualquier cosa rara: cero muestra el precio de lista, que
 * es un error visible y barato. Un recargo inventado cobra de más sin que
 * nadie se entere.
 */
export const recargoValido = (valor) => {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return SIN_RECARGO;
  return Math.min(n, TECHO);
};

/*
  Para arriba y a los diez pesos. Un 35% sobre $1.310 da $1.768,50: mostrar
  centavos en una tienda de pirotecnia no tiene sentido, y redondear para
  abajo sería regalar plata en cada venta.
*/
const redondear = (n) => Math.ceil(n / 10) * 10;

/**
 * Un precio con el recargo puesto, o null si no había precio.
 *
 * @returns {number|null}
 */
export const precioConRecargo = (precio, recargo) => {
  const base = Number(precio);
  if (!Number.isFinite(base) || base <= 0) return null;

  const pct = recargoValido(recargo);
  if (pct === SIN_RECARGO) return base;

  return redondear(base * (1 + pct / 100));
};

/*
  Las claves que no se venden viajan en null y no se omiten: Firestore hace
  merge profundo de los mapas, así que una clave ausente resucitaría la que
  estaba guardada.
*/
const mapaConRecargo = (presentaciones, recargo) => {
  if (!presentaciones || typeof presentaciones !== "object")
    return presentaciones;

  const salida = {};
  for (const [clave, valor] of Object.entries(presentaciones)) {
    if (!valor || typeof valor !== "object") {
      salida[clave] = valor;
      continue;
    }
    const precio = precioConRecargo(valor.precio, recargo);
    salida[clave] = precio === null ? null : { ...valor, precio };
  }
  return salida;
};

/**
 * El producto como lo tiene que ver el cliente.
 *
 * Devuelve una copia: el panel lee del mismo lugar y mutar acá le cambiaría
 * los precios al formulario de edición.
 */
export const conRecargo = (producto, recargo) => {
  if (!producto) return producto;

  const pct = recargoValido(recargo);
  if (pct === SIN_RECARGO) return producto;

  const salida = { ...producto };

  if (producto.presentaciones) {
    salida.presentaciones = mapaConRecargo(producto.presentaciones, pct);
  }

  if (Array.isArray(producto.modelos)) {
    salida.modelos = producto.modelos.map((m) => ({
      ...m,
      presentaciones: mapaConRecargo(m?.presentaciones, pct),
    }));
  }

  return salida;
};
