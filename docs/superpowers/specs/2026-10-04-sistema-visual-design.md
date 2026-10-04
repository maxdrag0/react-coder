# Spec — Subproyecto F: Sistema visual y rediseño

**Fecha:** 2026-10-04
**Estado:** pendiente de revisión
**Dirección estética elegida por el dueño:** "La noche"

---

## 1. Qué se pidió

Revisar vista por vista, modal por modal y componente por componente, y mejorarlos
visualmente para que el sitio sea limpio, claro, responsive y estéticamente
moderno. Desde el login hasta el carrito, pasando por el detalle de producto y
las cards. Tiene que verse bien en PC, notebook y celular.

## 2. Qué está mal hoy

El CSS actual no es feo: es **anónimo**. Usa Inter (la tipografía por defecto de
cualquier SaaS), un índigo genérico `#4361ee` que no tiene relación con la marca,
sombras `rgba(0,0,0,.1)` uniformes y un radio de borde aplicado por igual a todo.
Podría ser el panel de cualquier producto. Nada en pantalla dice "pirotecnia".

Tres problemas concretos:

**2.1 La paleta no es la de la marca.** El logo es azul acero, dorado cálido y
rojo. El CSS usa un índigo que no aparece en ningún lado del logo.

**2.2 El tema oscuro es un parche.** `main.css` define el tema claro en `:root` y
el oscuro como un override en `[data-theme="dark"]` que solo redefine 11 de las
32 variables. Las sombras, por ejemplo, se "adaptan" subiendo la opacidad del
negro, que sobre fondo oscuro no se lee: la elevación desaparece.

**2.3 La card esconde lo que se compra.** Ver sección 4.

## 3. La decisión estética y por qué

**La interfaz es la noche; el producto es la única luz.**

Un show de pirotecnia es 95% oscuridad y 5% luz. La interfaz adopta esa
proporción: fondo azul noche, un solo acento dorado, y el color pleno aparece
**únicamente dentro del media del producto**.

No es solo una metáfora. Tiene dos consecuencias prácticas:

- Sobre fondo oscuro, **cualquier foto o video de pirotecnia se ve bien**,
  incluso una mala. Importa porque los 323 productos no tienen foto y se van a
  cargar de a poco, probablemente con un celular.
- El fondo **no es negro**. Negro puro es el cliché obvio del rubro. El azul
  `#0E1726` es el azul del logo llevado a 12% de luminosidad, que además es el
  color real de un cielo nocturno sobre una ciudad.

## 4. Lo que no es decisión estética

El esquema de producto tiene campos que la interfaz ignora:

```js
duracion: null,          // cuánto dura el efecto
precioUnitario: 270,
precioDisplay: 27000,    // ×100
precioBulto: 270000,     // ×1000
subcategoria: "",
```

La card muestra **solo el precio unitario**. Nadie que compre pirotecnia para fin
de año compra de a una unidad: compra por display o por bulto. Están escondidos
los dos precios que mueven la venta.

Y un producto de pirotecnia **es invisible hasta que se usa**: la foto de un tubo
de cartón no dice nada. Lo que decide la compra es cuánto dura y cuánto sale el
bulto.

**Entra en el alcance independientemente de la dirección estética elegida.**

## 5. Alcance

### Entra

| Área | Qué |
|---|---|
| Sistema de tokens | Color, tipografía, escala de espacio, radios, elevación |
| Reestructura del tema | Oscuro por defecto, claro como alternativa |
| 10 páginas | Home, Products, ProductDetails, Carrito, Contact, Login, Register, Profile, NotFound, AdminDashboard |
| 2 modales | `Modal` común y el formulario de producto del panel |
| ~20 componentes | NavBar y sus hijos, Item, ItemList, ItemDetails, CarritoCard, CategoryFilter, Counter, Button, los 8 de auth |
| Información de la card | Los tres precios, duración, categoría |
| Responsive | Mobile-first, de 320px a 1440px+ |
| Accesibilidad | Contraste, foco visible, movimiento reducido, áreas táctiles |
| Datos de categorías | Normalizar los 5 valores inconsistentes (ver 9.1) |

### No entra

| Queda fuera | Dónde va |
|---|---|
| Componente de media que elija entre imagen, video propio y embed de YouTube | Tarea propia, inmediatamente después |
| Carrito persistente en localStorage | Tarea propia |
| Gate de edad y textos legales de pirotecnia | Tarea propia |
| Partir el `AdminDashboard` de 442 líneas | Subproyecto E |
| Unificar `name\|\|nombre`, `price\|\|precioUnitario` | Subproyecto E (requiere migrar datos) |
| `base: "/"`, SEO, favicon, dominio | Subproyecto D |
| Cualquier cambio de reglas de seguridad | Cerrado en A |

