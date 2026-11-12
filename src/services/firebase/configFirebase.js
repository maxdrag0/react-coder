import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { SIN_RECARGO, recargoValido } from "../../constants/recargo";

/*
  El recargo que la tienda le suma a los precios de lista.

  Vive en un solo documento, `config/precios`, porque es un solo número para
  todo el catálogo. Lectura pública: la tienda necesita el precio antes de que
  nadie inicie sesión. Escritura solo del admin, por las reglas.

  Se cachea en memoria: lo lee cada barrido del catálogo y cada detalle de
  producto, y es un valor que cambia una vez cada mucho. Media hora, igual que
  el caché del catálogo.
*/

const RUTA = ["config", "precios"];
const VIDA_MS = 30 * 60 * 1000;

let cache = null;

const ref = () => doc(db, ...RUTA);

/**
 * El recargo vigente, en porcentaje.
 *
 * Ante cualquier falla devuelve cero, que muestra el precio de lista. Es lo
 * mismo que hace el servidor al cotizar un pedido, así que los dos siguen
 * diciendo el mismo precio incluso cuando la lectura falla.
 *
 * @returns {Promise<number>}
 */
export const obtenerRecargo = async () => {
  if (cache && Date.now() - cache.guardadoEn < VIDA_MS) return cache.valor;

  try {
    const snap = await getDoc(ref());
    const valor = snap.exists()
      ? recargoValido(snap.data()?.recargo)
      : SIN_RECARGO;
    cache = { valor, guardadoEn: Date.now() };
    return valor;
  } catch (error) {
    console.error("No se pudo leer el recargo:", error);
    return SIN_RECARGO;
  }
};

/** Para el panel, que necesita el valor exacto y sin caché para editarlo. */
export const leerRecargo = async () => {
  const snap = await getDoc(ref());
  return snap.exists() ? recargoValido(snap.data()?.recargo) : SIN_RECARGO;
};

/**
 * Guarda el recargo. Solo el admin puede, por las reglas.
 *
 * Invalida el caché para que el panel vea el cambio sin recargar, pero el de
 * las otras pestañas abiertas vence solo.
 */
export const guardarRecargo = async (valor) => {
  const recargo = recargoValido(valor);
  await setDoc(ref(), { recargo }, { merge: true });
  cache = { valor: recargo, guardadoEn: Date.now() };
  return recargo;
};

/** Se llama al guardar desde el panel. */
export const invalidarRecargo = () => {
  cache = null;
};
