/*
  Cruza la lista del proveedor con lo que ya esta publicado.

  Por cada fila de la lista dice si ese producto ya existe en la tienda, con
  que presentaciones se vende hoy y a que precio, para poder mostrar la
  diferencia antes de tocar nada.

  Es puro: recibe las dos listas y devuelve datos.
*/

import { ACTIVO } from "./estadoProducto.js";

/** Los IDs de Firestore no admiten "/", y varios codigos del catalogo lo traen. */
export const idDeCodigo = (codigo) =>
  String(codigo ?? "")
    .trim()
    .replace(/\//g, "-");

const sinTildes = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/*
  El codigo se escribe distinto en los dos lados: el PDF usa barra ("2302/AR")
  y la base usa guion ("2302-AR"). Se comparan sin separadores.
*/
const claveCodigo = (codigo) =>
  sinTildes(codigo)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

/*
  Para comparar nombres se sacan tambien las palabras de union. El nombre de
  la tienda esta curado ("Bengala de humo") y el de la lista no ("BENGALA
  HUMO - FUMIGENO COLOR..."), y ese "de" de mas alcanzaba para que no
  cruzaran.
*/
const UNIONES = /\b(de|del|la|el|los|las|y|con|para|por|un|una)\b/g;

const claveNombre = (nombre) =>
  sinTildes(nombre)
    .toLowerCase()
    .replace(UNIONES, "")
    .replace(/[^a-z0-9]/g, "");

/** Lo que el producto publicado vende hoy, con precio y cantidades. */
export const presentacionesVivas = (doc) => {
  /*
    Con modelos el precio vive en cada modelo y el del producto va en null:
    se toma el primero que tenga precio, que es el que representa a todos.
  */
  const fuente =
    Array.isArray(doc?.modelos) && doc.modelos.length > 0
      ? doc.modelos.find((m) => m?.presentaciones?.unitario?.precio > 0)
          ?.presentaciones
      : doc?.presentaciones;

  const salida = {};
  for (const clave of ["unitario", "display", "bulto"]) {
    const v = fuente?.[clave];
    if (!v || typeof v.precio !== "number" || v.precio <= 0) continue;
    // La unidad no "trae" nada: ES una unidad. Solo display y bulto cuentan.
    salida[clave] =
      clave === "unitario"
        ? { precio: v.precio }
        : { precio: v.precio, unidades: v.unidades ?? null };
  }
  return salida;
};

const fichaDe = (doc) => ({
  /*
    SIEMPRE el id del documento, que es lo unico que sirve para leerlo y
    escribirlo. El campo `codigo` no alcanza: la barra no es valida en un id,
    asi que "2302/AR" vive en el documento "2302-AR" y el campo conserva la
    barra. Y obtenerProductos arma `{codigo: doc.id, ...doc.data()}`, donde
    el codigo de los datos pisa al id.

    Tomando el codigo crudo, la accion se calculaba contra un id que no
    existe y daba "crear": se escribia un documento nuevo encima del que ya
    estaba, sin sus fotos, su descripcion ni su contador de ventas.
  */
  id: idDeCodigo(doc._id ?? doc.codigo),
  nombre: doc.nombre ?? doc.name ?? "",
  categoria: doc.categoria ?? doc.category ?? null,
  marca: doc.marca ?? null,
  estado: doc.estado ?? (doc.activo === false ? null : ACTIVO),
  modelos: (doc.modelos ?? []).map((m) => m.etiqueta),
  vende: presentacionesVivas(doc),
  fotos: (doc.fotos ?? []).length || (doc.fotoUrl ? 1 : 0),
});

/*
  El nombre de la base es corto y el de la lista largo, asi que se busca el
  corto DENTRO del largo. Se exige un minimo de ocho caracteres para que
  "caña" no cruce con media lista.
*/
const LARGO_MINIMO = 8;

/**
 * Cada fila de la lista con su producto publicado, si existe.
 *
 * @param {Array} deLaLista lo que salio de interpretarLista
 * @param {Array} publicados los documentos de `products`
 * @returns {{filas: Array, sinCruce: Array}}
 */
export const cruzarConCatalogo = (deLaLista, publicados) => {
  const porCodigo = new Map();
  for (const doc of publicados ?? []) {
    const ficha = fichaDe(doc);
    porCodigo.set(claveCodigo(ficha.id), ficha);
  }

  /*
    DOS PASADAS, y el orden importa.

    Primero TODOS los cruces por codigo, que son los seguros. Recien despues
    los cruces por nombre, y solo contra los productos que quedaron libres.

    Haciendolo fila por fila pasaba esto: la fila 4257 ("MORTERO 2 REVOLUCION
    DE ESTRUENDO") se quedaba por nombre con el producto 237,1 ("Mortero 2")
    antes de que llegara la fila 237,1, que es la suya por codigo. El
    resultado era una comparacion de precios contra el producto equivocado, y
    actualizar el equivocado.
  */
  const porNombre = new Map();
  for (const ficha of porCodigo.values()) porNombre.set(ficha.id, ficha);

  const conCodigo = (deLaLista ?? []).map((p) => {
    const web = porCodigo.get(claveCodigo(p.codigo)) ?? null;
    if (web) porNombre.delete(web.id);
    return web;
  });

  const filas = (deLaLista ?? []).map((p, i) => {
    let web = conCodigo[i];

    if (!web) {
      const aguja = claveNombre(p.nombre);
      if (aguja.length >= LARGO_MINIMO) {
        for (const ficha of porNombre.values()) {
          const corto = claveNombre(ficha.nombre);
          if (corto.length >= LARGO_MINIMO && aguja.includes(corto)) {
            web = ficha;
            porNombre.delete(ficha.id);
            break;
          }
        }
      }
    }

    /*
      Arranca marcado SOLO lo que ya esta publicado, y exactamente las
      presentaciones que vende hoy. Lo que no esta en la tienda arranca sin
      marcar: subir 260 productos de una no es lo que nadie quiere.
    */
    return {
      ...p,
      web,
      pre: {
        unidad: Boolean(web?.vende?.unitario && p.pUnidad),
        display: Boolean(web?.vende?.display && p.pDisplay),
        bulto: Boolean(web?.vende?.bulto && p.pBulto),
      },
    };
  });

  desempatar(filas);

  /*
    Lo publicado que la lista no trae. Puede ser de otro proveedor, o que el
    proveedor lo discontinuo. No se toca: se avisa.
  */
  const cruzados = new Set(filas.map((f) => f.web?.id).filter(Boolean));
  const sinCruce = (publicados ?? [])
    .map(fichaDe)
    .filter((f) => !cruzados.has(f.id));

  return { filas, sinCruce };
};

/*
  Cuando dos filas de la lista apuntan al MISMO producto publicado, solo una
  puede arrancar marcada: las dos escribirian el mismo documento y la segunda
  pisaria a la primera.

  Pasa 34 veces en la lista, y casi siempre es el mismo producto en dos
  tamaños de display: la candela 1605 esta una vez con display de 6 y otra con
  display de 12. Ahi el desempate es obvio y no hace falta molestar a nadie:
  gana la que coincide con el display que el producto YA vende.

  Cuando ninguna coincide —dos productos distintos que comparten codigo— no
  hay forma de adivinar: queda marcada la primera y la otra apagada, para que
  una persona elija.
*/
const desempatar = (filas) => {
  const porProducto = new Map();

  for (const fila of filas) {
    if (!fila.web) continue;
    if (!porProducto.has(fila.web.id)) porProducto.set(fila.web.id, []);
    porProducto.get(fila.web.id).push(fila);
  }

  for (const grupo of porProducto.values()) {
    if (grupo.length < 2) continue;

    const unidadesPublicadas = grupo[0].web.vende.display?.unidades ?? null;
    const gana =
      (unidadesPublicadas !== null &&
        grupo.find((f) => f.porDisplay === unidadesPublicadas)) ||
      grupo[0];

    for (const fila of grupo) {
      if (fila === gana) continue;
      fila.pre = { unidad: false, display: false, bulto: false };
      fila.duplicada = gana.codigo;
    }
  }
};

/**
 * Que le va a pasar al producto, segun lo elegido y el codigo que tenga
 * escrito en ese momento.
 *
 * Se recalcula contra el codigo ACTUAL y no contra el cruce inicial: asi,
 * escribirle a una fila el codigo de un producto que ya existe la convierte
 * en una actualizacion. Es la unica forma de atar a mano los que la lista
 * escribe con una errata.
 */
export const accionDe = (fila, elegido, publicadosPorId) => {
  if (elegido.borrar) return fila.web ? "borrar" : "nada";

  const algo = elegido.unidad || elegido.display || elegido.bulto;
  if (!algo) return "nada";

  const id = idDeCodigo(elegido.codigo);

  /*
    El orden importa. Primero el renombre: si la fila esta atada a un
    producto publicado y el codigo escrito ya no es el de ese producto, lo
    que se pide es MOVERLO, aunque el codigo nuevo no exista todavia. Mirar
    primero si el codigo nuevo existe diria "crear" y dejaria el viejo
    duplicado.
  */
  if (fila.web && fila.web.id !== id) return "renombrar";

  return publicadosPorId?.has(id) ? "actualizar" : "crear";
};

/** Cuanto hay que mover el precio publicado para llegar al de la lista. */
export const variacion = (publicado, nuevo) =>
  publicado && nuevo
    ? Math.round(((nuevo - publicado) / publicado) * 100)
    : null;
