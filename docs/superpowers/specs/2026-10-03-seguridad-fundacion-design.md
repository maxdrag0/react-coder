# Spec — Subproyecto A: Fundación de seguridad

**Fecha:** 2026-10-03
**Estado:** pendiente de revisión
**Decidido previamente:** backend en Vercel Functions (ver `docs/backend-vercel-explicacion.md`)

---

## 1. Objetivo final del producto (contexto, no alcance de este spec)

Tienda de fuegos artificiales donde:

- **Max** sube y gestiona productos, precios y **promociones** desde su cuenta, y
  gestiona los pedidos entrantes.
- **El cliente** se registra, navega el catálogo, arma el carrito, ve el total, y envía
  sus datos junto con la orden para que Max lo contacte.
- **No hay pasarela de pago.** El entregable del checkout es que a Max le llegue el
  pedido por mail y lo vea en su panel. El pago se coordina a mano.

Este spec **no construye nada de eso.** Construye el piso sobre el que se apoya.

## 2. Por qué este subproyecto va primero

Hoy el rol de administrador vive en el documento `users/{uid}` de Firestore, que el
propio usuario puede escribir, y `src/contexts/AuthContext.jsx` lo lee de ahí para
decidir `isAdmin`. Dos consecuencias:

1. Cualquier cliente registrado puede intentar ascenderse a admin desde la consola del
   navegador.
2. Todo lo que construyamos encima —panel de gestión, promociones, API de órdenes—
   hereda ese permiso falsificable. Construir B a F antes que A significa construirlo
   sobre una autorización que no vale nada.

Además, no existen `firestore.rules` ni `storage.rules` en el repo. En una app
client-only las reglas **son** el backend: todo lo que hace `src/services/firebase/*` lo
ejecuta el navegador directo contra la base. Sin reglas versionadas no hay revisión, ni
historial, ni rollback de la única capa de autorización que existe.

## 3. Criterios de éxito

Al terminar A, todo esto debe ser verdad:

1. Un usuario autenticado **no puede** modificar su propio campo `role`, ni crear un
   documento de usuario con `role` incluido.
2. Un usuario autenticado **no puede** leer los pedidos de otro usuario. Solo ve los
   propios; Max ve todos.
3. Un usuario no-admin **no puede** crear, editar ni borrar productos, ni borrar
   mensajes de contacto, ni leer la colección de mensajes — **verificado contra
   Firestore**, no contra la UI.
4. El permiso de admin es un *custom claim* firmado por Google, imposible de modificar
   desde el cliente. Forzar `isAdmin = true` en devtools cambia lo que se ve en pantalla
   pero Firestore sigue rechazando cada escritura.
5. Las rutas `/admin` y `/profile` no montan su componente si el usuario no corresponde.
6. Las reglas de Firestore y Storage están en el repo, en git, y se despliegan con un
   comando reproducible.
7. Un usuario que se registra recibe un mail de verificación; un usuario que olvidó su
   contraseña puede recuperarla.
8. El nombre que la persona escribe al registrarse aparece en la app (hoy siempre dice
   "Usuario").
9. El botón "Subir Catálogo a Firestore" ya no existe en el bundle público.

## 4. Alcance

### Entra

| # | Cambio | Cierra |
|---|---|---|
| A1 | `firestore.rules`, `storage.rules`, `firebase.json`, `firestore.indexes.json` versionados | Hallazgos 1, 5, 6, 8 |
| A2 | Rol de admin a custom claims + script de asignación | Hallazgo 2 |
| A3 | `<ProtectedRoute>` para `/admin` y `/profile` | Hallazgos 3, 17 |
| A4 | Eliminar `InicializarBaseDeDatos.jsx`; seed como script de Node con Admin SDK | Hallazgo 7 |
| A5 | Verificación de email + reset de contraseña + política de contraseña + `updateProfile` | Hallazgo 9 |
| A6 | Runbook de endurecimiento de la consola de Firebase/GCP | Hallazgo 10 |
| A7 | Eliminar `temp_products.js` | Hallazgo 23 (parcial) |

