# Runbook — endurecimiento de la consola

Lo que no se puede resolver con código del repo porque vive en la consola de
Firebase y de Google Cloud. Cada punto se verifica.

---

## 0. Antes que nada: desplegar las reglas

Las reglas ya están escritas y bajo test en este repo, pero **todavía no están
en producción**. Hasta que corras esto, tu base sigue con las reglas que tenga
hoy en la consola.

El orden importa. Si desplegás las reglas primero y la asignación del claim
falla, nadie puede administrar nada.

- [ ] **Paso 1 — bajar la credencial** (ver sección 6 más abajo)
- [ ] **Paso 2 — asignarte el claim de admin**

```bash
npm run set-admin -- tucorreo@ejemplo.com
```

Tenés que estar registrado en la app con ese email antes. Si no, el script te
lo dice.

- [ ] **Paso 3 — cerrar sesión en la app y volver a entrar**

Los tokens de Firebase duran una hora y el que tenés en el navegador no
incluye el claim nuevo. En la consola del navegador:

```js
// claims.admin tiene que ser true
await firebase.auth().currentUser.getIdTokenResult()
```

- [ ] **Paso 4 — correr los tests antes de tocar producción**

```bash
npm test
```

Tienen que pasar 57 unitarios y 77 de reglas. **Si algo falla, no desplegar.**

- [ ] **Paso 5 — desplegar**

```bash
npx firebase login
npx firebase deploy --only firestore:rules,storage:rules
```

**Solo las reglas, a propósito.** Si se incluye `firestore:indexes` en el mismo
comando y la parte de índices falla, el comando sale con error y queda ambiguo
si las reglas se publicaron — justo la duda que no querés en un deploy de
seguridad. `firestore.indexes.json` está vacío: la query
`where('category','in',[…])` + `orderBy('__name__')` no necesita índice
compuesto, porque para el indexador `in` cuenta como igualdad y el índice de un
solo campo ya lo provee Firestore solo.

No requiere plan Blaze.

- [ ] **Paso 6 — verificar en producción**

1. Navegar el catálogo sin sesión → los productos se ven.
2. Filtrar por categoría → anda.
3. Con sesión de admin, entrar a `/admin` → ve productos, pedidos y mensajes.
4. Crear, editar y borrar un producto de prueba → funciona.
5. Subir una imagen de producto → funciona.
6. Enviar un pedido de prueba desde el carrito → se crea.
7. Enviar un mensaje de contacto sin sesión → se crea.
8. **Con un usuario sin el claim**, en la consola del navegador:

```js
// Tiene que fallar con "Missing or insufficient permissions"
await updateDoc(doc(db, "users", auth.currentUser.uid), { role: "admin" });
```

Si el punto 8 **no** falla, las reglas no quedaron desplegadas. Revisar antes
de seguir.

---

## 1. Restringir la API key por dominio

La API key de Firebase es pública por diseño: viaja en el bundle que descarga
cada visitante, y eso está bien, no es una contraseña. Lo que no puede quedar
abierto es desde qué dominios se la acepta.

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

El modo monitoreo primero no es opcional. Exigirlo de entrada corta clientes
reales.

## 3. Dominios autorizados de Auth

- [ ] Firebase Console → Authentication → Settings → Dominios autorizados
- [ ] Borrar los que no uses
- [ ] Agregar el dominio propio cuando se compre (subproyecto D)

## 4. Política de contraseñas de Auth

- [ ] Authentication → Settings → Password policy
- [ ] Mínimo 8 caracteres, para que coincida con `src/utils/validarPassword.js`

La validación del cliente se puede saltear abriendo devtools; esta es la que
manda.

## 5. Plantillas de mail

Los mails de verificación y de reset ya se mandan (Firebase Auth los envía por
su cuenta, sin servidor). Pero llegan con texto genérico de Google, en inglés y
sin tu marca. Para una tienda que quiere verse profesional, eso es lo primero
que ve un cliente nuevo.

- [ ] Authentication → Templates → Verificación de email: traducir y firmar
- [ ] Authentication → Templates → Restablecer contraseña: traducir y firmar
- [ ] Cambiar el nombre del remitente
- [ ] Mandarse los dos mails a uno mismo y leerlos

## 6. Credencial del Admin SDK

- [ ] Configuración del proyecto → Cuentas de servicio → Generar clave privada
- [ ] Guardarla como `serviceAccount.json` en la raíz del proyecto
- [ ] Verificar: `git status --short serviceAccount.json` no debe imprimir nada
- [ ] Si alguna vez se filtra: revocarla en Google Cloud Console → IAM → Cuentas
      de servicio, y generar una nueva

Esa credencial se saltea **todas** las reglas de seguridad. Es la llave maestra
de la base.

## 7. Después de cada cambio de reglas

- [ ] `npm test` en verde
- [ ] `npx firebase deploy --only firestore:rules,storage:rules`
- [ ] Repasar los 8 puntos de verificación de la sección 0, Paso 6

---

## Lo que sigue abierto hasta el subproyecto B

El total de cada pedido lo calcula el navegador del cliente, y las reglas no
pueden revalidarlo: exigiría una lectura de Firestore por ítem del carrito y el
límite son 10 por evaluación.

**Hasta que exista `api/crear-orden`, tratá el total de cada pedido como
declarado por el cliente y verificalo al contactar.** Es una mitigación de
proceso, no técnica, y es la razón para que el subproyecto B venga inmediatamente
después de este.
