# Fundación de Seguridad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los seis agujeros críticos de autorización del ecommerce moviendo el permiso de administrador a un custom claim firmado por Google y poniendo las reglas de Firestore y Storage bajo control de versiones y bajo test.

**Architecture:** Hoy la app es *client-only*: `src/services/firebase/*` le pega directo a Firestore desde el navegador, y la única capa de autorización posible son las reglas de seguridad — que no existen en el repo. El plan arranca desde un `firestore.rules` que **niega todo** y abre una colección por vez, cada una con sus tests contra el emulador de Firebase. En paralelo, el rol de admin deja de vivir en un documento que el usuario puede escribir y pasa a un custom claim del token de Auth, que las reglas leen con `request.auth.token.admin`.

**Tech Stack:** React 19 + Vite 7 · Firebase 12 (SDK de cliente) · `firebase-admin` (scripts locales) · `firebase-tools` (emulador y deploy) · Vitest + `@firebase/rules-unit-testing` · `@testing-library/react` + jsdom

**Spec:** `docs/superpowers/specs/2026-10-03-seguridad-fundacion-design.md`

## Global Constraints

- **El proyecto no tiene ningún test ni test runner hoy.** La Task 1 lo instala. No asumir que existe infraestructura de testing.
- **Todo el código y los mensajes de interfaz van en castellano.** La base de código mezcla castellano (`obtenerProductos`, `crearCompra`) e inglés (`crearProducto` recibe `producto` pero el campo es `name`). Para código nuevo: nombres de función y variables en castellano, igual que `productosFirebase.js`.
- **Componentizar al mínimo.** Preferencia explícita del dueño del proyecto. Cada tabla, formulario, campo, modal y fila va a su propio componente con su propio CSS. La lógica va a hooks `useX`. **Si un archivo nuevo pasa de ~120 líneas, hay que partirlo.** Nada de componentes de clase: el proyecto es todo funcional con hooks.
- **`firebase-admin` y `firebase-tools` van como `devDependencies`.** Nunca como dependencia de producción: si `firebase-admin` entra al bundle del cliente, su credencial queda pública y se pierde el control total de la base.
- **El `projectId` de los tests es `demo-lavadero`.** El prefijo `demo-` hace que el emulador no pida credenciales reales y garantiza que ningún test toque la base de producción.
- **`serviceAccount.json` nunca se commitea.** Entra en `.gitignore` en el mismo commit en que se crea el primer script que lo usa.
- **El alias `@` apunta a `./src`** (ya configurado en `vite.config.js`). Usarlo en imports de `src/`.
- **No tocar** `vite.config.js:7` (`base: "/react-coder"`), `package.json` (`homepage`, scripts de `gh-pages`), ni nada de SEO/favicon: eso es el subproyecto D y cambiarlo acá rompe el deploy actual de GitHub Pages.
- **No tocar** el cálculo de precios del checkout ni `src/pages/Admin/AdminDashboard.jsx` más allá de lo que exija un import roto: son los subproyectos B y E.

## Review Focus

Cinco modos de falla que el spec implica, que ningún test de las tareas ejercitaría por defecto, y que son los más probables de golpear a una persona real. Cada uno tiene su test asignado a la tarea que es dueña del código:

1. **Refrescar la página estando en `/admin`.** Al recargar, `AuthContext` arranca con `loading: true` y `user: null`. Si `ProtectedRoute` decide antes de que resuelva `onAuthStateChanged`, **expulsa al login a un admin perfectamente válido**. Es la falla más probable de todo el plan. → Test en Task 11.
2. **Claim recién asignado con un token viejo en la mano.** Los tokens de Firebase duran una hora. Después de correr `set-admin.mjs`, el usuario sigue viendo la app como comprador sin ninguna explicación, y concluye que el script falló. → Test en Task 10 + aviso explícito en la salida del script (Task 8).
3. **Registro con un email que ya existe.** Hoy cualquier fallo muestra "Error al registrarse. Inténtalo de nuevo.", así que la persona reintenta con los mismos datos para siempre. → Test en Task 13.
4. **Reset de contraseña con un email que no existe.** Firebase devuelve `auth/user-not-found`. Mostrar "ese email no está registrado" convierte el formulario en un **detector de cuentas** para cualquiera. Tiene que mostrar el mismo mensaje exista o no. → Test en Task 13.
5. **Contraseña de exactamente 8 caracteres.** El límite de la política. Un `>` en lugar de `>=` rechaza una contraseña válida y nadie se da cuenta hasta que un cliente se queja. → Test en Task 13 (7, 8 y 9 caracteres).

---

## File Structure

**Nuevos — configuración y reglas (raíz)**

| Archivo | Responsabilidad |
|---|---|
| `firebase.json` | Declara dónde están reglas, índices y puertos del emulador |
| `firestore.rules` | Autorización de la base de datos |
| `storage.rules` | Autorización de archivos subidos |
| `firestore.indexes.json` | Índice compuesto de `obtenerProductos` |
| `vitest.config.js` | Runner de tests |

**Nuevos — scripts (fuera del bundle)**

| Archivo | Responsabilidad |
|---|---|
| `scripts/firebaseAdmin.mjs` | Inicializa el Admin SDK una sola vez, compartido |
| `scripts/set-admin.mjs` | Asigna el custom claim `admin` a un uid |
| `scripts/seed-productos.mjs` | Carga el catálogo inicial (reemplaza el botón del navegador) |

**Nuevos — tests**

| Archivo | Responsabilidad |
|---|---|
| `tests/rules/helpers.js` | Monta y desmonta el entorno del emulador |
| `tests/rules/firestore.products.test.js` | `products` y `promociones` |
| `tests/rules/firestore.users.test.js` | Escalada de privilegios |
| `tests/rules/firestore.compras.test.js` | Aislamiento de pedidos entre clientes |
| `tests/rules/firestore.mensajes.test.js` | `mensajes` y el catch-all |
| `tests/rules/storage.test.js` | Tipo y tamaño de archivo |
| `tests/unit/validarPassword.test.js` | Política de contraseña |
| `tests/unit/authErrors.test.js` | Mapa de errores de Firebase |
| `tests/unit/ProtectedRoute.test.jsx` | Los tres estados del guard |

**Nuevos — componentes (uno por responsabilidad, según la preferencia de componentizar)**

| Archivo | Responsabilidad | Líneas aprox. |
|---|---|---|
| `src/components/ProtectedRoute/ProtectedRoute.jsx` | Guard de ruta | 25 |
| `src/components/common/FormField/FormField.jsx` | Un `label` + `input` + error | 30 |
| `src/components/common/FormError/FormError.jsx` | Bloque de error del formulario | 12 |
| `src/components/auth/AuthCard/AuthCard.jsx` | Carcasa visual de login/registro | 20 |
| `src/components/auth/GoogleAuthButton/GoogleAuthButton.jsx` | Botón de Google | 22 |
| `src/components/auth/PasswordResetLink/PasswordResetLink.jsx` | "Olvidé mi contraseña" + su flujo | 45 |
| `src/constants/authErrors.js` | Códigos de Firebase → castellano | 25 |
| `src/utils/validarPassword.js` | Política de contraseña, función pura | 20 |

**Modificados**

| Archivo | Cambio |
|---|---|
| `src/contexts/AuthContext.jsx` | Claim del token en vez de lectura de Firestore |
| `src/App.jsx` | Rutas envueltas en `ProtectedRoute` |
| `src/services/firebase/authFirebase.js` | Verificación, reset, `updateProfile`, deja de escribir `role` |
| `src/services/firebase/productosFirebase.js` | Sacar `sembrarProductos` |
| `src/services/firebase/index.js` | Sacar `sembrarProductos` del barrel |
| `src/pages/Auth/Register.jsx` | Recomponer con los componentes nuevos |
| `src/pages/Auth/Login.jsx` | Recomponer + link de reset |
| `src/pages/Profile/Profile.jsx` | Sacar `navigate()` del render; rol desde el claim |
| `.gitignore` | `serviceAccount.json` |
| `package.json` | devDependencies y scripts de test |

**Borrados**

| Archivo | Razón |
|---|---|
| `src/components/InicializarBaseDeDatos.jsx` | Botón de sembrar la base en el bundle público |
| `temp_products.js` | Huérfano; el grafo lo detectó como comunidad aislada de 1 nodo |

---

### Task 1: Harness de tests y reglas que niegan todo

Punto de partida seguro: las reglas arrancan negando y las tareas siguientes abren una colección por vez. Lo inverso (arrancar abierto e ir cerrando) deja ventanas abiertas si una tarea queda a medias.

**Files:**
- Create: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `vitest.config.js`, `tests/rules/helpers.js`, `tests/rules/firestore.denyall.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada, es la primera tarea.
- Produces: `tests/rules/helpers.js` exporta `montarEntorno(): Promise<RulesTestEnvironment>` y `limpiar(env): Promise<void>`. Las tasks 2–6 las importan. Scripts `npm run test:rules` y `npm run test:unit`.

- [ ] **Step 1: Instalar las dependencias de test**

```bash
npm i -D vitest@^3 @firebase/rules-unit-testing@^4 firebase-tools@^14
```

- [ ] **Step 2: Crear `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

- [ ] **Step 3: Crear `firestore.indexes.json`**

`obtenerProductos` combina `where("category","in",[...])` con `orderBy("__name__")`, y eso exige un índice compuesto que hoy no está declarado en ninguna parte. Sin él, el filtro por categoría falla en producción con un error que incluye un link para crearlo a mano — y queda fuera del repo.

```json
{
  "indexes": [
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "__name__", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 4: Crear `firestore.rules` negando todo**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isAdmin()    { return isSignedIn() && request.auth.token.admin == true; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    // Default: negar. Una colección nueva nace cerrada, no abierta.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Las tres funciones se declaran ya aunque todavía no se usen: las tasks 2–5 solo agregan bloques `match` y no vuelven a tocar esta cabecera.

- [ ] **Step 5: Crear `vitest.config.js`**

```js
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Los tests de reglas corren en Node contra el emulador.
    // Los de componentes declaran jsdom con un docblock en su propio archivo.
    environment: "node",
    // El emulador es un recurso compartido: en paralelo los tests se pisan.
    fileParallelism: false,
    testTimeout: 15000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 6: Crear `tests/rules/helpers.js`**

```js
import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

export const PROJECT_ID = "demo-lavadero";

export async function montarEntorno() {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
}

export async function limpiar(env) {
  await env.clearFirestore();
}
```

- [ ] **Step 7: Escribir el test que falla**

`tests/rules/firestore.denyall.test.js`

```js
import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => {
  env = await montarEntorno();
});

afterEach(async () => {
  await limpiar(env);
});

afterAll(async () => {
  await env.cleanup();
});

describe("default deny", () => {
  it("niega la lectura anónima de cualquier documento", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "products/p1")));
  });

  it("niega la escritura de un usuario autenticado en una colección no declarada", async () => {
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(
      setDoc(doc(cliente.firestore(), "coleccionInventada/x"), { a: 1 })
    );
  });
});
```

- [ ] **Step 8: Agregar los scripts a `package.json`**

Dentro de `"scripts"`:

```json
"test": "npm run test:unit && npm run test:rules",
"test:unit": "vitest run tests/unit",
"test:rules": "firebase emulators:exec --only firestore,storage --project demo-lavadero \"vitest run tests/rules\""
```

