# Paso a paso: activar la seguridad en producción

Todo lo que falta para que el subproyecto A tenga efecto. **Hoy las reglas están
escritas y probadas en el repo, pero tu base sigue funcionando con las reglas
que tenga hoy en la consola de Firebase.** Hasta que termines la Parte 6, nada
de esto protege nada.

Hacelo en orden. La Parte 4 va antes de la Parte 6 a propósito: si desplegás las
reglas antes de asignarte el claim de admin, te quedás sin poder administrar tu
propia tienda.

Tiempo estimado: 40-60 minutos la primera vez.

---

## Parte 0 — Antes de empezar

Lo que ya tenés verificado en esta máquina:

- Node y npm funcionando.
- **Java 17** instalado (lo usa el emulador de Firebase para los tests). Vas a
  ver un aviso de que `firebase-tools` 15 va a pedir Java 21; con la versión
  actual anda bien, ignoralo.
- Las 7 variables `VITE_*` definidas en tu `.env`, que está correctamente
  ignorado por git y nunca entró al historial.

Lo que necesitás a mano:

- Acceso a <https://console.firebase.google.com> con la cuenta dueña del proyecto.
- Acceso a <https://console.cloud.google.com> con la misma cuenta (es el mismo
  proyecto visto desde Google Cloud; no hace falta crear nada).
- **Estar registrado en tu propia tienda** con el email que vas a usar como
  administrador. Si nunca te registraste, hacelo ahora: `npm run dev`, andá a
  `/register` y creá la cuenta. El script de la Parte 4 necesita que el usuario
  exista.

---

## Parte 1 — Bajar la credencial del Admin SDK

Esta credencial es la **llave maestra de tu base**: se saltea todas las reglas
de seguridad. La necesitan los scripts que corren en tu máquina (asignarte
admin, cargar el catálogo).

1. Entrá a <https://console.firebase.google.com> y elegí tu proyecto.
2. Arriba a la izquierda, al lado de "Descripción general del proyecto", hacé
   click en el **engranaje** y después en **Configuración del proyecto**.
3. En las pestañas de arriba, entrá a **Cuentas de servicio**
   (*Service accounts*).
4. Abajo vas a ver "SDK de Firebase Admin" y un botón
   **Generar nueva clave privada**. Hacé click.
5. Te avisa que la clave da acceso completo. Confirmá con **Generar clave**.
6. Se descarga un `.json` con un nombre largo tipo
   `tu-proyecto-firebase-adminsdk-abc12-1234567890.json`.
7. **Renombralo a `serviceAccount.json`** y movelo a la raíz del proyecto, al
   lado de `package.json`:

   ```
   C:\Users\Max\Desktop\lavadero-ecommerce\serviceAccount.json
   ```

8. **Verificá que git lo ignora.** Esto no es opcional:

   ```bash
   git status --short serviceAccount.json
   ```

   Tiene que imprimir **nada**. Si imprime `?? serviceAccount.json`, pará y
   avisame: estarías a un `git add` de publicar el control total de tu base.

> **Si alguna vez se filtra** (la subís a git, la pegás en un chat, la mandás
> por mail): andá a Google Cloud Console, **IAM y administración**,
> **Cuentas de servicio**, borrá esa clave y generá una nueva. No alcanza con
> borrar el archivo local.

---

## Parte 2 — Conectar el repo con tu proyecto de Firebase

El repo tiene `firebase.json` (dice dónde están las reglas) pero no sabe **a qué
proyecto** desplegarlas. Esto se hace una sola vez.

1. Iniciá sesión en la CLI de Firebase. Te abre el navegador:

   ```bash
   npx firebase login
   ```

2. Vinculá el repo con tu proyecto:

   ```bash
   npx firebase use --add
   ```

   Te muestra la lista de tus proyectos; elegí el de la tienda con las flechas.
   Cuando pida un *alias*, escribí `default` y Enter.

3. Esto crea `.firebaserc`. Verificá:

   ```bash
   npx firebase use
   ```

   Tiene que mostrar el ID de tu proyecto.

> `.firebaserc` sí se puede commitear: contiene solo el ID del proyecto, que no
> es un secreto.

---

## Parte 3 — Verificar los métodos de inicio de sesión

El código usa email/contraseña y Google. Si alguno no está habilitado, el
registro falla con un error que no lo explica.

