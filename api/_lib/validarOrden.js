import { precioDe, unidadesQueTrae } from "../../src/constants/unidades.js";
import { sePuedeComprar } from "../../src/constants/estadoProducto.js";
import { tieneModelos, modeloPorId } from "../../src/constants/modelos.js";

/*
  Compara el carrito contra el catalogo y cotiza.

  Funcion pura: recibe los renglones y un Map de productos, y no toca Firebase
  ni HTTP. Toda la cobertura del subproyecto vive aca.

  Usa los MISMOS modulos que la tienda para resolver el precio. Si el servidor
  tuviera su propia lectura podria diferir de lo que el cliente ve, y el
  cliente recibiria un 409 por un precio que en realidad coincide.

  Junta TODOS los problemas antes de devolver: de a uno obligaria al cliente a
  reintentar una vez por renglon.
*/

const nombreDe = (p) => p?.nombre || p?.name || "";

/*
  Todo problema viaja con la identidad del renglon que lo causo, que es la
  misma con la que el carrito identifica sus renglones: codigo + modelo +
  unidad. Con solo el codigo el cliente no puede saber a cual corregir: con
  el mismo producto en dos unidades arregla la equivocada, y con modelos no
  encuentra ninguna y el pedido no se puede mandar nunca.
*/
const identidad = (item) => ({
  codigo: item.codigo,
  modelo: item.modelo ?? null,
  unidad: item.unidad,
});

export const validarOrden = (items, productosPorCodigo) => {
  const problemas = [];
  const renglones = [];

  for (const item of items) {
    const producto = productosPorCodigo.get(item.codigo);
    const nombre = nombreDe(producto);

    if (!producto) {
      problemas.push({ ...identidad(item), nombre: "", tipo: "inexistente" });
      continue;
    }

    if (!sePuedeComprar(producto)) {
      problemas.push({ ...identidad(item), nombre, tipo: "no_disponible" });
      continue;
    }

    /*
      Un producto con modelos NO tiene precio propio: el precio vive en cada
      modelo. Pedirlo sin elegir uno, o con uno que ya no existe, no se puede
      cotizar, y cotizar el producto como si no tuviera modelos daria un
      precio inventado.
    */
    const modelo = modeloPorId(producto, item.modelo);
    if (tieneModelos(producto) && !modelo) {
      problemas.push({ ...identidad(item), nombre, tipo: "sin_presentacion" });
      continue;
    }

    const precio = precioDe(producto, item.unidad, item.modelo);
    if (precio === null) {
      problemas.push({ ...identidad(item), nombre, tipo: "sin_presentacion" });
      continue;
    }

    if (precio !== item.precioVisto) {
      problemas.push({
        ...identidad(item),
        nombre,
        tipo: "precio_cambio",
        antes: item.precioVisto,
        ahora: precio,
      });
      continue;
    }

    renglones.push({
      codigo: item.codigo,
      nombre,
      unidad: item.unidad,
      modelo: modelo?.id ?? null,
      modeloEtiqueta: modelo?.etiqueta ?? null,
      cantidad: item.cantidad,
      precioUnidad: precio,
      unidadesPorPaquete: unidadesQueTrae(producto, item.unidad, item.modelo),
      subtotal: precio * item.cantidad,
    });
  }

  // Con problemas no se cotiza nada: un total a medias es peor que ninguno.
  if (problemas.length > 0) return { problemas, renglones: [], total: 0 };

  return {
    problemas,
    renglones,
    total: renglones.reduce((acc, r) => acc + r.subtotal, 0),
  };
};