`emulators:exec` levanta el emulador, corre el comando y lo apaga. Sin eso hay que acordarse de tener el emulador prendido en otra terminal, y los tests fallan con un timeout que no explica nada.

- [ ] **Step 9: Correr el test y verificar que pasa**

```bash
npm run test:rules
```

Esperado: 2 tests en verde. Si falla con `ECONNREFUSED 127.0.0.1:8080`, el emulador no arrancó — revisar que `firebase.json` esté en la raíz. Si falla pidiendo login, falta el `--project demo-lavadero`.

> Nota sobre TDD en esta tarea: el test de "niega todo" pasa contra las reglas del Step 4 por diseño — es la línea de base. A partir de la Task 2 el ciclo es el normal: test rojo primero, después la regla.

- [ ] **Step 10: Commit**

```bash
git add firebase.json firestore.rules firestore.indexes.json vitest.config.js tests/rules/ package.json package-lock.json
git commit -m "test: harness de reglas contra el emulador y firestore.rules que niega todo

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Reglas de `products` y `promociones`

**Files:**
- Create: `tests/rules/firestore.products.test.js`
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: `montarEntorno`, `limpiar` de `tests/rules/helpers.js`.
- Produces: `products` y `promociones` legibles por cualquiera, escribibles solo con el claim `admin`.

`promociones` se declara ahora aunque la colección todavía no exista, porque es un requisito ya confirmado del producto (el dueño pidió gestionar promociones) y el criterio de acceso es idéntico al del catálogo. Declararla acá evita volver a tocar y redesplegar las reglas en el subproyecto B.

- [ ] **Step 1: Escribir los tests que fallan**

```js
import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntorno(); });
afterEach(async () => { await limpiar(env); });
afterAll(async () => { await env.cleanup(); });

// Siembra saltándose las reglas, para tener algo que leer.
async function sembrar(coleccion, id, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `${coleccion}/${id}`), data);
  });
}

describe("products", () => {
  it("permite la lectura anónima (el catálogo es público)", async () => {
    await sembrar("products", "p1", { name: "Torta 100 tiros", price: 4500 });
    const anon = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(anon.firestore(), "products/p1")));
  });

  it("niega la escritura anónima", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(setDoc(doc(anon.firestore(), "products/p1"), { price: 1 }));
  });

  it("niega la escritura de un cliente autenticado sin el claim admin", async () => {
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(setDoc(doc(cliente.firestore(), "products/p1"), { price: 1 }));
  });

  it("niega que un cliente se declare admin en su propio token", async () => {
    // Un claim falso no existe: el token lo firma Google. Esto documenta
    // que la regla mira el token, no el payload del pedido.
    const falso = env.authenticatedContext("cliente1", { admin: "true" });
    await assertFails(setDoc(doc(falso.firestore(), "products/p1"), { price: 1 }));
  });

  it("permite que un admin cree un producto", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(
      setDoc(doc(admin.firestore(), "products/p1"), { name: "Torta", price: 4500 })
    );
  });

  it("permite que un admin borre un producto", async () => {
    await sembrar("products", "p1", { name: "Torta" });
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "products/p1")));
  });
});

describe("promociones", () => {
  it("permite la lectura anónima", async () => {
    await sembrar("promociones", "promo1", { codigo: "VERANO", descuento: 10 });
    const anon = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(anon.firestore(), "promociones/promo1")));
  });

  it("niega que un cliente cree una promoción", async () => {
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(
      setDoc(doc(cliente.firestore(), "promociones/promo1"), { descuento: 99 })
    );
  });

  it("permite que un admin cree una promoción", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(
      setDoc(doc(admin.firestore(), "promociones/promo1"), { codigo: "VERANO", descuento: 10 })
    );
  });
});
```

Nótese el test del claim `admin: "true"` (string, no booleano): la regla usa `== true`, así que un string no alcanza. Si alguien relaja la regla a `request.auth.token.admin` suelto, ese test se pone rojo.

- [ ] **Step 2: Correr y verificar que falla**

```bash
npm run test:rules
```
Esperado: FAIL. Los `assertSucceeds` fallan porque el catch-all niega todo. Los `assertFails` ya pasan.

- [ ] **Step 3: Agregar las reglas**

En `firestore.rules`, **antes** del bloque `match /{document=**}`:

```
    // Catálogo: lectura pública, escritura solo admin.
    match /products/{id} {
      allow read:  if true;
      allow write: if isAdmin();
    }

    // Promociones: mismo criterio que el catálogo.
    match /promociones/{id} {
      allow read:  if true;
      allow write: if isAdmin();
    }
```

El orden importa: en Firestore gana cualquier `allow` que coincida, así que un `match` específico puede abrir lo que el catch-all niega. Pero mantenerlo arriba hace el archivo legible de lo específico a lo general.

- [ ] **Step 4: Correr y verificar que pasa**

```bash
npm run test:rules
```
Esperado: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules tests/rules/firestore.products.test.js
git commit -m "feat: reglas de products y promociones (lectura pública, escritura solo admin)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Reglas de `users` — cerrar la escalada de privilegios

El agujero más grave del proyecto. `registerWithEmail` escribe `users/{uid}` con `role: "buyer"` desde el navegador, y `AuthContext` lee ese campo para decidir `isAdmin`. Si el usuario puede escribir su propio documento —lo más natural de permitir— se asciende a admin desde la consola del navegador.

**Files:**
- Create: `tests/rules/firestore.users.test.js`
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: `montarEntorno`, `limpiar`.
- Produces: `users/{uid}` donde cada uno lee y edita su perfil, y **el campo `role` no se puede escribir desde el cliente**. Esto obliga a que `registerWithEmail` deje de escribirlo (Task 12).

**Modelo de roles (definido por el dueño del proyecto):** hay exactamente dos y **no existe un campo `role` en la base**. Con el claim `admin` en el token sos soporte/dueño; sin el claim sos comprador. El usuario que se registra no completa ningún rol porque no hay nada que completar — comprador es el default por ausencia. La regla que rechaza `role` es defensa en profundidad para que ese campo no vuelva a aparecer por la ventana.

- [ ] **Step 1: Escribir los tests que fallan**

```js
import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntorno(); });
afterEach(async () => { await limpiar(env); });
afterAll(async () => { await env.cleanup(); });

async function sembrarUsuario(uid, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `users/${uid}`), data);
  });
}

const PERFIL = { name: "Ana", email: "ana@mail.com", telefono: "11-2222-3333" };

describe("users - lectura", () => {
  it("permite leer su propio perfil", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertSucceeds(getDoc(doc(ana.firestore(), "users/ana")));
  });

  it("niega leer el perfil de otro usuario", async () => {
    await sembrarUsuario("ana", PERFIL);
    const otro = env.authenticatedContext("beto");
    await assertFails(getDoc(doc(otro.firestore(), "users/ana")));
  });

  it("permite que un admin lea cualquier perfil", async () => {
    await sembrarUsuario("ana", PERFIL);
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(getDoc(doc(admin.firestore(), "users/ana")));
  });

  it("niega la lectura anónima", async () => {
    await sembrarUsuario("ana", PERFIL);
    const anon = env.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "users/ana")));
  });
});

describe("users - creación en el registro", () => {
  it("permite crear su propio perfil sin el campo role", async () => {
    const ana = env.authenticatedContext("ana");
    await assertSucceeds(setDoc(doc(ana.firestore(), "users/ana"), PERFIL));
  });

  it("NIEGA crear el perfil incluyendo role (ni siquiera role: buyer)", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(
      setDoc(doc(ana.firestore(), "users/ana"), { ...PERFIL, role: "buyer" })
    );
  });

  it("NIEGA crear el perfil con role: admin", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(
      setDoc(doc(ana.firestore(), "users/ana"), { ...PERFIL, role: "admin" })
    );
  });

  it("niega crear el perfil de otro uid", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(setDoc(doc(ana.firestore(), "users/beto"), PERFIL));
  });
});

describe("users - escalada de privilegios", () => {
  it("NIEGA que un usuario se ponga role: admin en su propio perfil", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertFails(updateDoc(doc(ana.firestore(), "users/ana"), { role: "admin" }));
  });

  it("NIEGA tocar role aunque se cambien otros campos a la vez", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertFails(
      updateDoc(doc(ana.firestore(), "users/ana"), {
        telefono: "11-9999-0000",
        role: "admin",
      })
    );
  });

  it("permite editar campos del perfil que no son role", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    await assertSucceeds(
      updateDoc(doc(ana.firestore(), "users/ana"), { telefono: "11-9999-0000" })
    );
  });

  it("permite que el admin corrija un dato del perfil de un cliente (soporte)", async () => {
    await sembrarUsuario("ana", PERFIL);
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(
      updateDoc(doc(admin.firestore(), "users/ana"), { telefono: "11-5555-6666" })
    );
  });

  it("NIEGA que un usuario borre su perfil", async () => {
    await sembrarUsuario("ana", PERFIL);
    const ana = env.authenticatedContext("ana");
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(deleteDoc(doc(ana.firestore(), "users/ana")));
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
npm run test:rules
```
Esperado: FAIL en todos los `assertSucceeds` de `users` (el catch-all los niega).

- [ ] **Step 3: Agregar la regla**

En `firestore.rules`, antes del catch-all:

```
    // Perfiles: cada uno ve y edita el suyo.
    //
    // No existe un campo `role` en el modelo de datos: hay exactamente dos
    // roles y se derivan del token. Con el claim `admin` sos soporte/dueño;
    // sin el claim sos comprador. El usuario no completa nada.
    // La prohibición de escribir `role` es defensa en profundidad: si algún
    // día alguien reintroduce ese campo desde el cliente, se rechaza.
    match /users/{uid} {
      allow read:   if isOwner(uid) || isAdmin();
      allow create: if isOwner(uid) && !('role' in request.resource.data);
      allow update: if isAdmin() ||
                       (isOwner(uid)
                        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']));
      allow delete: if isAdmin();
    }
```

Dos detalles de sintaxis que fallan si se escriben de memoria:

- En `create` se usa `'role' in request.resource.data` porque ahí `data` es un **Map** y `in` chequea claves de un Map.
- En `update` se usa `.affectedKeys().hasAny(['role'])` porque `affectedKeys()` devuelve un **Set**, y los Sets de las reglas **no soportan `in`** — solo `hasAny`, `hasAll` y `hasOnly`. Escribir `!('role' in ...affectedKeys())` hace fallar el deploy.

- [ ] **Step 4: Correr y verificar que pasa**

```bash
npm run test:rules
```
Esperado: PASS, 24 tests.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules tests/rules/firestore.users.test.js
git commit -m "fix: cerrar la escalada de privilegios en users (role intocable desde el cliente)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Reglas de `compras` — aislar los pedidos entre clientes

Hoy `obtenerTodasLasCompras()` hace `getDocs` de la colección entera sin filtrar por usuario. Si las reglas permiten leer `compras` a cualquier autenticado, cualquier cliente registrado lee nombres, emails y teléfonos de todos los demás.

**Files:**
- Create: `tests/rules/firestore.compras.test.js`
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: `montarEntorno`, `limpiar`.
- Produces: `compras` legible solo por su dueño o por admin; creación con `buyer.uid` verificado y forma validada.

> **Riesgo residual conocido y aceptado.** Esta regla permite que el cliente **cree** el pedido, porque cerrarlo (`create: if false`) rompe el checkout hasta que exista la API del subproyecto B. Las reglas no pueden validar precios: exigiría un `get()` por ítem y el límite son 10 lecturas por evaluación. Lo que esta tarea cierra es "cualquiera escribe pedidos ajenos" y "cualquiera lee los pedidos de todos". **La manipulación de precios sigue abierta hasta B.** Está documentado en la sección 5 del spec.

- [ ] **Step 1: Escribir los tests que fallan**

```js
import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntorno(); });
afterEach(async () => { await limpiar(env); });
afterAll(async () => { await env.cleanup(); });

function orden(uid, extra = {}) {
  return {
    buyer: { uid, name: "Ana", email: "ana@mail.com" },
    items: [{ codigo: "P1", cantidad: 2, precioUnitario: 4500 }],
    total: 9000,
    date: new Date().toISOString(),
    ...extra,
  };
}

async function sembrarCompra(id, uid) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `compras/${id}`), orden(uid));
  });
}

