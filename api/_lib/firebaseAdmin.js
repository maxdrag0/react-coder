import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { normalizarClave } from "./clavePrivada.js";

/*
  En un entorno serverless el modulo se reusa entre invocaciones. Inicializar
  de nuevo tira `app/duplicate-app`, asi que se chequea si ya hay una app.

  El service account es PROPIO de la API, distinto del serviceAccount.json de
  la maquina de desarrollo: si hay que revocar uno, el otro sigue andando.
*/
const credenciales = () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: normalizarClave(process.env.FIREBASE_PRIVATE_KEY),
});

const app = getApps()[0] ?? initializeApp({ credential: cert(credenciales()) });

export const db = getFirestore(app);
export const auth = getAuth(app);
