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

export const firebase = {
  obtenerTodasLasCompras,
  crearContacto,
  obtenerMensajes,
  marcarMensajeComoLeido,
  eliminarMensaje,
  obtenerProductos,
  obtenerProductosPorCodigo,
  crearProducto,
};
