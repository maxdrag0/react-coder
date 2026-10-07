import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/utils/firebase";

// El perfil NO incluye `role`: las reglas de Firestore rechazan ese campo
// desde el cliente. Hay exactamente dos roles y salen del token: con el
// claim `admin` sos soporte/dueno, sin el claim sos comprador.
const crearPerfil = (uid, datos) =>
  setDoc(doc(db, "users", uid), {
    ...datos,
    createdAt: new Date().toISOString(),
  });

// Una vez que createUserWithEmailAndPassword devuelve, la cuenta EXISTE y la
// sesion esta abierta. Si un paso posterior tira y el error sube a la
// interfaz, la persona cree que el registro fallo mientras ya esta registrada,
// y al reintentar le dicen "ese email ya tiene una cuenta", que se lee como
// una contradiccion. Asi que los pasos posteriores degradan en avisos.
const intentar = async (accion, aviso, avisos) => {
  try {
    await accion();
  } catch {
    avisos.push(aviso);
  }
};

/**
 * @returns {Promise<{user: object, avisos: string[]}>} `avisos` lista los
 * pasos no criticos que fallaron, para mostrarlos sin bloquear el registro.
 */
export const registerWithEmail = async (email, password, name, telefono) => {
  // Si esto falla no hay cuenta, asi que el error ES la verdad y sube.
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  const avisos = [];

  // Sin updateProfile, user.displayName queda en null para siempre y toda la
  // app muestra "Usuario" en lugar del nombre que la persona escribio.
  await intentar(
    () => updateProfile(user, { displayName: name }),
    "No pudimos guardar tu nombre. Podés completarlo desde tu perfil.",
    avisos,
  );

  await intentar(
    () => crearPerfil(user.uid, { name, email, telefono }),
    "No pudimos guardar tus datos de perfil. Revisalos desde tu perfil.",
    avisos,
  );

  await intentar(
    () => sendEmailVerification(user),
    "No pudimos enviarte el mail de verificación. Reenvialo desde tu perfil.",
    avisos,
  );

  return { user, avisos };
};

export const loginWithEmail = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const loginWithGoogle = async () => {
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider());

  const perfil = await getDoc(doc(db, "users", user.uid));
  if (!perfil.exists()) {
    await crearPerfil(user.uid, {
      name: user.displayName ?? "",
      email: user.email,
    });
  }

  return user;
};

export const logoutUser = () => signOut(auth);

export const enviarResetPassword = (email) => sendPasswordResetEmail(auth, email);

export const reenviarVerificacion = () => {
  if (!auth.currentUser) throw new Error("No hay sesión activa");
  return sendEmailVerification(auth.currentUser);
};
