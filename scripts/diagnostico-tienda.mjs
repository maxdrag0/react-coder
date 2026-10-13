import { db } from "./firebaseAdmin.mjs";
import { rangoUnitario, presentacionesDe } from "../src/constants/unidades.js";
import { modelosDe } from "../src/constants/modelos.js";
import { fotosDe } from "../src/constants/fotos.js";
import { estadoDe } from "../src/constants/estadoProducto.js";

/*
  Diagnostico: que ve la tienda realmente. Solo lee, no escribe nada.

  Usa los MISMOS modulos que la tienda (rangoUnitario, modelosDe, fotosDe) y
  no los campos crudos. La version anterior leia `precioUnitario` directo y
  reportaba como "sin precio" a todo producto con modelos, porque el precio
  de esos vive en cada modelo y el del producto se escribe en null a
  proposito. Un diagnostico que miente es peor que no tenerlo.
*/

const snap = await db.collection("products").get();
const productos = snap.docs.map((d) => ({ codigo: d.id, ...d.data() }));

const porEstado = {};
const sinPrecio = [];
const sinFoto = [];
const modelosSinFoto = [];
const conModelos = [];
const estadosRaros = [];

for (const p of productos) {
  const nombre = p.nombre ?? p.name ?? p.codigo;

  const estado = p.estado === undefined ? "(sin campo)" : String(p.estado);
  porEstado[estado] = (porEstado[estado] ?? 0) + 1;
  if (p.estado !== undefined && estadoDe(p) !== p.estado) {
    estadosRaros.push({ nombre, estado: p.estado });
  }

  const modelos = modelosDe(p);
  if (modelos.length > 0) conModelos.push({ nombre, cuantos: modelos.length });

  // El precio real, mirando los modelos si los hay.
  if (rangoUnitario(p) === null) sinPrecio.push({ nombre, codigo: p.codigo });

  if (fotosDe(p).length === 0) sinFoto.push({ nombre, codigo: p.codigo });

  const faltan = modelos.filter((m) => !m.foto);
  if (modelos.length > 0 && faltan.length > 0) {
    modelosSinFoto.push({ nombre, faltan: faltan.length, total: modelos.length });
  }
}

const linea = (n) => "-".repeat(n);

console.log(`\n${linea(60)}`);
console.log(`PRODUCTOS: ${productos.length}`);
console.log(linea(60));

console.log("\nEstado en la tienda:");
for (const [k, n] of Object.entries(porEstado).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}

if (estadosRaros.length) {
  console.log(`\n!! Estados que el codigo no reconoce (se tratan como activo):`);
  estadosRaros.forEach((p) => console.log(`     ${p.nombre} -> ${p.estado}`));
}

console.log(`\n${linea(60)}`);
console.log("PRECIOS");
console.log(linea(60));

if (conModelos.length === 0) {
  console.log("\nNingun producto usa modelos.");
} else {
  console.log(`\nCon modelos (el precio vive en cada modelo): ${conModelos.length}`);
  conModelos.forEach((p) => console.log(`     ${p.cuantos} modelos  ${p.nombre}`));
}

if (sinPrecio.length === 0) {
  console.log("\nTodos tienen precio. Bien.");
} else {
  console.log(`\n!! SIN NINGUN PRECIO (no se pueden comprar): ${sinPrecio.length}`);
  sinPrecio.forEach((p) => console.log(`     ${p.nombre}  (${p.codigo})`));
}

console.log(`\n${linea(60)}`);
console.log("FOTOS");
console.log(linea(60));

if (sinFoto.length === 0) {
  console.log("\nTodos tienen al menos una foto. Bien.");
} else {
  console.log(`\nSin ninguna foto: ${sinFoto.length} de ${productos.length}`);
  sinFoto.slice(0, 20).forEach((p) => console.log(`     ${p.nombre}  (${p.codigo})`));
  if (sinFoto.length > 20) console.log(`     ... y ${sinFoto.length - 20} mas`);
  console.log("\n  En el panel: filtro 'Sin foto' para verlos todos juntos.");
}

if (modelosSinFoto.length > 0) {
  console.log(`\nProductos con modelos sin foto propia: ${modelosSinFoto.length}`);
  modelosSinFoto.forEach((p) =>
    console.log(`     ${p.faltan} de ${p.total} modelos  ${p.nombre}`)
  );
  console.log("\n  Esos modelos muestran la foto general del producto.");
}

console.log("");
process.exit(0);
