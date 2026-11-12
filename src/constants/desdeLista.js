import { ACTIVO, OCULTO } from "./estadoProducto.js";
import { idLibre } from "./modelos.js";

/*
  Traduce la selección del tablero de la lista de precios a documentos de
  Firestore. Es puro: no toca Firebase, así que se puede probar entero.

  LAS DOS REGLAS QUE IMPORTAN:

  1. Una ACTUALIZACIÓN escribe los precios y nada más. El producto publicado
     tiene fotos, descripción, estado y contador de compras que la lista no
     conoce; escribirlos los perdería. Los demás campos viajan solo si una
     persona los editó en el tablero, y eso lo dice `editado`.

  2. Un producto NUEVO nace OCULTO. La lista no trae fotos, y 260 productos
     sin imagen en la portada es peor que no tenerlos. Se activan después,
     con npm run activar-ocultos o desde el panel.
*/

/** `{precio}` sin `unidades`: una unidad no "trae" nada, ES una unidad. */
const presentaciones = (item) => ({
  unitario: item.unidad ? { precio: item.unidad } : null,
  display: item.display
    ? { precio: item.display.precio, unidades: item.display.unidades ?? null }
    : null,
  bulto: item.bulto
    ? { precio: item.bulto.precio, unidades: item.bulto.unidades ?? null }
    : null,
});

/*
  Con modelos el producto no tiene precio propio: vive en cada modelo. Las
  tres claves van en null y explícitas, por el merge profundo de Firestore.
*/
const SIN_PRECIO = { unitario: null, display: null, bulto: null };

const conModelos = (item) =>
  Array.isArray(item.modelos) && item.modelos.length > 0;

const modelosNuevos = (etiquetas, pres) => {
  const usados = [];
  return etiquetas.map((etiqueta) => {
    const id = idLibre(etiqueta, usados);
    usados.push(id);
    return { id, etiqueta, presentaciones: pres, foto: null };
  });
};

/**
 * Los modelos de un producto que ya existe, con los precios nuevos.
 *
 * Conserva el id y la foto de los que ya estaban: el id del modelo viaja en
 * los carritos y queda guardado en los pedidos, así que regenerarlo dejaría
 * huérfano todo lo que lo referencia, y la foto por color es trabajo que la
 * lista no tiene. Los que no se eligieron quedan afuera.
 */
export const modelosActualizados = (existentes, etiquetas, pres) => {
  const porEtiqueta = new Map(
    (existentes ?? []).map((m) => [String(m.etiqueta).toLowerCase(), m]),
  );
  const usados = (existentes ?? []).map((m) => m.id);

  return etiquetas.map((etiqueta) => {
    const previo = porEtiqueta.get(etiqueta.toLowerCase());
    if (previo) {
      return {
        id: previo.id,
        etiqueta: previo.etiqueta,
        presentaciones: pres,
        foto: previo.foto ?? null,
      };
    }
    const id = idLibre(etiqueta, usados);
    usados.push(id);
    return { id, etiqueta, presentaciones: pres, foto: null };
  });
};

/**
 * El documento completo de un producto que no existe todavía.
 *
 * @param {object} item el renglón del tablero
 * @param {{activo?: boolean}} opciones
 */
export const aProductoNuevo = (item, { activo = false } = {}) => {
  const pres = presentaciones(item);
  const modelos = conModelos(item) ? modelosNuevos(item.modelos, pres) : [];

  return {
    codigo: item.codigo,
    nombre: item.nombre,
    /*
      La lista no trae descripción aparte: el nombre del PDF ya la lleva
      pegada ("TORTA ZONDA 16 T DE 1' tallo sauce rojo plata y dorado con
      estrellas"), así que ese texto completo es lo único que hay.
    */
    descripcion: item.nombreLista ?? item.nombre,
    categoria: item.categoria,
    subcategoria: item.subcategoria ?? null,
    marca: item.marca || null,
    duracion: item.duracion ?? null,
    presentaciones: modelos.length > 0 ? SIN_PRECIO : pres,
    modelos,
    estado: activo ? ACTIVO : OCULTO,
    fotos: [],
    fotoUrl: null,
    videoUrl: null,
    compras: 0,
  };
};

/**
 * Los campos a escribir sobre un producto que ya existe.
 *
 * Los modelos NO salen de acá: necesitan los del documento vivo para
 * conservar ids y fotos, y eso lo resuelve el script con modelosActualizados.
 */
export const aActualizacion = (item) => {
  const campos = { presentaciones: presentaciones(item) };
  const ed = item.editado ?? {};

  if (ed.nombre) campos.nombre = item.nombre;
  if (ed.categoria) campos.categoria = item.categoria;
  // Vaciar la marca es un cambio válido: va en null y no se omite.
  if (ed.marca) campos.marca = item.marca || null;

  return campos;
};

/**
 * Agrupa la selección por acción.
 *
 * `choques` son los documentos que dos renglones escribirían: el código ES el
 * id del documento y en la lista hay 34 códigos repetidos, así que sin este
 * aviso el segundo pisaría al primero en silencio.
 */
export const planDeAplicacion = (items) => {
  const plan = {
    crear: [],
    actualizar: [],
    renombrar: [],
    borrar: [],
    choques: [],
  };

  for (const [id, item] of Object.entries(items ?? {})) {
    const fila = { ...item, fila: id };
    if (plan[item.accion]) plan[item.accion].push(fila);
  }

  const cuenta = new Map();
  for (const fila of [...plan.crear, ...plan.actualizar, ...plan.renombrar]) {
    cuenta.set(fila.idDoc, (cuenta.get(fila.idDoc) ?? 0) + 1);
  }
  for (const [idDoc, cuantos] of cuenta) {
    if (cuantos > 1) plan.choques.push({ idDoc, cuantos });
  }

  return plan;
};
