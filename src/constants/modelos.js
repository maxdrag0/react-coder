/*
  Modelos de un producto: el color de una bengala, el tamaño de un mortero.

  Son cosas distintas que comparten una card, no productos separados. El
  catálogo ya probó que separarlos falla: "Torta Atomica Cienfuegos" está tres
  veces con el nombre idéntico y precios de 7690, 13100 y 20400, y el cliente
  no puede diferenciarlas.

  Cada modelo tiene SUS propias presentaciones, porque el display de un
  mortero de 3 pulgadas no trae la misma cantidad que el de 5.

  Un producto sin `modelos` se comporta igual que siempre: los 323 del
  catálogo no necesitan migración.

  El `id` va en la clave del carrito y queda guardado en el pedido, así que se
  genera una vez y NO cambia aunque después se edite la etiqueta. Cambiarlo
  dejaría huérfanos los carritos y los pedidos que lo referencian.
*/

const ACENTOS = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" };

/** Slug legible para el id de un modelo, o null si la etiqueta no da nada. */
export const idDeEtiqueta = (etiqueta) => {
  const limpio = String(etiqueta ?? "")
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (c) => ACENTOS[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return limpio || null;
};

/** Un id que no choque con los que ya existen en el producto. */
export const idLibre = (etiqueta, ocupados = []) => {
  const base = idDeEtiqueta(etiqueta);
  const tomados = new Set(ocupados);

  if (base && !tomados.has(base)) return base;

  // Sin slug usable (una etiqueta de solo símbolos) se cae en uno genérico.
  const raiz = base ?? "modelo";
  for (let n = base ? 2 : 1; ; n++) {
    const candidato = `${raiz}-${n}`;
    if (!tomados.has(candidato)) return candidato;
  }
};

const tieneAlgunPrecio = (presentaciones) =>
  Object.values(presentaciones ?? {}).some(
    (p) => typeof p?.precio === "number" && Number.isFinite(p.precio) && p.precio > 0
  );

/**
 * Los modelos usables del producto.
 *
 * Descarta los que no se podrían ni elegir ni comprar: sin id (no entra en la
 * clave del carrito), sin etiqueta (no se puede mostrar), sin ningún precio,
 * o con un id repetido (dos modelos con la misma clave de carrito se pisarían).
 */
export const modelosDe = (item) => {
  const crudos = item?.modelos;
  if (!Array.isArray(crudos)) return [];

  const vistos = new Set();
  const limpios = [];

  for (const m of crudos) {
    const id = typeof m?.id === "string" ? m.id.trim() : "";
    const etiqueta = typeof m?.etiqueta === "string" ? m.etiqueta.trim() : "";

    if (!id || !etiqueta) continue;
    if (vistos.has(id)) continue;
    if (!tieneAlgunPrecio(m.presentaciones)) continue;

    vistos.add(id);
    limpios.push({ id, etiqueta, presentaciones: m.presentaciones });
  }

  return limpios;
};

export const tieneModelos = (item) => modelosDe(item).length > 0;

export const modeloPorId = (item, id) =>
  (id ? modelosDe(item).find((m) => m.id === id) : null) ?? null;
