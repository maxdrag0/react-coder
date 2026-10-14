# 🛒 Ecommerce React - Proyecto Final

Este es un proyecto de Ecommerce desarrollado con **React**, utilizando **Firebase** como base de datos en tiempo real para la gestión de productos, órdenes de compra y mensajes de contacto.

---

## 🚀 Características

- **Catálogo de Productos:** Visualización dinámica de ítems desde Firestore.
- **Filtrado por Categoría:** Navegación optimizada mediante rutas de categorías.
- **Detalle de Producto:** Vista individual con manejo de stock y contador.
- **Carrito de Compras:** Gestión de estado global con **Context API**.
- **Checkout:** Proceso de compra con generación de ID de orden en Firebase.
- **Formulario de Contacto:** Envío de mensajes directo a la base de datos.

---

## 🛠️ Tecnologías Utilizadas

- **React.js** (Hooks, Context API, Router)
- **Firebase** (Firestore Database)
- **React Router Dom** (Navegación)
- **React Spinners** (Carga de datos)
- **CSS3**

---

## 📦 Instalación y Configuración

Sigue estos pasos para correr el proyecto localmente:

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/maxdrag0/react-coder](https://github.com/maxdrag0/react-coder)
   cd react-coder
   ```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el frontend |
| `npm run dev:api` | Frontend + las funciones de `api/` (hace falta para el checkout) |
| `npm test` | Tests unitarios + de reglas de seguridad |
| `npm run test:unit` | Solo los unitarios (rápido, sin emulador) |
| `npm run test:rules` | Reglas de Firestore y Storage contra el emulador |
| `npm run set-admin -- <email>` | Da permisos de admin a un usuario |
| `npm run seed` | Carga el catálogo inicial en Firestore (una sola vez) |
| `npm run unificar-campos` | Reporta qué productos tienen los campos duplicados en inglés |

Los tests de reglas necesitan Java instalado (lo usa el emulador de Firebase).

## La API de órdenes

El total de un pedido lo calcula el servidor, no el navegador: `api/orden.js`
recibe códigos y cantidades, lee el catálogo con el Admin SDK y escribe la
orden. Las reglas de Firestore tienen `compras.create` en `false`, así que el
cliente no puede escribir pedidos.

Para el checkout en local hace falta `vercel dev`, que sirve el front y la
función juntos:

```bash
npm i -g vercel      # una sola vez
npm run dev:api
```

`npm run dev` (Vite solo) sigue sirviendo para todo lo que no sea el checkout:
sin la función, el envío del pedido responde el `index.html` y falla.

Las tres variables del service account van en `.env.local`, que ya está
ignorado por el patrón `*.local`:

```
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### Dónde vive la tienda

En Vercel. El deploy a GitHub Pages se fue: `gh-pages -d dist` pusheaba una
rama con solo el `dist/` compilado, y Vercel —que construye todas las ramas—
fallaba ahí con `vite build: command not found` y mandaba un mail por cada
push. `vercel.json` además tiene esa rama excluida por si alguien la vuelve a
pushear a mano. Para recuperar el deploy a Pages alcanza con volver a agregar
los scripts `predeploy` y `deploy` (están en el historial de git).

## Un solo idioma en el catálogo

El esquema arrastra cada campo del producto en dos idiomas: el panel viejo
escribía `name`, `category`, `description` e `image`, y el nuevo escribe
`nombre`, `categoria`, `descripcion` y `fotoUrl`.

```bash
npm run unificar-campos              # reporta, no escribe
npm run unificar-campos -- --aplicar # escribe
```

Cuando los dos campos tienen valores **distintos**, el script no elige: los
lista como conflicto y los deja intactos. Puede que alguien haya corregido el
nombre en un panel y no en el otro, y quedarse con uno en silencio pierde el
otro. Se corrigen a mano en el panel y se vuelve a correr.

Los **pedidos no se tocan**. Un pedido es el registro de lo que se acordó y
guarda el nombre que el producto tenía ese día; reescribirlo falsearía el
historial. Por eso `nombreDeItem` en `src/constants/renglon.js` conserva el
fallback a `name`: es para leer renglones viejos, no productos.

Recién **después** de correr el script con `--aplicar` y ver cero conflictos
se pueden sacar los `|| item.name` que quedan del lado del catálogo.

## Seguridad

Las reglas de Firestore y Storage están en `firestore.rules` y `storage.rules`,
bajo test en `tests/rules/`. **No editarlas sin correr `npm test`.**

El permiso de admin es un custom claim del token de Firebase Auth, no un campo
de la base de datos. Hay exactamente dos roles: con el claim `admin` sos
soporte/dueño, sin el claim sos comprador. Se asigna con `npm run set-admin`.
Después de asignarlo hay que cerrar sesión y volver a entrar, porque los tokens
duran una hora.

Los pasos manuales de la consola de Firebase y Google Cloud, incluido el deploy
de las reglas, están en `docs/runbook-seguridad-consola.md`.

> La carpeta `docs/` queda fuera del repositorio a propósito: son runbooks
> operativos y notas de decisiones, no documentación del código. Vive solo en
> la máquina de desarrollo.
