import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

/*
  Puertos fuera del rango disputado: 8080 lo toman Docker, Tomcat y casi
  cualquier dev server, y el emulador no arranca con un "port taken" que no
  tiene nada que ver con los tests. Tienen que coincidir con firebase.json.
*/
const PUERTO_FIRESTORE = 8571;
const PUERTO_STORAGE = 9571;

export const PROJECT_ID = "demo-lavadero";

export async function montarEntorno() {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: PUERTO_FIRESTORE,
    },
  });
}

export async function limpiar(env) {
  await env.clearFirestore();
}

export async function montarEntornoStorage() {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: PUERTO_STORAGE,
    },
  });
}
