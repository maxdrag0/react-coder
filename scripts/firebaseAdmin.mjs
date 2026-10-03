import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import admin from "firebase-admin";

const RUTA = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "./serviceAccount.json";
const rutaAbsoluta = resolve(RUTA);

if (!existsSync(rutaAbsoluta)) {
  console.error(`
No se encontró la credencial del Admin SDK en:
  ${rutaAbsoluta}

Cómo obtenerla:
  1. Consola de Firebase -> Configuración del proyecto -> Cuentas de servicio
  2. "Generar nueva clave privada"
  3. Guardar el archivo como serviceAccount.json en la raíz del proyecto

Ya está en .gitignore: no se va a commitear.
Si lo guardaste en otra ruta, pasala en FIREBASE_SERVICE_ACCOUNT_PATH.
`);
  process.exit(1);
}

// Una credencial presente pero corrupta o de otro formato tira un stack
// trace de firebase-admin que no le dice nada a nadie. Traducirlo.
try {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync(rutaAbsoluta, "utf8"))),
  });
} catch (error) {
  console.error(`
La credencial existe pero no se pudo usar:
  ${rutaAbsoluta}

Detalle: ${error.message}

Suele ser por bajar el archivo equivocado. Tiene que ser el JSON de
"Generar nueva clave privada" en Configuración del proyecto -> Cuentas de
servicio, con los campos project_id, client_email y private_key.
`);
  process.exit(1);
}

export { admin };
export const db = admin.firestore();
export const auth = admin.auth();