### No entra (y a dónde va)

| Queda fuera | Subproyecto |
|---|---|
| Revalidación de precios y descuento de stock en servidor | **B** |
| Promociones y descuentos | **B** (cálculo) + **E** (gestión) |
| Mail de aviso de pedido a Max | **C** |
| `base: "/"`, `vercel.json`, dominio, SEO, favicon, README | **D** |
| Partir el `AdminDashboard` de 442 líneas, estados de pedido | **E** |
| Rediseño visual, carrito persistente, gate de edad, legales | **F** |
| Unificar el doble esquema `name\|\|nombre`, `price\|\|precioUnitario` | **E** (necesita migración de datos) |

## 5. Riesgo residual aceptado al cerrar A

**Esto hay que leerlo, no es un detalle.**

El checkout actual (`src/pages/Carrito/Carrito.jsx`) crea la orden desde el navegador con
`items` y `total` calculados en el cliente. La forma correcta de cerrarlo es que solo el
servidor pueda escribir en `compras` — pero eso **rompe el checkout** hasta que exista la
API de B.

Las reglas de Firestore no pueden resolverlo: validar precios exigiría un `get()` por
cada ítem del carrito, y las reglas están limitadas a 10 lecturas por request.

Decisión: en A, `compras` acepta creación del cliente **solo si** el `buyer.uid` coincide
con el usuario autenticado y la forma del documento es válida (tipos y tamaños). Eso cierra
"cualquiera escribe pedidos" y "cualquiera lee los pedidos de todos", pero **la
manipulación de precios sigue abierta hasta B**. En B la regla pasa a `create: if false`
y la escritura queda exclusivamente en manos del Admin SDK.

Mientras dure esa ventana: Max debe tratar el `total` de cada pedido como *declarado por
el cliente*, no como verdad. Hay que verificarlo al contactar. Esto es una mitigación de
proceso, no técnica, y es la razón principal para que B venga inmediatamente después.

## 6. Diseño

### A1 — Reglas versionadas

Cuatro archivos nuevos en la raíz:

- `firebase.json` — declara dónde están las reglas y los índices.
- `firestore.rules` — autorización de la base.
- `storage.rules` — autorización de archivos.
- `firestore.indexes.json` — el índice compuesto que necesita `obtenerProductos`
  (`where("category","in",[...])` junto a `orderBy("__name__")` requiere índice, y hoy
  no está declarado en ningún lado).

