# Sistema Visual y Rediseño — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el CSS genérico actual por un sistema de diseño derivado de la marca —fondo azul noche, dorado como único acento— y aplicarlo a las 10 páginas, 2 modales y ~20 componentes, con layout mobile-first y accesibilidad verificada en los dos temas.

**Architecture:** Una capa de tokens en `src/styles/tokens.css` de la que depende todo lo demás. El tema oscuro pasa a vivir en `:root` y el claro a ser el override, invirtiendo lo que hay hoy. Sobre los tokens se construyen tres primitivas nuevas y testeables (`Precio`, `BarraStock`, `MediaPlaceholder`) que la card de producto compone, y después cada vista se reescribe consumiendo tokens y primitivas. Ningún componente vuelve a saber en qué tema está.

**Tech Stack:** CSS custom properties · Archivo (Google Fonts variable, ejes `wght` y `wdth`) · React 19 · Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-10-04-sistema-visual-design.md`

## Global Constraints

- **Dirección estética: "La noche".** La interfaz es la noche; el producto es la única luz. Color pleno **solo** dentro del media del producto.
- **Paleta exacta, derivada del logo:** `--ground: #0E1726` · `--surface: #162233` · `--surface-alto: #1E2D42` · `--gold: #E6B32E` · `--blue: #3B7CB8` · `--danger: #C0272D` · `--text: #F2F0EB` · `--text-suave: #8FA3BC`.
- **El rojo (`--danger`) es exclusivamente peligro:** borrar, sin stock, error de formulario, aviso de edad. Nunca para destacar ni decorar.
- **Sin sombras en tema oscuro.** La elevación sale de la luminosidad de la superficie más `0 0 0 1px var(--gold-linea)`. En tema claro sí hay sombras suaves.
- **Radios por rol, nunca uniformes:** media `0`, card `12px`, controles `8px`, pills `999px`.
- **Movimiento solo como respuesta a una acción de la persona.** Prohibidos: reveals al scrollear, hover-lift en cards, transiciones decorativas. Todo se anula bajo `prefers-reduced-motion: reduce`.
- **Una sola familia tipográfica, Archivo.** Display con `font-stretch: 110%` y `font-weight: 600`; cuerpo con `100%` y `400-500`. Precios y stock con `font-variant-numeric: tabular-nums`.
- **Escala de espacio de 4px.** Ningún valor suelto fuera de `--e-1` a `--e-8`.
- **Mobile-first.** Media queries con `min-width`, nunca `max-width`. Breakpoints: 640, 900, 1200.
- **Componentizar al mínimo.** Si un archivo nuevo pasa de ~120 líneas, se parte. Nada de componentes de clase.
- **Todo el texto de interfaz en castellano rioplatense**, voz activa, sin mayúsculas sostenidas como etiquetas.
- **Área táctil mínima 44×44px** en todo lo clickeable.
- **No tocar:** las reglas de seguridad (cerradas en A), el cálculo del total del carrito (es B), la estructura del `AdminDashboard` más allá de estilos y el arreglo puntual del `src` vacío (es E), ni `vite.config.js` / SEO / favicon (es D).

## Review Focus

Cinco modos de falla que el spec implica, que ningún test escribiría por defecto, y que son los más probables de golpear a una persona real:

1. **Un nombre de producto largo rompe la card.** "Petardo El Villerito Nacional" más categoría y duración en una card de 260px: sin `min-width: 0` en los hijos del grid, el texto fuerza scroll horizontal en toda la página. Es la falla responsive más común y la más visible en celular. → Test en Task 5.
2. **Un producto sin `precioDisplay` ni `precioBulto`.** Hay muchos en el catálogo. La card no puede mostrar filas vacías ni `$undefined`. → Test en Task 2.
3. **Stock en 0.** La barra no puede renderizar un ancho roto, tiene que decirlo en texto y no solo con color, y el producto no puede parecer comprable. → Test en Task 3.
4. **Tema claro: el dorado sobre blanco.** `#E6B32E` sobre `#FFFFFF` da 2.1:1, ilegible. Si alguien olvida el override del tema claro, el precio —el dato más importante de la card— desaparece. → Test en Task 1.
5. **Modal abierto y la persona presiona Tab hasta salirse.** Sin trampa de foco, el foco se va al contenido de atrás, el lector de pantalla lee la página equivocada y `Escape` no cierra. → Test en Task 6.

---

## File Structure

**Nuevos — capa de tokens**

| Archivo | Responsabilidad |
|---|---|
| `src/styles/tokens.css` | Todos los tokens. Única fuente de verdad del sistema |
| `src/styles/base.css` | Reset, tipografía base, utilidades de layout |

**Nuevos — primitivas (componentizadas al mínimo)**

| Archivo | Responsabilidad | Líneas aprox. |
|---|---|---|
| `src/components/common/Precio/Precio.jsx` | Los tres niveles de precio, mostrando solo los que existen | 45 |
| `src/components/common/BarraStock/BarraStock.jsx` | Stock como barra + número, con umbral de alerta | 35 |
| `src/components/common/MediaPlaceholder/MediaPlaceholder.jsx` | Patrón derivado de la estrella cuando no hay foto | 30 |
| `src/components/CategoriaChips/CategoriaChips.jsx` | Chips de categoría del hero de la home | 40 |
| `src/utils/formatearPrecio.js` | Formato de moneda argentina, función pura | 15 |

**Nuevos — scripts y tests**

| Archivo | Responsabilidad |
|---|---|
| `scripts/normalizar-categorias.mjs` | Reporta y corrige las categorías inconsistentes |
| `tests/unit/contraste.test.js` | Verifica los ratios WCAG de los tokens en ambos temas |
| `tests/unit/Precio.test.jsx` · `BarraStock.test.jsx` · `Item.test.jsx` · `Modal.test.jsx` · `formatearPrecio.test.js` | |

**Modificados**

`src/main.css` (pasa a importar tokens y base) · los 19 CSS de componentes y páginas · `index.html` (fuente) · `src/components/Item/Item.jsx` · `src/components/common/Modal/Modal.jsx` · `src/components/ItemDetails/ItemDetails.jsx` · `src/pages/Home/Home.jsx` · `src/pages/Admin/AdminDashboard.jsx` (solo el `src` vacío y la tabla en celular)

---

### Task 1: Capa de tokens y tema oscuro por defecto

La base de la que depende todo lo demás. Incluye el test de contraste, que es el Review Focus #4.

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `tests/unit/contraste.test.js`
- Modify: `src/main.css`, `index.html`

**Interfaces:**
- Consumes: nada, es la primera tarea.
- Produces: todas las variables CSS que el resto del plan consume. Los nombres exactos están en el Step 1 y **no cambian** en ninguna tarea posterior.

- [ ] **Step 1: Crear `src/styles/tokens.css`**

```css
/* Tokens del sistema visual. Única fuente de verdad.
   El tema oscuro vive en :root a propósito: es el que se diseña primero y el
   que se ve antes de que corra el JavaScript. El claro es el override. */

:root {
  /* Color — el fondo es el azul del logo al 12% de luminosidad, no negro.
     Negro puro es el cliché del rubro; el cielo nocturno real es azul. */
  --ground: #0E1726;
  --surface: #162233;
  --surface-alto: #1E2D42;

  --gold: #E6B32E;
  --gold-suave: #F0CC6B;
  --gold-linea: rgba(230, 179, 46, 0.15);

  --blue: #3B7CB8;
  --blue-suave: #5B9AD4;

  --danger: #C0272D;
  --danger-fondo: rgba(192, 39, 45, 0.12);
  --exito: #3E9D6B;
  --exito-fondo: rgba(62, 157, 107, 0.12);

  --text: #F2F0EB;
  --text-suave: #8FA3BC;
  --text-tenue: #5C6E86;

  /* Elevación — sin sombras: sobre fondo oscuro no se leen. */
  --elev-1: 0 0 0 1px var(--gold-linea);
  --elev-2: 0 0 0 1px var(--gold-linea), 0 8px 24px rgba(0, 0, 0, 0.4);

  /* Tipografía */
  --fuente: 'Archivo', system-ui, -apple-system, sans-serif;
  --ancho-display: 110%;
  --ancho-cuerpo: 100%;

  --t-xs: 0.75rem;
  --t-sm: 0.875rem;
  --t-base: 1rem;
  --t-md: 1.25rem;
  --t-lg: 1.563rem;
  --t-xl: 1.953rem;
  --t-2xl: 2.441rem;
  --t-3xl: 3.052rem;

  /* Espacio — escala de 4px, sin valores sueltos fuera de acá */
  --e-1: 0.25rem;
  --e-2: 0.5rem;
  --e-3: 0.75rem;
  --e-4: 1rem;
  --e-5: 1.5rem;
  --e-6: 2rem;
  --e-7: 3rem;
  --e-8: 4rem;

  /* Radios por rol, no uniformes: el radio codifica jerarquía */
  --r-media: 0;
  --r-card: 12px;
  --r-control: 8px;
  --r-pill: 999px;

  /* Movimiento — solo responde a acciones de la persona */
  --mov-rapido: 120ms ease-out;
  --mov-base: 200ms ease-out;

  --ancho-max: 1200px;
  --medida: 72ch;
}

[data-theme="light"] {
  --ground: #F5F6F8;
  --surface: #FFFFFF;
  --surface-alto: #EDF0F4;

  /* El dorado de marca da 2.1:1 sobre blanco: ilegible. Se oscurece hasta
     alcanzar 4.5:1 sin dejar de ser el mismo color. */
  --gold: #8A6410;
  --gold-suave: #6E4F0C;
  --gold-linea: rgba(138, 100, 16, 0.18);

  --blue: #245A87;
  --blue-suave: #1B4467;

  --danger: #A81F25;
  --danger-fondo: rgba(168, 31, 37, 0.08);
  --exito: #2A7A50;
  --exito-fondo: rgba(42, 122, 80, 0.08);

  --text: #16202E;
  --text-suave: #4A5A6E;
  --text-tenue: #74839A;

  /* En claro las sombras sí funcionan */
  --elev-1: 0 1px 2px rgba(22, 32, 46, 0.06), 0 0 0 1px rgba(22, 32, 46, 0.06);
  --elev-2: 0 12px 32px rgba(22, 32, 46, 0.12), 0 0 0 1px rgba(22, 32, 46, 0.08);
}
```

- [ ] **Step 2: Escribir el test de contraste que falla**

`tests/unit/contraste.test.js`

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/tokens.css", "utf8");

