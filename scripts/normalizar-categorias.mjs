import { db } from "./firebaseAdmin.mjs";
import { CATEGORIES } from "../src/constants/categories.js";

/*
  El catálogo de producción tiene TODAS las categorías en mayúsculas
  ("TORTAS", "CAÑAS VOLADORAS"), mientras que CATEGORIES las declara en
  capitalización normal ("Tortas", "Cañas Voladoras").

  Esa es la razón real por la que obtenerProductos hace
  where("category", "in", [categoria, categoria.toUpperCase()]): no parchea
  cuatro casos sueltos, parchea el catálogo entero.

  Además, mostrar "TORTAS" en una card se lee como un grito.

  Este script lleva las categorías a la forma canónica de CATEGORIES.
*/

// "CAÑAS VOLADORAS" -> "Cañas Voladoras"
const CANONICA = new Map(
  Object.values(CATEGORIES).map((c) => [c.toUpperCase(), c])
);

const aplicar = process.argv.includes("--aplicar");

const snapshot = await db.collection("products").get();

const aNormalizar = [];
const sinCategoria = [];
const desconocidas = new Map();
let yaCorrectas = 0;

snapshot.forEach((doc) => {
  const d = doc.data();
  const cat = d.category ?? d.categoria ?? "";

  if (!cat) {
    sinCategoria.push({ id: doc.id, nombre: d.nombre ?? d.name ?? "(sin nombre)" });
    return;
  }

  const canonica = CANONICA.get(cat.toUpperCase());

  if (!canonica) {
    desconocidas.set(cat, (desconocidas.get(cat) ?? 0) + 1);
  } else if (cat !== canonica) {
    aNormalizar.push({ id: doc.id, de: cat, a: canonica });
  } else {
    yaCorrectas++;
  }
});

console.log(`\nProductos: ${snapshot.size}`);
console.log(`Ya correctas: ${yaCorrectas}\n`);

console.log(`A normalizar: ${aNormalizar.length}`);
const porValor = aNormalizar.reduce(
  (acc, m) => ({ ...acc, [`${m.de} -> ${m.a}`]: (acc[`${m.de} -> ${m.a}`] ?? 0) + 1 }),
  {}
);
for (const [cambio, n] of Object.entries(porValor)) {
  console.log(`  ${cambio}  (${n})`);
}

if (sinCategoria.length) {
  console.log(`\nSin categoría: ${sinCategoria.length}`);
  sinCategoria.slice(0, 20).forEach((p) => console.log(`  ${p.id}  ${p.nombre}`));
  if (sinCategoria.length > 20) console.log(`  ... y ${sinCategoria.length - 20} más`);
  console.log("\n  Estos hay que clasificarlos a mano: el script no puede");
  console.log("  adivinar si un producto es petardo o estallo.");
}

if (desconocidas.size) {
  console.log("\nCategorías que no están en CATEGORIES y NO se tocan:");
  for (const [v, n] of desconocidas) console.log(`  "${v}"  (${n})`);
  console.log("\n  Si alguna es válida, agregala a src/constants/categories.js");
  console.log("  y volvé a correr esto.");
}

if (!aplicar) {
  console.log("\nEsto fue solo un reporte. Para aplicar los cambios:");
  console.log("  npm run categorias -- --aplicar\n");
  process.exit(0);
}

if (aNormalizar.length === 0) {
  console.log("\nNo hay nada que aplicar.\n");
  process.exit(0);
}

const LOTE = 400;
let escritos = 0;

for (let i = 0; i < aNormalizar.length; i += LOTE) {
  const batch = db.batch();
  for (const m of aNormalizar.slice(i, i + LOTE)) {
    batch.update(db.collection("products").doc(m.id), { category: m.a });
    escritos++;
  }
  await batch.commit();
  console.log(`  lote confirmado: ${escritos}/${aNormalizar.length}`);
}

console.log(`\nListo. ${escritos} categorías normalizadas.`);
console.log("\nAhora el toUpperCase() de obtenerProductos ya no hace falta,");
console.log("pero dejarlo no molesta y protege de datos viejos.\n");
process.exit(0);
