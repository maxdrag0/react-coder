import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/*
  jsdom no hace layout ni evalúa media queries, así que esto se lee del CSS.

  EL BUG: en el panel, desde el celular, la página entera se podía arrastrar
  para los costados. La culpa era la fila de pestañas —Productos, Pedidos,
  Mensajes, Precios, Subir lista—, que es un flex sin wrap: cinco botones con
  texto no entran en 360px, y una fila más ancha que la pantalla empuja el
  ancho de todo el documento. El resto del panel ya estaba resuelto: la tabla
  se vuelve tarjetas y las barras de filtros envuelven.
*/

// Sin comentarios: el comentario que precede a una regla queda pegado al
// selector, y si tiene una coma adentro parte la lista de selectores.
const sinComentarios = (texto) =>
  texto
    .split("/*")
    .map((parte, i) => (i === 0 ? parte : parte.slice(parte.indexOf("*/") + 2)))
    .join("");

const css = sinComentarios(
  readFileSync("src/pages/Admin/AdminDashboard.css", "utf8"),
);

const CORTE = "@media (max-width: 767px)";
const celular = css.slice(css.indexOf(CORTE));

const reglaDe = (bloque, selector) => {
  for (const [, selectores, cuerpo] of bloque.matchAll(
    /([^{}]+)\{([^}]*)\}/g,
  )) {
    const lista = selectores.split(",").map((s) => s.trim());
    if (lista.includes(selector)) return cuerpo;
  }
  return null;
};

describe("Panel en celular: las pestañas no empujan el ancho de la página", () => {
  it("la fila de pestañas envuelve", () => {
    expect(css).toContain(CORTE);
    expect(reglaDe(celular, ".admin-tabs")).toMatch(/flex-wrap:\s*wrap/);
  });

  it("cada pestaña puede encogerse", () => {
    // Sin esto, el wrap no alcanza: una pestaña más ancha que la pantalla
    // sigue desbordando aunque la fila envuelva.
    const regla = reglaDe(celular, ".admin-tab");
    expect(regla).toMatch(/flex:/);
    expect(regla).toMatch(/min-width:\s*0/);
  });
});

describe("Panel en celular: ningún campo empuja el ancho", () => {
  /*
    EL BUG: un <select> dentro de un flex NO se achica por debajo del ancho
    de su opción más larga si no se le baja el min-width. La categoría más
    larga —"Tres Tiros Y Girandolas"— mide unos 210px, al lado va el select
    de marcas, y los dos juntos pasan los 360px de la pantalla. El panel
    entero se podía arrastrar para los costados aunque las pestañas ya
    envolvieran.
  */
  it("los selectores de los filtros se pueden achicar", () => {
    const regla = reglaDe(celular, ".prodfiltros-select");
    expect(regla).toMatch(/min-width:\s*0/);
    expect(regla).toMatch(/max-width:\s*100%/);
  });

  it("los campos de texto tampoco desbordan", () => {
    const regla = reglaDe(celular, ".admin-actions-bar input");
    expect(regla).toMatch(/min-width:\s*0/);
  });

  it("el título del panel no ocupa dos renglones", () => {
    // --t-xl son 31px: en 360px el título solo empujaba todo abajo del
    // pliegue.
    expect(reglaDe(celular, ".admin-header h2")).toMatch(/font-size/);
  });
});

describe("Panel en celular: las reglas de tamaño no quedan tapadas", () => {
  /*
    EL BUG: un media query NO aporta especificidad. `.prodfiltros-select` con
    font-size vivía en el primer bloque de celular, y la regla base del mismo
    selector está más abajo en el archivo: ganaba la de abajo y el select
    seguía con la letra grande. Es la misma trampa que ya tenía documentada
    el NavBar.
  */
  const posicionDe = (desde, selector) => {
    const indice = css.indexOf(`${selector} {`, desde);
    return indice === -1 ? Infinity : indice;
  };

  it("el font-size de celular del select va después de su regla base", () => {
    const base = posicionDe(0, ".prodfiltros-select");
    const conTamano = css.indexOf(
      "font-size",
      css.indexOf(".prodfiltros-select {", base + 1),
    );

    // La última declaración del selector tiene que ser la del celular.
    const ultima = css.lastIndexOf(".prodfiltros-select {");
    expect(ultima).toBeGreaterThan(base);
    expect(conTamano).toBeGreaterThan(base);
    expect(css.slice(ultima, ultima + 200)).toMatch(
      /font-size:\s*var\(--t-xs\)/,
    );
  });
});