Las tres primeras se mencionan porque el dueño las pidió y están pendientes, pero
mezclarlas acá haría que ninguna quede terminada.

## 6. Sistema de tokens

### 6.1 Color

```css
--ground:        #0E1726;  /* fondo: el azul de marca al 12% de luminosidad */
--surface:       #162233;  /* cards, modales: un escalón arriba */
--surface-alto:  #1E2D42;  /* hover, filas alternas, inputs */

--gold:          #E6B32E;  /* ÚNICO acento: precio, CTA, foco */
--gold-suave:    #F0CC6B;  /* hover del acento */
--gold-linea:    rgba(230, 179, 46, 0.15);  /* hairlines */

--blue:          #3B7CB8;  /* estructura y links. NO es el acento */
--blue-suave:    #5B9AD4;

--danger:        #C0272D;  /* SOLO peligro. Nunca decorativo */
--exito:         #3E9D6B;  /* confirmaciones */

--text:          #F2F0EB;  /* blanco cálido: la luz de la pirotecnia es cálida */
--text-suave:    #8FA3BC;  /* secundario, azul grisáceo */
--text-tenue:    #5C6E86;  /* deshabilitado, metadatos */
```

Tema claro (override en `[data-theme="light"]`): `--ground: #F5F6F8`,
`--surface: #FFFFFF`, `--text: #16202E`, `--text-suave: #5A6B80`. El dorado baja
a `#B8881A` para alcanzar contraste sobre blanco, y el azul sube a `#2D6494`.

**Regla del rojo:** `--danger` se usa exclusivamente en borrar, sin stock, errores
de formulario y el aviso de edad. Nunca para destacar, nunca para decorar. En un
rubro regulado eso no es prolijidad: es que el rojo signifique algo.

### 6.2 Elevación — sin sombras

Sobre fondo oscuro las sombras no se leen; subirles la opacidad es el error
clásico de portar un tema claro. La elevación sale de dos cosas:

1. La luminosidad de la superficie (`--ground` → `--surface` → `--surface-alto`)
2. Una línea de 1px en `--gold-linea`

```css
--elev-0: none;
--elev-1: 0 0 0 1px var(--gold-linea);
--elev-2: 0 0 0 1px var(--gold-linea), 0 8px 24px rgba(0, 0, 0, 0.4);  /* solo modales */
```

En tema claro sí se usan sombras suaves, porque ahí sí funcionan.

### 6.3 Tipografía

Una familia, **Archivo** (variable, ejes de peso 100-900 y ancho 62-125), en dos
expresiones claramente distintas:

```css
--fuente: 'Archivo', system-ui, sans-serif;
```

| Rol | Tratamiento |
|---|---|
| Display y títulos | `font-stretch: 110%` · `font-weight: 600` |
| Cuerpo e interfaz | `font-stretch: 100%` · `font-weight: 400-500` |
| Precios y stock | `font-variant-numeric: tabular-nums` |

**Por qué Archivo y no Inter:** Inter es la tipografía por defecto de cualquier
SaaS, que es exactamente lo que hay hoy. Archivo viene de la tradición del
grotesco americano de cartelería y packaging impreso — el vernáculo visual de un
puesto de pirotecnia. Y usar el **eje de ancho** para separar display de cuerpo,
en vez de meter una segunda familia, es una decisión poco común y más cohesiva.

Escala modular, base 16px, razón 1.25:

```css
--t-xs: 0.75rem;   /* 12 — metadatos */
--t-sm: 0.875rem;  /* 14 — secundario */
--t-base: 1rem;    /* 16 — cuerpo */
--t-md: 1.25rem;   /* 20 — título de card */
--t-lg: 1.563rem;  /* 25 — título de sección */
--t-xl: 1.953rem;  /* 31 — título de página */
--t-2xl: 2.441rem; /* 39 — display */
--t-3xl: 3.052rem; /* 49 — hero */
```

Medida de texto: máximo 72 caracteres en párrafos. Interlineado 1.6 en cuerpo,
1.15 en display.

### 6.4 Espacio

Escala de 4px, sin valores sueltos fuera de ella:

