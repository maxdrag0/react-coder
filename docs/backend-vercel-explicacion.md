# Cómo va a funcionar el backend en Vercel

Explicación del modelo que vamos a usar, con los archivos de este proyecto como ejemplo.
No es un plan de implementación — es para que entiendas la arquitectura antes de que
escribamos código.

---

## 1. El problema de fondo

Tu lectura es correcta: **la base de datos está en Firebase, y hoy `src/services/firebase/*`
le pega directo desde el navegador.** No hay servidor en el medio. Eso se llama una
arquitectura *client-only*.

Eso funciona, pero tiene un límite duro: **todo el código que corre en el navegador es
código que el usuario controla.** No importa cuántas validaciones escribas en React —
el usuario puede abrir las herramientas de desarrollador y saltarlas todas, o directamente
ignorar tu web y hablarle a Firestore con su propio script.

El ejemplo más claro está en tu checkout, `src/pages/Carrito/Carrito.jsx`:

```js
const orden = {
  buyer: { uid: user.uid, name: ..., email: ... },
  items: cartList,   // <-- esto sale del estado de React
  total: total,      // <-- esto también
  date: new Date().toISOString(),
};
await services.firebase.crearCompra(orden);
```

`cartList` y `total` viven en la memoria del navegador del cliente. Si edita
`precioUnitario` y lo pone en 1, `crearCompra` guarda esa orden tal cual, porque
`crearCompra` es un `addDoc` y nada más. No hay nadie que diga "pará, ese producto
cuesta 4500".

**Lo que falta no es más validación en React. Es un lugar donde correr código que el
cliente no pueda tocar.** Eso es el servidor.

---

## 2. Qué es una Vercel Function

Una Vercel Function es **un archivo JavaScript que corre en el servidor de Vercel en vez
de en el navegador**. Lo escribís en una carpeta `api/` en la raíz del proyecto, y Vercel
automáticamente lo convierte en una URL.

```
lavadero-ecommerce/
├── api/                        <-- NUEVO: esto corre en el servidor
│   ├── crear-orden.js          --> se publica en  https://tutienda.com/api/crear-orden
│   └── contacto.js             --> se publica en  https://tutienda.com/api/contacto
├── src/                        <-- esto sigue corriendo en el navegador
└── vercel.json
```

No hay que levantar un servidor, ni elegir un puerto, ni mantener una máquina prendida.
Vercel ejecuta el archivo cuando llega un pedido a esa URL y lo apaga cuando termina.
De ahí el nombre *serverless*: hay un servidor, pero no es tuyo y no lo administrás.

Un archivo de `api/` se ve así:

```js
// api/crear-orden.js  — ESTO CORRE EN EL SERVIDOR
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { items } = req.body;   // lo que mandó el navegador

  // ... acá validamos, leemos precios reales, creamos la orden, mandamos el mail

  res.status(200).json({ orderId: "0001" });
}
```

El punto clave: **el usuario nunca ve este archivo.** No está en el bundle, no se puede
leer desde devtools, no se puede modificar. Solo puede mandarle un pedido HTTP y recibir
la respuesta.

---

## 3. Qué cambia y qué no cambia en tu código

Esto es lo importante de entender. **No todo pasa por el servidor.** Solo lo que necesita
protección. El resto sigue como está hoy, porque meter todo por el servidor sería más
lento y más caro sin ganar nada.

### Sigue igual: lecturas públicas, directo del navegador a Firestore

```
Navegador                               Firestore
   │                                        │
   │  obtenerProductos()  ───────────────>  │   (SDK de Firebase en el navegador)
   │  <─────────────── lista de productos   │
```

El catálogo son datos públicos. Que el cliente los lea directo es **más rápido**
(una sola ida y vuelta en vez de dos) y **más barato**. `obtenerProductos`,
`obtenerProductosPorCodigo` y la autenticación (`loginWithEmail`, `loginWithGoogle`)
se quedan exactamente como están.

