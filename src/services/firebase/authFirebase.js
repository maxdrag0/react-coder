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

export const registerWithEmail = async (email, password, name) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // Sin esto user.displayName queda en null para siempre y toda la app
  // muestra "Usuario" en lugar del nombre que la persona escribio.
  await updateProfile(user, { displayName: name });

  await crearPerfil(user.uid, { name, email });
  await sendEmailVerification(user);

  return user;
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
