/**
 * Caché del catálogo completo.
 *
 * El buscador y los filtros corren en el cliente, así que necesitan todos los
 * productos. Traerlos en cada visita son 321 lecturas de Firestore por
 * persona, y el plan gratuito da 50.000 por día: unas 150 visitas.
 *
 * Con caché son 321 lecturas por sesión y cero en cada navegación posterior.
 * Alguien que mira veinte productos pasa de 6.420 lecturas a 321.
 */

const CLAVE = "catalogo";
const VIDA_MS = 30 * 60 * 1000; // media hora

// En memoria: sobrevive a la navegación entre páginas sin tocar el disco.
let enMemoria = null;

const ahora = () => Date.now();

const vigente = (entrada) =>
  entrada && Array.isArray(entrada.items) && ahora() - entrada.guardadoEn < VIDA_MS;

export const leerCatalogo = (categoria) => {
  const clave = categoria ?? "__todas__";

  if (enMemoria?.clave === clave && vigente(enMemoria)) {
    return enMemoria.items;
  }

  try {
    const crudo = sessionStorage.getItem(`${CLAVE}:${clave}`);
    if (!crudo) return null;
    const entrada = JSON.parse(crudo);
    if (!vigente(entrada)) return null;
    enMemoria = { clave, ...entrada };
    return entrada.items;
  } catch {
    // sessionStorage puede fallar en modo privado. Sin caché igual anda.
    return null;
  }
};

export const guardarCatalogo = (categoria, items) => {
  const clave = categoria ?? "__todas__";
  const entrada = { items, guardadoEn: ahora() };

  enMemoria = { clave, ...entrada };

  try {
    sessionStorage.setItem(`${CLAVE}:${clave}`, JSON.stringify(entrada));
  } catch {
    // Si no entra (cuota llena), el caché en memoria alcanza.
  }
};

/** Se llama al crear, editar o borrar un producto desde el panel. */
export const invalidarCatalogo = () => {
  enMemoria = null;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(`${CLAVE}:`)) sessionStorage.removeItem(k);
    }
  } catch {
    // Nada que limpiar si no hay almacenamiento.
  }
};
