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