Lo único que hay que hacer acá es que las **reglas de Firestore** digan
"`products` se puede leer, no se puede escribir". Eso ya lo protege.

### Cambia: escrituras sensibles, ahora pasan por tu API

```
Navegador                  Vercel Function                 Firestore
   │                              │                            │
   │  POST /api/crear-orden ───>  │                            │
   │  { items: [{codigo,          │ 1. verifica quién sos      │
   │             cantidad}] }     │ 2. lee precios reales ───> │
   │                              │ <──── precios              │
   │                              │ 3. recalcula el total      │
   │                              │ 4. descuenta stock ─────>  │
   │                              │ 5. guarda la orden ─────>  │
   │                              │ 6. te manda el mail        │
   │  <──── { orderId: "0001" }   │                            │
```

Fijate qué manda el navegador ahora: **solo `codigo` y `cantidad`**. El precio no viaja
desde el cliente. No se puede falsificar algo que nunca mandás.

Las funciones que se mudan al servidor:

| Hoy (navegador) | Después | Por qué |
|---|---|---|
| `crearCompra()` | `POST /api/crear-orden` | el precio y el stock no pueden salir del cliente |
| `crearProducto()` | `POST /api/admin/producto` | solo un admin real puede crear productos |
| `actualizarProducto()` | `PUT /api/admin/producto` | idem |
| `eliminarProducto()` | `DELETE /api/admin/producto` | idem |
| `eliminarMensaje()` | `DELETE /api/admin/mensaje` | idem |
| `obtenerTodasLasCompras()` | `GET /api/admin/pedidos` | hoy devuelve los datos de *todos* los clientes |
| `crearContacto()` | `POST /api/contacto` | para poder limitar spam y mandarte el mail |
| `sembrarProductos()` | script de Node, no API | es una operación de una sola vez, no va en la web |

Tus archivos en `src/services/` **no desaparecen** — se siguen llamando igual desde los
componentes. Lo que cambia es su contenido: en vez de `addDoc(...)` van a hacer
`fetch("/api/crear-orden", ...)`. El resto de la app no se enteró de nada. Esa es la
ventaja de que ya tengas la capa de servicios separada: el cambio queda contenido ahí.

---

## 4. Las dos caras del SDK de Firebase

Esta es la parte que más confunde al principio, y es el corazón de por qué esto es
más seguro.

Firebase tiene **dos librerías distintas**:

**`firebase` — el SDK de cliente.** Es el que ya usás en `src/utils/firebase.js`.
Está pensado para correr en un navegador que no es de confianza, así que **obedece las
reglas de seguridad de Firestore**. Si la regla dice que no podés escribir, no escribís,
aunque seas vos el que escribió el código.

**`firebase-admin` — el SDK de administrador.** Corre solo en un servidor y
**se saltea todas las reglas de Firestore**. Tiene permiso total sobre la base. Puede
leer cualquier documento, escribir cualquier cosa, y asignar roles a los usuarios.

Por eso `firebase-admin` **jamás puede estar en el navegador**. Si lo pusieras en `src/`,
Vite lo empaquetaría en el bundle junto con su credencial, y cualquiera que mire el
código fuente de tu página tendría control total de tu base. Esto es un error que se
comete y que es catastrófico.

Donde vive cada uno:

```
src/      ──> usa  firebase          (SDK de cliente, respeta las reglas)
api/      ──> usa  firebase-admin    (SDK de servidor, permiso total)
```

Esa separación de carpetas es la frontera de seguridad del proyecto entero.

---

## 5. Las variables de entorno: el prefijo `VITE_` es una decisión de seguridad

Ahora mismo tu `.env` tiene cosas como `VITE_API_KEY`. Ese prefijo no es decorativo:

- **`VITE_ALGO`** → Vite lo **mete en el bundle**. Termina en el JavaScript que descarga
  el visitante. Es público, siempre, inevitablemente.