describe("compras - lectura", () => {
  it("permite leer su propio pedido", async () => {
    await sembrarCompra("c1", "ana");
    const ana = env.authenticatedContext("ana");
    await assertSucceeds(getDoc(doc(ana.firestore(), "compras/c1")));
  });

  it("NIEGA leer el pedido de otro cliente", async () => {
    await sembrarCompra("c1", "ana");
    const beto = env.authenticatedContext("beto");
    await assertFails(getDoc(doc(beto.firestore(), "compras/c1")));
  });

  it("NIEGA listar la colección entera siendo cliente", async () => {
    await sembrarCompra("c1", "ana");
    await sembrarCompra("c2", "beto");
    const ana = env.authenticatedContext("ana");
    await assertFails(getDocs(collection(ana.firestore(), "compras")));
  });

  it("permite que un admin lea cualquier pedido", async () => {
    await sembrarCompra("c1", "ana");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(getDoc(doc(admin.firestore(), "compras/c1")));
  });

  it("permite que un admin liste la colección entera (es el panel)", async () => {
    await sembrarCompra("c1", "ana");
    await sembrarCompra("c2", "beto");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(getDocs(collection(admin.firestore(), "compras")));
  });

  it("niega la lectura anónima", async () => {
    await sembrarCompra("c1", "ana");
    const anon = env.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "compras/c1")));
  });
});

describe("compras - creación", () => {
  it("permite crear un pedido propio con forma válida", async () => {
    const ana = env.authenticatedContext("ana");
    await assertSucceeds(addDoc(collection(ana.firestore(), "compras"), orden("ana")));
  });

  it("NIEGA crear un pedido a nombre de otro uid", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(addDoc(collection(ana.firestore(), "compras"), orden("beto")));
  });

  it("niega crear un pedido anónimo", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(addDoc(collection(anon.firestore(), "compras"), orden("ana")));
  });

  it("niega un pedido con items vacío", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), orden("ana", { items: [] }))
    );
  });

  it("niega un pedido con total negativo", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), orden("ana", { total: -500 }))
    );
  });

  it("niega un pedido con total que no es número", async () => {
    const ana = env.authenticatedContext("ana");
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), orden("ana", { total: "9000" }))
    );
  });

  it("niega un pedido con más de 50 items", async () => {
    const ana = env.authenticatedContext("ana");
    const muchos = Array.from({ length: 51 }, (_, i) => ({
      codigo: `P${i}`, cantidad: 1, precioUnitario: 100,
    }));
    await assertFails(
      addDoc(collection(ana.firestore(), "compras"), orden("ana", { items: muchos }))
    );
  });
});

describe("compras - modificación", () => {
  it("NIEGA que un cliente borre su propio pedido", async () => {
    await sembrarCompra("c1", "ana");
    const ana = env.authenticatedContext("ana");
    await assertFails(deleteDoc(doc(ana.firestore(), "compras/c1")));
  });

  it("permite que un admin borre un pedido", async () => {
    await sembrarCompra("c1", "ana");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "compras/c1")));
  });
});
```

El test de "niega listar la colección entera siendo cliente" es importante y poco intuitivo: en Firestore las reglas se evalúan **por documento**, pero una consulta de colección se rechaza entera si *algún* documento del resultado podría no pasar. Por eso un cliente no puede hacer `getDocs(collection(...))` sin un `where` sobre su propio uid, aunque sí pueda leer sus documentos de a uno.

- [ ] **Step 2: Correr y verificar que falla**

```bash
npm run test:rules
```

- [ ] **Step 3: Agregar la regla**

```
    // Pedidos: cada cliente ve los suyos; el admin ve todos.
    // El `create` del cliente es TEMPORAL — en el subproyecto B pasa a
    // `if false` y la escritura queda solo en manos del Admin SDK, que es
    // lo que permite revalidar precios y stock del lado del servidor.
    match /compras/{id} {
      allow read:   if isAdmin() ||
                       (isSignedIn() && resource.data.buyer.uid == request.auth.uid);
      allow create: if isSignedIn()
                    && request.resource.data.buyer.uid == request.auth.uid
                    && request.resource.data.total is number
                    && request.resource.data.total >= 0
                    && request.resource.data.items is list
                    && request.resource.data.items.size() > 0
                    && request.resource.data.items.size() <= 50;
      allow update, delete: if isAdmin();
    }
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
npm run test:rules
```
Esperado: PASS, 39 tests.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules tests/rules/firestore.compras.test.js
git commit -m "fix: aislar los pedidos por cliente y validar su forma al crearlos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Reglas de `mensajes` y verificación del catch-all

**Files:**
- Create: `tests/rules/firestore.mensajes.test.js`
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: `montarEntorno`, `limpiar`.
- Produces: `mensajes` escribible por cualquiera (el formulario de contacto es público) con límite de tamaño, legible solo por admin. Confirmación de que el catch-all sigue cerrando lo no declarado.

El formulario de contacto no exige login a propósito: pedirlo pierde consultas de gente que todavía no se registró. El costo es que habilita spam, acotado acá con el límite de tamaño y en el subproyecto C con rate limiting en `api/contacto`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { montarEntorno, limpiar } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntorno(); });
afterEach(async () => { await limpiar(env); });
afterAll(async () => { await env.cleanup(); });

const MENSAJE = {
  nombre: "Ana",
  email: "ana@mail.com",
  mensaje: "Quiero consultar por una torta de 100 tiros",
  date: new Date().toISOString(),
  leido: false,
};

async function sembrarMensaje(id) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `mensajes/${id}`), MENSAJE);
  });
}

describe("mensajes", () => {
  it("permite que un visitante anónimo deje un mensaje", async () => {
    const anon = env.unauthenticatedContext();
    await assertSucceeds(addDoc(collection(anon.firestore(), "mensajes"), MENSAJE));
  });

  it("niega un mensaje de más de 2000 caracteres", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(
      addDoc(collection(anon.firestore(), "mensajes"), {
        ...MENSAJE,
        mensaje: "x".repeat(2001),
      })
    );
  });

  it("niega un mensaje cuyo cuerpo no es string", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(
      addDoc(collection(anon.firestore(), "mensajes"), { ...MENSAJE, mensaje: 42 })
    );
  });

  it("NIEGA que un cliente autenticado lea los mensajes", async () => {
    await sembrarMensaje("m1");
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(getDoc(doc(cliente.firestore(), "mensajes/m1")));
  });

  it("permite que un admin lea los mensajes", async () => {
    await sembrarMensaje("m1");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(getDoc(doc(admin.firestore(), "mensajes/m1")));
  });

  it("permite que un admin marque un mensaje como leído", async () => {
    await sembrarMensaje("m1");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(updateDoc(doc(admin.firestore(), "mensajes/m1"), { leido: true }));
  });

  it("NIEGA que un cliente borre un mensaje", async () => {
    await sembrarMensaje("m1");
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(deleteDoc(doc(cliente.firestore(), "mensajes/m1")));
  });

  it("permite que un admin borre un mensaje", async () => {
    await sembrarMensaje("m1");
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "mensajes/m1")));
  });
});

describe("catch-all sigue cerrado", () => {
  it("niega escribir en una colección no declarada, incluso siendo admin", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      setDoc(doc(admin.firestore(), "coleccionInventada/x"), { a: 1 })
    );
  });

  it("niega leer una colección no declarada, incluso siendo admin", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(getDoc(doc(admin.firestore(), "coleccionInventada/x")));
  });
});
```

Los dos últimos tests son deliberados: **ni el admin** puede tocar una colección sin regla. Eso obliga a que agregar una colección sea un cambio consciente de las reglas, y no algo que aparece porque alguien escribió desde el panel.

- [ ] **Step 2: Correr y verificar que falla**

```bash
npm run test:rules
```

- [ ] **Step 3: Agregar la regla**

```
    // Mensajes de contacto: cualquiera escribe (el formulario es público),
    // solo el admin lee. El límite de tamaño acota el spam hasta que haya
    // rate limiting en api/contacto.
    match /mensajes/{id} {
      allow read:   if isAdmin();
      allow create: if request.resource.data.mensaje is string
                    && request.resource.data.mensaje.size() <= 2000;
      allow update, delete: if isAdmin();
    }
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
npm run test:rules
```
Esperado: PASS, 49 tests.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules tests/rules/firestore.mensajes.test.js
git commit -m "feat: reglas de mensajes y verificación del default-deny

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Reglas de Storage — tipo y tamaño de archivo

`uploadFile` acepta cualquier `File`, sin límite de tamaño ni whitelist de MIME. El `accept="image/*,video/*"` del formulario de admin es solo el selector del navegador y no valida nada.

**Files:**
- Create: `storage.rules`, `tests/rules/storage.test.js`
- Modify: `tests/rules/helpers.js`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `tests/rules/helpers.js` exporta además `montarEntornoStorage(): Promise<RulesTestEnvironment>`. `products/` legible por cualquiera, escribible solo por admin, con imágenes hasta 5 MB y videos hasta 50 MB.

- [ ] **Step 1: Agregar el helper de Storage**

En `tests/rules/helpers.js`, agregar:

```js
export async function montarEntornoStorage() {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
}
```

- [ ] **Step 2: Escribir los tests que fallan**

`tests/rules/storage.test.js`

