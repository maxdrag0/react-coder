/**
 * Caché del catálogo completo.
 *
 * El buscador y los filtros corren en el cliente, así que necesitan todos los
 * productos. Traerlos en cada visita cuesta una lectura de Firestore por
 * producto y por persona, y el plan gratuito da 50.000 por día.
 *
 * Con caché es una vuelta por sesión y cero en cada navegación posterior:
 * quien mira veinte productos pasa de veinte barridos del catálogo a uno.
 */

const CLAVE = "catalogo";
const VIDA_MS = 30 * 60 * 1000; // media hora

/*
  La forma de lo que se guarda. SUBIRLA cada vez que cambie la forma de un
  producto, porque el cache vive en sessionStorage y sobrevive al deploy.

  Ya paso dos veces que un arreglo no se vio: la consulta por categoria
  devolvia vacio y se cacheaba, y despues el catalogo entregaba el codigo con
  barra y se cacheaba igual. En los dos casos el JS nuevo seguia leyendo
  datos viejos hasta media hora, recargar no alcanzaba, y parecia que el
  arreglo no servia.
*/
const VERSION = 2;

// En memoria: sobrevive a la navegación entre páginas sin tocar el disco.
let enMemoria = null;

/*
  Las consultas que están saliendo en este momento, por clave.

  El caché no alcanza para esto: se escribe cuando la consulta TERMINA, así
  que dos pedidos que arrancan juntos con el caché vacío no ven nada y salen
  los dos. Y arrancan juntos de verdad: la portada y el pie de página se
  montan en el mismo render y los dos piden el catálogo completo.

  Con 31 productos eran 62 lecturas por sesión en vez de 31; con el catálogo
  entero cargado, 640. El plan gratuito da 50.000 por día.
*/
const enVuelo = new Map();

const ahora = () => Date.now();

const vigente = (entrada) =>
  entrada &&
  entrada.version === VERSION &&
  Array.isArray(entrada.items) &&
  ahora() - entrada.guardadoEn < VIDA_MS;

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
  /*
    Un catálogo vacío no se guarda. Vacío no es una respuesta que valga la
    pena recordar: o es un error que se va a arreglar, o es una categoría sin
    nada, y volver a preguntar cuesta una lectura.

    El bug que esto evita ya pasó: la consulta por categoría filtraba por un
    campo que la migración había borrado y devolvía cero productos. Eso
    quedaba cacheado, así que después de arreglar la consulta la categoría se
    seguía viendo vacía media hora, y recargar no alcanzaba porque el caché
    vive en sessionStorage.
  */
  if (!Array.isArray(items) || items.length === 0) return;

  const clave = categoria ?? "__todas__";
  const entrada = { version: VERSION, items, guardadoEn: ahora() };

  enMemoria = { clave, ...entrada };

  try {
    sessionStorage.setItem(`${CLAVE}:${clave}`, JSON.stringify(entrada));
  } catch {
    // Si no entra (cuota llena), el caché en memoria alcanza.
  }
};

/**
 * Una sola consulta por clave mientras esté saliendo. Quien llegue segundo
 * espera la misma respuesta en vez de pedir de nuevo.
 *
 * No es un caché —de eso se encarga guardarCatalogo—: en cuanto termina, la
 * promesa se olvida, así que el siguiente pedido vuelve a preguntar. Si falla,
 * el error llega a todos los que estaban esperando y tampoco queda pegado.
 *
 * @param {string|null} categoria
 * @param {() => Promise<any>} traer
 */
export const traerUnaVez = (categoria, traer) => {
  const clave = categoria ?? "__todas__";
  const yendo = enVuelo.get(clave);
  if (yendo) return yendo;

  const promesa = traer();
  enVuelo.set(clave, promesa);

  // El olvido va en then/catch y no en finally sobre la promesa guardada:
  // finally devuelve OTRA promesa, y guardar esa haría que un rechazo sin
  // nadie escuchando quedara sin manejar.
  const olvidar = () => enVuelo.delete(clave);
  promesa.then(olvidar, olvidar);

  return promesa;
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
