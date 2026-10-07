import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/utils/firebase";

/*
  El documento del comprador en /users/{uid}. Lo crea authFirebase al
  registrarse; esto lo lee y lo actualiza desde el perfil y el checkout.

  Las reglas dejan que el dueño del documento lo edite salvo el campo `role`,
  que solo existe como claim del token.
*/

const refDe = (uid) => doc(db, "users", uid);

export const obtenerPerfil = async (uid) => {
  if (!uid) return null;
  const snap = await getDoc(refDe(uid));
  return snap.exists() ? snap.data() : null;
};

/**
 * Merge y no reemplazo: el perfil tiene campos que esta pantalla no conoce
 * (createdAt, y lo que venga despues). Sobrescribirlo entero los borraria.
 */
export const actualizarPerfil = async (uid, campos) => {
  await setDoc(refDe(uid), campos, { merge: true });
};
