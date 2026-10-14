import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const archivosDe = (dir) => {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosDe(ruta));
    else if (/\.(jsx?|mjs)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
};

describe("firebase-admin", () => {
  it("es una dependencia de produccion", () => {
    /*
      api/orden.js corre en Vercel y lo importa en runtime. Como
      devDependency anda de casualidad: Vercel instala todo y rastrea los
      imports para empaquetar la funcion, pero cualquier instalacion con
      --omit=dev deja la funcion sin el modulo y el checkout devuelve 500.
    */
    expect(pkg.dependencies["firebase-admin"]).toBeTruthy();
    expect(pkg.devDependencies?.["firebase-admin"]).toBeUndefined();
  });

  it("no lo importa nada del cliente", () => {
    /*
      Esto es lo que de verdad lo mantiene fuera del bundle, y no en que
      seccion del package.json este: Vite empaqueta lo que se importa desde
      src/, sin mirar dependencies ni devDependencies. Con la credencial
      adentro, el bundle del navegador seria la llave maestra de la base.
    */
    const culpables = archivosDe("src").filter((f) =>
      readFileSync(f, "utf8").includes("firebase-admin")
    );
    expect(culpables).toEqual([]);
  });
});