```css
--e-1: 0.25rem;  --e-2: 0.5rem;   --e-3: 0.75rem;  --e-4: 1rem;
--e-5: 1.5rem;   --e-6: 2rem;     --e-7: 3rem;     --e-8: 4rem;
```

### 6.5 Radios — por rol, no uniformes

Aplicar un mismo radio a todo es el tell del "kit de cards SaaS". Acá el radio
codifica jerarquía:

```css
--r-media: 0;        /* el media va a sangre dentro de la card, como un marco */
--r-card: 12px;
--r-control: 8px;    /* botones, inputs */
--r-pill: 999px;     /* badges, chips de categoría */
```

### 6.6 Movimiento

```css
--mov-rapido: 120ms ease-out;
--mov-base: 200ms ease-out;
```

**El movimiento solo responde a una acción de la persona**: abrir un modal,
agregar al carrito (el contador cuenta), confirmar un pedido. No hay reveals al
scrollear ni hover-lift en las cards — son el tell más común de página generada.

Todo dentro de `@media (prefers-reduced-motion: reduce)` se anula.

## 7. Reestructura del tema: oscuro por defecto

Hoy `:root` define el tema claro y `[data-theme="dark"]` lo parchea. Se invierte:
`:root` define el oscuro y `[data-theme="light"]` es el override.

**Por qué importa más allá de la estética:** con la estructura actual, cualquier
variable nueva nace clara y hay que acordarse de redefinirla para oscuro. Al
invertirla, el modo que se diseña primero es el que se ve bien, y el claro se
revisa explícitamente.

`ThemeContext` **no cambia**: ya maneja `system | light | dark` y escribe
`data-theme` en el `<html>`, y en modo `system` sigue respetando lo que pida el
sistema operativo. Lo que cambia es cuál es el tema que se ve **antes de que el
JavaScript corra**: hoy el CSS nace claro y hay un parpadeo blanco al cargar en
un equipo configurado en oscuro. Al invertirlo, el fondo de arranque es el
oscuro, que es el que se diseña primero.

Punto a favor del estado actual: `data-theme` aparece **una sola vez en todo el
CSS**, en `main.css`. Ningún componente sabe en qué tema está — todos consumen
variables. Eso hace que invertir el tema sea un cambio en un archivo, no en
diecinueve.

## 8. Vista por vista

### 8.1 Home — el hero

Hoy: un `<h1>` que dice "Bienvenido a la tienda!" y debajo la lista de productos.

Una frase de bienvenida no ayuda a nadie. Para un catálogo de 323 productos donde
el comprador ya sabe qué busca ("necesito tortas y cañitas"), lo más útil como
primer elemento son **las categorías**, grandes y táctiles.

```
┌────────────────────────────────────────────┐
│  Pirotecnia                                │  display 49px, ancho 110%
│  Catálogo mayorista y minorista            │  --text-suave, 20px
│                                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │
│  │ Tortas │ │Morteros│ │Candelas│ │ Ver  │ │  chips --r-pill
│  └────────┘ └────────┘ └────────┘ │ todo │ │  borde --gold-linea
│                                   └──────┘ │
├────────────────────────────────────────────┤
│  Más vendidos                              │  --t-lg
│  [grid de cards]                           │
└────────────────────────────────────────────┘
```

El orden por `ventas` que ya existe se mantiene, con el encabezado "Más vendidos"
que hoy falta: la lista está ordenada por popularidad y nada lo dice.

### 8.2 Card de producto — el elemento más repetido

```
┌──────────────────────────────┐
│                              │   media a sangre, radio 0
│      [ video / foto ]        │   aspect-ratio 4/3
│                              │   sin foto: patrón sutil, no "No Image"
├──────────────────────────────┤
│ Torta 100 tiros              │   --t-md, ancho 110%
│ Tortas · 45 seg              │   --t-sm, --text-suave
│                              │
│ unidad    $4.500             │   tabular-nums
│ display   $45.000      ×10   │
│ bulto     $390.000     ×100  │   el bulto en --gold
│                              │
│ ▓▓▓▓▓▓▓▓▓▓▓░░░  87 en stock  │   barra fina; <10 pasa a --danger
└──────────────────────────────┘
   --surface + --elev-1
```

Cambios respecto de hoy: aparecen los tres precios, la duración y la categoría;
desaparece el botón "Ver Detalles" (la card entera es el link, lo que además
agranda el área táctil en celular); el stock se vuelve visual.

**Los tres precios solo se muestran si existen.** Hay productos sin
`precioDisplay` ni `precioBulto`; en esos casos la card muestra solo la unidad,
sin huecos.