```js
import { describe, it, beforeAll, afterAll } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { montarEntornoStorage } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntornoStorage(); });
afterAll(async () => { await env.cleanup(); });

const imagenChica = () => new Uint8Array(1024);                 // 1 KB
const imagenGrande = () => new Uint8Array(6 * 1024 * 1024);     // 6 MB
const videoMediano = () => new Uint8Array(10 * 1024 * 1024);    // 10 MB

describe("storage products/", () => {
  it("niega que un anónimo suba un archivo", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(
      uploadBytes(ref(anon.storage(), "products/foto.jpg"), imagenChica(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("niega que un cliente autenticado sin claim admin suba un archivo", async () => {
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(
      uploadBytes(ref(cliente.storage(), "products/foto.jpg"), imagenChica(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("permite que un admin suba una imagen chica", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(
      uploadBytes(ref(admin.storage(), "products/foto.jpg"), imagenChica(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("NIEGA que un admin suba una imagen de 6 MB (límite 5 MB)", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      uploadBytes(ref(admin.storage(), "products/grande.jpg"), imagenGrande(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("permite que un admin suba un video de 10 MB (límite 50 MB)", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(
      uploadBytes(ref(admin.storage(), "products/demo.mp4"), videoMediano(), {
        contentType: "video/mp4",
      })
    );
  });

  it("NIEGA un ejecutable aunque lo suba el admin", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      uploadBytes(ref(admin.storage(), "products/malo.exe"), imagenChica(), {
        contentType: "application/x-msdownload",
      })
    );
  });

  it("NIEGA un PDF disfrazado de nombre de imagen", async () => {
    // El nombre no importa: la regla mira el contentType declarado.
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      uploadBytes(ref(admin.storage(), "products/foto.jpg"), imagenChica(), {
        contentType: "application/pdf",
      })
    );
  });

  it("niega escribir fuera de products/", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      uploadBytes(ref(admin.storage(), "otracarpeta/foto.jpg"), imagenChica(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("permite la lectura pública de products/ (las fotos se muestran en la tienda)", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await uploadBytes(ref(admin.storage(), "products/publica.jpg"), imagenChica(), {
      contentType: "image/jpeg",
    });
    const anon = env.unauthenticatedContext();
    await assertSucceeds(getDownloadURL(ref(anon.storage(), "products/publica.jpg")));
  });
});
```

- [ ] **Step 3: Correr y verificar que falla**

```bash
npm run test:rules
```
Esperado: FAIL — `storage.rules` todavía no existe, así que el emulador no arranca con Storage o niega todo.

- [ ] **Step 4: Crear `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    match /products/{file} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.admin == true
                   && (
                        (request.resource.contentType.matches('image/.*')
                         && request.resource.size < 5 * 1024 * 1024)
                        ||
                        (request.resource.contentType.matches('video/.*')
                         && request.resource.size < 50 * 1024 * 1024)
                      );
    }

    // Todo lo demás, cerrado.
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Los dos umbrales son distintos a propósito: 5 MB no alcanza para un video y 50 MB es absurdo para una foto de producto.

- [ ] **Step 5: Correr y verificar que pasa**

```bash
npm run test:rules
```
Esperado: PASS, 58 tests. Esta suite tarda más que las otras porque sube megabytes reales al emulador.

- [ ] **Step 6: Commit**

```bash
git add storage.rules tests/rules/storage.test.js tests/rules/helpers.js
git commit -m "feat: reglas de Storage con whitelist de MIME y límite de tamaño

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Inicialización compartida del Admin SDK

Los dos scripts siguientes (asignar el claim, sembrar el catálogo) necesitan el Admin SDK. La inicialización va en un módulo propio para no duplicarla y para que el manejo del error de credencial —que es donde todo el mundo se traba— esté en un solo lugar.

**Files:**
- Create: `scripts/firebaseAdmin.mjs`
- Modify: `.gitignore`, `package.json`

**Interfaces:**
- Consumes: nada.
- Produces: `scripts/firebaseAdmin.mjs` exporta `admin` (el namespace inicializado), `db` (Firestore) y `auth` (Auth). Las tasks 8 y 9 las importan.

- [ ] **Step 1: Instalar `firebase-admin` como devDependency**

```bash
npm i -D firebase-admin@^13
```

Como `devDependency`, no como dependencia: si entra al bundle del cliente, su credencial queda pública y se pierde el control total de la base.

- [ ] **Step 2: Ignorar la credencial ANTES de escribir el script**

Agregar al final de `.gitignore`:

```
# Credencial del Admin SDK - NUNCA commitear
serviceAccount.json
```

Va primero a propósito. Si el orden se invierte hay una ventana en la que un `git add -A` distraído sube la llave de la base entera.

- [ ] **Step 3: Crear `scripts/firebaseAdmin.mjs`**

```js
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

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(readFileSync(rutaAbsoluta, "utf8"))),
});

export { admin };
export const db = admin.firestore();
export const auth = admin.auth();
```

El mensaje de error explica cómo conseguir la credencial en vez de tirar un stack trace. Es un script que se corre una vez cada muchos meses: el error va a aparecer justo cuando nadie se acuerde del procedimiento.

- [ ] **Step 4: Verificar que la credencial no es trackeable**

```bash
printf '{"type":"service_account"}' > serviceAccount.json
git status --short serviceAccount.json
```
Esperado: **sin salida**. Si aparece `?? serviceAccount.json`, el `.gitignore` no tomó efecto — revisar el Step 2.

```bash
rm serviceAccount.json
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore scripts/firebaseAdmin.mjs package.json package-lock.json
git commit -m "chore: inicialización compartida del Admin SDK para scripts locales

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Script para asignar el claim de admin

**Files:**
- Create: `scripts/set-admin.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `admin`, `auth` de `scripts/firebaseAdmin.mjs`.
- Produces: `npm run set-admin -- <email>` asigna `{ admin: true }` al usuario de ese email. Es lo que hace que `isAdmin()` de las reglas devuelva `true` para alguien.

Toma el **email** y no el uid: el uid hay que ir a buscarlo a la consola, el email ya lo sabés. El script lo resuelve con `getUserByEmail`.

- [ ] **Step 1: Crear el script**

```js
import { auth } from "./firebaseAdmin.mjs";

const email = process.argv[2];
const quitar = process.argv.includes("--quitar");

if (!email) {
  console.error(`
Uso:
  npm run set-admin -- correo@ejemplo.com            asigna admin
  npm run set-admin -- correo@ejemplo.com --quitar   lo revoca
`);
  process.exit(1);
}

try {
  const usuario = await auth.getUserByEmail(email);
  const claims = { ...(usuario.customClaims ?? {}) };

  if (quitar) {
    delete claims.admin;
  } else {
    claims.admin = true;
  }

  await auth.setCustomUserClaims(usuario.uid, claims);

  // Releer para confirmar que quedó escrito y no asumirlo.
  const confirmado = await auth.getUser(usuario.uid);
  const esAdmin = confirmado.customClaims?.admin === true;

  console.log(`
${quitar ? "Revocado" : "Asignado"} el claim admin.
  email: ${email}
  uid:   ${usuario.uid}
  admin: ${esAdmin}

IMPORTANTE: el token que ese usuario ya tiene en el navegador NO incluye
el cambio. Los tokens de Firebase duran una hora. Para verlo aplicado:
cerrar sesión y volver a iniciarla (o esperar hasta una hora).
Si entrás a /admin y te rebota, es esto, no un error del script.
`);
} catch (error) {
  if (error.code === "auth/user-not-found") {
    console.error(`No existe ningún usuario con el email ${email}.`);
    console.error("Registrate primero en la app con ese email y volvé a correr esto.");
  } else {
    console.error("Error al asignar el claim:", error.message);
  }
  process.exit(1);
}
```

El aviso sobre el token no es decoración: es el **modo de falla 2 de Review Focus**. Sin ese mensaje, el procedimiento se vive como "el script no funciona".

Preserva los claims existentes con `{ ...usuario.customClaims }` en vez de sobrescribirlos: `setCustomUserClaims` **reemplaza el objeto entero**, así que pasarle `{ admin: true }` borraría cualquier otro claim. Hoy no hay otros, pero los va a haber.

- [ ] **Step 2: Agregar el script a `package.json`**

```json
"set-admin": "node scripts/set-admin.mjs"
```

- [ ] **Step 3: Verificar el manejo de error sin credencial**

```bash
npm run set-admin -- test@ejemplo.com
```
Esperado: el mensaje de "No se encontró la credencial" de la Task 7, con las instrucciones y salida 1. No un stack trace.

- [ ] **Step 4: Verificar el manejo de error sin argumento**

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/dev/null npm run set-admin
```
Esperado: el mensaje de uso. (La credencial se chequea primero, así que con `/dev/null` existente el flujo llega a validar el argumento.)

- [ ] **Step 5: Commit**

```bash
git add scripts/set-admin.mjs package.json
git commit -m "feat: script para asignar y revocar el claim admin por email

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Sacar el seed del navegador

`src/components/InicializarBaseDeDatos.jsx` pone un botón "Subir Catálogo a Firestore" en código que se le descarga a cada visitante. Su propio comentario dice *"Zona de Admin (Borrar después)"*.

**Files:**
- Create: `scripts/seed-productos.mjs`
- Modify: `src/services/firebase/productosFirebase.js`, `src/services/firebase/index.js`, `package.json`
- Delete: `src/components/InicializarBaseDeDatos.jsx`, `temp_products.js`

**Interfaces:**
- Consumes: `db` de `scripts/firebaseAdmin.mjs`; `products` de `src/constants/products.js`.
- Produces: `npm run seed`. `sembrarProductos` deja de existir en `src/`.

- [ ] **Step 1: Verificar quién importa lo que se va a borrar**

```bash
grep -rn "InicializarBaseDeDatos\|sembrarProductos\|temp_products" src/ *.js
```
Esperado: `InicializarBaseDeDatos` solo se define (no está montado en ninguna página — confirmar). `sembrarProductos` aparece en `productosFirebase.js` y en `firebase/index.js`. Si aparece algún import más, hay que sacarlo también en esta tarea.

- [ ] **Step 2: Crear `scripts/seed-productos.mjs`**

```js
import { db } from "./firebaseAdmin.mjs";
import { products } from "../src/constants/products.js";

const LOTE = 400; // Firestore admite 500 operaciones por batch; margen de seguridad.

const existentes = await db.collection("products").limit(1).get();
if (!existentes.empty && !process.argv.includes("--forzar")) {
  console.log(`
La colección products ya tiene documentos. No se hace nada.
Para sobrescribir de todas formas: npm run seed -- --forzar
`);
  process.exit(0);
}

let escritos = 0;

for (let i = 0; i < products.length; i += LOTE) {
  const batch = db.batch();

  for (const producto of products.slice(i, i + LOTE)) {
    const adaptado = { ...producto, category: producto.categoria };
    delete adaptado.categoria;

    // Las '/' no son válidas en un ID de documento de Firestore.
    const idSeguro = String(producto.codigo).replace(/\//g, "-");
    batch.set(db.collection("products").doc(idSeguro), adaptado);
    escritos++;
  }

  await batch.commit();
  console.log(`  lote confirmado: ${escritos}/${products.length}`);
}

console.log(`\nListo. ${escritos} productos cargados en Firestore.`);
process.exit(0);
```

Dos cosas que la versión del navegador no hacía: **lotea** (el original hacía un solo batch, y `src/constants/products.js` tiene 5170 líneas — con más de 500 productos el commit falla entero), y acepta `--forzar` explícito en vez de abortar en silencio.

- [ ] **Step 3: Sacar `sembrarProductos` de los servicios del cliente**

En `src/services/firebase/productosFirebase.js`: borrar la función `sembrarProductos` completa, y del bloque de imports de `firebase/firestore` quitar `writeBatch` y `collection` **solo si ya no se usan** en el resto del archivo (`collection` sí se usa en `obtenerProductos`; `writeBatch` no). Borrar también `import { products } from "../../constants/products";`.

En `src/services/firebase/index.js`: quitar `sembrarProductos` del import y del objeto `firebase` exportado.

- [ ] **Step 4: Borrar los archivos muertos**

```bash
git rm src/components/InicializarBaseDeDatos.jsx temp_products.js
```

- [ ] **Step 5: Agregar el script y verificar que la app sigue compilando**