1. Firebase Console, menú izquierdo, **Authentication**.
2. Pestaña **Sign-in method** (*Métodos de acceso*).
3. Confirmá que estén **habilitados**:
   - **Correo electrónico/Contraseña**
   - **Google**
4. Si alguno está deshabilitado, hacé click, activá el switch y guardá.

---

## Parte 4 — Asignarte el rol de administrador

Esto es lo que te convierte en admin. **Va antes del deploy de reglas.**

No hay campo `role` en la base: tu permiso vive dentro del token que Firebase te
da al iniciar sesión, firmado por Google. Nadie lo puede falsificar desde el
navegador, que era exactamente el agujero que teníamos.

1. Con `serviceAccount.json` en su lugar:

   ```bash
   npm run set-admin -- tucorreo@ejemplo.com
   ```

   Usá el email con el que te registraste en la tienda.

2. Si sale bien, imprime tu uid y `admin: true`.

   Si dice que no existe ningún usuario con ese email, no estás registrado en la
   tienda con él. Volvé a la Parte 0.

3. **Cerrá sesión en la app y volvé a iniciarla.** Este paso parece de más y no
   lo es: los tokens de Firebase duran una hora, y el que tenés en el navegador
   **no incluye** el permiso que acabás de asignar. Si entrás a `/admin` y te
   rebota al inicio, es esto, no un error.

4. Verificación opcional, en la consola del navegador (F12) con sesión abierta:

   ```js
   await firebase.auth().currentUser.getIdTokenResult()
   ```

   Dentro de `claims` tiene que estar `admin: true`.

> Para revocarle el admin a alguien:
> `npm run set-admin -- otro@ejemplo.com --quitar`

---

## Parte 5 — Correr los tests antes de tocar producción

```bash
npm test
```

Tienen que pasar **57 unitarios y 77 de reglas** (134 en total). Tarda unos
2 minutos porque levanta el emulador de Firebase.

**Si algo falla, no desplegues.** Mandame la salida.

---

## Parte 6 — Desplegar las reglas

Este es el paso que hace que todo lo anterior tenga efecto.

```bash
npx firebase deploy --only firestore:rules,storage
```

**Solo las reglas, a propósito.** Si incluís `firestore:indexes` en el mismo
comando y la parte de índices falla, el comando sale con error y queda ambiguo
si las reglas se publicaron: justo la duda que no querés en un deploy de
seguridad. (`firestore.indexes.json` está vacío porque la consulta que usamos no
necesita índice compuesto: para el indexador un `in` cuenta como igualdad, y el
índice de un solo campo ya lo provee Firestore solo.)

**Ojo con la sintaxis**: para Firestore es `firestore:rules` (porque reglas e
índices son dos cosas separables), pero para Storage es `storage` a secas. Si
escribís `storage:rules`, Firebase lo interpreta como "el target llamado
rules", no lo encuentra, y falla con *"Could not find rules for the following
storage targets: rules"*.

Si Storage todavía no está habilitado en el proyecto, el deploy falla entero.
En ese caso desplegá primero solo Firestore (`--only firestore:rules`), que es
lo que cierra los agujeros graves, y habilitá Storage después desde la consola
eligiendo **modo de producción** (nunca modo de prueba: abre todo por 30 días).

No requiere el plan Blaze para Firestore. El plan gratuito alcanza.

Cuando termina dice "Deploy complete!". Las reglas ya están activas.

---

## Parte 7 — Verificar que funcionó

Ocho comprobaciones. Las primeras siete confirman que **no rompiste nada**; la
octava confirma que **el agujero está cerrado**, y es la que importa de verdad.

Levantá la app (`npm run dev`) o usá la versión publicada.

1. **Sin iniciar sesión**, navegá el catálogo: los productos se ven.
2. Filtrá por categoría: anda.
3. **Con tu sesión de admin**, entrá a `/admin`: ves productos, pedidos y
   mensajes.
4. Creá, editá y borrá un producto de prueba: funciona.
5. Subí una imagen de producto: funciona.
6. Hacé un pedido de prueba desde el carrito: se crea y te da número de orden.
7. Mandá un mensaje desde `/contact` sin iniciar sesión: se crea y lo ves en la
   pestaña Mensajes del panel.
