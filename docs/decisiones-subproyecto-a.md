# Registro de decisiones — Subproyecto A: Fundación de seguridad

**Período:** 1 al 4 de octubre de 2026
**Rama:** `feat/seguridad-fundacion` (22 commits)
**Proyecto Firebase:** `react-coder-6377b`
**Estado:** desplegado en producción (reglas de Firestore y Storage activas)

Qué se hizo, por qué, y qué cuesta si alguna decisión resulta equivocada.
Agrupado por rubro. Las decisiones están numeradas para poder referenciarlas.

**Resumen:** 66 archivos tocados, 47 nuevos, 2 borrados. 134 tests donde antes
había cero. Seis agujeros de autorización cerrados.

---

## 1. Seguridad

### 1.1 El rol de administrador dejó de vivir en la base de datos

**Antes:** el rol estaba en el documento `users/{uid}` de Firestore, y
`AuthContext` lo leía de ahí para decidir `isAdmin`. Ese documento lo escribe el
propio usuario.

**Consecuencia:** cualquier cliente registrado podía ascenderse a administrador
desde la consola del navegador con una línea:
`updateDoc(doc(db,'users',miUid), { role:'admin' })`.

**Ahora:** el permiso es un *custom claim* dentro del token de Firebase Auth,
firmado criptográficamente por Google. El cliente lo puede leer pero no
modificar, porque no tiene la clave privada para volver a firmar el token. Se
asigna solo desde servidor, con `scripts/set-admin.mjs`.

**Por qué así y no de otra forma:** era la única opción que no requiere servidor
propio. Las alternativas (una colección `admins` que el usuario no pueda
escribir) funcionan pero obligan a una lectura extra de Firestore por sesión y
siguen dependiendo de que la regla esté bien escrita en dos lugares. El claim lo
resuelve en uno.

**Efecto lateral bueno:** se eliminó una lectura de Firestore por login.

**Costo si está mal:** los tokens duran una hora, así que revocar un admin tarda
hasta 60 minutos en hacer efecto. Para una tienda de una persona es irrelevante;
si algún día hay varios administradores y hace falta revocar al instante, habría
que agregar una lista de revocación.

### 1.2 No existe campo `role` en el modelo de datos

**Decisión del dueño del proyecto**, tomada el 3 de octubre: hay exactamente dos
roles y ninguno se escribe en ningún lado. Con el claim `admin` sos soporte;
sin el claim sos comprador. El usuario que se registra no completa nada.

**Por qué:** mantener un campo espejo del claim crea dos fuentes de verdad que
se pueden desincronizar. El perfil muestra "Administrador" o "Comprador"
derivándolo de `isAdmin`.

Las reglas igual rechazan cualquier escritura de `role` desde el cliente, como
defensa en profundidad: si alguien reintroduce ese campo en el futuro, se
rechaza en vez de volver a abrir el agujero.

### 1.3 Las reglas de seguridad entraron al repositorio y bajo test

**Antes:** no existían `firestore.rules` ni `storage.rules` en el repo. Vivían
solo en la consola de Firebase: sin revisión, sin historial, sin rollback.

En una app *client-only* como esta, **las reglas son el backend**: todo lo que
hace `src/services/firebase/*` lo ejecuta el navegador directo contra la base.
Dejarlas fuera del control de versiones era dejar fuera la única capa de
autorización que existía.

**Ahora:** están versionadas y cubiertas por **77 tests** que corren contra el
emulador de Firebase. Los tests leen los archivos de reglas reales del disco, así
que lo que se prueba es exactamente lo que se despliega.

### 1.4 Las reglas arrancan negando todo

El archivo empieza con `match /{document=**} { allow read, write: if false; }` y
cada colección se abre explícitamente encima.

**Por qué:** hace que el *default* del sistema sea negar. Si mañana se agrega una
colección y nadie escribe su regla, nace cerrada en vez de abierta. Es la
diferencia entre fallar seguro y fallar abierto.

Hay dos tests que lo verifican y son deliberados: **ni el administrador** puede
tocar una colección sin regla declarada. Agregar una colección tiene que ser un
cambio consciente de las reglas, no algo que aparece porque alguien escribió
desde el panel.

**El orden de construcción siguió el mismo principio:** se empezó con el archivo
negando todo y se fue abriendo una colección por vez, cada una con sus tests. Lo
inverso (arrancar abierto e ir cerrando) deja ventanas abiertas si una tarea
queda a medias.

