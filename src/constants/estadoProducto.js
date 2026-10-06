/*
  Estado de un producto en la tienda. Es UN campo y no tres booleanos porque
  los estados se excluyen: algo "oculto y sin stock" es solamente oculto, y
  con un campo no existe la combinación contradictoria.

  Un producto sin el campo cuenta como activo, así que el catálogo que ya
  está cargado no necesita migración.

  Ojo: `oculto` es un filtro de la tienda, no una barrera de seguridad. El
  documento sigue siendo legible por la API de Firestore. Para un catálogo
  de pirotecnia alcanza; para algo secreto habría que resolverlo en el
  servidor.
*/

export const ACTIVO = "activo";
export const SIN_STOCK = "sin_stock";
export const OCULTO = "oculto";

export const ESTADOS = [
  {
    clave: ACTIVO,
    etiqueta: "Activo",
    ayuda: "Se ve en el catálogo y se puede comprar.",
  },
  {
    clave: SIN_STOCK,
    etiqueta: "Sin stock",
    ayuda: "Se ve en el catálogo pero no se puede comprar.",
  },
  {
    clave: OCULTO,
    etiqueta: "Oculto",
    ayuda: "No aparece en la tienda.",
  },
];

const CLAVES = new Set(ESTADOS.map((e) => e.clave));

/** Un estado que no se reconoce cae en activo: un dato raro en la base no
 *  tiene que hacer desaparecer mercadería de la tienda. */
export const estadoDe = (producto) => {
  const estado = producto?.estado;
  return CLAVES.has(estado) ? estado : ACTIVO;
};

export const seMuestra = (producto) => estadoDe(producto) !== OCULTO;

export const sePuedeComprar = (producto) => estadoDe(producto) === ACTIVO;

export const etiquetaDe = (clave) =>
  ESTADOS.find((e) => e.clave === clave)?.etiqueta ?? "Activo";
