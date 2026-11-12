import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/*
  El recargo se aplica en dos lugares y en NINGÚN otro: la fachada
  `services/firebase/index.js`, por donde lee la tienda, y `api/orden.js`, por
  donde cotiza el servidor.

  Estos tests cuidan las dos formas de romperlo, que son silenciosas:

  1. Que el panel empiece a leer de la fachada. Entonces el formulario de
     edición mostraría el precio con recargo, guardarlo lo hornearía en el
     precio guardado, y en la vuelta siguiente el recargo se aplicaría sobre
     ese precio ya recargado. Dos ediciones y los precios se van al techo.

  2. Que el servidor deje de aplicarlo. Entonces la tienda mostraría un precio
     y el servidor cotizaría otro, y TODOS los pedidos volverían con 409
     "tu carrito está desactualizado". La tienda queda sin poder vender.
*/

const archivosDe = (dir) => {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosDe(ruta));
    else if (/\.(jsx?|mjs)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
};

const leer = (ruta) => readFileSync(ruta, "utf8");

describe("el panel lee los precios de lista", () => {
  it("no importa la fachada de servicios", () => {
    const culpables = archivosDe(join("src", "pages", "Admin")).filter(
      (ruta) => {
        const fuente = leer(ruta);
        return (
          /from\s+["'][^"']*services\/index(\.js)?["']/.test(fuente) ||
          /from\s+["'][^"']*services\/firebase["']/.test(fuente) ||
          /from\s+["'][^"']*services\/firebase\/index(\.js)?["']/.test(fuente)
        );
      },
    );

    expect(culpables).toEqual([]);
  });

  it("importa productosFirebase directo", () => {
    const panel = leer(join("src", "pages", "Admin", "AdminDashboard.jsx"));
    expect(panel).toMatch(/services\/firebase\/productosFirebase/);
  });
});

describe("la tienda ve los precios con recargo", () => {
  const fachada = leer(join("src", "services", "firebase", "index.js"));

  it("la fachada aplica el recargo", () => {
    expect(fachada).toMatch(/conRecargo/);
    expect(fachada).toMatch(/obtenerRecargo/);
  });

  it("lo aplica en las dos lecturas de productos", () => {
    // El listado y el detalle son dos caminos distintos: si solo uno lo
    // aplicara, la card y la ficha dirían precios distintos.
    const listado = fachada.slice(fachada.indexOf("obtenerProductos:"));
    const detalle = fachada.slice(
      fachada.indexOf("obtenerProductosPorCodigo:"),
    );
    expect(listado).toMatch(/conRecargo|conPrecios/);
    expect(detalle).toMatch(/conRecargo/);
  });
});

describe("el servidor cotiza con el mismo recargo", () => {
  const handler = leer(join("api", "orden.js"));

  it("lee la configuración", () => {
    expect(handler).toMatch(/config/);
    expect(handler).toMatch(/recargoValido/);
  });

  it("se lo aplica a cada producto antes de validar", () => {
    const antesDeValidar = handler.slice(
      0,
      handler.indexOf("validarOrden(items"),
    );
    expect(antesDeValidar).toMatch(/conRecargo\(/);
  });

  it("usa el mismo módulo que la tienda", () => {
    // Una segunda implementación del mismo cálculo deriva. Tiene que ser el
    // mismo archivo, igual que precioDe.
    expect(handler).toMatch(/from\s+["']\.\.\/src\/constants\/recargo\.js["']/);
  });
});