### 1.5 Los pedidos quedaron aislados por cliente

**Antes:** `obtenerTodasLasCompras()` hacía `getDocs` de la colección entera sin
filtrar por usuario. Cualquier cliente registrado podía leer nombres, emails y
datos de todos los demás.

**Ahora:** cada uno ve solo los suyos; el administrador ve todos. Un detalle poco
intuitivo que quedó cubierto por test: en Firestore las reglas se evalúan *por
documento*, pero una consulta de colección se rechaza entera si algún documento
del resultado podría no pasar. Por eso un cliente no puede hacer
`getDocs(collection(...))` sin filtrar por su propio uid, aunque sí pueda leer
sus documentos de a uno.

### 1.6 Riesgo aceptado a propósito: el precio sigue viniendo del cliente

**Esto sigue abierto y es la razón para que el subproyecto B sea lo próximo.**

`Carrito.jsx` arma la orden con `items` y `total` calculados en el navegador. Un
usuario con devtools puede mandar un pedido de $1.

**Por qué no se cerró:** la forma correcta es que solo el servidor pueda escribir
en `compras`, y eso **rompe el checkout** hasta que exista la API del subproyecto
B. Las reglas no lo pueden resolver solas: validar precios exigiría un `get()`
por cada ítem del carrito, y las reglas están limitadas a 10 lecturas por
evaluación.

**Lo que sí se cerró:** "cualquiera escribe pedidos ajenos" y "cualquiera lee los
pedidos de todos".

**Mitigación mientras tanto:** tratar el total de cada pedido como *declarado por
el cliente* y verificarlo al contactar. Es una mitigación de proceso, no técnica.

### 1.7 El formulario de contacto sigue siendo público

**Decisión:** no exigir login para enviar un mensaje.

**Por qué:** pedirlo pierde consultas de gente que todavía no se registró, que es
justo el tráfico que se quiere capturar.

**Costo:** habilita spam. Acotado con límite de campos y de tamaño (ver 1.8), y
se cerrará más con rate limiting en `api/contacto` cuando llegue el subproyecto C.

### 1.8 Hallazgo crítico de la revisión: documentos sin cota

La revisión final descubrió que el límite de 2000 caracteres cubría **solo el
campo `mensaje`**, y el resto del documento quedaba libre. Un visitante sin
sesión podía escribir documentos de ~1 MiB en un campo inventado.

**Consecuencia real:** con App Check en modo monitoreo, un script de 20 líneas
llenaba la base a costa del dueño del proyecto, y como el panel lee la colección
**sin `limit()`**, la pestaña de Mensajes intentaba descargar gigabytes y quedaba
inutilizable. Sin borrado masivo desde el cliente, la limpieza sería manual.

**Ahora:** whitelist de campos permitidos (`hasOnly`) y cota en cada string.

**Lección que vale anotar:** el spec afirmaba que el límite "acotaba el spam" y
era falso. Una afirmación de seguridad sin test es una hipótesis.

### 1.9 Subida de archivos con validación real

**Antes:** `uploadFile` aceptaba cualquier `File`, sin límite de tamaño ni
whitelist de tipo. El `accept="image/*,video/*"` del formulario es solo el
selector del navegador y no valida nada.

**Ahora:** dos capas. Las reglas de Storage rechazan en el servidor (imágenes
hasta 5 MB, videos hasta 50 MB, por `contentType` y no por nombre de archivo), y
`uploadFile` valida antes de gastar la subida con un mensaje en castellano que
dice el límite concreto.

**Por qué los dos umbrales son distintos:** 5 MB no alcanza para un video y 50 MB
es absurdo para una foto de producto.

**Por qué la validación va también en el cliente:** las fotos de un celular
moderno pesan 3-8 MB. Sin la validación local, el rechazo ocurre en el servidor
y la persona ve un error genérico sin saber que el problema era el tamaño.

### 1.10 Mensajes de error que no revelan si una cuenta existe

Tres códigos de Firebase (`user-not-found`, `wrong-password`,
`invalid-credential`) comparten **un único mensaje**. El reset de contraseña
confirma el envío exista o no la cuenta.