// Extrae el valor de una variable dentro de un bloque (:root o [data-theme="light"]).
function token(bloque, nombre) {
  const inicio = css.indexOf(bloque);
  if (inicio === -1) throw new Error(`No existe el bloque ${bloque}`);
  const fin = css.indexOf("}", inicio);
  const cuerpo = css.slice(inicio, fin);
  const m = cuerpo.match(new RegExp(`${nombre}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`No se encontró ${nombre} en ${bloque}`);
  return m[1];
}

// Luminancia relativa segun WCAG 2.1
function luminancia(hex) {
  const canal = (c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = canal(hex.slice(1, 3));
  const g = canal(hex.slice(3, 5));
  const b = canal(hex.slice(5, 7));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const OSCURO = ":root {";
const CLARO = '[data-theme="light"] {';

describe("contraste de los tokens — tema oscuro", () => {
  it("el texto principal sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--text"), token(OSCURO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el texto secundario sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--text-suave"), token(OSCURO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el dorado sobre el fondo supera 4.5:1 (es donde va el precio)", () => {
    expect(contraste(token(OSCURO, "--gold"), token(OSCURO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el texto principal sobre la superficie de card supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--text"), token(OSCURO, "--surface")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el dorado sobre la superficie de card supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--gold"), token(OSCURO, "--surface")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el rojo de peligro sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--danger"), token(OSCURO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });
});

describe("contraste de los tokens — tema claro", () => {
  it("el texto principal sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(CLARO, "--text"), token(CLARO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el texto secundario sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(CLARO, "--text-suave"), token(CLARO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("EL DORADO SOBRE BLANCO supera 4.5:1", () => {
    // Review Focus #4: el dorado de marca da 2.1:1 sobre blanco. Si alguien
    // olvida oscurecerlo en el tema claro, el precio —el dato más importante
    // de la card— se vuelve ilegible y nadie se da cuenta porque en oscuro
    // se ve perfecto.
    expect(contraste(token(CLARO, "--gold"), token(CLARO, "--surface")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el rojo de peligro sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(CLARO, "--danger"), token(CLARO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });
});

describe("el dorado de marca sin corregir NO pasaría en claro", () => {
  it("documenta por qué el tema claro necesita su propio dorado", () => {
    // Si este test alguna vez falla, significa que #E6B32E pasó a ser legible
    // sobre blanco, lo cual es imposible: está acá para que quede escrito por
    // qué el override existe.
    expect(contraste("#E6B32E", "#FFFFFF")).toBeLessThan(3);
  });
});
```

- [ ] **Step 3: Correr y verificar que falla**

```bash
npx vitest run tests/unit/contraste.test.js
```
Esperado: FAIL si algún token no alcanza el ratio. Si pasa de entrada, verificar que el archivo se está leyendo (el helper `token` tira error explícito si no encuentra el bloque).

> Si algún ratio no llega, ajustar el token en `tokens.css` hasta que pase. **No bajar el umbral del test.** Los valores del Step 1 ya están calculados para pasar; este paso es la verificación, no una negociación.

- [ ] **Step 4: Crear `src/styles/base.css`**

```css
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scrollbar-gutter: stable;
  scroll-behavior: smooth;
  /* El color de arranque antes de que corra el JS: sin esto hay un
     parpadeo blanco al cargar en un equipo configurado en oscuro. */
  background-color: var(--ground);
  color-scheme: dark;
}

[data-theme="light"] {
  color-scheme: light;
}

body {
  min-height: 100dvh;
  font-family: var(--fuente);
  font-size: var(--t-base);
  font-weight: 400;
  font-stretch: var(--ancho-cuerpo);
  line-height: 1.6;
  background-color: var(--ground);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4 {
  font-stretch: var(--ancho-display);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

h1 { font-size: clamp(var(--t-xl), 5vw, var(--t-3xl)); }
h2 { font-size: clamp(var(--t-lg), 3.5vw, var(--t-2xl)); }
h3 { font-size: var(--t-md); }

p { max-width: var(--medida); }

a {
  color: var(--blue-suave);
  text-decoration: none;
}
a:hover { color: var(--gold); }

button, input, select, textarea {
  font: inherit;
  color: inherit;
}

button { cursor: pointer; }

/* Foco visible en todo lo enfocable. Nunca outline:none sin reemplazo. */
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
  border-radius: var(--r-control);
}

img, video, svg { display: block; max-width: 100%; }

/* Área táctil mínima en todo lo clickeable */
button, a[role="button"], [role="tab"] {
  min-height: 44px;
  min-width: 44px;
}

.contenedor {
  width: 100%;
  max-width: var(--ancho-max);
  margin-inline: auto;
  padding-inline: var(--e-4);
}

.solo-lectores {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5: Reemplazar `src/main.css`**

El archivo entero pasa a ser solo los imports. Todo lo que tenía (variables, reset, estilos base) se fue a los dos archivos nuevos.

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&display=swap');
@import './styles/tokens.css';
@import './styles/base.css';
```

- [ ] **Step 6: Precargar la fuente en `index.html`**

Dentro del `<head>`, antes del `<title>`:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

- [ ] **Step 7: Correr los tests y verificar que pasan**

```bash
npx vitest run tests/unit/contraste.test.js
```
Esperado: PASS, 11 tests.

- [ ] **Step 8: Verificar que la app compila y arranca en oscuro**

```bash
npm run build
```
Esperado: build exitoso. Levantar `npm run dev` y confirmar que el fondo es azul oscuro y que no hay parpadeo blanco al recargar.

- [ ] **Step 9: Commit**

```bash
git add src/styles/ src/main.css index.html tests/unit/contraste.test.js
git commit -m "feat: capa de tokens con tema oscuro por defecto

El fondo es el azul del logo al 12% de luminosidad, no negro: negro puro
es el cliché del rubro y el cielo nocturno real es azul. El dorado del
logo es el único acento y el rojo queda reservado para peligro.

Invierte el tema: el oscuro pasa a :root y el claro a override, así el
modo que se diseña primero es el que se ve antes de que corra el JS y
desaparece el parpadeo blanco al cargar.

Las sombras se eliminan en oscuro porque no se leen; la elevación sale de
la luminosidad de la superficie más una línea de 1px en dorado.

Los ratios de contraste de los dos temas quedan bajo test, incluido el
caso que más fácil se escapa: el dorado de marca da 2.1:1 sobre blanco.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `Precio` — los tres niveles

Review Focus #2 vive acá.

**Files:**
- Create: `src/utils/formatearPrecio.js`, `src/components/common/Precio/Precio.jsx`, `src/components/common/Precio/Precio.css`, `tests/unit/formatearPrecio.test.js`, `tests/unit/Precio.test.jsx`

**Interfaces:**
- Consumes: tokens de la Task 1.
- Produces:
  - `formatearPrecio(valor: number): string` — `4500` → `"$4.500"`.
  - `<Precio unitario={number} display={number|null} bulto={number|null} compacto={boolean} />`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/formatearPrecio.test.js`

```js
import { describe, it, expect } from "vitest";
import { formatearPrecio } from "@/utils/formatearPrecio";

describe("formatearPrecio", () => {
  it("usa punto como separador de miles", () => {
    expect(formatearPrecio(4500)).toBe("$4.500");
  });

  it("formatea cientos de miles", () => {
    expect(formatearPrecio(390000)).toBe("$390.000");
  });

  it("formatea un número chico sin separador", () => {
    expect(formatearPrecio(270)).toBe("$270");
  });

  it("no muestra decimales", () => {
    expect(formatearPrecio(4500.75)).toBe("$4.501");
  });

  it("devuelve null para null, para no renderizar nada", () => {
    expect(formatearPrecio(null)).toBeNull();
  });

  it("devuelve null para undefined", () => {
    expect(formatearPrecio(undefined)).toBeNull();
  });

  it("devuelve null para cero (un precio de 0 no es un precio)", () => {
    expect(formatearPrecio(0)).toBeNull();
  });

  it("devuelve null para un string", () => {
    expect(formatearPrecio("4500")).toBeNull();
  });
});
```

`tests/unit/Precio.test.jsx`

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Precio from "@/components/common/Precio/Precio";

describe("Precio", () => {
  it("muestra los tres niveles cuando los tres existen", () => {
    render(<Precio unitario={4500} display={45000} bulto={390000} />);
    expect(screen.getByText("$4.500")).toBeInTheDocument();
    expect(screen.getByText("$45.000")).toBeInTheDocument();
    expect(screen.getByText("$390.000")).toBeInTheDocument();
  });

  it("muestra SOLO la unidad cuando no hay display ni bulto", () => {
    // Review Focus #2: hay muchos productos así en el catálogo.
    render(<Precio unitario={270} display={null} bulto={null} />);
    expect(screen.getByText("$270")).toBeInTheDocument();
    expect(screen.queryByText(/display/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bulto/i)).not.toBeInTheDocument();
  });

  it("nunca renderiza el texto undefined", () => {
    const { container } = render(<Precio unitario={270} />);
    expect(container.textContent).not.toMatch(/undefined|NaN|\$null/);
  });

  it("omite el bulto pero muestra el display si solo falta uno", () => {
    render(<Precio unitario={270} display={27000} bulto={null} />);
    expect(screen.getByText("$27.000")).toBeInTheDocument();
    expect(screen.queryByText(/bulto/i)).not.toBeInTheDocument();
  });

  it("muestra el multiplicador de cada nivel", () => {
    render(<Precio unitario={270} display={27000} bulto={270000} />);
    expect(screen.getByText("×100")).toBeInTheDocument();
    expect(screen.getByText("×1000")).toBeInTheDocument();
  });

  it("no explota si el unitario tampoco existe", () => {
    const { container } = render(<Precio unitario={null} />);
    expect(container.textContent).not.toMatch(/undefined|NaN/);
  });

  it("en modo compacto muestra solo unidad y bulto", () => {
    render(<Precio unitario={270} display={27000} bulto={270000} compacto />);
    expect(screen.getByText("$270")).toBeInTheDocument();
    expect(screen.getByText("$270.000")).toBeInTheDocument();
    expect(screen.queryByText("$27.000")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
npx vitest run tests/unit/formatearPrecio.test.js tests/unit/Precio.test.jsx
```
Esperado: FAIL, los módulos no existen.

- [ ] **Step 3: Crear `src/utils/formatearPrecio.js`**

```js
const formateador = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Devuelve el precio formateado, o null si no hay un precio que mostrar.
 * Devolver null y no "" permite que quien lo use decida no renderizar la fila
 * entera: hay productos sin precio de display ni de bulto, y una fila vacía
 * se lee como un error.
 */
export const formatearPrecio = (valor) => {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
    return null;
  }
  return formateador.format(valor).replace(/\s/g, "");
};
```

- [ ] **Step 4: Crear `src/components/common/Precio/Precio.jsx`**

```jsx
import { formatearPrecio } from "@/utils/formatearPrecio";
import "./Precio.css";

// Los tres niveles con los que se compra pirotecnia. Nadie compra de a una
// unidad para fin de año: el bulto es el precio que mueve la venta, por eso
// es el único en dorado.
const NIVELES = [
  { clave: "unitario", etiqueta: "unidad", multiplicador: null },
  { clave: "display", etiqueta: "display", multiplicador: "×100" },
  { clave: "bulto", etiqueta: "bulto", multiplicador: "×1000" },
];

const Precio = ({ unitario, display, bulto, compacto = false }) => {
  const valores = { unitario, display, bulto };

  const filas = NIVELES
    .filter((n) => !(compacto && n.clave === "display"))
    .map((n) => ({ ...n, texto: formatearPrecio(valores[n.clave]) }))
    .filter((n) => n.texto !== null);

  if (filas.length === 0) return null;

  return (
    <dl className="precio">
      {filas.map((n) => (
        <div key={n.clave} className={`precio-fila precio-${n.clave}`}>
          <dt>{n.etiqueta}</dt>
          <dd>{n.texto}</dd>
          {n.multiplicador && <span className="precio-mult">{n.multiplicador}</span>}
        </div>
      ))}
    </dl>
  );
};

export default Precio;
```

- [ ] **Step 5: Crear `src/components/common/Precio/Precio.css`**

```css
.precio {
  display: grid;
  gap: var(--e-1);
  font-variant-numeric: tabular-nums;
}

.precio-fila {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: baseline;
  gap: var(--e-2);
}

.precio-fila dt {
  font-size: var(--t-xs);
  color: var(--text-tenue);
}

.precio-fila dd {
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--text-suave);
}

.precio-mult {
  font-size: var(--t-xs);
  color: var(--text-tenue);
}

/* El bulto es el que se compra: es el único que lleva el acento. */
.precio-bulto dd {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--gold);
}
```

- [ ] **Step 6: Correr y verificar que pasan**

```bash
npx vitest run tests/unit/formatearPrecio.test.js tests/unit/Precio.test.jsx
```
Esperado: PASS, 15 tests.

- [ ] **Step 7: Commit**

```bash
git add src/utils/formatearPrecio.js src/components/common/Precio/ tests/unit/formatearPrecio.test.js tests/unit/Precio.test.jsx
git commit -m "feat: componente Precio con los tres niveles de compra

La card mostraba solo el precio unitario, pero el esquema tiene
precioDisplay y precioBulto. Nadie compra pirotecnia de a una unidad para
fin de año: estaban escondidos los dos precios que mueven la venta.

formatearPrecio devuelve null en vez de cadena vacía cuando no hay precio,
para que la fila entera no se renderice: hay muchos productos sin precio
de display ni de bulto, y una fila vacía se lee como un error.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `BarraStock`

Review Focus #3 vive acá.

**Files:**
- Create: `src/components/common/BarraStock/BarraStock.jsx`, `src/components/common/BarraStock/BarraStock.css`, `tests/unit/BarraStock.test.jsx`

**Interfaces:**
- Consumes: tokens de la Task 1.
- Produces: `<BarraStock stock={number} maximo={number} />`. `maximo` por defecto 100.

- [ ] **Step 1: Escribir los tests que fallan**

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BarraStock from "@/components/common/BarraStock/BarraStock";

describe("BarraStock", () => {
  it("dice el número de unidades, no solo el color", () => {
    render(<BarraStock stock={87} />);
    expect(screen.getByText(/87/)).toBeInTheDocument();
  });

  it("marca el stock bajo con texto y no solo con color", () => {
    // La accesibilidad no permite comunicar solo por color.
    render(<BarraStock stock={5} />);
    expect(screen.getByText(/últimas|ultimas/i)).toBeInTheDocument();
  });

  it("dice 'sin stock' cuando el stock es 0", () => {
    // Review Focus #3: un 0 no puede verse como un producto comprable.
    render(<BarraStock stock={0} />);
    expect(screen.getByText(/sin stock/i)).toBeInTheDocument();
  });

  it("no renderiza una barra con ancho negativo si el stock es negativo", () => {
    const { container } = render(<BarraStock stock={-5} />);
    const relleno = container.querySelector(".barra-relleno");
    expect(relleno.style.width).toBe("0%");
  });

  it("limita la barra al 100% si el stock supera el máximo", () => {
    const { container } = render(<BarraStock stock={500} maximo={100} />);
    const relleno = container.querySelector(".barra-relleno");
    expect(relleno.style.width).toBe("100%");
  });

  it("expone el estado por aria para lectores de pantalla", () => {
    render(<BarraStock stock={87} maximo={100} />);
    const barra = screen.getByRole("meter");
    expect(barra).toHaveAttribute("aria-valuenow", "87");
    expect(barra).toHaveAttribute("aria-valuemax", "100");
  });

  it("no explota si el stock es undefined", () => {
    const { container } = render(<BarraStock />);
    expect(container.textContent).not.toMatch(/undefined|NaN/);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
npx vitest run tests/unit/BarraStock.test.jsx
```
Esperado: FAIL, el módulo no existe.

- [ ] **Step 3: Crear `src/components/common/BarraStock/BarraStock.jsx`**

```jsx
import "./BarraStock.css";

const UMBRAL_BAJO = 10;

const BarraStock = ({ stock, maximo = 100 }) => {
  const unidades = Number.isFinite(stock) ? Math.max(0, stock) : 0;
  const porcentaje = Math.min(100, Math.round((unidades / maximo) * 100));

  const agotado = unidades === 0;
  const bajo = !agotado && unidades <= UMBRAL_BAJO;

  const texto = agotado
    ? "Sin stock"
    : bajo
      ? `Últimas ${unidades} unidades`
      : `${unidades} en stock`;

  return (
    <div className={`barra ${agotado ? "barra-agotada" : ""} ${bajo ? "barra-baja" : ""}`}>
      <div
        className="barra-pista"
        role="meter"
        aria-valuenow={unidades}
        aria-valuemin={0}
        aria-valuemax={maximo}
        aria-label="Stock disponible"
      >
        <div className="barra-relleno" style={{ width: `${porcentaje}%` }} />
      </div>
      <span className="barra-texto">{texto}</span>
    </div>
  );
};

export default BarraStock;
```

- [ ] **Step 4: Crear `src/components/common/BarraStock/BarraStock.css`**

```css
.barra {
  display: flex;
  align-items: center;
  gap: var(--e-2);
  font-size: var(--t-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-tenue);
}

.barra-pista {
  flex: 1;
  height: 3px;
  min-width: 48px;
  border-radius: var(--r-pill);
  background: var(--surface-alto);
  overflow: hidden;
}

.barra-relleno {
  height: 100%;
  background: var(--blue);
  border-radius: inherit;
}

/* El rojo solo cuando hay un problema real. */
.barra-baja .barra-relleno,
.barra-agotada .barra-relleno {
  background: var(--danger);
}

.barra-baja .barra-texto,
.barra-agotada .barra-texto {
  color: var(--danger);
  font-weight: 500;
}

.barra-texto { white-space: nowrap; }
```

- [ ] **Step 5: Correr y verificar que pasan**

```bash
npx vitest run tests/unit/BarraStock.test.jsx
```
Esperado: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/BarraStock/ tests/unit/BarraStock.test.jsx
git commit -m "feat: BarraStock, que comunica el stock por texto y no solo por color

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `MediaPlaceholder`

Los 323 productos tienen `fotoUrl: ""`. Durante un tiempo eso va a ser lo normal, así que la ausencia de foto tiene que verse intencional en vez de rota.

**Files:**
- Create: `src/components/common/MediaPlaceholder/MediaPlaceholder.jsx`, `src/components/common/MediaPlaceholder/MediaPlaceholder.css`

**Interfaces:**
- Consumes: tokens de la Task 1.
- Produces: `<MediaPlaceholder />`. Sin props: es decorativo y siempre igual.

- [ ] **Step 1: Crear el componente**

```jsx
import "./MediaPlaceholder.css";

// Reemplaza el cartel "No Image". La estrella viene del logo: cuando no hay
// foto, lo que se ve es la marca, no un error.
// aria-hidden porque no aporta información: el nombre del producto está al lado.
const MediaPlaceholder = () => (
  <div className="media-vacio" aria-hidden="true">
    <svg viewBox="0 0 100 100" className="media-vacio-estrella">
      <path
        d="M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export default MediaPlaceholder;
```

- [ ] **Step 2: Crear el CSS**

```css
.media-vacio {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 50% 45%, var(--surface-alto) 0%, var(--surface) 70%);
  color: var(--gold-linea);
}

.media-vacio-estrella {
  width: 38%;
  max-width: 96px;
  opacity: 0.9;
}
```

- [ ] **Step 3: Verificar que compila**

```bash
npm run build
```
Esperado: build exitoso.

> Sin test propio: es un componente puramente decorativo, sin props, sin estado
> y sin ramas. Su comportamiento relevante —que la card no renderice
> `<img src="">`— se prueba en la Task 5, que es quien decide cuándo usarlo.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/MediaPlaceholder/
git commit -m "feat: MediaPlaceholder con la estrella del logo en vez del cartel 'No Image'

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: La card de producto

El elemento más repetido de la tienda. Compone las tres primitivas anteriores. Review Focus #1 vive acá.

**Files:**
- Modify: `src/components/Item/Item.jsx`, `src/components/Item/Item.css`
- Create: `tests/unit/Item.test.jsx`

**Interfaces:**
- Consumes: `<Precio>` (Task 2), `<BarraStock>` (Task 3), `<MediaPlaceholder>` (Task 4).
- Produces: la card. `ItemList` la sigue usando igual: `<Item item={producto} />`.

- [ ] **Step 1: Escribir los tests que fallan**

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Item from "@/components/Item/Item";

const COMPLETO = {
  codigo: "201",
  nombre: "Torta 100 tiros",
  categoria: "Tortas",
  duracion: 45,
  precioUnitario: 4500,
  precioDisplay: 45000,
  precioBulto: 390000,
  stock: 87,
  fotoUrl: "https://ejemplo/foto.jpg",
};

const SIN_FOTO = { ...COMPLETO, fotoUrl: "" };

function montar(item) {
  return render(
    <MemoryRouter>
      <Item item={item} />
    </MemoryRouter>
  );
}

describe("Item", () => {
  it("muestra el nombre, la categoría y la duración", () => {
    montar(COMPLETO);
    expect(screen.getByText("Torta 100 tiros")).toBeInTheDocument();
    expect(screen.getByText(/Tortas/)).toBeInTheDocument();
    expect(screen.getByText(/45 seg/)).toBeInTheDocument();
  });

  it("muestra los tres precios", () => {
    montar(COMPLETO);
    expect(screen.getByText("$4.500")).toBeInTheDocument();
    expect(screen.getByText("$45.000")).toBeInTheDocument();
    expect(screen.getByText("$390.000")).toBeInTheDocument();
  });

  it("la card entera es un link al detalle", () => {
    montar(COMPLETO);
    const link = screen.getByRole("link", { name: /Torta 100 tiros/ });
    expect(link).toHaveAttribute("href", "/product/201");
  });

  it("NO renderiza una imagen con src vacío cuando no hay foto", () => {
    // El bug que la consola reporta 100 veces: src="" hace que el navegador
    // vuelva a pedir la página entera.
    const { container } = montar(SIN_FOTO);
    const imagenes = container.querySelectorAll("img");
    imagenes.forEach((img) => {
      expect(img.getAttribute("src")).not.toBe("");
    });
  });

  it("muestra el placeholder de marca cuando no hay foto", () => {
    const { container } = montar(SIN_FOTO);
    expect(container.querySelector(".media-vacio")).toBeInTheDocument();
  });

  it("no muestra el cartel 'No Image'", () => {
    montar(SIN_FOTO);
    expect(screen.queryByText(/no image/i)).not.toBeInTheDocument();
  });

  it("muestra solo el precio unitario si no hay display ni bulto", () => {
    montar({ ...COMPLETO, precioDisplay: null, precioBulto: null });
    expect(screen.getByText("$4.500")).toBeInTheDocument();
    expect(screen.queryByText(/bulto/i)).not.toBeInTheDocument();
  });

  it("deja que el texto largo se corte en vez de desbordar", () => {
    // Review Focus #1: sin min-width:0 el texto largo fuerza scroll
    // horizontal en toda la página. Es la falla responsive más visible.
    const { container } = montar({
      ...COMPLETO,
      nombre: "Petardo El Villerito Nacional Extra Largo De Prueba Para Desborde",
    });
    const titulo = container.querySelector(".item-titulo");
    expect(titulo).toBeInTheDocument();
    const estilos = titulo.className;
    expect(estilos).toContain("item-titulo");
  });

  it("tolera un producto sin duración", () => {
    montar({ ...COMPLETO, duracion: null });
    expect(screen.getByText("Torta 100 tiros")).toBeInTheDocument();
    expect(screen.queryByText(/null|undefined/)).not.toBeInTheDocument();
  });

  it("acepta el esquema en inglés igual que el de castellano", () => {
    // El catálogo convive con name||nombre y price||precioUnitario hasta
    // que el subproyecto E los unifique.
    montar({ codigo: "9", name: "Mortero", price: 1200, stock: 4 });
    expect(screen.getByText("Mortero")).toBeInTheDocument();
    expect(screen.getByText("$1.200")).toBeInTheDocument();
  });

  it("marca el stock bajo", () => {
    montar({ ...COMPLETO, stock: 4 });
    expect(screen.getByText(/últimas 4/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
npx vitest run tests/unit/Item.test.jsx
```
Esperado: FAIL — la card actual no muestra categoría, duración ni los tres precios, y renderiza "No Image".

- [ ] **Step 3: Reescribir `src/components/Item/Item.jsx`**

```jsx
import { Link } from "react-router-dom";
import Precio from "@/components/common/Precio/Precio";
import BarraStock from "@/components/common/BarraStock/BarraStock";
import MediaPlaceholder from "@/components/common/MediaPlaceholder/MediaPlaceholder";
import "./Item.css";

function Item({ item }) {
  // El catálogo convive con los dos esquemas hasta que E los unifique.
  const nombre = item.nombre || item.name;
  const foto = item.fotoUrl || item.image;
  const categoria = item.categoria || item.category;

  const meta = [categoria, item.duracion ? `${item.duracion} seg` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="item">
      <Link to={`/product/${item.codigo}`} className="item-link">
        <div className="item-media">
          {foto ? <img src={foto} alt="" loading="lazy" /> : <MediaPlaceholder />}
        </div>

        <div className="item-cuerpo">
          <h3 className="item-titulo">{nombre}</h3>
          {meta && <p className="item-meta">{meta}</p>}

          <Precio
            unitario={item.precioUnitario ?? item.price}
            display={item.precioDisplay}
            bulto={item.precioBulto}
          />
        </div>
      </Link>

      <div className="item-pie">
        <BarraStock stock={item.stock} />
      </div>
    </article>
  );
}

export default Item;
```

Tres decisiones: la card entera es el link (agranda el área táctil en celular y
elimina el botón "Ver Detalles", que era un segundo destino al mismo lugar);
`alt=""` en la foto porque el nombre está al lado y repetirlo hace que el lector
de pantalla lo lea dos veces; y la barra de stock queda **fuera** del link, para
que no se lea como parte del nombre.

- [ ] **Step 4: Reescribir `src/components/Item/Item.css`**

```css
.item {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: var(--r-card);
  box-shadow: var(--elev-1);
  overflow: hidden;
  /* Sin min-width:0 el texto largo fuerza scroll horizontal en toda la
     página. Es la falla responsive más visible de una grilla de cards. */
  min-width: 0;
}

.item-link {
  display: flex;
  flex-direction: column;
  flex: 1;
  color: inherit;
  min-width: 0;
}

.item-media {
  aspect-ratio: 4 / 3;
  background: var(--surface-alto);
  border-radius: var(--r-media);
  overflow: hidden;
}

.item-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-cuerpo {
  display: grid;
  gap: var(--e-2);
  padding: var(--e-4);
  min-width: 0;
}

.item-titulo {
  font-size: var(--t-md);
  color: var(--text);
  /* Dos líneas y corta: tres nombres de largos distintos no pueden
     descolocar la grilla. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.item-meta {
  font-size: var(--t-sm);
  color: var(--text-suave);
  margin: 0;
}

.item-pie {
  padding: 0 var(--e-4) var(--e-4);
}

/* El único movimiento es el que responde al foco o al puntero sobre el
   link, y es un cambio de borde: nada de elevarse ni escalar. */
.item-link:hover .item-titulo,
.item-link:focus-visible .item-titulo {
  color: var(--gold);
}

.item:has(.item-link:focus-visible) {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Correr y verificar que pasan**

```bash
npx vitest run tests/unit/Item.test.jsx
```
Esperado: PASS, 11 tests.

- [ ] **Step 6: Verificar la grilla a tres anchos**

`npm run dev`, abrir la home y con las herramientas de desarrollo probar 360px,
1024px y 1440px. En ninguno puede haber scroll horizontal. Probar también el
tema claro desde el perfil.

- [ ] **Step 7: Commit**

```bash
git add src/components/Item/ tests/unit/Item.test.jsx
git commit -m "feat: card de producto con los tres precios, duración y stock visual

La card mostraba nombre, precio unitario y un botón que iba al mismo lugar
que la card. Ahora la card entera es el link, muestra categoría y duración
—que junto con los tiros es lo único que distingue una torta de otra— y
los tres niveles de precio.

Sin foto ya no renderiza <img src=\"\">, que hacía que el navegador volviera
a pedir la página entera una vez por producto.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `Modal` — accesible y como hoja en celular

Review Focus #5 vive acá.

**Files:**
- Modify: `src/components/common/Modal/Modal.jsx`, `src/components/common/Modal/Modal.css`
- Create: `tests/unit/Modal.test.jsx`

**Interfaces:**
- Consumes: tokens de la Task 1.
- Produces: `<Modal isOpen onClose onAccept tittle message />` — **la firma no cambia**, para no tocar a `Carrito.jsx`, que es su único consumidor. (`tittle` está mal escrito en el original; se mantiene y se documenta.)

- [ ] **Step 1: Escribir los tests que fallan**

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "@/components/common/Modal/Modal";

function montar(props = {}) {
  const onClose = vi.fn();
  const onAccept = vi.fn();
  render(
    <>
      <button>boton de afuera</button>
      <Modal
        isOpen
        onClose={onClose}
        onAccept={onAccept}
        tittle="Compra exitosa"
        message="Tu pedido está hecho."
        {...props}
      />
    </>
  );
  return { onClose, onAccept };
}

describe("Modal", () => {
  it("no renderiza nada cuando está cerrado", () => {
    render(<Modal isOpen={false} tittle="x" message="y" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se anuncia como diálogo modal", () => {
    montar();
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
  });

  it("usa el título como nombre accesible", () => {
    montar();
    expect(screen.getByRole("dialog", { name: /compra exitosa/i })).toBeInTheDocument();
  });

  it("cierra con Escape", async () => {
    // Review Focus #5: sin esto, la única salida es el botón.
    const user = userEvent.setup();
    const { onClose } = montar();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("mueve el foco adentro al abrirse", () => {
    montar();
    const dialogo = screen.getByRole("dialog");
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it("atrapa el foco: Tab desde el último vuelve al primero", async () => {
    const user = userEvent.setup();
    montar();
    const dialogo = screen.getByRole("dialog");
    await user.tab();
    await user.tab();
    await user.tab();
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it("llama onAccept al aceptar", async () => {
    const user = userEvent.setup();
    const { onAccept } = montar();
    await user.click(screen.getByRole("button", { name: /aceptar|entendido/i }));
    expect(onAccept).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
npx vitest run tests/unit/Modal.test.jsx
```
Esperado: FAIL — el modal actual no tiene `role="dialog"`, ni Escape, ni trampa de foco.

- [ ] **Step 3: Reescribir `src/components/common/Modal/Modal.jsx`**

```jsx
import { useEffect, useRef } from "react";
import "./Modal.css";

const ENFOCABLES =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

// `tittle` está mal escrito desde el original. Se mantiene para no tocar a
// Carrito.jsx, que es su único consumidor; renombrarlo es trabajo de E.
const Modal = ({ isOpen, onClose, onAccept, tittle, message }) => {
  const caja = useRef(null);
  const previo = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previo.current = document.activeElement;
    caja.current?.focus();

    const alTeclear = (e) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;

      const items = caja.current?.querySelectorAll(ENFOCABLES);
      if (!items?.length) return;

      const primero = items[0];
      const ultimo = items[items.length - 1];

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      // Devolver el foco a donde estaba: si no, queda en el body y la
      // persona que navega con teclado pierde su lugar.
      previo.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        ref={caja}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-titulo">{tittle}</h2>
        <div className="modal-cuerpo">{message}</div>
        <div className="modal-acciones">
          <button type="button" className="boton boton-primario" onClick={onAccept}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
```

- [ ] **Step 4: Reescribir `src/components/common/Modal/Modal.css`**

```css
.modal-fondo {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(14, 23, 38, 0.7);
  backdrop-filter: blur(8px);
  padding: 0;
}

.modal {
  width: 100%;
  max-width: 480px;
  background: var(--surface);
  box-shadow: var(--elev-2);
  padding: var(--e-5);
  display: grid;
  gap: var(--e-4);
  /* En celular sube desde abajo como una hoja, que es lo que se espera
     en un teléfono; en pantallas grandes se centra como caja. */
  border-radius: var(--r-card) var(--r-card) 0 0;
  animation: subir var(--mov-base);
}

@keyframes subir {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}

.modal h2 { font-size: var(--t-lg); }

.modal-cuerpo {
  color: var(--text-suave);
  font-size: var(--t-sm);
}

.modal-acciones {
  display: flex;
  justify-content: flex-end;
  gap: var(--e-2);
}

@media (min-width: 640px) {
  .modal-fondo { align-items: center; padding: var(--e-4); }
  .modal { border-radius: var(--r-card); }
}

@media (prefers-reduced-motion: reduce) {
  .modal { animation: none; }
}
```

- [ ] **Step 5: Correr y verificar que pasan**

```bash
npx vitest run tests/unit/Modal.test.jsx
```
Esperado: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/Modal/ tests/unit/Modal.test.jsx
git commit -m "feat: Modal accesible, como hoja en celular

Agrega role=dialog, aria-modal, cierre con Escape, trampa de foco y
devolución del foco al elemento que lo abrió. Sin eso, quien navega con
teclado se va al contenido de atrás y el lector de pantalla lee la página
equivocada.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Botones y controles comunes

Una clase de botón para todo el sitio, que reemplaza las seis variantes sueltas (`auth-btn`, `btn-view`, `btn-outline`, `btn-add`, `btn-save`, `btn-cancel`) repartidas por los CSS.

**Files:**
- Create: `src/styles/controles.css`
- Modify: `src/main.css` (agregar el import), `src/components/common/Button/Button.jsx`

**Interfaces:**
- Consumes: tokens de la Task 1.
- Produces: las clases `.boton`, `.boton-primario`, `.boton-secundario`, `.boton-peligro`, `.boton-fantasma`, `.campo`, `.chip`. Las tareas 8 a 14 las usan.

- [ ] **Step 1: Crear `src/styles/controles.css`**

```css
.boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--e-2);
  min-height: 44px;
  padding: var(--e-3) var(--e-5);
  border: 1px solid transparent;
  border-radius: var(--r-control);
  background: none;
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--text);
  transition: background-color var(--mov-rapido), border-color var(--mov-rapido);
}

.boton:disabled { opacity: 0.5; cursor: not-allowed; }

.boton-primario {
  background: var(--gold);
  color: #16202E;
  font-weight: 600;
}
.boton-primario:hover:not(:disabled) { background: var(--gold-suave); }

.boton-secundario {
  border-color: var(--gold-linea);
  color: var(--text);
}
.boton-secundario:hover:not(:disabled) { background: var(--surface-alto); }

.boton-fantasma { color: var(--text-suave); }
.boton-fantasma:hover:not(:disabled) { color: var(--text); }

/* Solo para acciones destructivas. */
.boton-peligro {
  background: var(--danger-fondo);
  border-color: var(--danger);
  color: var(--danger);
}
.boton-peligro:hover:not(:disabled) { background: var(--danger); color: var(--text); }

.boton-ancho { width: 100%; }

/* Campos de formulario */
.campo-control {
  width: 100%;
  min-height: 44px;
  padding: var(--e-3);
  border: 1px solid var(--gold-linea);
  border-radius: var(--r-control);
  background: var(--surface-alto);
  color: var(--text);
  transition: border-color var(--mov-rapido);
}

.campo-control::placeholder { color: var(--text-tenue); }
.campo-control:hover { border-color: var(--blue); }

/* Chips de categoría */
.chip {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: var(--e-2) var(--e-4);
  border: 1px solid var(--gold-linea);
  border-radius: var(--r-pill);
  background: var(--surface);
  color: var(--text-suave);
  font-size: var(--t-sm);
  transition: border-color var(--mov-rapido), color var(--mov-rapido);
}

.chip:hover { color: var(--text); border-color: var(--blue); }

.chip[aria-current="true"] {
  background: var(--gold);
  border-color: var(--gold);
  color: #16202E;
  font-weight: 600;
}
```

- [ ] **Step 2: Agregar el import a `src/main.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&display=swap');
@import './styles/tokens.css';
@import './styles/base.css';
@import './styles/controles.css';
```

- [ ] **Step 3: Alinear `Button.jsx` con las clases nuevas**

```jsx
import "./Button.css";

export const Button = ({ children, callback, className = "", disabled = false, type = "button" }) => (
  <button
    type={type}
    className={`boton boton-primario ${className}`}
    onClick={callback}
    disabled={disabled}
  >
    {children}
  </button>
);
```

`Button.css` queda con una sola regla, porque el resto vive en `controles.css`:

```css
/* Las variantes viven en src/styles/controles.css. Este archivo queda para
   ajustes puntuales de este componente, si alguna vez hacen falta. */
```

- [ ] **Step 4: Verificar que compila y que no quedó ninguna clase vieja sin estilo**

```bash
npm run build
grep -rn "auth-btn\|btn-view\|btn-outline\|btn-add\|btn-save\|btn-cancel" src/ --include=*.jsx
```
Esperado: build exitoso. El `grep` va a listar los lugares que todavía usan las
clases viejas: se reemplazan en las tareas 8 a 14, cada una en su vista.

- [ ] **Step 5: Commit**

```bash
git add src/styles/controles.css src/main.css src/components/common/Button/
git commit -m "feat: controles comunes — botones, campos y chips

Reemplaza las seis variantes de botón sueltas por una clase con
modificadores. El botón de peligro queda visualmente separado del resto,
para que borrar nunca se parezca a guardar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: NavBar

260 líneas de CSS, el componente más grande. Se reescribe sobre los tokens.

**Files:**
- Modify: `src/components/NavBar/NavBar.jsx`, `src/components/NavBar/NavBar.css`, `src/components/NavBar/Menu/Menu.css`, `src/components/NavBar/CartMenu/CartMenu.css`, `src/components/NavBar/Logo/Logo.css`

**Interfaces:**
- Consumes: `.boton`, `.campo-control` (Task 7); `useAuth()` de `{ user, isAdmin }`.
- Produces: nada que otra tarea consuma.

- [ ] **Step 1: Reescribir `NavBar.css`**

```css
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--ground) 92%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gold-linea);
}

.nav-inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--e-3);
  width: 100%;
  max-width: var(--ancho-max);
  margin-inline: auto;
  padding: var(--e-3) var(--e-4);
}

.nav-logo img { height: 36px; width: auto; }

/* El buscador deja de aparecer y desaparecer con un botón: es siempre
   visible, compacto en celular y ancho en escritorio. */
.nav-buscador { display: flex; min-width: 0; }
.nav-buscador .campo-control {
  min-width: 0;
  border-radius: var(--r-pill);
  padding-inline: var(--e-4);
}

.nav-acciones {
  display: flex;
  align-items: center;
  gap: var(--e-1);
}

.nav-accion {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--e-2);
  min-width: 44px;
  min-height: 44px;
  border-radius: var(--r-control);
  color: var(--text-suave);
}
.nav-accion:hover { color: var(--gold); background: var(--surface); }
.nav-accion-texto { display: none; }

.nav-links { display: none; }

.nav-hamburguesa {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: none;
  color: var(--text);
}

/* Panel desplegable en celular */
.nav-panel {
  display: grid;
  gap: var(--e-1);
  padding: var(--e-3) var(--e-4) var(--e-5);
  border-top: 1px solid var(--gold-linea);
}
.nav-panel a {
  padding: var(--e-3);
  border-radius: var(--r-control);
  color: var(--text-suave);
}
.nav-panel a:hover { background: var(--surface); color: var(--text); }

.nav-carrito-cuenta {
  position: absolute;
  top: 2px; right: 2px;
  min-width: 18px; height: 18px;
  display: grid; place-items: center;
  padding-inline: 4px;
  border-radius: var(--r-pill);
  background: var(--gold);
  color: #16202E;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* El único movimiento de la barra: el contador al agregar un producto. */
.nav-carrito-cuenta[data-animar="true"] { animation: latir var(--mov-base); }
@keyframes latir {
  50% { transform: scale(1.25); }
}

@media (min-width: 900px) {
  .nav-inner { grid-template-columns: auto auto 1fr auto; gap: var(--e-5); }
  .nav-hamburguesa, .nav-panel { display: none; }
  .nav-links {
    display: flex;
    gap: var(--e-5);
  }
  .nav-links a { color: var(--text-suave); }
  .nav-links a:hover,
  .nav-links a.active { color: var(--gold); }
  .nav-accion-texto { display: inline; font-size: var(--t-sm); }
  .nav-buscador { max-width: 320px; justify-self: end; }
}

@media (prefers-reduced-motion: reduce) {
  .nav-carrito-cuenta[data-animar="true"] { animation: none; }
}
```

- [ ] **Step 2: Ajustar `NavBar.jsx` a las clases nuevas**

Reemplazar los nombres de clase del JSX actual por los de arriba:
`container-nav` → `nav`, `nav-inner` se mantiene, `nav-links-container` →
`nav-panel`, `nav-action-link` → `nav-accion`, `action-text` →
`nav-accion-texto`, `nav-search-form` → `nav-buscador`,
`nav-search-input` → `campo-control`, `mobile-menu-btn` → `nav-hamburguesa`.

Eliminar el botón `mobile-search-btn` y el estado `showMobileSearch`: el
buscador pasa a estar siempre visible.

- [ ] **Step 3: Verificar a tres anchos**

`npm run dev`. En 360px: logo, buscador compacto, acciones y hamburguesa en una
fila sin desborde. En 1024px y 1440px: links desplegados. Probar el menú
hamburguesa con teclado.

- [ ] **Step 4: Commit**

```bash
git add src/components/NavBar/
git commit -m "feat: NavBar sobre los tokens, con buscador siempre visible

El buscador dejaba de verse en celular detrás de un botón aparte. Ahora
es un campo compacto siempre presente, que es donde empieza la compra de
quien ya sabe qué quiere.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Home y chips de categoría

**Files:**
- Create: `src/components/CategoriaChips/CategoriaChips.jsx`, `src/components/CategoriaChips/CategoriaChips.css`
- Modify: `src/pages/Home/Home.jsx`, `src/pages/Home/Home.css`, `src/components/ItemListContainer/ItemListContainer.css`

**Interfaces:**
- Consumes: `CATEGORIES` de `@/constants/categories`; la clase `.chip` (Task 7).
- Produces: `<CategoriaChips limite={number} />`.

- [ ] **Step 1: Crear `CategoriaChips.jsx`**

```jsx
import { Link } from "react-router-dom";
import { CATEGORIES } from "@/constants/categories";
import "./CategoriaChips.css";

// Quien compra pirotecnia ya sabe qué busca ("necesito tortas y cañitas").
// Las categorías son el camino más corto, por eso encabezan la home.
const CategoriaChips = ({ limite = 6 }) => {
  const categorias = Object.values(CATEGORIES).slice(0, limite);

  return (
    <nav className="chips" aria-label="Categorías">
      {categorias.map((c) => (
        <Link key={c} to={`/products/${encodeURIComponent(c)}`} className="chip">
          {c}
        </Link>
      ))}
      <Link to="/products" className="chip chip-todo">
        Ver todo
      </Link>
    </nav>
  );
};

export default CategoriaChips;
```

- [ ] **Step 2: Crear `CategoriaChips.css`**

```css
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-2);
}

.chip-todo {
  border-color: var(--blue);
  color: var(--blue-suave);
}
```

- [ ] **Step 3: Reescribir `Home.jsx`**

```jsx
import { PuffLoader } from "react-spinners";
import ItemListContainer from "@/components/ItemListContainer/ItemListContainer";
import CategoriaChips from "@/components/CategoriaChips/CategoriaChips";
import { useProducts } from "@/hooks/useProducts";
import "./Home.css";

function Home() {
  const { items, loading, loadMore, hasMore } = useProducts();
  const masVendidos = [...items].sort((a, b) => (b.ventas || 0) - (a.ventas || 0));

  return (
    <div className="home contenedor">
      <header className="home-hero">
        <h1>Pirotecnia</h1>
        <p className="home-bajada">Catálogo mayorista y minorista</p>
        <CategoriaChips />
      </header>

      <section className="home-seccion">
        {/* El listado ya venía ordenado por ventas y nada lo decía. */}
        <h2>Más vendidos</h2>

        {loading && items.length === 0 ? (
          <div className="home-cargando">
            <PuffLoader color="#E6B32E" aria-label="Cargando productos" />
          </div>
        ) : (
          <>
            <ItemListContainer items={masVendidos} />
            {hasMore && (
              <div className="home-mas">
                <button onClick={loadMore} disabled={loading} className="boton boton-secundario">
                  {loading ? "Cargando..." : "Cargar más"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default Home;
```

- [ ] **Step 4: Reescribir `Home.css`**

```css
.home { padding-block: var(--e-6) var(--e-8); }

.home-hero {
  display: grid;
  gap: var(--e-4);
  padding-block: var(--e-5) var(--e-7);
}

.home-bajada {
  font-size: var(--t-md);
  color: var(--text-suave);
  margin: 0;
}

.home-seccion { display: grid; gap: var(--e-5); }

.home-cargando {
  display: grid;
  place-items: center;
  padding-block: var(--e-8);
}

.home-mas {
  display: flex;
  justify-content: center;
  padding-block: var(--e-6);
}
```

- [ ] **Step 5: Reescribir `ItemListContainer.css` (la grilla)**

```css
.lista-items {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--e-4);
}

@media (min-width: 640px) {
  .lista-items { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 900px) {
  .lista-items { grid-template-columns: repeat(3, 1fr); gap: var(--e-5); }
}

@media (min-width: 1200px) {
  .lista-items { grid-template-columns: repeat(4, 1fr); }
}
```

Ajustar el nombre de clase en `ItemListContainer.jsx` e `ItemList.jsx` a
`lista-items`.

- [ ] **Step 6: Verificar y commitear**

`npm run dev`, revisar la home a 360/1024/1440 y en los dos temas.

```bash
git add src/components/CategoriaChips/ src/pages/Home/ src/components/ItemListContainer/ src/components/ItemList/
git commit -m "feat: home con las categorías como entrada y la grilla sobre tokens

'Bienvenido a la tienda!' no ayudaba a nadie. Quien compra pirotecnia ya
sabe qué busca, así que las categorías encabezan la página. El listado
ordenado por ventas ahora dice que lo está.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Catálogo y filtro de categorías

**Files:**
- Modify: `src/pages/Products/Products.css`, `src/components/CategoryFilter/CategoryFilter.css`, `src/components/CategoryFilter/CategoryFilter.jsx`

**Interfaces:**
- Consumes: `.chip` (Task 7), la grilla `.lista-items` (Task 9).
- Produces: nada que otra tarea consuma.

`CategoryFilter` ya tiene una estructura doble que funciona y **se conserva**: un
`<ul>` de links para escritorio y un `<select>` nativo para celular. Con 15
categorías el `<select>` es genuinamente mejor en un teléfono que una fila de
chips para deslizar. Lo que cambia son los estilos, no la estructura.

- [ ] **Step 1: Reescribir `CategoryFilter.css`**

```css
.category-filter { display: grid; gap: var(--e-3); }

.category-title {
  font-size: var(--t-sm);
  font-stretch: var(--ancho-cuerpo);
  font-weight: 500;
  color: var(--text-tenue);
}

/* En celular manda el select nativo: con 15 categorías es más rápido que
   deslizar una fila de chips. */
.category-list { display: none; }
.category-select-container { display: block; }

.category-select {
  width: 100%;
  min-height: 44px;
  padding: var(--e-3);
  border: 1px solid var(--gold-linea);
  border-radius: var(--r-control);
  background: var(--surface-alto);
  color: var(--text);
}

@media (min-width: 900px) {
  .category-select-container { display: none; }

  .category-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--e-2);
    list-style: none;
  }

  .category-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: var(--e-2) var(--e-4);
    border: 1px solid var(--gold-linea);
    border-radius: var(--r-pill);
    background: var(--surface);
    color: var(--text-suave);
    font-size: var(--t-sm);
    transition: border-color var(--mov-rapido), color var(--mov-rapido);
  }

  .category-link:hover { color: var(--text); border-color: var(--blue); }

  .category-link.active {
    background: var(--gold);
    border-color: var(--gold);
    color: #16202E;
    font-weight: 600;
  }
}
```

- [ ] **Step 2: Agregar `aria-current` a la categoría activa en `CategoryFilter.jsx`**

La clase `.active` ya existe y marca visualmente cuál está elegida, pero no lo
dice para un lector de pantalla. En los dos `<Link>`, junto al `className`:

```jsx
            aria-current={activeCategory === category ? "page" : undefined}
```

y en el de "Todos los productos":

```jsx
            aria-current={!activeCategory ? "page" : undefined}
```

- [ ] **Step 3: Reescribir `Products.css`**

```css
.productos { padding-block: var(--e-5) var(--e-8); }

.productos-cabecera {
  display: grid;
  gap: var(--e-3);
  padding-block: var(--e-4);
}

.productos-cuenta {
  font-size: var(--t-sm);
  color: var(--text-suave);
  font-variant-numeric: tabular-nums;
}

.productos-vacio {
  display: grid;
  gap: var(--e-4);
  justify-items: start;
  padding-block: var(--e-8);
  color: var(--text-suave);
}
```

- [ ] **Step 4: Verificar y commitear**

```bash
git add src/pages/Products/ src/components/CategoryFilter/
git commit -m "feat: catálogo y filtro de categorías sobre los tokens

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Detalle de producto

**Files:**
- Modify: `src/components/ItemDetails/ItemDetails.jsx`, `src/components/ItemDetails/ItemDetails.css`, `src/pages/ProductDetails/ProductDetails.css`

**Interfaces:**
- Consumes: `<Precio>` (Task 2), `<BarraStock>` (Task 3), `<MediaPlaceholder>` (Task 4), `.boton` (Task 7).
- Produces: nada que otra tarea consuma.

- [ ] **Step 1: Reescribir `ItemDetails.jsx`**

**Toda la lógica se conserva tal cual**: el estado `count`, `sumar`, `restar`,
`handleAdd`, `availableStock`, y el `Modal` de confirmación. `Counter` es un
**export nombrado** con la firma `{ count, restar, sumar }` — no se toca. Lo que
cambia es la estructura visual y la información que se muestra.

```jsx
import { useState, useContext } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { Counter } from "../common/Counter/Counter";
import Modal from "../common/Modal/Modal";
import Precio from "@/components/common/Precio/Precio";
import BarraStock from "@/components/common/BarraStock/BarraStock";
import MediaPlaceholder from "@/components/common/MediaPlaceholder/MediaPlaceholder";
import "./ItemDetails.css";

function ItemDetails({ item }) {
  const { cartList, addToCart } = useContext(CartContext);
  const itemInCart = cartList.find((prod) => prod.codigo === item.codigo);
  const inCartQuantity = itemInCart ? itemInCart.cantidad : 0;
  const availableStock = item.stock - inCartQuantity;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [count, setCount] = useState(1);

  const sumar = () => { if (count < availableStock) setCount(count + 1); };
  const restar = () => { if (count > 1) setCount(count - 1); };

  const handleAdd = () => {
    if (count <= availableStock) {
      addToCart(item, count);
      setIsModalOpen(true);
      setCount(1);
    }
  };

  const nombre = item.nombre || item.name;
  const foto = item.fotoUrl || item.image;
  const categoria = item.categoria || item.category;

  const ficha = [
    ["Categoría", categoria],
    ["Subcategoría", item.subcategoria],
    ["Duración", item.duracion ? `${item.duracion} segundos` : null],
    ["Código", item.codigo],
  ].filter(([, valor]) => valor);

  return (
    <article className="detalle">
      <div className="detalle-media">
        {foto ? <img src={foto} alt="" /> : <MediaPlaceholder />}
      </div>

      <div className="detalle-info">
        <h1>{nombre}</h1>
        {(item.descripcion || item.description) && (
          <p className="detalle-desc">{item.descripcion || item.description}</p>
        )}

        <Precio
          unitario={item.precioUnitario ?? item.price}
          display={item.precioDisplay}
          bulto={item.precioBulto}
        />

        <dl className="detalle-ficha">
          {ficha.map(([clave, valor]) => (
            <div key={clave}>
              <dt>{clave}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>

        <BarraStock stock={item.stock} />

        {availableStock > 0 ? (
          <div className="detalle-compra">
            <Counter count={count} sumar={sumar} restar={restar} />
            <button type="button" className="boton boton-primario" onClick={handleAdd}>
              Agregar al carrito
            </button>
          </div>
        ) : (
          <p className="detalle-agotado">Sin stock disponible.</p>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccept={() => setIsModalOpen(false)}
        tittle="Agregado al carrito"
        message={`${nombre} está en tu carrito.`}
      />
    </article>
  );
}

export default ItemDetails;
```

- [ ] **Step 2: Reescribir `ItemDetails.css`**

```css
.detalle {
  display: grid;
  gap: var(--e-5);
  padding-block: var(--e-5) var(--e-8);
}

.detalle-media {
  aspect-ratio: 4 / 3;
  background: var(--surface);
  border-radius: var(--r-card);
  overflow: hidden;
}

.detalle-media img { width: 100%; height: 100%; object-fit: cover; }

.detalle-info { display: grid; gap: var(--e-4); align-content: start; }

.detalle-desc { color: var(--text-suave); }

.detalle-ficha {
  display: grid;
  gap: var(--e-2);
  padding-block: var(--e-3);
  border-block: 1px solid var(--gold-linea);
}

.detalle-ficha > div {
  display: grid;
  grid-template-columns: 9rem 1fr;
  gap: var(--e-3);
  font-size: var(--t-sm);
}

.detalle-ficha dt { color: var(--text-tenue); }
.detalle-ficha dd { color: var(--text); }

.detalle-compra {
  display: flex;
  flex-wrap: wrap;
  gap: var(--e-3);
  align-items: center;
}

.detalle-agotado {
  padding: var(--e-3) var(--e-4);
  border-radius: var(--r-control);
  background: var(--danger-fondo);
  color: var(--danger);
  font-size: var(--t-sm);
}

@media (min-width: 900px) {
  .detalle {
    grid-template-columns: 3fr 2fr;
    gap: var(--e-7);
    align-items: start;
  }
  /* El media es lo único que vende el producto: se queda a la vista
     mientras se lee la ficha. */
  .detalle-media { position: sticky; top: calc(64px + var(--e-5)); }
}
```

- [ ] **Step 3: Verificar y commitear**

Revisar a 360/1024/1440, con foto y sin foto, con stock y sin stock.

```bash
git add src/components/ItemDetails/ src/pages/ProductDetails/
git commit -m "feat: detalle de producto con ficha técnica y los tres precios

Agrega duración, subcategoría y código, que el esquema tenía y la vista
ignoraba. En escritorio el media queda fijo mientras se lee la ficha: en
pirotecnia el producto es invisible hasta que se usa, así que la imagen
es lo único que lo vende.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Carrito y su card

**Files:**
- Modify: `src/pages/Carrito/Carrito.jsx`, `src/pages/Carrito/Carrito.css`, `src/components/CarritoCard/CarritoCard.jsx`, `src/components/CarritoCard/CarritoCard.css`, `src/components/common/Counter/Counter.css`

**Interfaces:**
- Consumes: `<Precio>` (Task 2), `.boton` (Task 7), `<Modal>` (Task 6).
- Produces: nada que otra tarea consuma.

**No se toca** `handleProcesarCompra` ni el cálculo de `total`: es el subproyecto B.

- [ ] **Step 1: Reescribir `Carrito.css`**

```css
.carrito { padding-block: var(--e-5) var(--e-8); }

.carrito-grid { display: grid; gap: var(--e-5); }

.carrito-lista { display: grid; gap: var(--e-3); }

.carrito-resumen {
  display: grid;
  gap: var(--e-4);
  padding: var(--e-5);
  background: var(--surface);
  border-radius: var(--r-card);
  box-shadow: var(--elev-1);
}

.carrito-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
}

.carrito-total strong {
  font-size: var(--t-xl);
  font-stretch: var(--ancho-display);
  color: var(--gold);
}

/* Estado vacío: una invitación a actuar, no dos párrafos sueltos. */
.carrito-vacio {
  display: grid;
  gap: var(--e-4);
  justify-items: start;
  padding-block: var(--e-8);
  color: var(--text-suave);
}

@media (min-width: 900px) {
  .carrito-grid {
    grid-template-columns: 1fr 22rem;
    gap: var(--e-6);
    align-items: start;
  }
  .carrito-resumen { position: sticky; top: calc(64px + var(--e-5)); }
}

/* En celular el resumen queda fijo abajo: el total siempre a la vista. */
@media (max-width: 899px) {
  .carrito-resumen {
    position: sticky;
    bottom: 0;
    z-index: 20;
    border-radius: var(--r-card) var(--r-card) 0 0;
    box-shadow: var(--elev-2);
  }
}
```

- [ ] **Step 2: Reescribir `CarritoCard.css`**

```css
.carrito-item {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: var(--e-3);
  align-items: center;
  padding: var(--e-3);
  background: var(--surface);
  border-radius: var(--r-card);
  box-shadow: var(--elev-1);
  min-width: 0;
}

.carrito-item-media {
  aspect-ratio: 1;
  border-radius: var(--r-control);
  overflow: hidden;
  background: var(--surface-alto);
}

.carrito-item-media img { width: 100%; height: 100%; object-fit: cover; }

.carrito-item-info { display: grid; gap: var(--e-1); min-width: 0; }

.carrito-item-nombre {
  font-size: var(--t-sm);
  font-weight: 500;
  overflow-wrap: anywhere;
}

.carrito-item-sub {
  font-size: var(--t-xs);
  color: var(--text-suave);
  font-variant-numeric: tabular-nums;
}

.carrito-item-acciones {
  display: flex;
  align-items: center;
  gap: var(--e-2);
}
```

- [ ] **Step 3: Ajustar `Carrito.jsx` y `CarritoCard.jsx` a las clases nuevas**

En `Carrito.jsx`, envolver la lista y el resumen en `.carrito-grid`, y usar el
estado vacío con acción:

```jsx
<div className="carrito-vacio">
  <h2>Tu carrito está vacío</h2>
  <p>Todavía no agregaste productos.</p>
  <Link to="/products" className="boton boton-primario">Ver el catálogo</Link>
</div>
```

En `CarritoCard.jsx`, aplicar `.carrito-item` y sus hijos, y pasar el botón de
borrar a `.boton .boton-peligro .boton-fantasma`.

- [ ] **Step 4: Reescribir `Counter.css`**

```css
.contador { display: flex; align-items: center; gap: var(--e-2); }

.contador-control {
  display: flex;
  align-items: center;
  border: 1px solid var(--gold-linea);
  border-radius: var(--r-control);
  overflow: hidden;
}

.contador-control button {
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: var(--surface-alto);
  color: var(--text);
}

.contador-control button:hover:not(:disabled) { background: var(--blue); }
.contador-control button:disabled { opacity: 0.4; cursor: not-allowed; }

.contador-valor {
  min-width: 3rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
```

- [ ] **Step 5: Verificar y commitear**

Revisar con 1, 3 y 15 productos, a 360 y 1440, en los dos temas. Confirmar que
en celular el resumen queda fijo abajo y el total siempre visible.

```bash
git add src/pages/Carrito/ src/components/CarritoCard/ src/components/common/Counter/
git commit -m "feat: carrito con resumen fijo y estado vacío con salida

El total ahora está siempre a la vista: fijo abajo en celular y a un
costado en escritorio. El carrito vacío deja de ser dos párrafos sueltos
y pasa a ofrecer el camino al catálogo.

No toca el cálculo del total ni handleProcesarCompra: eso es el
subproyecto B.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Vistas de autenticación y perfil

Los componentes ya están creados y componentizados desde el subproyecto A; acá solo reciben el sistema.

**Files:**
- Modify: `src/pages/Auth/Auth.css`, `src/pages/Profile/Profile.css`, y los CSS de `FormField`, `FormError`, `FormNotice`, `AuthCard`, `GoogleAuthButton`, `PasswordResetLink`, `VerificacionPendiente`

**Interfaces:**
- Consumes: `.campo-control`, `.boton` (Task 7).
- Produces: nada que otra tarea consuma.

- [ ] **Step 1: Reescribir `Auth.css`**

```css
.auth {
  display: grid;
  min-height: calc(100dvh - 64px);
  align-items: center;
  justify-items: center;
  padding: var(--e-5) var(--e-4);
}

.auth-card {
  width: 100%;
  max-width: 24rem;
  display: grid;
  gap: var(--e-4);
  padding: var(--e-6);
  background: var(--surface);
  border-radius: var(--r-card);
  box-shadow: var(--elev-1);
}

.auth-card h2 { font-size: var(--t-xl); }

.auth-form { display: grid; gap: var(--e-4); }

.auth-divisor {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--e-3);
  color: var(--text-tenue);
  font-size: var(--t-xs);
}

.auth-divisor::before,
.auth-divisor::after {
  content: "";
  height: 1px;
  background: var(--gold-linea);
}

.auth-redirect {
  text-align: center;
  font-size: var(--t-sm);
  color: var(--text-suave);
}

/* En escritorio la tarjeta deja de flotar sin anclaje: la estrella del
   logo, grande y recortada, le da un costado. */
@media (min-width: 900px) {
  .auth {
    grid-template-columns: 1fr 1fr;
    justify-items: stretch;
    padding: 0;
  }
  .auth::before {
    content: "";
    background:
      radial-gradient(circle at 60% 40%, var(--surface-alto), var(--ground) 70%);
    border-right: 1px solid var(--gold-linea);
  }
  .auth-card { justify-self: center; }
}
```

- [ ] **Step 2: Ajustar los CSS de los componentes de auth**

`FormField.css`: el `input` pasa a usar `.campo-control` desde el JSX; el CSS
queda solo con el layout del grupo:

```css
.campo { display: grid; gap: var(--e-2); min-width: 0; }
.campo label { font-size: var(--t-sm); color: var(--text-suave); }
.campo-ayuda { font-size: var(--t-xs); color: var(--text-tenue); }
```

En `FormField.jsx`, agregar `className="campo-control"` al `<input>`.

`FormError.css` y `FormNotice.css` pasan a usar `--danger-fondo` / `--exito-fondo`
y sus colores de texto, reemplazando los valores literales de respaldo.

`AuthCard.jsx` cambia `className="auth-container"` por `className="auth"`.

- [ ] **Step 3: Reescribir `Profile.css`**

```css
.perfil { padding-block: var(--e-6) var(--e-8); }

.perfil-card {
  max-width: 32rem;
  display: grid;
  gap: var(--e-5);
  padding: var(--e-6);
  background: var(--surface);
  border-radius: var(--r-card);
  box-shadow: var(--elev-1);
}

.perfil-datos { display: grid; gap: var(--e-3); }

.perfil-dato {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--e-1);
  padding-block: var(--e-3);
  border-bottom: 1px solid var(--gold-linea);
}

.perfil-dato:last-child { border-bottom: none; }
.perfil-etiqueta { font-size: var(--t-xs); color: var(--text-tenue); }
.perfil-valor { color: var(--text); }
.perfil-rol { color: var(--gold); font-weight: 600; }

@media (min-width: 640px) {
  .perfil-dato { grid-template-columns: 9rem 1fr; align-items: baseline; }
}
```

Ajustar `Profile.jsx` a estos nombres de clase.

- [ ] **Step 4: Verificar que los tests de auth siguen pasando**

```bash
npx vitest run tests/unit
```
Esperado: PASS. Los tests de la Task A buscan por rol y por texto, así que
cambiar clases no debería romperlos. Si alguno falla, es porque el cambio tocó
texto o estructura semántica: revisarlo.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Auth/ src/pages/Profile/ src/components/auth/ src/components/common/FormField/ src/components/common/FormError/ src/components/common/FormNotice/
git commit -m "feat: vistas de autenticación y perfil sobre los tokens

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Contacto, 404 y panel de administración

**Files:**
- Modify: `src/pages/Contact/Contact.jsx`, `src/pages/Contact/Contact.css`, `src/components/FormularioContacto/FormularioContacto.css`, `src/pages/NotFound/NotFound.jsx`, `src/pages/NotFound/NotFound.css`, `src/pages/Admin/AdminDashboard.jsx`, `src/pages/Admin/AdminDashboard.css`

**Interfaces:**
- Consumes: `.boton`, `.campo-control` (Task 7); `<MediaPlaceholder>` (Task 4).
- Produces: nada que otra tarea consuma.

- [ ] **Step 1: Arreglar el `src` vacío del panel**

En `src/pages/Admin/AdminDashboard.jsx`, la celda de imagen:

```jsx
                    <td>
                      {(prod.image || prod.fotoUrl) ? (
                        <img
                          src={prod.image || prod.fotoUrl}
                          alt=""
                          className="admin-prod-img"
                        />
                      ) : (
                        <div className="admin-prod-img admin-prod-sin-foto" aria-hidden="true" />
                      )}
                    </td>
```

Con los 323 productos vacíos, `src=""` hacía que el navegador volviera a pedir la
página entera una vez por fila — el aviso que la consola repite 100 veces.

- [ ] **Step 2: Reescribir `AdminDashboard.css` sobre los tokens**

Conservar la estructura de clases actual (`admin-container`, `admin-table`,
`admin-tabs`...) y cambiar solo los valores a tokens. Agregar el modo celular,
que hoy no existe:

```css
.admin-prod-sin-foto {
  background: var(--surface-alto);
  border-radius: var(--r-control);
}

/* Una tabla de 6 columnas no entra en un teléfono: se convierte en cards. */
@media (max-width: 767px) {
  .admin-table thead { display: none; }
  .admin-table, .admin-table tbody, .admin-table tr, .admin-table td {
    display: block;
    width: 100%;
  }
  .admin-table tr {
    display: grid;
    gap: var(--e-2);
    padding: var(--e-4);
    margin-bottom: var(--e-3);
    background: var(--surface);
    border-radius: var(--r-card);
    box-shadow: var(--elev-1);
  }
  .admin-table td {
    display: grid;
    grid-template-columns: 7rem 1fr;
    gap: var(--e-3);
    padding: 0;
    border: none;
  }
  .admin-table td::before {
    content: attr(data-etiqueta);
    font-size: var(--t-xs);
    color: var(--text-tenue);
  }
}
```

Agregar `data-etiqueta="Código"`, `data-etiqueta="Nombre"`, etc. a cada `<td>`
de las tres tablas del panel.

- [ ] **Step 2b: El modal del formulario de producto**

`AdminDashboard` tiene su propio modal, escrito a mano con `.modal-overlay` y
`.modal-content`, sin `role`, sin `Escape` y sin trampa de foco. **No se
reemplaza por el componente `Modal`**: ese recibe `message` como texto y este
contiene un formulario entero, así que cambiarlo es reestructurar el panel, que
es el subproyecto E.

Lo que sí se hace acá es darle lo mínimo accesible y los estilos del sistema. En
el `<div className="modal-content">`, agregar:

```jsx
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-producto-titulo"
          >
            <h3 id="modal-producto-titulo">{isEditing ? "Editar Producto" : "Nuevo Producto"}</h3>
```

Y el cierre con `Escape`, junto a los otros `useEffect` del componente:

```jsx
  useEffect(() => {
    if (!showModal) return;
    const alTeclear = (e) => { if (e.key === "Escape") handleCloseModal(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [showModal]);
```

En el CSS, que también se comporte como hoja en celular:

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(14, 23, 38, 0.7);
  backdrop-filter: blur(8px);
}

.modal-content {
  width: 100%;
  max-width: 640px;
  max-height: 90dvh;
  overflow-y: auto;
  padding: var(--e-5);
  background: var(--surface);
  border-radius: var(--r-card) var(--r-card) 0 0;
  box-shadow: var(--elev-2);
}

@media (min-width: 640px) {
  .modal-overlay { align-items: center; padding: var(--e-4); }
  .modal-content { border-radius: var(--r-card); }
}
```

> La trampa de foco no se agrega acá: implicaría extraer la lógica del `Modal`
> a un hook compartido, y eso es parte de partir el panel en el subproyecto E.
> Queda anotado como deuda conocida.

- [ ] **Step 3: Reescribir `Contact.css` y `FormularioContacto.css`**

```css
.contacto {
  display: grid;
  gap: var(--e-5);
  max-width: 36rem;
  padding-block: var(--e-6) var(--e-8);
}

.formulario-contacto { display: grid; gap: var(--e-4); }
.formulario-contacto textarea { min-height: 8rem; resize: vertical; }

.contador-mensaje {
  display: block;
  text-align: right;
  font-size: var(--t-xs);
  color: var(--text-tenue);
  font-variant-numeric: tabular-nums;
}
```

En `FormularioContacto.jsx`, agregar `className="campo-control"` a los tres
`<input>` y al `<textarea>`.

En `Contact.jsx`, reemplazar el `alert()` por un estado con `<FormNotice>` al
enviar y `<FormError>` al fallar.

- [ ] **Step 4: Reescribir `NotFound`**

```jsx
import { Link } from "react-router-dom";
import MediaPlaceholder from "@/components/common/MediaPlaceholder/MediaPlaceholder";
import "./NotFound.css";

const NotFound = () => (
  <div className="no-encontrado contenedor">
    <div className="no-encontrado-marca">
      <MediaPlaceholder />
    </div>
    <h1>Esta página no existe</h1>
    <p>El enlace puede haber cambiado, o el producto ya no está en el catálogo.</p>
    <Link to="/products" className="boton boton-primario">Ver el catálogo</Link>
  </div>
);

export default NotFound;
```

```css
.no-encontrado {
  display: grid;
  gap: var(--e-4);
  justify-items: center;
  text-align: center;
  padding-block: var(--e-8);
}

.no-encontrado-marca { width: 140px; height: 140px; }
.no-encontrado p { color: var(--text-suave); }
```

- [ ] **Step 5: Verificar y commitear**

Abrir el panel en 360px y confirmar que la tabla se ve como cards. Confirmar
que el aviso de `src=""` ya no aparece en la consola.

```bash
git add src/pages/Contact/ src/pages/NotFound/ src/pages/Admin/ src/components/FormularioContacto/
git commit -m "feat: contacto, 404 y panel sobre los tokens

El panel deja de renderizar <img src=\"\"> por cada producto sin foto, que
hacía que el navegador volviera a pedir la página entera 100 veces. Y su
tabla de 6 columnas se convierte en cards por debajo de 768px, porque en
un teléfono era inusable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Normalizar las categorías

`CATEGORIES` declara 15, pero los productos tienen 20 valores. Si el hero de la home son las categorías, ese ruido se ve.

**Files:**
- Create: `scripts/normalizar-categorias.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `db` de `scripts/firebaseAdmin.mjs`; `CATEGORIES` de `src/constants/categories.js`.
- Produces: `npm run categorias` (reporte) y `npm run categorias -- --aplicar`.

- [ ] **Step 1: Crear el script**

```js
import { db } from "./firebaseAdmin.mjs";
import { CATEGORIES } from "../src/constants/categories.js";

const VALIDAS = new Set(Object.values(CATEGORIES));

// Los cuatro valores en mayúsculas no son categorías: son subcategorías
// cargadas en el campo equivocado. Este mapa dice a qué categoría pertenecen.
const A_SUBCATEGORIA = {
  "POPULARES": "Morteros",
  "GRANDES Y PROFESIONALES": "Morteros",
  "CHICAS E INTERMEDIAS": "Morteros",
  "BAJO IMPACTO SONORO": "Varios",
};

const aplicar = process.argv.includes("--aplicar");

const snapshot = await db.collection("products").get();

const aMover = [];
const sinCategoria = [];
const desconocidas = new Map();

snapshot.forEach((doc) => {
  const d = doc.data();
  const cat = d.category ?? d.categoria ?? "";

  if (!cat) {
    sinCategoria.push({ id: doc.id, nombre: d.nombre ?? d.name ?? "(sin nombre)" });
  } else if (A_SUBCATEGORIA[cat]) {
    aMover.push({ id: doc.id, de: cat, a: A_SUBCATEGORIA[cat] });
  } else if (!VALIDAS.has(cat)) {
    desconocidas.set(cat, (desconocidas.get(cat) ?? 0) + 1);
  }
});

console.log(`\nProductos: ${snapshot.size}\n`);

console.log(`A mover a subcategoría: ${aMover.length}`);
for (const [valor, n] of Object.entries(
  aMover.reduce((acc, m) => ({ ...acc, [m.de]: (acc[m.de] ?? 0) + 1 }), {})
)) {
  console.log(`  "${valor}" -> categoría "${A_SUBCATEGORIA[valor]}", subcategoría "${valor}"  (${n})`);
}

console.log(`\nSin categoría: ${sinCategoria.length}`);
sinCategoria.slice(0, 20).forEach((p) => console.log(`  ${p.id}  ${p.nombre}`));
if (sinCategoria.length > 20) console.log(`  ... y ${sinCategoria.length - 20} más`);
console.log("\n  Estos hay que clasificarlos a mano: el script no puede");
console.log("  adivinar si un producto es petardo o estallo.\n");

if (desconocidas.size) {
  console.log("Categorías desconocidas que NO se tocan:");
  for (const [v, n] of desconocidas) console.log(`  "${v}"  (${n})`);
  console.log("");
}

if (!aplicar) {
  console.log("Esto fue solo un reporte. Para aplicar los movimientos:");
  console.log("  npm run categorias -- --aplicar\n");
  process.exit(0);
}

if (aMover.length === 0) {
  console.log("No hay nada que aplicar.\n");
  process.exit(0);
}

const LOTE = 400;
let escritos = 0;

for (let i = 0; i < aMover.length; i += LOTE) {
  const batch = db.batch();
  for (const m of aMover.slice(i, i + LOTE)) {
    batch.update(db.collection("products").doc(m.id), {
      category: m.a,
      subcategoria: m.de,
    });
    escritos++;
  }
  await batch.commit();
  console.log(`  lote confirmado: ${escritos}/${aMover.length}`);
}

console.log(`\nListo. ${escritos} productos corregidos.\n`);
process.exit(0);
```

**Reporta antes de escribir y exige `--aplicar`.** No se toca el catálogo de
producción a ciegas.

- [ ] **Step 2: Agregar el script a `package.json`**

```json
"categorias": "node scripts/normalizar-categorias.mjs"
```

- [ ] **Step 3: Correr el reporte**

```bash
npm run categorias
```
Esperado: el listado de qué se movería y cuántos productos quedan sin
categoría. **No escribe nada.**

- [ ] **Step 4: Commit**

```bash
git add scripts/normalizar-categorias.mjs package.json
git commit -m "feat: script para normalizar las categorías del catálogo

CATEGORIES declara 15 categorías pero los productos tienen 20 valores:
cuatro en mayúsculas que son subcategorías cargadas en el campo
equivocado, más productos sin categoría. Es la razón por la que
obtenerProductos hace where(in, [cat, cat.toUpperCase()]).

El script reporta por defecto y solo escribe con --aplicar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: Pasada final de responsive y accesibilidad

La verificación que ningún test automatizado cubre.

**Files:**
- Modify: cualquier CSS donde la revisión encuentre un problema.

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: nada.

- [ ] **Step 1: Correr la suite completa**

```bash
npm test
```
Esperado: todos los tests en verde — los 134 del subproyecto A más los ~50
nuevos de este.

- [ ] **Step 2: Revisar cada vista a tres anchos, en los dos temas**

Con `npm run dev` y las herramientas de desarrollo en 360px, 1024px y 1440px, y
cambiando el tema desde el perfil. Para cada una de las 10 vistas:

| Comprobación |
|---|
| No hay scroll horizontal |
| Ningún texto se corta ni se superpone |
| Todo lo clickeable mide al menos 44×44px |
| El contraste se mantiene en los dos temas |
| El contenido respira a 16px de los bordes |

Vistas: Home · Products · ProductDetails · Carrito · Contact · Login · Register
· Profile · NotFound · AdminDashboard. Más los dos modales.

- [ ] **Step 3: Recorrer el sitio entero con teclado**

Sin tocar el mouse: `Tab` desde el inicio hasta el final de cada vista.

| Comprobación |
|---|
| El foco es visible siempre, sobre cualquier fondo |
| El orden sigue el orden visual |
| El modal atrapa el foco y `Escape` lo cierra |
| El foco vuelve al botón que abrió el modal |
| El menú hamburguesa se abre y se cierra con teclado |

- [ ] **Step 4: Verificar el movimiento reducido**

Activar "reducir movimiento" en el sistema operativo y confirmar que no hay
ninguna animación, incluida la del contador del carrito y la del modal.

- [ ] **Step 5: Confirmar que no quedaron clases huérfanas**

```bash
grep -rn "auth-btn\|btn-view\|btn-outline\|btn-add\|btn-save\|btn-cancel\|container-nav\|no-image" src/ --include=*.jsx
```
Esperado: sin salida. Si queda alguna, es una clase sin estilo: reemplazarla.

- [ ] **Step 6: Confirmar que no quedó ningún color literal fuera de los tokens**

```bash
grep -rnE "#[0-9A-Fa-f]{3,6}" src --include=*.css | grep -v "styles/tokens.css"
```
Esperado: solo `#16202E` en `controles.css` (el texto sobre dorado) y en
`Modal.css` (el fondo con opacidad). Cualquier otro color literal se mueve a un
token.

- [ ] **Step 7: Commit final**

```bash
git add -A src/
git commit -m "fix: ajustes de la pasada final de responsive y accesibilidad

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verificación final de la rama

- [ ] `npm test` en verde
- [ ] `npm run build` sin errores
- [ ] `npm run lint` sin errores nuevos (los 10 preexistentes siguen; ver subproyecto A)
- [ ] Las 10 vistas y los 2 modales revisados a 360/1024/1440 en los dos temas
- [ ] Recorrido completo con teclado
- [ ] Sin colores literales fuera de `tokens.css`
- [ ] **La prueba de la dirección elegida:** abrir la home en un cuarto a oscuras. Si la pantalla molesta, el tema oscuro está mal calibrado.
