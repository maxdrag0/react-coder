import {
  obtenerProductos,
  obtenerProductosPorId,
  crearProducto,
} from "./productosFirebase";

import { crearCompra } from "./comprasFirebase";
import { crearContacto } from "./contactoFirebase";

export const firebase = {
  crearCompra,
  crearContacto,
  obtenerProductos,
  obtenerProductosPorId,
  crearProducto,
};