**Por qué:** mensajes distintos convierten el formulario en un detector de
cuentas registradas. Cualquiera podría probar una lista de emails y saber cuáles
tienen cuenta en la tienda.

La lógica que decide qué código revela y cuál no quedó como función pura
(`mensajeDeErrorDeReset`) con 8 tests, al lado del resto del mapeo, para que
sobreviva a la próxima edición.

---

## 2. Desarrollo y arquitectura

### 2.1 Componentización al mínimo

Preferencia explícita del dueño del proyecto, aplicada a todo lo nuevo.

| Archivo | Antes | Después |
|---|---|---|
| `Register.jsx` | 128 líneas | 91 |
| `Login.jsx` | 100 líneas | 79 |
| `authFirebase.js` | 95 líneas | 62 |

Se extrajeron 8 componentes nuevos, ninguno por encima de 60 líneas: `FormField`,
`FormError`, `FormNotice`, `AuthCard`, `GoogleAuthButton`, `PasswordResetLink`,
`VerificacionPendiente`, `ProtectedRoute`.

Los cuatro bloques `form-group` repetidos de Register quedaron en un componente,
y los dos `try/catch` idénticos en una función.

**Umbral adoptado:** si un archivo nuevo pasa de ~120 líneas, se parte.

### 2.2 `ProtectedRoute` en vez de un `useEffect` adentro del componente

**Antes:** la protección de `/admin` vivía en un `useEffect` **dentro** de
`AdminDashboard`, que corre después del primer render. El componente se montaba,
disparaba sus tres consultas a Firestore, y recién entonces redirigía.

**Ahora:** un guard de ruta que no monta el componente.

**El caso que más importa y tiene test propio:** al **refrescar la página**
estando en `/admin`, `AuthContext` arranca con `loading: true` y `user: null`. Un
guard que decide en ese momento **expulsa al login a un administrador
perfectamente válido**. Era la falla más probable de todo el plan.

**Aclaración importante:** esto corrige UX y fuga de datos en pantalla, **no es
la autorización**. La defensa real son las reglas. Forzar `isAdmin = true` en
devtools cambia lo que se ve, y Firestore sigue rechazando cada escritura.

### 2.3 El seed del catálogo salió del navegador

`src/components/InicializarBaseDeDatos.jsx` ponía un botón "Subir Catálogo a
Firestore" en el código que se le descarga a cada visitante. Su propio comentario
decía *"Zona de Admin (Borrar después)"*. Además `sembrarProductos` quedaba
exportado en `services.firebase`, alcanzable desde la consola de cualquiera.

**Ahora** es `scripts/seed-productos.mjs`, que corre con el Admin SDK y **lotea
de a 400**. La versión del navegador hacía un solo batch, y Firestore admite 500
operaciones por batch: con más de 500 productos habría fallado entera. Hoy son
323, así que todavía no había explotado.

### 2.4 El registro ya no aborta si falla un paso secundario

**Hallazgo de la revisión.** Una vez que `createUserWithEmailAndPassword`
devuelve, la cuenta **existe** y la sesión está abierta. Si después fallaba
`updateProfile`, la escritura del perfil o el mail de verificación, el error
subía a la interfaz y la persona creía que el registro había fallado — mientras
ya estaba registrada. Al reintentar le decían "ese email ya tiene una cuenta",
que se lee como una contradicción.

**Ahora** esos pasos degradan a avisos y el registro continúa.

### 2.5 Bugs preexistentes corregidos de paso

- **`updateProfile` nunca se llamaba**, así que `user.displayName` era siempre
  `null` y toda la app mostraba "Usuario". El nombre se guardaba en Firestore
  pero nunca en Auth.
- **No había forma de recuperar una contraseña olvidada.** Un cliente que la
  perdía, perdía la cuenta y la venta.
- **Nadie verificaba los emails.**
- **La política de contraseña no existía:** solo se validaba que las dos
  coincidieran, y Firebase acepta 6 caracteres, así que "123456" pasaba.
- **`Profile.jsx` llamaba `navigate()` durante el render** — un side-effect en el
  cuerpo del componente, que React advierte y que en modo concurrente es
  impredecible.
- **`AuthContext` renderizaba `{!loading && children}`**, así que cualquier fallo
  al leer el token dejaba la app en **pantalla blanca**.
- **Los servicios hacían `console.error(error)`** con el objeto de error completo
  de Firebase, filtrando detalles internos en la consola del cliente.

