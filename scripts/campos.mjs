/*
  El esquema arrastra cada campo del producto en dos idiomas: el panel viejo
  escribía `name`, `category`, `description` e `image`, y el nuevo escribe
  `nombre`, `categoria`, `descripcion` y `fotoUrl`. Cada lectura de la app
  terminaba siendo `p.nombre || p.name`, en una docena de lugares.

  Esto decide, documento por documento, qué hay que mover y qué hay que
  borrar. Es puro: no toca Firestore, así que se puede probar entero.
*/

/** `[canónico, viejo]`. El canónico es el que gana. */
export const PARES = [
  ["nombre", "name"],
  ["categoria", "category"],
  ["descripcion", "description"],
  ["fotoUrl", "image"],
];

const vacio = (v) => v === undefined || v === null || String(v).trim() === "";

/**
 * Qué hacer con un documento.
 *
 * @returns {{asignar: object, borrar: string[], conflictos: object[], hayCambios: boolean}}
 */
export const planDe = (datos) => {
  const asignar = {};
  const borrar = [];
  const conflictos = [];

  for (const [canonico, viejo] of PARES) {
    const tieneViejo = Object.prototype.hasOwnProperty.call(datos, viejo);
    if (!tieneViejo) continue;

    const vCanonico = datos[canonico];
    const vViejo = datos[viejo];

    /*
      Los dos con valores distintos: no se elige por nadie. Puede que alguien
      haya corregido el nombre en un panel y no en el otro, y quedarse con uno
      en silencio pierde el otro para siempre.
    */
    if (!vacio(vCanonico) && !vacio(vViejo) && vCanonico !== vViejo) {
      conflictos.push({ campo: canonico, canonico: vCanonico, viejo: vViejo });
      continue;
    }

    // El viejo solo se copia si aporta algo: el panel viejo escribía "" en
    // los campos que el admin dejaba en blanco.
    if (vacio(vCanonico) && !vacio(vViejo)) asignar[canonico] = vViejo;

    borrar.push(viejo);
  }

  return {
    asignar,
    borrar,
    conflictos,
    hayCambios: Object.keys(asignar).length > 0 || borrar.length > 0,
  };
};