En `package.json`: `"seed": "node scripts/seed-productos.mjs"`

```bash
npm run build
```
Esperado: build exitoso. Si falla con "sembrarProductos is not exported", quedó un import sin limpiar — lo señala el propio error.

- [ ] **Step 6: Verificar que el bundle ya no contiene el seed**

```bash
grep -r "sembrarProductos\|Subir Catálogo" dist/assets/*.js && echo "FALLO: sigue en el bundle" || echo "OK: fuera del bundle"
```
Esperado: `OK: fuera del bundle`.

- [ ] **Step 7: Commit**

```bash
git add scripts/seed-productos.mjs src/services/firebase/ package.json
git commit -m "refactor: mover el seed del catálogo del navegador a un script de Node

El botón 'Subir Catálogo a Firestore' viajaba en el bundle público.
El script nuevo usa el Admin SDK y lotea de a 400 para no pasar el
límite de 500 operaciones por batch de Firestore.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: `AuthContext` lee el claim del token

**Files:**
- Modify: `src/contexts/AuthContext.jsx`
- Create: `tests/unit/AuthContext.test.jsx`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces: `useAuth()` devuelve `{ user, isAdmin, loading, refrescarClaims }`. **`role` deja de existir en el contexto** — quien lo usaba pasa a usar `isAdmin`. `refrescarClaims(): Promise<void>` fuerza el refresh del token. Las tasks 11 y 14 lo consumen.

Hoy `AuthContext` hace una lectura de Firestore por sesión para saber el rol, y ese rol sale de un documento que el usuario puede escribir. Pasa a leerlo del token, que el cliente ya tiene en la mano: se cierra el agujero **y** se elimina una lectura de Firestore por login.

- [ ] **Step 1: Escribir el test que falla**

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const onAuthStateChangedMock = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args) => onAuthStateChangedMock(...args),
}));
vi.mock("@/utils/firebase", () => ({ auth: {} }));

const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");

function Sonda() {
  const { isAdmin, loading, user } = useAuth();
  if (loading) return <p>cargando</p>;
  return (
    <p data-testid="resultado">
      {user ? user.email : "sin-usuario"}|{isAdmin ? "admin" : "comprador"}
    </p>
  );
}

function usuarioFalso({ claims = {} } = {}) {
  return {
    uid: "u1",
    email: "ana@mail.com",
    getIdTokenResult: vi.fn().mockResolvedValue({ claims }),
  };
}

function montarCon(usuario) {
  onAuthStateChangedMock.mockImplementation((_auth, callback) => {
    callback(usuario);
    return () => {};
  });
  render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>
  );
}

beforeEach(() => { onAuthStateChangedMock.mockReset(); });
afterEach(() => { vi.clearAllMocks(); });

describe("AuthContext", () => {
  it("marca isAdmin cuando el token trae el claim admin", async () => {
    montarCon(usuarioFalso({ claims: { admin: true } }));
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("ana@mail.com|admin")
    );
  });

  it("NO marca isAdmin cuando el token no trae el claim (token viejo)", async () => {
    // Review Focus #2: claim recién asignado, token de hasta una hora sin él.
    montarCon(usuarioFalso({ claims: {} }));
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("ana@mail.com|comprador")
    );
  });

  it("NO marca isAdmin cuando el claim es el string 'true' y no el booleano", async () => {
    montarCon(usuarioFalso({ claims: { admin: "true" } }));
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("comprador")
    );
  });

  it("deja isAdmin en false si no hay usuario", async () => {
    montarCon(null);
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("sin-usuario|comprador")
    );
  });

  it("no deja la app colgada en loading si getIdTokenResult falla", async () => {
    const roto = {
      uid: "u1",
      email: "ana@mail.com",
      getIdTokenResult: vi.fn().mockRejectedValue(new Error("red caída")),
    };
    montarCon(roto);
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("comprador")
    );
  });
});
```

El último test cubre algo que la implementación actual no maneja: si la llamada al token falla, `setLoading(false)` nunca corre y **la app entera queda en blanco**, porque `AuthProvider` hoy hace `{!loading && children}`.

- [ ] **Step 2: Instalar las dependencias de test de componentes**

```bash
npm i -D @testing-library/react@^16 @testing-library/jest-dom@^6 jsdom@^26
```

Crear `tests/setup.js`:

```js
import "@testing-library/jest-dom/vitest";
```

Y en `vitest.config.js`, dentro de `test`:

```js
setupFiles: ["./tests/setup.js"],
```

- [ ] **Step 3: Correr y verificar que falla**

```bash
npm run test:unit
```
Esperado: FAIL — `AuthContext` todavía lee el rol de Firestore con `getUserRole`, que el test no mockea.

- [ ] **Step 4: Reescribir `AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/utils/firebase";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // El permiso de admin vive en un custom claim firmado por Google, no en un
  // documento de Firestore que el propio usuario podría escribir.
  const leerClaims = useCallback(async (usuario, forzarRefresh = false) => {
    if (!usuario) return false;
    try {
      const token = await usuario.getIdTokenResult(forzarRefresh);
      return token.claims.admin === true;
    } catch (error) {
      // Nunca dejar la app colgada por un fallo de red: degradar a comprador.
      console.error("No se pudieron leer los claims del token");
      return false;
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (usuarioActual) => {
      setUser(usuarioActual);
      setIsAdmin(await leerClaims(usuarioActual));
      setLoading(false);
    });
  }, [leerClaims]);

  const refrescarClaims = useCallback(async () => {
    setIsAdmin(await leerClaims(auth.currentUser, true));
  }, [leerClaims]);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, refrescarClaims }}>
      {children}
    </AuthContext.Provider>
  );
};
```

Tres cambios además del claim:

- `console.error` **sin el objeto de error**. El original volcaba el error completo de Firebase en la consola del cliente.
- `{children}` en vez de `{!loading && children}`. Con el guardado anterior, cualquier fallo del token dejaba la pantalla en blanco. Ahora `loading` se expone y **`ProtectedRoute` es quien decide** qué mostrar mientras resuelve — que es lo correcto, porque el resto de la app no necesita esperar.
- `role` sale del contexto. La Task 14 ajusta `Profile`, que es su único consumidor.

- [ ] **Step 5: Correr y verificar que pasa**

```bash
npm run test:unit
```
Esperado: PASS, 5 tests.

- [ ] **Step 6: Verificar que nada más usaba `role`**

```bash
grep -rn "useAuth()" src/ | grep -i "role"
```
Esperado: solo `src/pages/Profile/Profile.jsx`. La Task 14 lo arregla. Si aparece otro archivo, ajustarlo acá.

- [ ] **Step 7: Commit**

```bash
git add src/contexts/AuthContext.jsx tests/unit/AuthContext.test.jsx tests/setup.js vitest.config.js package.json package-lock.json
git commit -m "fix: isAdmin desde el custom claim del token, no desde Firestore

El rol vivía en users/{uid}, un documento que el propio usuario puede
escribir. Ahora sale del token firmado por Google. De paso elimina una
lectura de Firestore por login y evita que un fallo de red deje la app
en pantalla blanca.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: `ProtectedRoute`

Hoy `/admin` y `/profile` se montan sin ningún guard: la protección está en un `useEffect` **dentro** de `AdminDashboard`, que corre después del primer render. O sea que el componente se monta, dispara `loadData()` contra Firestore, y recién entonces redirige.

**Files:**
- Create: `src/components/ProtectedRoute/ProtectedRoute.jsx`, `tests/unit/ProtectedRoute.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `useAuth()` de la Task 10 (`{ user, isAdmin, loading }`).
- Produces: `<ProtectedRoute />` y `<ProtectedRoute requireAdmin />` como rutas de layout con `<Outlet />`.

- [ ] **Step 1: Escribir el test que falla**

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const useAuthMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => useAuthMock() }));

const { default: ProtectedRoute } = await import("@/components/ProtectedRoute/ProtectedRoute");