### 2.6 Los mails de autenticación no necesitan servidor

Firebase Auth envía por su cuenta los mails de verificación y de recuperación de
contraseña. Son dos llamadas del SDK de cliente.

**Por qué importa:** significó que esta etapa pudiera entregar funcionalidad
visible y no solo cerrojos. Solo el **aviso de pedido** necesita servidor, y ese
es el subproyecto C.

### 2.7 La verificación de email no bloquea navegar ni armar el carrito

**Decisión:** se pedirá verificar antes de **enviar un pedido**, no antes.

**Por qué:** bloquear antes perjudica la conversión sin ganar seguridad. El punto
donde la identidad importa es cuando el dueño va a invertir tiempo en contactar a
esa persona.

### 2.8 Limpieza

- `temp_products.js` borrado: huérfano en la raíz. El grafo de graphify lo
  detectó como comunidad aislada de un solo nodo, sin ninguna conexión.
- Se agregó al ESLint un bloque para archivos que corren en Node (configs,
  scripts, tests), que no tenían declaradas sus globales. Bajó los errores de
  lint de 13 a 10 y arregló de paso uno preexistente en `vite.config.js`. Los 10
  restantes son preexistentes en archivos fuera del alcance de esta etapa.

---

## 3. Testing

### 3.1 El proyecto no tenía ningún test ni runner

Se instaló Vitest, `@firebase/rules-unit-testing`, `@testing-library/react` y el
emulador de Firebase. **134 tests** donde antes había cero.

| Suite | Tests | Qué cubre |
|---|---|---|
| Reglas de Firestore y Storage | 77 | Autorización real contra el emulador |
| Unitarios | 57 | Componentes, funciones puras, scripts CLI |

### 3.2 Las reglas se probaron con TDD estricto

Cada colección siguió el ciclo: escribir el test, **verlo fallar**, escribir la
regla, verlo pasar, commitear. Un test que nunca se vio fallar no prueba nada.

El valor concreto: en la Task 3, la sintaxis correcta de Firestore para detectar
si se tocó un campo es
`.diff(resource.data).affectedKeys().hasAny(['role'])`. Escribirla con el
operador `in` —que es lo intuitivo— **hace fallar el deploy**, porque
`affectedKeys()` devuelve un `Set` y los Sets de las reglas no soportan `in`. El
test lo detectó antes de llegar a producción.

### 3.3 Una revisión de contexto fresco, adversarial

Al terminar, un revisor sin contexto previo examinó toda la rama. En vez de leer
el diff, **escribió 26 formas de ataque propias y las corrió contra el
emulador**: consultas de grupo de colección, listados filtrados por el uid de
otro, listados sin filtrar, `setDoc` con merge, subcolecciones, claves de
escalada alternativas.

**Veredicto sobre lo que más importa:** ningún camino de escalada de privilegios
ni lectura cruzada entre clientes, en ninguna de las formas probadas.

**Pero encontró 1 crítico y 8 importantes** (ver 1.8, 2.4, y los puntos de
deploy más abajo). Los cinco sondeos de aislamiento que corrió a mano quedaron
fijados como tests: pasaban, y por eso mismo valía clavarlos — están a una
edición de regla de abrirse en silencio.

### 3.4 Dos límites del harness de test, documentados

- **`vitest.config.js` necesita `globals: true`**, porque el auto-cleanup de
  Testing Library se engancha al `afterEach` global. Sin eso, el segundo test de
  cada archivo falla con "Found multiple elements".
- **Los tests de componente no pueden ejercitar promesas rechazadas** cuando hay
  un `beforeEach` con `mockReset`/`mockClear`: Vitest atribuye el rechazo como
  error no manejado aunque el componente lo capture. Se verificó imprimiendo el
  DOM que el componente se comporta bien. La salida fue extraer la lógica a una
  función pura testeable, que además es mejor diseño.

---

## 4. Deploy y operaciones

### 4.1 Qué quedó activo en producción

El 4 de octubre se desplegaron las reglas al proyecto `react-coder-6377b`:

```
+ cloud.firestore: released rules firestore.rules to cloud.firestore
+ storage: released rules storage.rules to firebase.storage
```

Desde ese momento, en producción: nadie puede ascenderse a admin, ningún cliente
lee los pedidos de otro, solo el admin escribe productos y promociones, solo el
admin lee los mensajes, y toda colección no declarada está cerrada.