- **`ALGO`** (sin prefijo) → Vite lo **ignora** al compilar el frontend. Solo lo pueden
  leer los archivos de `api/`, en el servidor.

Entonces las variables se parten en dos grupos:

```bash
# PÚBLICAS — van al navegador, está bien que se vean
VITE_API_KEY=...                 # la config de Firebase es pública por diseño
VITE_AUTH_DOMAIN=...
VITE_PROJECT_ID=...

# PRIVADAS — solo el servidor, NUNCA con prefijo VITE_
FIREBASE_CLIENT_EMAIL=...        # credencial del Admin SDK
FIREBASE_PRIVATE_KEY=...         # si esto se filtra, perdés la base entera
RESEND_API_KEY=...               # servicio de mails
MAIL_DESTINO=tucorreo@...        # a dónde te llegan los pedidos
```

Una aclaración sobre `VITE_API_KEY`: **que sea pública no es un bug.** La "API key" de
Firebase no es una contraseña, es un identificador de proyecto. Lo que protege tu base
no es esconderla — es la combinación de reglas de Firestore + App Check + restricción de
dominios. Esconderla sería imposible igual: ya está en el bundle que publicás.

**Dónde se cargan:** en el panel de Vercel, en Settings → Environment Variables. **No**
en el repo. El `.env` local queda solo para desarrollo en tu máquina, y sigue en
`.gitignore` (eso ya lo tenés bien).

Un detalle que hace perder horas: `FIREBASE_PRIVATE_KEY` tiene saltos de línea reales.
Al pegarla en Vercel se guardan como `\n` literales, así que en el código hay que
revertirlo con `.replace(/\\n/g, "\n")`. Es la causa número uno de "no me conecta el
Admin SDK".

---

## 6. Cómo sabe el servidor quién le está hablando

Pregunta natural: si cualquiera puede mandar un POST a `/api/crear-orden`, ¿cómo sabe
la función que sos vos y no un desconocido?

Con el **ID token** de Firebase Auth. Es un token firmado criptográficamente por Google
que el navegador ya tiene cuando el usuario está logueado.

En el navegador:

```js
const token = await user.getIdToken();
await fetch("/api/crear-orden", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({ items: cartList.map(i => ({ codigo: i.codigo, cantidad: i.cantidad })) }),
});
```

En el servidor:

```js
const token = req.headers.authorization?.split("Bearer ")[1];
const decoded = await admin.auth().verifyIdToken(token);
// decoded.uid  <- quién es, verificado por Google. Imposible de falsificar.
```

`verifyIdToken` verifica la firma de Google. Si el token está inventado, vencido o
modificado, tira error. No hay forma de hacerse pasar por otro usuario.

### Y acá se arregla el agujero del rol de admin

Hoy el rol vive en el documento `users/{uid}` de Firestore, que el propio usuario puede
escribir. Con el servidor en el medio, el rol pasa a vivir dentro del **token**, como
*custom claim*:

```js
// solo desde el servidor, una vez, para darte permisos a vos
await admin.auth().setCustomUserClaims(TU_UID, { admin: true });
```

Ese claim viaja firmado dentro del token. El usuario puede verlo pero **no puede
cambiarlo**, porque no tiene la clave privada de Google para volver a firmar el token.
Y las reglas de Firestore lo pueden leer directamente:

```js
// firestore.rules
match /products/{id} {
  allow read: if true;
  allow write: if request.auth.token.admin == true;
}
```

Esa es la diferencia entre un cartel y una puerta. Hoy `isAdmin` en
`src/contexts/AuthContext.jsx` es un cartel: esconde el botón de admin del navbar, pero
no impide nada. Con custom claims, aunque alguien fuerce `isAdmin = true` en su
navegador, Firestore le rechaza cada escritura.

---

## 7. Cómo se trabaja localmente

Hoy corrés `npm run dev` y Vite levanta el frontend. Pero Vite no sabe nada de la
carpeta `api/` — para él es código que no existe.

