import {
  obtenerProductos,
  obtenerProductosPorCodigo,
  crearProducto,
} from "./productosFirebase";

import { obtenerTodasLasCompras } from "./comprasFirebase";
import {
  crearContacto,
  obtenerMensajes,
  marcarMensajeComoLeido,
  eliminarMensaje,
} from "./contactoFirebase";
import { obtenerRecargo } from "./configFirebase";
import { conRecargo } from "../../constants/recargo";

/*
  ESTA FACHADA ES POR DONDE LEE LA TIENDA, y por eso es acá donde los precios
  de lista se convierten en precios de venta.

  El panel de administración importa `obtenerProductos` DIRECTO de
  productosFirebase, así que sigue viendo los precios de lista, que son los
  que edita. Si leyera de acá, guardar un producto le hornearía el recargo
  encima del precio guardado, y el recargo se volvería a aplicar sobre eso en
  la próxima vuelta.

  Hay un test que falla si el panel empieza a leer de acá.
*/

const conPrecios = async (productos) => {
  const recargo = await obtenerRecargo();
  return productos.map((p) => conRecargo(p, recargo));
};

export const firebase = {
  obtenerTodasLasCompras,
  crearContacto,
  obtenerMensajes,
  marcarMensajeComoLeido,
  eliminarMensaje,
  crearProducto,

  obtenerProductos: async (...args) => {
    const pagina = await obtenerProductos(...args);
    return { ...pagina, items: await conPrecios(pagina.items ?? []) };
  },

  obtenerProductosPorCodigo: async (codigo) => {
    const producto = await obtenerProductosPorCodigo(codigo);
    if (!producto) return producto;
    return conRecargo(producto, await obtenerRecargo());
  },
};