### 4.2 El orden del deploy no es arbitrario

**Asignar el claim de admin va antes de endurecer las reglas.** Al revés, si la
asignación falla, nadie puede administrar nada y hay que arreglarlo desde la
consola.

### 4.3 Faltaba `.firebaserc`

El repo tenía `firebase.json` (dónde están las reglas) pero no a qué proyecto
desplegarlas. Sin él, `firebase deploy` falla con "No project active". Se creó
con `firebase use --add` y **se commiteó**: contiene solo el ID del proyecto, que
no es un secreto.

### 4.4 El índice declarado hacía fallar el deploy

`firestore.indexes.json` declaraba un índice compuesto de `category` + `__name__`
para la consulta de filtrado por categoría.

**Es innecesario:** para el indexador de Firestore, un `in` cuenta como igualdad,
y el índice de un solo campo más `__name__` ya lo provee Firestore
automáticamente. La API de índices rechaza esa forma con un `400 this index is
not necessary`.

**Por qué importa más de lo que parece:** el comando de deploy documentado
incluía los índices, así que al fallar esa parte **quedaba ambiguo si las reglas
se habían publicado** — justo la duda que no se quiere en un deploy de seguridad.

**Decisión:** el archivo quedó vacío y el deploy de reglas va en su propio
comando. (Este hallazgo lo marcó la revisión como "Minor"; se re-gradó a
Important porque el efecto real es peor que lo que sugería su severidad.)

### 4.5 La sintaxis de deploy es asimétrica

Para Firestore es `--only firestore:rules`, porque reglas e índices son dos cosas
separables. Para Storage es `--only storage` **a secas**: la forma
`storage:algo` significa "el target llamado algo", y falla con *"Could not find
rules for the following storage targets: rules"*.

Se descubrió al desplegar de verdad. Ningún test lo podía detectar porque todos
corren contra el emulador, que no usa esa sintaxis.

### 4.6 Storage no estaba habilitado en el proyecto

El primer intento de deploy falló porque el bucket nunca se había creado. Se
habilitó eligiendo **modo de producción**, no modo de prueba: el modo de prueba
pone `allow read, write: if true` durante 30 días, exactamente el agujero que
toda esta etapa cerró.

**Dato relacionado:** que Storage nunca se hubiera configurado tenía una causa —
los 323 productos tienen `fotoUrl: ""`. Nunca se subió una foto, así que nunca
hizo falta el bucket (ver sección 6).

### 4.7 Lo que queda fuera del repo y es manual

`docs/runbook-seguridad-consola.md` tiene el paso a paso. Pendientes: restringir
la API key por dominio, activar App Check (**en modo monitoreo al menos una
semana** antes de exigirlo, o corta clientes reales), revisar dominios
autorizados, política de contraseñas, y traducir las plantillas de mail — que hoy
llegan en inglés con texto genérico de Google y son lo primero que ve un cliente
nuevo.

### 4.8 Decisión de no ejecutar el deploy automáticamente

Desplegar reglas sobre un proyecto de producción es un efecto fuera del
repositorio. Se escribió el runbook y se entregó la ejecución al dueño.

---

## 5. Documentación

Cinco documentos nuevos, cada uno con un propósito distinto:

| Documento | Para qué |
|---|---|
| `docs/superpowers/specs/2026-10-03-seguridad-fundacion-design.md` | Qué se iba a hacer y por qué, antes de escribir código |
| `docs/superpowers/plans/2026-10-03-seguridad-fundacion.md` | 15 tareas con su ciclo de test, para ejecutar |
| `docs/backend-vercel-explicacion.md` | Cómo funciona el modelo de Vercel Functions, explicado con los archivos de este proyecto |
| `docs/runbook-seguridad-consola.md` | Paso a paso operativo de activación |
| `docs/decisiones-subproyecto-a.md` | Este documento |

También se construyó un **grafo de conocimiento** del código con graphify
(`graphify-out/`): 196 nodos, 409 aristas, 13 comunidades. Reveló que
`AdminDashboard()` es el tercer nodo más conectado del proyecto con 442 líneas,
lo que lo convierte en el candidato obvio a dividir en el subproyecto E.

