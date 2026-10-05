import { readFileSync } from "node:fs";

/*
  Las marcas de pirotecnia no están en un campo propio: viven al final del
  nombre del producto ("Petardo El Villerito Nacional", "Fosforo X 8 Punto
  Austral"). Este script las detecta buscando los sufijos de una y dos
  palabras que más se repiten.

  Solo reporta. La asignación la hace normalizar-marcas.mjs.
*/

const texto = readFileSync("src/constants/products.js", "utf8");
const nombres = [...texto.matchAll(/nombre: "([^"]*)"/g)].map((m) => m[1]);

const conteo = new Map();

for (const nombre of nombres) {
  const palabras = nombre.trim().split(/\s+/);
  for (const n of [1, 2]) {
    if (palabras.length <= n) continue;
    const sufijo = palabras.slice(-n).join(" ");
    conteo.set(sufijo, (conteo.get(sufijo) ?? 0) + 1);
  }
}

const candidatos = [...conteo.entries()]
  .filter(([, n]) => n >= 4)
  .sort((a, b) => b[1] - a[1]);

console.log(`Productos: ${nombres.length}\n`);
console.log("Sufijos que se repiten 4 o más veces (candidatos a marca):\n");
for (const [sufijo, n] of candidatos.slice(0, 30)) {
  console.log(`  ${String(n).padStart(4)}  ${sufijo}`);
}
