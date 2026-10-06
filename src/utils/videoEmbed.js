/*
  Videos de producto por YouTube y no subidos a Firebase Storage.

  El plan gratuito da 1 GB de descarga por día, compartido con todas las
  imágenes del catálogo: un video de 50 MB visto veinte veces deja la tienda
  sin fotos hasta el día siguiente. YouTube sirve los bytes y no gasta cuota.

  Los ids de YouTube son 11 caracteres de [A-Za-z0-9_-]. La url del iframe se
  RECONSTRUYE a partir de ese id; nunca se reusa el texto que escribió
  alguien, que es lo que mantiene limpio el src.
*/

const ID = "[A-Za-z0-9_-]{11}";

// youtu.be/ID · youtube.com/watch?v=ID · /embed/ID · /shorts/ID · /v/ID
const PATRONES = [
  new RegExp(`youtu\\.be/(${ID})`),
  new RegExp(`youtube\\.com/watch\\?(?:.*&)?v=(${ID})`),
  new RegExp(`youtube\\.com/(?:embed|shorts|v)/(${ID})`),
];

/**
 * @param {string} url
 * @returns {string|null} el id de 11 caracteres, o null si no es YouTube
 */
export const idDeYoutube = (url) => {
  if (typeof url !== "string" || !url) return null;

  for (const patron of PATRONES) {
    const encontrado = url.match(patron);
    if (!encontrado) continue;

    const id = encontrado[1];
    // El caracter siguiente no puede ser parte de un id: sin esto, un id de
    // 15 caracteres pasaria recortado a sus primeros 11.
    const resto = url.slice(encontrado.index + encontrado[0].length);
    if (/^[A-Za-z0-9_-]/.test(resto)) continue;

    return id;
  }

  return null;
};

/**
 * Url para el src del iframe. nocookie: YouTube no deja cookies de
 * seguimiento hasta que la persona le da play.
 */
export const urlDeEmbed = (url) => {
  const id = idDeYoutube(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
};

/** Miniatura del video, servida por YouTube. Sirve de portada en la card. */
export const miniaturaDe = (url) => {
  const id = idDeYoutube(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};