8. **La prueba que decide si esto sirvió.** Iniciá sesión con una cuenta **que
   no sea la de admin** (creá una de prueba si hace falta). Con esa sesión
   abierta, abrí la consola del navegador (F12) y ejecutá:

   ```js
   // Esto tiene que FALLAR con "Missing or insufficient permissions"
   const fs = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
   const au = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
   const db = fs.getFirestore();
   const uid = au.getAuth().currentUser.uid;
   await fs.updateDoc(fs.doc(db, "users", uid), { role: "admin" });
   ```

   **Tiene que tirar error.** Si la escritura pasa, las reglas no se
   desplegaron: volvé a la Parte 6 y revisá que `npx firebase use` apunte al
   proyecto correcto.

---

## Parte 8 — Cargar el catálogo (solo si la base está vacía)

Si ya tenés los 323 productos en Firestore, salteá esta parte.

El botón "Subir Catálogo a Firestore" que había en la web **ya no existe**:
viajaba en el código público, así que cualquier visitante podía dispararlo.
Ahora es un script que corre en tu máquina con la credencial de admin.

```bash
npm run seed
```

Si la colección ya tiene productos, no hace nada y te lo dice. Para sobrescribir
igual:

```bash
npm run seed -- --forzar
```

---

## Parte 9 — Endurecer la consola

Piezas que no se pueden resolver con código del repo. Ninguna es tan urgente
como la Parte 6, pero todas suman.

### 9.1 Restringir la API key por dominio

Tu API key de Firebase viaja en el código que descarga cada visitante, y eso
**está bien**: no es una contraseña, es un identificador de proyecto. Lo que no
puede quedar abierto es desde qué dominios se acepta.

1. <https://console.cloud.google.com>, arriba elegí tu proyecto.
2. Menú izquierdo, **APIs y servicios**, **Credenciales**.
3. En "Claves de API", click en la clave del navegador (suele llamarse
   "Browser key (auto created by Firebase)").
4. En **Restricciones de la aplicación**, elegí **Sitios web**.
5. En **Restricciones del sitio web**, agregá:
   - `localhost`
   - `localhost:5173` (el puerto de Vite en desarrollo)
   - Tu dominio de producción, cuando lo tengas (subproyecto D)
   - Si usás Vercel, también `*.vercel.app` para los previews
6. **Guardar**. Tarda unos minutos en propagarse.

> Si después de esto la app deja de funcionar en local, falta `localhost` en la
> lista.

### 9.2 App Check

Garantiza que los pedidos vienen de tu app y no de un script. **Es lo que más
reduce el riesgo que queda abierto** en el formulario de contacto público.

1. Firebase Console, menú izquierdo, **App Check**.
2. Pestaña **Apps**, encontrá tu app web, **Registrar**.
3. Elegí **reCAPTCHA v3** y seguí los pasos (te da una clave de sitio).
4. **Dejalo en modo monitoreo al menos una semana.** No lo exijas todavía.
5. Pasada la semana, revisá las métricas en **Apps**: si hay tráfico legítimo
   siendo rechazado, no lo exijas.
6. Recién cuando las métricas estén limpias: en **APIs**, exigí App Check para
   **Cloud Firestore** y **Cloud Storage**.

El modo monitoreo primero no es un detalle. Exigirlo de entrada corta clientes
reales y no te vas a enterar por qué.

### 9.3 Dominios autorizados de Auth

1. Firebase Console, **Authentication**, pestaña **Settings**
   (*Configuración*), **Dominios autorizados**.
2. Borrá los que no uses.
3. Agregá tu dominio propio cuando lo compres (subproyecto D). **Si te olvidás
   de esto, el login deja de funcionar en el dominio nuevo.**

### 9.4 Política de contraseñas

El código ya exige 8 caracteres, pero esa validación corre en el navegador y se
puede saltear con devtools. Esta es la que manda de verdad.

1. **Authentication**, **Settings**, **Password policy**.
2. Poné mínimo **8 caracteres**, para que coincida con
   `src/utils/validarPassword.js`.

> Si no ves esa opción, requiere activar Google Cloud Identity Platform en el
> proyecto. No es imprescindible: la validación del cliente ya cubre el caso
> normal.

### 9.5 Plantillas de mail: esto es lo primero que ve un cliente nuevo

Los mails de verificación y de recuperación de contraseña **ya se mandan**:
Firebase los envía por su cuenta, sin servidor. El problema es que llegan con
texto genérico de Google, **en inglés**, y sin tu marca.