Forma de `firestore.rules`, con helpers para que cada colección se lea de un vistazo:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isAdmin()    { return isSignedIn() && request.auth.token.admin == true; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    // Catálogo: lectura pública, escritura solo admin.
    match /products/{id} {
      allow read:  if true;
      allow write: if isAdmin();
    }

    // Promociones: preparado para el subproyecto B/E. Mismo criterio.
    match /promociones/{id} {
      allow read:  if true;
      allow write: if isAdmin();
    }

    // Usuarios: cada uno ve y edita su perfil, pero NUNCA su rol.
    match /users/{uid} {
      allow read:   if isOwner(uid) || isAdmin();
      allow create: if isOwner(uid) && !('role' in request.resource.data);
      allow update: if isAdmin() ||
                       (isOwner(uid)
                        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']));
      allow delete: if isAdmin();
    }

    // Pedidos: cada cliente ve los suyos; Max ve todos.
    // create del cliente es TEMPORAL — ver sección 5.
    match /compras/{id} {
      allow read:   if isAdmin() || (isSignedIn() && resource.data.buyer.uid == request.auth.uid);
      allow create: if isSignedIn()
                    && request.resource.data.buyer.uid == request.auth.uid
                    && request.resource.data.total is number
                    && request.resource.data.total >= 0
                    && request.resource.data.items is list
                    && request.resource.data.items.size() > 0
                    && request.resource.data.items.size() <= 50;
      allow update, delete: if isAdmin();
    }

    // Mensajes de contacto: cualquiera escribe, solo Max lee.
    match /mensajes/{id} {
      allow read:   if isAdmin();
      allow create: if request.resource.data.mensaje is string
                    && request.resource.data.mensaje.size() <= 2000;
      allow update, delete: if isAdmin();
    }

    // Todo lo demás, cerrado. Una colección nueva nace negada, no abierta.
    match /{document=**} { allow read, write: if false; }
  }
}
```

Dos decisiones que vale la pena justificar:

- **`match /{document=**} { allow read, write: if false; }` al final.** Hace que el
  default del sistema sea negar. Si mañana agregamos una colección y nos olvidamos de la
  regla, queda cerrada en vez de abierta. Es la diferencia entre fallar seguro y fallar
  abierto.
- **`mensajes` permite `create` sin estar autenticado**, porque el formulario de contacto
  es público. Eso habilita spam. Se acota con el límite de tamaño ahora, y con rate
  limiting en `api/contacto` cuando llegue C. Alternativa descartada: exigir login para
  contactar, porque pierde consultas de gente que todavía no se registró.

`storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{file} {
      allow read: if true;
      allow write: if request.auth.token.admin == true
                   && (
                        (request.resource.contentType.matches('image/.*')
                         && request.resource.size < 5 * 1024 * 1024)
                        ||
                        (request.resource.contentType.matches('video/.*')
                         && request.resource.size < 50 * 1024 * 1024)
                      );
    }
    match /{allPaths=**} { allow read, write: if false; }
  }
}
```

El `accept="image/*,video/*"` del formulario de admin es solo el selector del navegador y
no valida nada; el límite real tiene que estar acá. Los dos umbrales son distintos porque
5 MB no alcanza para video y 50 MB es demasiado para una foto de producto.

**Despliegue:** `firebase deploy --only firestore:rules,storage:rules`. Queda documentado
en el README de la etapa D. No requiere plan Blaze.

### A2 — Rol de admin a custom claims

Tres piezas.

**1. Script de asignación** — `scripts/set-admin.mjs`, corre en tu máquina con el Admin
SDK y una service account. Toma el **email** y resuelve el uid por su cuenta, porque el
uid hay que ir a buscarlo a la consola y el email ya lo sabés:

```bash
npm run set-admin -- tucorreo@ejemplo.com
```

Se corre una vez para tu usuario. Requiere bajar la service account de la consola de
Firebase (paso manual, documentado en A6). El archivo de credencial **no** va al repo:
entra en `.gitignore` junto a `.env`.

**2. `AuthContext` lee el claim del token, no de Firestore.** Hoy hace una lectura de
Firestore por sesión para saber el rol. Pasa a leerlo del token, que el cliente ya tiene:

```js
const token = await currentUser.getIdTokenResult();
setIsAdmin(token.claims.admin === true);
```

Efecto lateral bueno: se elimina una lectura de Firestore por login.

**3. Refresco del token.** Un claim recién asignado no aparece en el token que el usuario
ya tiene en la mano — los tokens duran una hora. Hay que forzar
`getIdToken(true)` o cerrar y volver a abrir sesión. Es la causa número uno de
"le puse el claim y no funciona", así que va documentado en el script y en el runbook.

**Modelo de roles (decidido por el dueño del proyecto):** hay exactamente dos y **el
campo `role` desaparece del modelo de datos**. Con el claim `admin` en el token sos
soporte/dueño; sin el claim sos comprador. El usuario que se registra no completa ningún
rol porque no hay nada que completar: comprador es el default por ausencia.

Esto es más simple y más seguro que mantener un campo espejo: no hay dos fuentes de
verdad que puedan desincronizarse. Las reglas igual rechazan cualquier escritura de
`role` desde el cliente, como defensa en profundidad para que el campo no vuelva a
aparecer por la ventana. `Profile` muestra "Administrador" o "Comprador" derivándolo de
`isAdmin`.

### A3 — `ProtectedRoute`

Componente nuevo, `src/components/ProtectedRoute/ProtectedRoute.jsx`:

```jsx
<Route element={<ProtectedRoute />}>
  <Route path="/profile" element={<Profile />} />
