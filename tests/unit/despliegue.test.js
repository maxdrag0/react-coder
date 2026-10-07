import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/*
  El sitio se publica en dos lados con reglas distintas: GitHub Pages lo sirve
  bajo /react-coder/ y Vercel en la raíz. Cuando esa configuración se
  desalinea el síntoma es una PÁGINA EN BLANCO con 404 en los assets, sin un
  solo error de código que lo delate. Por eso vive acá.
*/

const leer = (ruta) => readFileSync(ruta, "utf8");

describe("base del sitio", () => {
  it("vite decide el base por entorno, no con un valor fijo", () => {
    expect(leer("vite.config.js")).toContain("process.env.VERCEL");
  });

  it("el basename del router se deriva del base de Vite", () => {
    // Escribirlo a mano es la trampa: si los dos no coinciden, el router no
    // matchea ninguna ruta y no renderiza nada.
    const main = leer("src/main.jsx");
    expect(main).toContain("import.meta.env.BASE_URL");
    expect(main).toMatch(/basename=\{/);
  });

  it("el basename no está escrito a mano en ningún lado", () => {
    expect(leer("src/main.jsx")).not.toMatch(/basename="/);
  });
});

describe("rutas profundas en los dos hostings", () => {
  it("vercel.json manda lo que no es un archivo a index.html", () => {
    // Sin esto, entrar directo a /products/Cohetes da 404 en Vercel.
    const vercel = JSON.parse(leer("vercel.json"));
    expect(vercel.rewrites.some((r) => r.destination === "/index.html")).toBe(true);
  });

  it("GitHub Pages tiene su 404.html, que es como se resuelve allá", () => {
    // Pages no tiene rewrites: sirve 404.html cuando no encuentra la ruta, y
    // si ese archivo es el index el router arranca igual.
    expect(existsSync("scripts/copiar-404.mjs")).toBe(true);
    const pkg = JSON.parse(leer("package.json"));
    expect(pkg.scripts.predeploy).toContain("copiar-404");
  });
});

describe("favicon", () => {
  it("existe el archivo que el HTML pide", () => {
    const html = leer("index.html");
    const encontrado = html.match(/<link rel="icon"[^>]*href="\/([^"]+)"/);
    expect(encontrado).not.toBeNull();
    // Vite le pega el base adelante al compilar, así que en el fuente va
    // absoluto y el archivo vive en public/.
    expect(existsSync(`public/${encontrado[1]}`)).toBe(true);
  });
});