**Sin foto:** en vez del cartel "No Image", un patrón geométrico tenue derivado de
la estrella del logo. 323 productos sin foto es el estado actual y durante un
tiempo va a ser lo normal: tiene que verse intencional, no roto.

### 8.3 Detalle de producto

Dos columnas en escritorio (media 60% / información 40%), apiladas en celular con
el media primero. El media ocupa la altura completa de la ventana menos la barra
de navegación: es lo único que vende el producto.

La información incluye lo que hoy no está: duración, categoría, subcategoría,
código, y los tres precios como una tabla.

> **Los tres precios se muestran, pero no se puede elegir cuál comprar.** Un
> selector de unidad (unidad / display / bulto) cambiaría qué se manda al carrito
> y por lo tanto el cálculo del pedido, que es lógica de negocio y no de
> presentación. Entra en el subproyecto B, junto con la revalidación del total en
> el servidor. Acá los precios son informativos: el comprador los ve y los
> menciona al coordinar, que es exactamente lo que pasa hoy con el pedido por
> mail.

### 8.4 Carrito

Hoy: lista de cards, un total, un botón. Sin dirección de envío, sin teléfono,
sin resumen de cantidades.

El rediseño mantiene el alcance (no se agregan campos de envío, eso es B/E) pero
arregla la presentación: lista a la izquierda, resumen fijo (`position: sticky`)
a la derecha en escritorio y fijo abajo en celular, con el total siempre visible.

Estado vacío: en vez de dos párrafos sueltos, un bloque con una acción
("Ver el catálogo"). Una pantalla vacía es una invitación a actuar.

### 8.5 Login, registro, perfil

Los componentes de auth se crearon en el subproyecto A y ya están componentizados
(`AuthCard`, `FormField`, `FormError`, `FormNotice`, `GoogleAuthButton`,
`PasswordResetLink`, `VerificacionPendiente`). Acá solo se les aplica el sistema:
tokens, tipografía, estados de foco.

Un cambio de estructura: la tarjeta de auth hoy flota centrada sobre el fondo de
página. En oscuro queda sin anclaje. Pasa a tener el media de marca a un lado en
escritorio (la estrella del logo, grande y recortada) y se mantiene centrada en
celular.

### 8.6 Modales

Dos: el `Modal` común (confirmación de compra) y el formulario de producto del
panel.

Ambos adoptan: fondo de página con `backdrop-filter: blur(8px)` y
`rgba(14,23,38,.7)`, superficie `--surface` con `--elev-2`, ancho máximo 480px el
común y 640px el de producto, y en celular se vuelven hojas que suben desde abajo
(`sheet`) en vez de cajas centradas, que es lo que se espera en un teléfono.

Accesibilidad que hoy no tienen: foco atrapado dentro del modal, cierre con
`Escape`, `aria-modal`, y que el foco vuelva al elemento que lo abrió.

### 8.7 Panel de administración

**No se reestructura** (son 442 líneas y partirlo es el subproyecto E). Se le
aplican los tokens y se arreglan dos cosas puntuales:

- La tabla no es usable en celular: pasa a cards apiladas por debajo de 768px.
- `AdminDashboard.jsx:235` renderiza `<img src={prod.image || prod.fotoUrl}>` sin
  guarda. Con los 323 productos vacíos, el navegador vuelve a pedir la página una
  vez por fila. Se agrega la guarda que `Item.jsx` ya tiene.

### 8.8 NavBar

260 líneas de CSS, el archivo de componente más grande. Se reescribe sobre los
tokens, manteniendo el comportamiento: logo, links, buscador, admin condicional,
perfil, carrito, y el menú hamburguesa en celular.

Dos arreglos: el buscador en celular hoy aparece y desaparece con un botón
aparte; pasa a ser siempre visible como un campo compacto. Y el contador del
carrito pasa a ser el único elemento con movimiento de la barra, al agregar un
producto.

### 8.9 Contacto y 404

Contacto: el formulario ya tiene los campos nuevos (dirección, ciudad, contador
de caracteres). Se le aplica el sistema y se le agrega un estado de envío real en
vez del `alert()`.

404: hoy es texto plano. Pasa a tener la estrella del logo y un camino de vuelta
al catálogo.

## 9. Datos que hay que normalizar

### 9.1 Las categorías están inconsistentes