</Route>
<Route element={<ProtectedRoute requireAdmin />}>
  <Route path="/admin" element={<AdminDashboard />} />
</Route>
```

Usa `<Outlet />` y `<Navigate replace />`. Tres estados: `loading` → no decide todavía;
autorizado → renderiza; no autorizado → redirige.

Por qué importa la diferencia con lo de hoy: el `useEffect` dentro de `AdminDashboard`
corre **después** del primer render, así que el componente se monta, dispara
`loadData()` y recién entonces redirige. Con `ProtectedRoute` el componente nunca se
monta. Aun así, la defensa real son las reglas: esto es corrección de UX y de fugas de
datos en pantalla, no la autorización.

De paso se arregla `src/pages/Profile/Profile.jsx:14`, que hoy llama `navigate()` durante
el render — un side-effect en el cuerpo del componente, que React advierte y que en modo
concurrente es impredecible. Al moverse la decisión a `ProtectedRoute`, esas líneas
desaparecen.

### A4 — Sacar el seed del navegador

`src/components/InicializarBaseDeDatos.jsx` se borra. Su propio código dice *"Zona de
Admin (Borrar después)"*. `sembrarProductos()` sale de
`src/services/firebase/productosFirebase.js` y se convierte en
`scripts/seed-productos.mjs`, con el Admin SDK, leyendo de `src/constants/products.js`.

Razón: es una operación de una sola vez que no tiene ninguna razón para existir en código
que se le descarga a cada visitante.

### A5 — Mails de autenticación (sin necesitar Vercel)

Esto es lo que hace que A entregue funcionalidad visible y no solo cerrojos.

Firebase Auth **ya manda mails** de verificación y de recuperación de contraseña por su
cuenta. No necesita servidor, ni Vercel, ni Resend. Son dos llamadas del SDK de cliente:

- `sendEmailVerification(user)` después del registro.
- `sendPasswordResetEmail(auth, email)` desde un link "Olvidé mi contraseña" en el login,
  que hoy no existe.

Solo el mail de **aviso de pedido a Max** necesita servidor, y ese es el subproyecto C.

Además:

- **`updateProfile(user, { displayName: name })`** en el registro. Hoy nunca se llama, y
  por eso `user.displayName` es siempre `null` y la app entera muestra "Usuario" — el
  nombre se guarda en Firestore pero nunca en Auth.
- **Política de contraseña.** Hoy `Register.jsx` solo valida que las dos coincidan, así
  que "123456" pasa porque Firebase acepta 6 caracteres. Mínimo 8 con validación propia
  y mensajes de error en castellano.
- **Mensajes de error reales.** Hoy cualquier fallo del registro muestra "Error al
  registrarse. Inténtalo de nuevo." Hay que mapear los códigos de Firebase
  (`auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`) a texto útil.

Decisión de diseño: **la verificación de email no bloquea la navegación ni el carrito.**
Se pide verificar antes de **enviar un pedido**. Bloquear antes perjudica la conversión
sin ganar seguridad; el punto donde la identidad importa es cuando Max va a invertir
tiempo en contactar a esa persona.

### A6 — Runbook de la consola

Hay cosas que no se pueden resolver con código del repo porque viven en la consola de
Firebase y de Google Cloud. Van como checklist verificable en
`docs/runbook-seguridad-consola.md`:

1. Restringir la API key por HTTP referrer en Google Cloud Console.
2. Activar **App Check** para Firestore y Storage.
3. Revisar los dominios autorizados en Firebase Auth (sacar los que no uses).
4. Habilitar la política de contraseñas de Firebase Auth si está disponible en tu plan.
5. Bajar la service account para los scripts y confirmar que quedó fuera de git.
6. Personalizar las plantillas de mail de Auth (hoy llegan con texto genérico de Google,
   en inglés, y sin tu marca).

Es un documento con casillas, no prosa: cada punto se puede verificar.

## 7. Qué se toca

**Nuevos**

```
firebase.json
firestore.rules
firestore.indexes.json
storage.rules
scripts/set-admin.mjs
scripts/seed-productos.mjs
src/components/ProtectedRoute/ProtectedRoute.jsx
docs/runbook-seguridad-consola.md
```

**Modificados**

```
src/contexts/AuthContext.jsx          claim del token en vez de lectura de Firestore
src/App.jsx                           rutas envueltas en ProtectedRoute
src/pages/Auth/Register.jsx           updateProfile, verificación, política, errores
src/pages/Auth/Login.jsx              link de "olvidé mi contraseña", errores
src/pages/Profile/Profile.jsx         sacar el navigate() del render
src/services/firebase/authFirebase.js verificación, reset, sin escribir role
src/services/firebase/productosFirebase.js  sacar sembrarProductos
.gitignore                            service account
package.json                          firebase-admin como devDependency
```

**Borrados**

```
src/components/InicializarBaseDeDatos.jsx
temp_products.js
```

## 8. Cómo se verifica

Las reglas de Firestore son código, y código sin probar es código roto. Se prueban con el
**emulador de Firebase** (`@firebase/rules-unit-testing`), que corre local y gratis.

Casos que tienen que pasar, escritos como tests y no como clicks:

| Caso | Esperado |
|---|---|
| anónimo lee `products` | permitido |
| anónimo escribe `products` | denegado |
| cliente autenticado escribe `products` | denegado |
| admin escribe `products` | permitido |
| cliente se pone `role: "admin"` en su propio doc | **denegado** |
| cliente crea su doc con `role` incluido | **denegado** |
| cliente lee la compra de otro uid | **denegado** |
| cliente lee su propia compra | permitido |
| admin lee todas las compras | permitido |
| cliente lee `mensajes` | denegado |
| anónimo crea un mensaje de 3000 caracteres | denegado |
| escritura en una colección no declarada | denegado |
| no-admin sube a Storage | denegado |
| admin sube una imagen de 8 MB | denegado |
| admin sube una imagen de 2 MB | permitido |
| admin sube un `.exe` | denegado |

Más una verificación manual que ningún test cubre: **forzar `isAdmin = true` en devtools,
entrar a `/admin`, e intentar borrar un producto.** La UI tiene que dejarte intentarlo y
Firestore tiene que rechazarlo. Si el producto se borra, A falló, y no importa cuántos
tests estén verdes.

## 9. Riesgos de la ejecución

| Riesgo | Mitigación |
|---|---|
| Desplegar reglas y romper la app en producción | Probar primero en el emulador; desplegar en una ventana en la que se pueda revisar |
| Perder el acceso de admin (claim mal puesto) | Correr `set-admin.mjs` y confirmar con `getIdTokenResult()` **antes** de endurecer las reglas |
| El claim no aparece tras asignarlo | Documentado: el token dura una hora, hay que forzar refresh o reloguear |
| El índice compuesto falta y el filtro por categoría deja de andar | `firestore.indexes.json` se despliega junto con las reglas |
| Filtrar la service account | Entra en `.gitignore` en el mismo commit en que se crea el script |

## 10. Después de A

Orden propuesto, a confirmar al terminar:

**B** — `api/` en Vercel: órdenes con precio revalidado, stock en transacción, y el motor
de **promociones** (un descuento calculado en el cliente es un descuento falsificable,
así que vive acá desde el día uno). Cierra el riesgo residual de la sección 5.

**C** — Mail de aviso de pedido a Max, desde servidor.

**D** — `base: "/"`, `vercel.json`, dominio, SEO, favicon, README.

**E** — Panel de gestión: partir las 442 líneas del `AdminDashboard`, estados de pedido,
numeración legible, gestión de promociones, unificar el doble esquema de campos.

**F** — Rediseño visual, carrito persistente, gate de edad y legales de pirotecnia.
