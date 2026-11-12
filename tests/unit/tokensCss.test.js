import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/*
  EL BUG QUE CUBRE: la barra del panel de la lista usaba `var(--bg)` de
  fondo, y ese token no existe. Una variable CSS inventada no tira error ni
  warning: resuelve a nada, y `background: ` sin valor es transparente. La
  barra quedaba traslúcida con las filas pasando por abajo, y no había manera
  de darse cuenta mirando el código.

  Un token con respaldo —var(--x, #hex)— es legítimo: ahí la intención de
  tener un valor de reserva está escrita.
*/

const archivosCss = (dir) => {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosCss(ruta));
    else if (nombre.endsWith(".css")) salida.push(ruta);
  }
  return salida;
};

/** Saca los comentarios: un token nombrado al explicarlo no es un uso. */
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("las variables CSS existen", () => {
  it("ningún archivo usa un token que no esté definido", () => {
    const fuentes = archivosCss("src");

    // Todo lo que se declara en cualquier hoja, no solo en tokens.css: hay
    // componentes que definen variables propias en su propio bloque.
    const declarados = new Set();
    for (const ruta of fuentes) {
      for (const m of readFileSync(ruta, "utf8").matchAll(/(--[\w-]+)\s*:/g)) {
        declarados.add(m[1]);
      }
    }

    const huerfanos = [];
    for (const ruta of fuentes) {
      const css = sinComentarios(readFileSync(ruta, "utf8"));
      for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
        // Con respaldo es una decisión; sin respaldo y sin declarar es un bug.
        if (!m[2] && !declarados.has(m[1])) huerfanos.push(`${ruta}: ${m[1]}`);
      }
    }

    expect(huerfanos).toEqual([]);
  });
});