function montar({ ruta = "/admin", auth }) {
  useAuthMock.mockReturnValue(auth);
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<p>pantalla de login</p>} />
        <Route path="/" element={<p>pantalla de inicio</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<p>pantalla de perfil</p>} />
        </Route>
        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="/admin" element={<p>panel de admin</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("NO expulsa a un admin mientras la sesión todavía está cargando", () => {
    // Review Focus #1: al refrescar /admin, AuthContext arranca con
    // loading:true y user:null. Decidir ahí echa a un admin válido.
    montar({ auth: { user: null, isAdmin: false, loading: true } });
    expect(screen.queryByText("pantalla de login")).not.toBeInTheDocument();
    expect(screen.queryByText("panel de admin")).not.toBeInTheDocument();
  });

  it("manda al login a un visitante no autenticado", () => {
    montar({ ruta: "/profile", auth: { user: null, isAdmin: false, loading: false } });
    expect(screen.getByText("pantalla de login")).toBeInTheDocument();
  });

  it("deja pasar a un usuario autenticado a una ruta que solo pide sesión", () => {
    montar({
      ruta: "/profile",
      auth: { user: { uid: "u1" }, isAdmin: false, loading: false },
    });
    expect(screen.getByText("pantalla de perfil")).toBeInTheDocument();
  });

  it("manda al inicio a un usuario autenticado que NO es admin", () => {
    montar({ auth: { user: { uid: "u1" }, isAdmin: false, loading: false } });
    expect(screen.getByText("pantalla de inicio")).toBeInTheDocument();
    expect(screen.queryByText("panel de admin")).not.toBeInTheDocument();
  });

  it("deja pasar al admin", () => {
    montar({ auth: { user: { uid: "max" }, isAdmin: true, loading: false } });
    expect(screen.getByText("panel de admin")).toBeInTheDocument();
  });

  it("no monta el componente protegido mientras carga (no dispara sus fetch)", () => {
    montar({ auth: { user: { uid: "max" }, isAdmin: true, loading: true } });
    expect(screen.queryByText("panel de admin")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
npm run test:unit
```
Esperado: FAIL — el módulo no existe.

- [ ] **Step 3: Crear el componente**

```jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import "./ProtectedRoute.css";

const ProtectedRoute = ({ requireAdmin = false }) => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  // Mientras la sesión no resolvió no se decide nada: decidir acá expulsaría
  // a un usuario válido que acaba de refrescar la página.
  if (loading) {
    return <div className="ruta-cargando">Verificando tu sesión...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ volverA: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
```

`replace` en vez de `push` para que el botón "atrás" no devuelva a la ruta prohibida. `state.volverA` queda disponible para que el login devuelva a donde la persona quería ir.

- [ ] **Step 4: Crear `src/components/ProtectedRoute/ProtectedRoute.css`**

```css
.ruta-cargando {
  display: grid;
  place-items: center;
  min-height: 50vh;
  color: var(--text-secondary);
}
```

- [ ] **Step 5: Correr y verificar que pasa**

```bash
npm run test:unit
```
Esperado: PASS, 11 tests acumulados.

- [ ] **Step 6: Envolver las rutas en `src/App.jsx`**

Agregar el import y reemplazar las dos rutas sueltas:

```jsx
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
```

```jsx
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
```

Las líneas `<Route path="/profile" .../>` y `<Route path="/admin" .../>` originales se borran. El resto de `App.jsx` no se toca.

- [ ] **Step 7: Verificación manual — la prueba que importa de verdad**

```bash
npm run dev
```

1. Entrar a `/admin` sin sesión → redirige al login.
2. Iniciar sesión con un usuario **sin** el claim → entrar a `/admin` → redirige al inicio.
3. Con sesión de admin, estando en `/admin`, **recargar la página (F5)** → tiene que quedarse en el panel. Si rebota al login, el chequeo de `loading` falló.
4. Con un usuario sin claim, en devtools forzar `isAdmin = true` en el estado de React, entrar al panel e **intentar borrar un producto** → la UI deja intentarlo y **Firestore lo rechaza**. Si el producto se borra, falló la Task 2 y no sirve de nada que el guard funcione.

El punto 4 es el que distingue un cartel de una puerta.

- [ ] **Step 8: Commit**

```bash
git add src/components/ProtectedRoute/ src/App.jsx tests/unit/ProtectedRoute.test.jsx
git commit -m "feat: ProtectedRoute para /admin y /profile

Antes la protección vivía en un useEffect dentro de AdminDashboard, que
corre después del primer render: el componente se montaba y disparaba sus
consultas a Firestore antes de redirigir.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Servicios de auth — verificación, reset y `displayName`

Cierra tres bugs que cuestan ventas: no hay forma de recuperar una contraseña olvidada, nadie verifica los emails, y la app muestra "Usuario" en vez del nombre real porque `updateProfile` nunca se llama.

**Files:**
- Modify: `src/services/firebase/authFirebase.js`

**Interfaces:**
- Consumes: `auth`, `db` de `@/utils/firebase`.
- Produces: `registerWithEmail(email, password, name)` (ahora con `updateProfile` + `sendEmailVerification`, y **sin escribir `role`**), `loginWithEmail`, `loginWithGoogle`, `logoutUser`, y nuevas: `enviarResetPassword(email)`, `reenviarVerificacion()`. **`getUserRole` se elimina** — no quedan consumidores después de la Task 10.

Firebase Auth manda estos mails por su cuenta: no hace falta servidor, ni Vercel, ni Resend. Solo el aviso de pedido necesita servidor, y ese es el subproyecto C.

- [ ] **Step 1: Reescribir `authFirebase.js`**

```js
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
// desde el cliente. El permiso de admin vive en un custom claim del token,
// asignado solo desde el servidor con scripts/set-admin.mjs.
const crearPerfil = (uid, datos) => setDoc(doc(db, "users", uid), {
  ...datos,
  createdAt: new Date().toISOString(),
});

export const registerWithEmail = async (email, password, name) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // Sin esto user.displayName queda en null para siempre y toda la app
  // muestra "Usuario" en lugar del nombre que la persona escribió.
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
```

Se van los `try/catch` que hacían `console.error(error)` y después `throw error`: no agregaban nada y volcaban el objeto de error de Firebase en la consola del cliente. El manejo de errores sube a la UI, que es la que puede mostrar algo útil — y es donde la Task 13 lo pone.

`getUserRole` se elimina: su único consumidor era `AuthContext`, que ya lee el claim.

- [ ] **Step 2: Verificar que no quedan consumidores de `getUserRole`**

```bash
grep -rn "getUserRole" src/
```
Esperado: **sin salida**. Si aparece algo, es un import que hay que limpiar en esta tarea.

- [ ] **Step 3: Verificar que compila**

```bash
npm run build && npm run lint
```
Esperado: build y lint en verde.

- [ ] **Step 4: Commit**

```bash
git add src/services/firebase/authFirebase.js
git commit -m "feat: verificación de email, reset de contraseña y displayName en el registro

El cliente deja de escribir el campo role (las reglas lo rechazan).
Elimina getUserRole, que ya no tiene consumidores.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Componentizar los formularios de auth

`Register.jsx` tiene 128 líneas con cuatro bloques `form-group` casi idénticos; `Login.jsx` tiene 100 con dos más. Esta tarea extrae las piezas reutilizables y agrega la política de contraseña, el mapa de errores y el link de recuperación.

**Files:**
- Create: `src/utils/validarPassword.js`, `src/constants/authErrors.js`, `src/components/common/FormField/FormField.jsx` + `.css`, `src/components/common/FormError/FormError.jsx` + `.css`, `src/components/auth/AuthCard/AuthCard.jsx` + `.css`, `src/components/auth/GoogleAuthButton/GoogleAuthButton.jsx` + `.css`, `src/components/auth/PasswordResetLink/PasswordResetLink.jsx` + `.css`, `tests/unit/validarPassword.test.js`, `tests/unit/authErrors.test.js`
- Modify: `src/pages/Auth/Register.jsx`, `src/pages/Auth/Login.jsx`

**Interfaces:**
- Consumes: `registerWithEmail`, `loginWithEmail`, `loginWithGoogle`, `enviarResetPassword` de la Task 12.
- Produces:
  - `validarPassword(password: string): string | null` — mensaje de error, o `null` si es válida.
  - `mensajeDeError(codigo: string): string` — texto en castellano para un código de Firebase.
  - `<FormField label id type value onChange required autoComplete />`
  - `<FormError mensaje />` — no renderiza nada si `mensaje` es falsy.
  - `<AuthCard titulo subtitulo>{children}</AuthCard>`
  - `<GoogleAuthButton texto onClick disabled />`
  - `<PasswordResetLink />`

- [ ] **Step 1: Escribir los tests de las dos funciones puras**

`tests/unit/validarPassword.test.js`

```js
import { describe, it, expect } from "vitest";
import { validarPassword } from "@/utils/validarPassword";

describe("validarPassword", () => {
  it("rechaza 7 caracteres", () => {
    expect(validarPassword("1234567")).toBeTruthy();
  });

  it("ACEPTA exactamente 8 caracteres", () => {
    // Review Focus #5: un `>` en lugar de `>=` rechaza una contraseña válida.
    expect(validarPassword("12345678")).toBeNull();
  });

  it("acepta 9 caracteres", () => {
    expect(validarPassword("123456789")).toBeNull();
  });

  it("rechaza una cadena vacía", () => {
    expect(validarPassword("")).toBeTruthy();
  });

  it("rechaza undefined sin explotar", () => {
    expect(validarPassword(undefined)).toBeTruthy();
  });

  it("devuelve un mensaje en castellano que menciona el mínimo", () => {
    expect(validarPassword("abc")).toContain("8");
  });

  it("no cuenta los espacios de los extremos como caracteres válidos", () => {
    expect(validarPassword("  abc   ")).toBeTruthy();
  });
});
```

`tests/unit/authErrors.test.js`

```js
import { describe, it, expect } from "vitest";
import { mensajeDeError } from "@/constants/authErrors";

describe("mensajeDeError", () => {
  it("explica que el email ya está en uso", () => {
    // Review Focus #3: hoy muestra "Error al registrarse. Inténtalo de nuevo."
    // y la persona reintenta con los mismos datos para siempre.
    const mensaje = mensajeDeError("auth/email-already-in-use");
    expect(mensaje).toMatch(/ya/i);
    expect(mensaje).not.toMatch(/int[eé]ntalo de nuevo/i);
  });

  it("explica que la contraseña es débil", () => {
    expect(mensajeDeError("auth/weak-password")).toMatch(/contrase/i);
  });

  it("explica que el email es inválido", () => {
    expect(mensajeDeError("auth/invalid-email")).toMatch(/email|correo/i);
  });

  it("no revela si una cuenta existe al fallar el login", () => {
    // Review Focus #4: mensajes distintos convierten el login en un
    // detector de cuentas. Los tres códigos dan el MISMO texto.
    const a = mensajeDeError("auth/user-not-found");
    const b = mensajeDeError("auth/wrong-password");
    const c = mensajeDeError("auth/invalid-credential");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("avisa de demasiados intentos", () => {
    expect(mensajeDeError("auth/too-many-requests")).toMatch(/intento/i);
  });

  it("da un mensaje genérico ante un código desconocido", () => {
    expect(mensajeDeError("auth/algo-que-no-existe")).toBeTruthy();
  });

  it("no explota con undefined", () => {
    expect(mensajeDeError(undefined)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
npm run test:unit
```
Esperado: FAIL — ninguno de los dos módulos existe.

- [ ] **Step 3: Crear `src/utils/validarPassword.js`**

```js
export const PASSWORD_MINIMO = 8;

export const validarPassword = (password) => {
  const valor = (password ?? "").trim();

  if (valor.length < PASSWORD_MINIMO) {
    return `La contraseña debe tener al menos ${PASSWORD_MINIMO} caracteres.`;
  }

  return null;
};
```

Firebase acepta 6 caracteres, así que sin esto "123456" pasa. El `.trim()` evita que ocho espacios cuenten como contraseña.

- [ ] **Step 4: Crear `src/constants/authErrors.js`**

```js
// Las credenciales inválidas comparten UN mensaje a propósito: distinguir
// "ese email no existe" de "la contraseña es incorrecta" convierte el
// formulario en un detector de cuentas registradas.
const CREDENCIAL_INVALIDA =
  "El email o la contraseña no son correctos.";

const MENSAJES = {
  "auth/email-already-in-use": "Ese email ya tiene una cuenta. Probá iniciar sesión.",
  "auth/invalid-email": "Ese email no tiene un formato válido.",
  "auth/weak-password": "La contraseña es demasiado débil. Usá al menos 8 caracteres.",
  "auth/user-not-found": CREDENCIAL_INVALIDA,
  "auth/wrong-password": CREDENCIAL_INVALIDA,
  "auth/invalid-credential": CREDENCIAL_INVALIDA,
  "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos y volvé a probar.",
  "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
  "auth/network-request-failed": "No pudimos conectarnos. Revisá tu conexión.",
};

export const mensajeDeError = (codigo) =>
  MENSAJES[codigo] ?? "No pudimos completar la operación. Probá de nuevo en un momento.";
```

- [ ] **Step 5: Correr y verificar que pasa**

```bash
npm run test:unit
```
Esperado: PASS, 25 tests acumulados.

- [ ] **Step 6: Crear los componentes chicos**

`src/components/common/FormField/FormField.jsx`

```jsx
import "./FormField.css";

const FormField = ({ label, id, type = "text", value, onChange, required = true, autoComplete, ayuda }) => (
  <div className="campo">
    <label htmlFor={id}>{label}</label>
    <input
      type={type}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      required={required}
      autoComplete={autoComplete}
    />
    {ayuda && <small className="campo-ayuda">{ayuda}</small>}
  </div>
);

export default FormField;
```

`src/components/common/FormField/FormField.css`

```css
.campo { display: flex; flex-direction: column; gap: 0.35rem; }
.campo label { font-size: 0.9rem; color: var(--text-secondary); }
.campo input {
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 8px;
  background: var(--bg-input, #fff);
  color: inherit;
  font: inherit;
}
.campo input:focus-visible { outline: 2px solid var(--accent-color, #c9a227); outline-offset: 1px; }
.campo-ayuda { font-size: 0.78rem; color: var(--text-secondary); }
```

`src/components/common/FormError/FormError.jsx`

```jsx
import "./FormError.css";

const FormError = ({ mensaje }) => {
  if (!mensaje) return null;
  return (
    <p className="form-error" role="alert">
      {mensaje}
    </p>
  );
};

export default FormError;
```

`src/components/common/FormError/FormError.css`

```css
.form-error {
  margin: 0;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  background: var(--danger-bg, #fdecea);
  color: var(--danger-color, #b3261e);
  font-size: 0.9rem;
}
```

`role="alert"` hace que un lector de pantalla anuncie el error cuando aparece, sin que la persona tenga que ir a buscarlo.

`src/components/auth/AuthCard/AuthCard.jsx`

```jsx
import "./AuthCard.css";

const AuthCard = ({ titulo, subtitulo, children }) => (
  <div className="auth-container">
    <div className="auth-card">
      <h2>{titulo}</h2>
      {subtitulo && <p className="auth-subtitulo">{subtitulo}</p>}
      {children}
    </div>
  </div>
);

export default AuthCard;
```

`src/components/auth/AuthCard/AuthCard.css`

```css
.auth-subtitulo { margin: 0 0 1.25rem; color: var(--text-secondary); }
```

Las clases `.auth-container` y `.auth-card` ya existen en `src/pages/Auth/Auth.css`, que se sigue importando desde las páginas. El rediseño visual de estas pantallas es el subproyecto F.

`src/components/auth/GoogleAuthButton/GoogleAuthButton.jsx`

```jsx
import "./GoogleAuthButton.css";

const LOGO = "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

const GoogleAuthButton = ({ texto, onClick, disabled = false }) => (
  <button type="button" className="auth-btn google-btn" onClick={onClick} disabled={disabled}>
    <img src={LOGO} alt="" aria-hidden="true" />
    {texto}
  </button>
);

export default GoogleAuthButton;
```

`src/components/auth/GoogleAuthButton/GoogleAuthButton.css`

```css
.google-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.6rem; }
.google-btn img { width: 18px; height: 18px; }
```

`alt=""` con `aria-hidden`: el logo es decorativo, el texto del botón ya dice "Continuar con Google". Un `alt="Google logo"` como el actual hace que el lector de pantalla lea "Google logo Continuar con Google".

- [ ] **Step 7: Crear `PasswordResetLink`**

`src/components/auth/PasswordResetLink/PasswordResetLink.jsx`

```jsx
import { useState } from "react";
import { enviarResetPassword } from "@/services/firebase/authFirebase";
import FormError from "@/components/common/FormError/FormError";
import "./PasswordResetLink.css";

// Mensaje único a propósito: confirmar que un email existe convertiría
// esto en un detector de cuentas registradas.
const CONFIRMACION =
  "Si ese email tiene una cuenta, te enviamos un link para restablecer la contraseña. Revisá tu correo.";

const PasswordResetLink = () => {
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await enviarResetPassword(email);
    } catch {
      // Se ignora a propósito: el mensaje es el mismo exista o no la cuenta.
    }
    setEstado(CONFIRMACION);
    setEnviando(false);
  };

  if (!abierto) {
    return (
      <button type="button" className="reset-link" onClick={() => setAbierto(true)}>
        ¿Olvidaste tu contraseña?
      </button>
    );
  }

  if (estado) return <FormError mensaje={estado} />;

  return (
    <form className="reset-form" onSubmit={enviar}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Tu email"
        aria-label="Email para restablecer la contraseña"
        required
      />
      <button type="submit" disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar link"}
      </button>
    </form>
  );
};

export default PasswordResetLink;
```

`src/components/auth/PasswordResetLink/PasswordResetLink.css`

```css
.reset-link {
  background: none; border: none; padding: 0;
  color: var(--accent-color, #c9a227);
  font-size: 0.88rem; cursor: pointer; text-decoration: underline;
}
.reset-form { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.reset-form input { flex: 1; padding: 0.6rem; border: 1px solid var(--border-color, #ccc); border-radius: 8px; }
```

El `catch` vacío es deliberado y está comentado: si mostrara el error, `auth/user-not-found` revelaría qué emails están registrados.

- [ ] **Step 8: Reescribir `Register.jsx` con los componentes nuevos**

```jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerWithEmail, loginWithGoogle } from "@/services/firebase/authFirebase";
import { mensajeDeError } from "@/constants/authErrors";
import { validarPassword, PASSWORD_MINIMO } from "@/utils/validarPassword";
import AuthCard from "@/components/auth/AuthCard/AuthCard";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton/GoogleAuthButton";
import FormField from "@/components/common/FormField/FormField";
import FormError from "@/components/common/FormError/FormError";
import "./Auth.css";

const Register = () => {
  const [datos, setDatos] = useState({ name: "", email: "", password: "", confirmar: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const ejecutar = async (accion) => {
    setCargando(true);
    setError("");
    try {
      await accion();
      navigate("/");
    } catch (err) {
      setError(mensajeDeError(err.code));
    } finally {
      setCargando(false);
    }
  };

  const registrar = (e) => {
    e.preventDefault();

    if (datos.password !== datos.confirmar) {
      return setError("Las contraseñas no coinciden.");
    }

    const errorPassword = validarPassword(datos.password);
    if (errorPassword) return setError(errorPassword);

    ejecutar(() => registerWithEmail(datos.email, datos.password, datos.name));
  };

  return (
    <AuthCard titulo="Crear una cuenta" subtitulo="Unite a nuestra tienda">
      <FormError mensaje={error} />

      <form onSubmit={registrar} className="auth-form">
        <FormField label="Nombre completo" id="name" value={datos.name} onChange={cambiar} autoComplete="name" />
        <FormField label="Email" id="email" type="email" value={datos.email} onChange={cambiar} autoComplete="email" />
        <FormField
          label="Contraseña"
          id="password"
          type="password"
          value={datos.password}
          onChange={cambiar}
          autoComplete="new-password"
          ayuda={`Mínimo ${PASSWORD_MINIMO} caracteres.`}
        />
        <FormField
          label="Confirmar contraseña"
          id="confirmar"
          type="password"
          value={datos.confirmar}
          onChange={cambiar}
          autoComplete="new-password"
        />

        <button type="submit" className="auth-btn" disabled={cargando}>
          {cargando ? "Creando tu cuenta..." : "Registrarse"}
        </button>
      </form>

      <div className="auth-divider"><span>o</span></div>

      <GoogleAuthButton
        texto="Continuar con Google"
        onClick={() => ejecutar(loginWithGoogle)}
        disabled={cargando}
      />

      <p className="auth-redirect">
        ¿Ya tenés una cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </AuthCard>
  );
};

export default Register;
```

De 128 líneas a ~75, con cuatro `useState` colapsados en uno, los cuatro bloques `form-group` repetidos reemplazados por `FormField`, y los dos `try/catch` idénticos unificados en `ejecutar`.

- [ ] **Step 9: Reescribir `Login.jsx`**

```jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "@/services/firebase/authFirebase";
import { mensajeDeError } from "@/constants/authErrors";
import AuthCard from "@/components/auth/AuthCard/AuthCard";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton/GoogleAuthButton";
import PasswordResetLink from "@/components/auth/PasswordResetLink/PasswordResetLink";
import FormField from "@/components/common/FormField/FormField";
import FormError from "@/components/common/FormError/FormError";
import "./Auth.css";

const Login = () => {
  const [datos, setDatos] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ProtectedRoute guarda a dónde quería ir la persona antes de rebotarla.
  const destino = location.state?.volverA ?? "/";

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const ejecutar = async (accion) => {
    setCargando(true);
    setError("");
    try {
      await accion();
      navigate(destino, { replace: true });
    } catch (err) {
      setError(mensajeDeError(err.code));
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthCard titulo="Iniciar sesión" subtitulo="Bienvenido de vuelta">
      <FormError mensaje={error} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ejecutar(() => loginWithEmail(datos.email, datos.password));
        }}
        className="auth-form"
      >
        <FormField label="Email" id="email" type="email" value={datos.email} onChange={cambiar} autoComplete="email" />
        <FormField label="Contraseña" id="password" type="password" value={datos.password} onChange={cambiar} autoComplete="current-password" />

        <PasswordResetLink />

        <button type="submit" className="auth-btn" disabled={cargando}>
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div className="auth-divider"><span>o</span></div>

      <GoogleAuthButton
        texto="Continuar con Google"
        onClick={() => ejecutar(loginWithGoogle)}
        disabled={cargando}
      />

      <p className="auth-redirect">
        ¿No tenés cuenta? <Link to="/register">Registrate</Link>
      </p>
    </AuthCard>
  );
};

export default Login;
```

Usa `location.state.volverA` que dejó `ProtectedRoute`: quien quiso entrar a `/admin` y fue rebotado al login, después de autenticarse va a `/admin` y no al inicio.

- [ ] **Step 10: Verificar build, lint y tests**

```bash
npm run build && npm run lint && npm run test:unit
```
Esperado: los tres en verde.

- [ ] **Step 11: Verificación manual del flujo de mails**

```bash
npm run dev
```

1. Registrarse con un email real → tiene que llegar el mail de verificación de Firebase.
2. Registrarse con **ese mismo email** → el error dice "Ese email ya tiene una cuenta", no el genérico.
3. Intentar registrarse con contraseña de 7 caracteres → lo rechaza antes de llamar a Firebase.
4. En el login, click en "¿Olvidaste tu contraseña?" con un email **que no existe** → muestra la confirmación genérica, **no** "ese email no está registrado".
5. Lo mismo con un email que sí existe → misma confirmación, y llega el mail de reset.
6. Confirmar que el nombre real aparece en el navbar y el perfil, no "Usuario".

- [ ] **Step 12: Commit**

```bash
git add src/components/common/FormField/ src/components/common/FormError/ src/components/auth/ src/utils/validarPassword.js src/constants/authErrors.js src/pages/Auth/ tests/unit/validarPassword.test.js tests/unit/authErrors.test.js
git commit -m "feat: componentizar los formularios de auth, política de contraseña y reset

Register pasa de 128 a ~75 líneas y Login de 100 a ~70 extrayendo
FormField, FormError, AuthCard, GoogleAuthButton y PasswordResetLink.
Los errores de Firebase se traducen a castellano, y las credenciales
inválidas comparten un único mensaje para no filtrar qué emails
están registrados.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: `Profile` sin side-effects en el render

`src/pages/Profile/Profile.jsx:14` llama `navigate()` en el cuerpo del componente. Es un side-effect durante el render: React lo advierte y en modo concurrente es impredecible. Con `ProtectedRoute` ya montado, esas líneas no tienen razón de existir.

**Files:**
- Modify: `src/pages/Profile/Profile.jsx`
- Create: `src/components/auth/VerificacionPendiente/VerificacionPendiente.jsx` + `.css`

**Interfaces:**
- Consumes: `useAuth()` de la Task 10 (`{ user, isAdmin }` — ya no hay `role`); `reenviarVerificacion` de la Task 12.
- Produces: `<VerificacionPendiente />`, reutilizable desde el checkout en el subproyecto B.

- [ ] **Step 1: Crear `VerificacionPendiente`**

```jsx
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { reenviarVerificacion } from "@/services/firebase/authFirebase";
import "./VerificacionPendiente.css";

const VerificacionPendiente = () => {
  const { user } = useAuth();
  const [estado, setEstado] = useState(null);

  // Los usuarios de Google llegan con el email ya verificado por Google.
  if (!user || user.emailVerified) return null;

  const reenviar = async () => {
    try {
      await reenviarVerificacion();
      setEstado("Te reenviamos el mail. Revisá tu correo.");
    } catch {
      setEstado("No pudimos reenviarlo. Esperá unos minutos y probá de nuevo.");
    }
  };

  return (
    <div className="verificacion-pendiente" role="status">
      <p>Tu email todavía no está verificado. Vas a necesitarlo para enviar un pedido.</p>
      {estado ? <p className="verificacion-estado">{estado}</p> : (
        <button type="button" onClick={reenviar}>Reenviar el mail de verificación</button>
      )}
    </div>
  );
};

export default VerificacionPendiente;
```

`src/components/auth/VerificacionPendiente/VerificacionPendiente.css`

```css
.verificacion-pendiente {
  padding: 0.9rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--warning-color, #d9a406);
  background: var(--warning-bg, #fff8e1);
  color: var(--warning-text, #6b4e00);
  font-size: 0.9rem;
}
.verificacion-pendiente p { margin: 0 0 0.5rem; }
.verificacion-estado { font-weight: 600; }
.verificacion-pendiente button {
  background: none; border: none; padding: 0;
  color: inherit; text-decoration: underline; cursor: pointer; font: inherit;
}
```

El texto dice **para qué** sirve verificar ("vas a necesitarlo para enviar un pedido"), que es la decisión del spec: la verificación no bloquea navegar ni armar el carrito, solo enviar el pedido.

- [ ] **Step 2: Reescribir `Profile.jsx`**

```jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser } from "@/services/firebase/authFirebase";
import { useTheme } from "@/contexts/ThemeContext";
import VerificacionPendiente from "@/components/auth/VerificacionPendiente/VerificacionPendiente";
import "./Profile.css";

const Profile = () => {
  // ProtectedRoute garantiza que hay sesión: acá no hace falta chequearlo
  // ni redirigir, que es lo que hacía este componente durante el render.
  const { user, isAdmin } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const navigate = useNavigate();

  const salir = async () => {
    await logoutUser();
    navigate("/");
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>Mi Perfil</h2>

        <VerificacionPendiente />

        <div className="profile-info">
          <div className="info-group">
            <span className="info-label">Nombre:</span>
            <span className="info-value">{user.displayName || "Sin nombre"}</span>
          </div>
          <div className="info-group">
            <span className="info-label">Email:</span>
            <span className="info-value">{user.email}</span>
          </div>
          <div className="info-group">
            <span className="info-label">Rol:</span>
            <span className="info-value profile-role">
              {isAdmin ? "Administrador" : "Comprador"}
            </span>
          </div>
          <div className="info-group">
            <span className="info-label">Tema:</span>
            <div className="info-value">
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value)}
                className="theme-select"
                aria-label="Tema de la interfaz"
              >
                <option value="system">Sistema (Automático)</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>
          </div>
        </div>

        <button className="logout-btn" onClick={salir}>Cerrar Sesión</button>
      </div>
    </div>
  );
};

export default Profile;
```

Se van el `if (loading)`, el `if (!user) navigate(...)` y el uso de `role`: lo primero y lo segundo los cubre `ProtectedRoute`, y el rol ahora sale de `isAdmin`.

- [ ] **Step 3: Verificar build y lint**

```bash
npm run build && npm run lint
```

- [ ] **Step 4: Verificación manual**

```bash
npm run dev
```

1. Con sesión no verificada, entrar al perfil → aparece el aviso con el botón de reenviar.
2. Click en reenviar → llega el mail y el aviso cambia a confirmación.
3. Verificar el email desde el link, **cerrar sesión y volver a entrar** → el aviso desaparece.
4. Entrar con Google → el aviso no aparece nunca (Google ya verificó el email).
5. Confirmar que la consola del navegador **no** tira la advertencia de React sobre actualizar estado durante el render.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Profile/Profile.jsx src/components/auth/VerificacionPendiente/
git commit -m "fix: sacar navigate() del render de Profile y avisar si falta verificar el email

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Desplegar las reglas y escribir el runbook de la consola

Último paso, y el único con efecto en producción. Hay cosas que no se pueden resolver con código del repo porque viven en la consola de Firebase y de Google Cloud.

**Files:**
- Create: `docs/runbook-seguridad-consola.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `scripts/set-admin.mjs`.
- Produces: reglas desplegadas en producción y un checklist verificable de lo que queda por hacer a mano.

- [ ] **Step 1: Correr la suite completa antes de tocar producción**

```bash
npm test
```
Esperado: todo en verde — 58 tests de reglas y 25 unitarios. **Si algo falla, no desplegar.**

- [ ] **Step 2: Asignar el claim de admin ANTES de endurecer las reglas**

El orden es crítico. Si las reglas se despliegan primero y el claim falla, nadie puede administrar nada.

```bash
npm run set-admin -- tucorreo@ejemplo.com
```

Después **cerrar sesión y volver a entrar** en la app, ir a `/admin` y confirmar que entra. Verificación en la consola del navegador:

```js
await firebase.auth().currentUser.getIdTokenResult()
// claims.admin tiene que ser true
```

- [ ] **Step 3: Desplegar reglas e índices**

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

No requiere plan Blaze. El índice puede tardar unos minutos en construirse: hasta que termine, el filtro por categoría puede devolver un error con un link — es temporal.

- [ ] **Step 4: Verificar en producción**

1. Navegar el catálogo sin sesión → los productos se ven.
2. Filtrar por categoría → anda (si no, el índice todavía se está construyendo).
3. Con sesión de admin, entrar a `/admin` → ve productos, pedidos y mensajes.
4. Crear, editar y borrar un producto de prueba → funciona.
5. Subir una imagen de producto → funciona.
6. **Con un usuario sin el claim**, en la consola del navegador:

```js
// Tiene que fallar con "Missing or insufficient permissions"
await updateDoc(doc(db, "users", auth.currentUser.uid), { role: "admin" });
```

7. Enviar un pedido de prueba desde el carrito → se crea.
8. Enviar un mensaje de contacto sin sesión → se crea.

Si el punto 6 **no** falla, la Task 3 no quedó desplegada: revisar antes de seguir.

- [ ] **Step 5: Escribir `docs/runbook-seguridad-consola.md`**

```markdown
# Runbook — endurecimiento de la consola

Lo que no se puede resolver con código del repo. Cada punto se verifica.

## 1. Restringir la API key por dominio

La API key de Firebase es pública por diseño (viaja en el bundle). Lo que no
puede quedar abierto es desde qué dominios se la acepta.

- [ ] Google Cloud Console → APIs y servicios → Credenciales
- [ ] Elegir la clave del navegador → Restricciones de aplicación → Sitios web
- [ ] Agregar solo: `localhost`, el dominio de producción, y los previews de Vercel
- [ ] Verificar: pegar la key en un HTML servido desde otro dominio → debe fallar

## 2. App Check

Garantiza que los pedidos vienen de tu app y no de un script.

- [ ] Firebase Console → App Check → registrar la app web con reCAPTCHA v3
- [ ] Dejarlo en **modo monitoreo** al menos una semana antes de exigirlo
- [ ] Revisar las métricas: si hay tráfico legítimo rechazado, no exigir todavía
- [ ] Recién después: exigir App Check para Firestore y Storage

El modo monitoreo primero no es opcional. Exigirlo de entrada corta clientes reales.

## 3. Dominios autorizados de Auth

- [ ] Firebase Console → Authentication → Settings → Dominios autorizados
- [ ] Borrar los que no uses
- [ ] Agregar el dominio propio cuando se compre (subproyecto D)

## 4. Política de contraseñas de Auth

- [ ] Authentication → Settings → Password policy
- [ ] Mínimo 8 caracteres, para que coincida con `src/utils/validarPassword.js`

La validación del cliente se puede saltear; esta es la que manda.

## 5. Plantillas de mail

Hoy los mails de verificación y de reset llegan con texto genérico de Google,
en inglés y sin tu marca. Para una tienda que quiere verse profesional, eso
es lo primero que ve un cliente nuevo.

- [ ] Authentication → Templates → Verificación de email: traducir y firmar
- [ ] Authentication → Templates → Restablecer contraseña: traducir y firmar
- [ ] Cambiar el nombre del remitente
- [ ] Mandarse los dos mails a uno mismo y leerlos

## 6. Credencial del Admin SDK

- [ ] Configuración del proyecto → Cuentas de servicio → Generar clave privada
- [ ] Guardarla como `serviceAccount.json` en la raíz
- [ ] Verificar: `git status --short serviceAccount.json` no debe imprimir nada
- [ ] Si alguna vez se filtra: revocarla en Google Cloud Console → IAM → Cuentas de servicio

## 7. Después de cada cambio de reglas

- [ ] `npm test` en verde
- [ ] `npx firebase deploy --only firestore:rules,firestore:indexes,storage:rules`
- [ ] Probar los 8 puntos de verificación de la Task 15, Step 4

## Lo que sigue abierto hasta el subproyecto B

El total de cada pedido lo calcula el navegador del cliente y las reglas no
pueden revalidarlo (exigiría una lectura por ítem y el límite son 10 por
evaluación). **Hasta que exista `api/crear-orden`, tratá el total de cada
pedido como declarado por el cliente y verificalo al contactar.**
```

- [ ] **Step 6: Documentar los comandos nuevos en el README**

El README actual apunta a `github.com/maxdrag0/react-coder` y se corta después del `git clone`: no documenta `npm install`, ni `npm run dev`, ni las variables de entorno. Arreglarlo entero es el subproyecto D; acá solo se agrega lo que esta etapa introdujo.

Agregar al final del `README.md`:

```markdown
## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el frontend |
| `npm test` | Tests unitarios + de reglas de seguridad |
| `npm run test:unit` | Solo los unitarios (rápido, sin emulador) |
| `npm run test:rules` | Reglas de Firestore y Storage contra el emulador |
| `npm run set-admin -- <email>` | Da permisos de admin a un usuario |
| `npm run seed` | Carga el catálogo inicial en Firestore (una sola vez) |

## Seguridad

Las reglas de Firestore y Storage están en `firestore.rules` y `storage.rules`,
bajo test en `tests/rules/`. **No editarlas sin correr `npm test`.**

El permiso de admin es un custom claim del token de Firebase Auth, no un campo
de la base. Se asigna con `npm run set-admin`. Después de asignarlo hay que
cerrar sesión y volver a entrar: los tokens duran una hora.

Pasos manuales de la consola: `docs/runbook-seguridad-consola.md`.
```

- [ ] **Step 7: Commit**

```bash
git add docs/runbook-seguridad-consola.md README.md
git commit -m "docs: runbook de endurecimiento de la consola y comandos de la etapa

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verificación final de la rama

Antes de cerrar el subproyecto A, con todas las tareas hechas:

- [ ] `npm test` — 83 tests en verde
- [ ] `npm run build` — sin errores
- [ ] `npm run lint` — sin errores
- [ ] `grep -rn "sembrarProductos\|getUserRole\|InicializarBaseDeDatos" src/` — sin salida
- [ ] `git status --short serviceAccount.json` — sin salida
- [ ] Los 8 puntos de verificación en producción de la Task 15, Step 4
- [ ] **La prueba que decide si esto sirvió:** con un usuario sin claim, forzar `isAdmin = true` en devtools, entrar a `/admin`, intentar borrar un producto. La UI deja intentarlo; Firestore lo rechaza. Si el producto se borra, el subproyecto A falló, sin importar cuántos tests estén verdes.