**Decisión sobre el estilo de los comentarios:** el *por qué* va en el código, al
lado de lo que explica, no en un documento aparte. Las reglas de seguridad
tienen el razonamiento escrito encima de cada bloque, porque es ahí donde alguien
lo va a necesitar antes de editarlas.

---

## 6. Datos y contenido

### 6.1 El catálogo no tiene ni una imagen

**Los 323 productos tienen `fotoUrl: ""`.** Todos. La tienda muestra "No Image"
en cada producto.

Esto reencuadra la prioridad del proyecto: un ecommerce de pirotecnia sin fotos
no vende, por más seguro que esté.

### 6.2 El campo `videoUrl` ya existe y nunca se usó

El esquema de productos ya tiene `videoUrl` separado de `fotoUrl`, vacío en los
323. El modelo de datos anticipaba el video.

**Consecuencia de diseño:** el componente de media que falta no tiene que
adivinar si una URL es foto o video — usa `videoUrl` cuando está y cae a
`fotoUrl` cuando no.

### 6.3 Doble esquema de campos sin unificar

El código convive con `name || nombre`, `price || precioUnitario`,
`image || fotoUrl`, `category || categoria`. El panel escribe los dos juegos
"para mantener compatibilidad".

**No se tocó en esta etapa** porque unificarlo requiere migrar los datos
existentes. Es trabajo del subproyecto E.

---

## 7. Lo que queda abierto

### Pendiente inmediato

- **El video se sube pero no se ve.** `Item.jsx` e `ItemDetails.jsx` renderizan
  con `<img>`. Falta un componente que elija la etiqueta. Se decidió también
  soportar embeber desde YouTube.
- **`AdminDashboard.jsx:235` renderiza `<img src="">`** sin guarda. Con 100
  productos vacíos, el navegador vuelve a descargar la página 100 veces.
  `Item.jsx` sí tiene la guarda.
- **Las 323 fotos.** Decisión pendiente: subirlas a Firebase Storage o usar
  Cloudinary + YouTube. Importa porque el plan gratuito de Firebase da 5 GB de
  almacenamiento pero **1 GB de descarga por día**, compartido con todo el
  catálogo: un video de 50 MB visto 20 veces agota la cuota y deja de cargar
  también las fotos de todos los productos.

### Minors conocidos, no corregidos

- `users` acepta claves nuevas arbitrarias (`affectedKeys()` es de primer nivel).
  Inerte hoy porque nada lee flags de `users/{uid}`.
- `refrescarClaims` quedó expuesto sin consumidor.
- Quien verifica su email sigue viendo el aviso hasta cerrar sesión y volver a
  entrar (`user.reload()` no se llama).
- Nada en pantalla menciona el mail de verificación al registrarse; el aviso solo
  vive en `/profile`.
- `volverA` descarta `location.search` y el hash.
- Sin timeout en la pantalla "Verificando tu sesión...".
- `seed-productos.mjs` sin `try/catch` alrededor de `batch.commit()`.

### Subproyectos siguientes

| | Qué | Depende de |
|---|---|---|
| **B** | API en Vercel: precios revalidados, stock en transacción, motor de promociones | A (hecho) |
| **C** | Mail de aviso de pedido | B |
| **D** | `base: "/"`, `vercel.json`, dominio, SEO, favicon, README | — |
| **E** | Partir el panel de 442 líneas, estados de pedido, unificar esquema | A, B |
| **F** | Rediseño visual, carrito persistente, gate de edad, legales de pirotecnia | — |

---

## Apéndice: las decisiones que más costaría revertir

Si algo de esto resulta equivocado, acá está qué implicaría cambiarlo.

| Decisión | Costo de revertirla |
|---|---|
| Admin por custom claim (1.1) | Alto: toca `AuthContext`, las reglas, el script y la documentación |
| Sin campo `role` (1.2) | Bajo: agregar el campo y una regla |
| Reglas con default-deny (1.4) | Bajo, pero volvería a dejar colecciones nuevas abiertas |
| Permitir que el cliente cree pedidos (1.6) | Es temporal por diseño; B lo cierra |
| Contacto público (1.7) | Bajo: una condición en la regla |
| Verificación que no bloquea navegar (2.7) | Bajo: mover la condición al checkout |
| `firestore.indexes.json` vacío (4.4) | Bajo: si hiciera falta un índice, Firestore da el link para crearlo |