Para probar las funciones en tu máquina:

```bash
npm i -g vercel     # una sola vez
vercel dev          # en lugar de npm run dev
```

`vercel dev` levanta Vite **y** las funciones de `api/` juntas, y hace que `/api/*`
apunte a los archivos locales. Es el mismo entorno que producción.

`npm run dev` sigue sirviendo si estás tocando solo CSS o componentes y no necesitás
las APIs.

---

## 8. Costo y límites

El plan **Hobby** de Vercel es gratis y no pide tarjeta. Incluye invocaciones de
funciones, ancho de banda y dominio propio con HTTPS automático. Para una tienda que
recibe pedidos por mail y no procesa pagos, esto queda muy lejos de los límites.

Dos cosas que conviene saber:

1. **El plan Hobby es para uso no comercial** según los términos de Vercel. Una tienda
   que vende es uso comercial. En la práctica a proyectos chicos no los molestan, pero
   si el proyecto va en serio, el plan Pro existe y es la opción correcta. Conviene
   mirar los términos actuales antes de decidir.
2. **Arranque en frío** (*cold start*): si nadie usó la función en un rato, la primera
   llamada tarda uno o dos segundos más. Para "finalizar compra" es irrelevante. Para
   el catálogo sería molesto — y por eso el catálogo **no** pasa por el servidor.

Lo que **no** necesitás: pasar Firebase al plan Blaze. Ese es el costo que te
ahorrás eligiendo Vercel en vez de Cloud Functions. Firestore en el plan Spark
(gratis) alcanza perfectamente, y el Admin SDK se conecta igual desde Vercel.

---

## 9. Resumen en una imagen

```
                        ┌─────────────────────────────┐
                        │   NAVEGADOR DEL CLIENTE     │
                        │   (código público, que el   │
                        │    usuario puede modificar) │
                        │                             │
                        │   src/  +  SDK  firebase    │
                        └──────────┬──────────┬───────┘
                                   │          │
              lecturas públicas    │          │   escrituras sensibles
              (catálogo, login)    │          │   (órdenes, admin)
                                   │          │
                                   ▼          ▼
                        ┌──────────────┐  ┌─────────────────────────┐
                        │              │  │   VERCEL FUNCTIONS      │
                        │              │  │   (código privado, el   │
                        │   FIRESTORE  │  │    usuario no lo ve)    │
                        │              │  │                         │
                        │  protegido   │◄─┤  api/ + firebase-admin  │
                        │  por reglas  │  │  ─ verifica el token    │
                        │              │  │  ─ relee precios reales │
                        └──────────────┘  │  ─ descuenta stock      │
                                          │  ─ manda el mail  ──────┼──► tu correo
                                          └─────────────────────────┘
```

Las tres ideas para quedarse:

1. **`src/` es público, `api/` es privado.** Esa frontera define qué se puede confiar.
2. **Las reglas de Firestore son la última línea de defensa**, no la primera. Aunque
   el servidor tenga un bug, una regla bien escrita igual rechaza la escritura.
3. **El cliente manda intenciones, no hechos.** Manda "quiero 2 del código ABC",
   no "esto cuesta $9000". El servidor decide los hechos.

---

## 10. Lo que queda por decidir (no está resuelto todavía)

- Qué proveedor de mails: **Resend** (más simple, pensado para desarrolladores) vs
  **SendGrid** (más viejo y burocrático). Con cualquiera de los dos hay que verificar
  el dominio para que los mails no caigan en spam.
- Si el carrito se persiste en `localStorage` o en Firestore por usuario.
- Cómo se numeran las órdenes de forma legible (`0001`) en vez del hash de Firestore.
- Si el panel de admin consume las APIs nuevas o se reescribe (hoy son 442 líneas en un
  solo archivo, y el grafo lo marcó como el tercer nodo más conectado del proyecto).

Eso lo definimos antes de escribir el spec.
