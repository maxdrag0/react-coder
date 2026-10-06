import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/*
  jsdom no evalúa media queries ni la cascada, así que esto no se puede
  probar renderizando: se lee el CSS.

  El bug que cubre: `.nav-solo-escritorio { display: none }` y
  `.nav-accion { display: inline-flex }` tienen la misma especificidad, y en
  el archivo la segunda venía después. Gana la última, así que el carrito y
  la cuenta se seguían viendo en celular aunque estuvieran marcados como
  solo-escritorio.

  La defensa es el selector compuesto, que sube la especificidad y queda a
  salvo de cualquier reordenamiento. Si alguien lo "simplifica", esto falla.
*/

const css = readFileSync("src/components/NavBar/NavBar.css", "utf8");

const CORTE = "@media (min-width: 900px)";
const base = css.slice(0, css.indexOf(CORTE));
const escritorio = css.slice(css.indexOf(CORTE));

// Devuelve el valor de display declarado para un selector exacto.
const displayDe = (bloque, selector) => {
  const reglas = [...bloque.matchAll(/([^{}]+)\{([^}]*)\}/g)];
  for (const [, selectores, cuerpo] of reglas) {
    const lista = selectores.split(",").map((s) => s.trim());
    if (!lista.includes(selector)) continue;
    const m = cuerpo.match(/display:\s*([a-z-]+)/);
    if (m) return m[1];
  }
  return null;
};

describe("NavBar: el carrito y la cuenta no se ven en celular", () => {
  it("esconde el compuesto .nav-accion.nav-solo-escritorio, no solo la clase suelta", () => {
    expect(displayDe(base, ".nav-accion.nav-solo-escritorio")).toBe("none");
  });

  it("lo muestra en escritorio, también con el compuesto", () => {
    // Un media query no aporta especificidad: si la regla de escritorio
    // usara solo .nav-solo-escritorio, perdería contra el compuesto de
    // arriba y el carrito desaparecería también en escritorio.
    expect(displayDe(escritorio, ".nav-accion.nav-solo-escritorio")).toBe(
      "inline-flex"
    );
  });

  it("no quedó ninguna regla de hamburguesa", () => {
    expect(css).not.toMatch(/nav-hamburguesa|nav-panel/);
  });
});

describe("NavBar: lo que SÍ queda arriba en celular", () => {
  it("el escudo del panel no está marcado como solo-escritorio", () => {
    // Es el único destino que BottomNav no lleva, así que en celular este
    // escudo es su único acceso.
    const jsx = readFileSync("src/components/NavBar/NavBar.jsx", "utf8");
    const linea = jsx.split("\n").find((l) => l.includes('to="/admin"'));
    expect(linea).toBeDefined();
    expect(linea).not.toContain("nav-solo-escritorio");
  });

  it("el carrito y la cuenta sí lo están", () => {
    const jsx = readFileSync("src/components/NavBar/NavBar.jsx", "utf8");
    const cart = readFileSync(
      "src/components/NavBar/CartMenu/CartMenu.jsx",
      "utf8"
    );
    const cuenta = jsx
      .split("\n")
      .find((l) => l.includes('to={user ? "/profile" : "/login"}'));
    expect(cuenta).toBeDefined();
    expect(jsx).toContain("nav-accion nav-solo-escritorio");
    expect(cart).toContain("nav-accion nav-solo-escritorio");
  });
});
