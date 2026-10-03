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
| `npm test` | Tests unitarios + de reglas de seguridad (134 en total) |
| `npm run test:unit` | Solo los unitarios (rápido, sin emulador) |
| `npm run test:rules` | Reglas de Firestore y Storage contra el emulador |
| `npm run set-admin -- <email>` | Da permisos de admin a un usuario |
| `npm run seed` | Carga el catálogo inicial en Firestore (una sola vez) |

Los tests de reglas necesitan Java instalado (lo usa el emulador de Firebase).

## Seguridad

Las reglas de Firestore y Storage están en `firestore.rules` y `storage.rules`,
bajo test en `tests/rules/`. **No editarlas sin correr `npm test`.**

El permiso de admin es un custom claim del token de Firebase Auth, no un campo
de la base de datos. Hay exactamente dos roles: con el claim `admin` sos
soporte/dueño, sin el claim sos comprador. Se asigna con `npm run set-admin`.
Después de asignarlo hay que cerrar sesión y volver a entrar, porque los tokens
duran una hora.

Los pasos manuales de la consola de Firebase y Google Cloud, incluido el deploy
de las reglas, están en [docs/runbook-seguridad-consola.md](docs/runbook-seguridad-consola.md).