`CATEGORIES` declara 15, pero los productos tienen 20 valores distintos. Cuatro no
existen en la constante y están en mayúsculas — `"POPULARES"`,
`"GRANDES Y PROFESIONALES"`, `"CHICAS E INTERMEDIAS"`, `"BAJO IMPACTO SONORO"` —
más productos con `categoria: ""`.

Parecen subcategorías cargadas en el campo equivocado. Es la razón por la que
`obtenerProductos` hace `where("category", "in", [categoria, categoria.toUpperCase()])`:
alguien parcheó la inconsistencia en la consulta en vez de arreglar el dato.

Si el hero de la home son las categorías, ese ruido se ve en pantalla.

**Decisión:** un script `scripts/normalizar-categorias.mjs` que mueve los cuatro
valores en mayúsculas al campo `subcategoria`, les asigna la categoría que
corresponde, y reporta los productos sin categoría para que el dueño los
clasifique. **El script reporta antes de escribir y pide confirmación**: no se
toca el catálogo de producción a ciegas.

La query con `in` y `toUpperCase()` se deja como está hasta que los datos estén
normalizados en producción. Sacarla antes rompería el filtro.

## 10. Responsive

**Mobile-first.** Hoy el CSS es desktop-first (`max-width`), lo que obliga a
desarmar estilos en cada breakpoint. Se invierte a `min-width`.

| Breakpoint | Qué cambia |
|---|---|
| base (320px+) | Una columna. Navegación en hamburguesa. Modales como hojas. Resumen del carrito fijo abajo |
| `640px` | Grid de cards a 2 columnas |
| `900px` | Navegación desplegada. Grid a 3 columnas. Detalle a dos columnas |
| `1200px` | Grid a 4 columnas. Ancho máximo del contenido |

Reglas que aplican en todos:

- Área táctil mínima de 44×44px en todo lo clickeable
- Sin scroll horizontal en ningún ancho, con 16px de aire a los costados
- La tabla del panel se vuelve cards por debajo de 768px
- `clamp()` para los tamaños de display, para que no haya saltos entre breakpoints

## 11. Accesibilidad — el piso, no un extra

- Contraste mínimo 4.5:1 en texto normal y 3:1 en texto grande, verificado en los
  dos temas. El dorado sobre `--ground` da 8.9:1; sobre blanco baja a 2.1:1, por
  eso en tema claro el dorado se oscurece a `#B8881A`.
- Foco visible en todo lo enfocable: anillo de 2px en `--gold` con 2px de
  separación. Nunca `outline: none` sin reemplazo.
- `prefers-reduced-motion: reduce` anula todas las transiciones.
- Los modales atrapan el foco y cierran con `Escape`.
- La barra de stock no comunica solo por color: lleva el número al lado.

## 12. Cómo se verifica

El rediseño es visual y la mayor parte no se puede probar con aserciones. Lo que
sí se puede, se prueba:

| Qué | Cómo |
|---|---|
| Los tres precios aparecen solo si existen | Test de `Item` con producto completo y producto solo con unidad |
| El stock bajo cambia de color y lo dice en texto | Test de `Item` con stock 5 y stock 87 |
| La card entera es un link | Test de rol y destino |
| Sin foto no se renderiza `<img src="">` | Test de `Item` y del panel — el bug real de 8.7 |
| El modal cierra con Escape y devuelve el foco | Test de `Modal` con `userEvent` |
| El tema claro no rompe el contraste del dorado | Test del token calculado |

Lo visual se verifica a mano, en tres anchos (360px, 1024px, 1440px) y en los dos
temas, con una lista de comprobación por vista en el plan de implementación.

## 13. Riesgos

| Riesgo | Mitigación |
|---|---|
| 19 archivos CSS reescritos a la vez: algo se rompe sin que se note | Una vista por tarea, con comprobación visual al cerrar cada una |
| El tema claro queda abandonado al diseñar oscuro primero | Comprobación explícita de los dos temas en cada tarea |
| El script de categorías toca datos de producción | Reporta y pide confirmación antes de escribir; se corre primero en local |
| Archivo no carga y cae a la fuente de sistema | `font-display: swap` y una pila de respaldo con métricas parecidas |
| El rediseño tapa que no hay fotos | El estado sin foto se diseña a propósito (8.2); el problema de contenido queda explícito |

## 14. Lo que esto no arregla

El sitio va a verse bien y **va a seguir sin tener una sola foto de producto**.
Son 323 productos con `fotoUrl: ""`. El diseño hace que esa ausencia se vea
intencional en vez de rota, pero no la resuelve.

Es el cuello de botella real para vender, y es trabajo de contenido, no de código.