1. **Authentication**, pestaña **Templates** (*Plantillas*).
2. Entrá a **Verificación de la dirección de correo electrónico** y editá:
   - Cambiá el **nombre del remitente** a tu marca.
   - Traducí el asunto y el cuerpo al castellano.
3. Hacé lo mismo con **Restablecimiento de contraseña**.
4. **Mandate los dos mails a vos mismo y leelos.** Registrate con un email tuyo
   y usá "¿Olvidaste tu contraseña?" en el login.

---

## Parte 10 — Lo que todavía NO funciona (y por qué)

Para que no te sorprenda.

### 10.1 El video de producto se sube pero no se ve

Importante para lo que querés hacer.

**Lo que ya funciona:** podés subir videos desde el panel. Las reglas de Storage
los aceptan hasta 50 MB, y `uploadFile` valida tipo y tamaño antes de subir, con
un mensaje claro si se pasa.

**Lo que no funciona:** la tienda renderiza el archivo con `<img src="...">` en
`src/components/Item/Item.jsx` y `src/components/ItemDetails/ItemDetails.jsx`.
Un video aparece como **imagen rota**. No hay ningún `<video>` en el código.

Es un arreglo chico (un componente que elija `<img>` o `<video>` según el
archivo) pero no está hecho.

**Y hay un límite práctico que importa más que el código.** En el plan gratuito
de Firebase, Storage te da 5 GB de almacenamiento pero solo **1 GB de descarga
por día**, compartido con todas las fotos del catálogo. Un video de 50 MB visto
20 veces agota la cuota diaria, y cuando se agota **dejan de cargar también las
imágenes de todos los productos**: la tienda se ve vacía.

Opciones, de menos a más trabajo:

- **Videos cortos y comprimidos**: 5-10 segundos, bajo 5 MB. Para mostrar cómo
  explota un producto alcanza, y entran unas 200 vistas por día.
- **Subirlos a YouTube** (no listados) y embeberlos. Gratis, sin límite de ancho
  de banda, y es lo que hace casi todo el rubro.
- **Cloudinary** en plan gratuito: transcodifica y sirve video optimizado, con
  más cuota que Firebase.

### 10.2 El total del pedido lo sigue calculando el navegador

`Carrito.jsx` arma la orden con el total calculado en el navegador del cliente.
Alguien con devtools puede mandarte un pedido de $1.

Cerrarlo bien significa que solo el servidor pueda escribir pedidos, y eso rompe
tu checkout hasta que exista la API del subproyecto B. Las reglas no lo pueden
resolver: validar precios exigiría una lectura de Firestore por ítem del
carrito, y el límite son 10 por evaluación.

**Hasta que hagamos B: tratá el total de cada pedido como declarado por el
cliente, y verificalo cuando lo contactes.** Es una mitigación de proceso, no
técnica, y es la razón para que B sea lo próximo.

### 10.3 El pedido no te llega por mail

Sigue habiendo que abrir el panel para ver pedidos nuevos. El mail de aviso
necesita servidor y es el subproyecto C.

### 10.4 Otras cosas conocidas

- Quien verifica su email sigue viendo el aviso "falta verificar" hasta cerrar
  sesión y volver a entrar.
- El carrito se pierde al refrescar la página (subproyecto F).
- `base: "/react-coder"` en `vite.config.js` rompe el deploy en un dominio
  propio (subproyecto D).

---

## Si algo falla

- **`npm test` falla**: mandame la salida, no desplegues.
- **`firebase deploy` dice "No project active"**: te falta la Parte 2.
- **Entro a `/admin` y me rebota**: casi siempre es el token de una hora. Cerrá
  sesión y volvé a entrar (Parte 4, paso 3).
- **"Missing or insufficient permissions" en el panel**: no tenés el claim, o
  tenés un token viejo. Mismo arreglo.
- **La app no carga nada después de la 9.1**: falta `localhost` en los dominios
  permitidos de la API key.
- **Los scripts dicen que no encuentran la credencial**: `serviceAccount.json`
  no está en la raíz o tiene otro nombre.

## Después de cada cambio de reglas, siempre

```bash
npm test
npx firebase deploy --only firestore:rules,storage
```

Y repasá el punto 8 de la Parte 7.
