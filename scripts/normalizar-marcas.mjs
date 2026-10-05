import { db } from "./firebaseAdmin.mjs";

/*
  Las marcas no estaban en un campo propio: viven dentro del nombre del
  producto ("Fosforo X 8 Punto Austral"). Este script las extrae a `marca`
  para poder filtrar por ellas.

  El nombre NO se toca: sacarle la marca cambiaría lo que el cliente ve y
  lo que figura en los pedidos ya hechos.

  Reporta por defecto; solo escribe con --aplicar.
*/

// El orden importa: "Punto Austral" tiene que probarse antes que "Austral".
const MARCAS = [
  { nombre: "Punto Austral", patrones: ["punto austral", "pto austral", "austral"] },
  { nombre: "Cienfuegos", patrones: ["cienfuegos"] },
  { nombre: "Jupiter", patrones: ["jupiter"] },
  { nombre: "Sylver", patrones: ["sylver"] },
  { nombre: "Corsario", patrones: ["corsario"] },
  { nombre: "Diabólico", patrones: ["diabolico", "diabólico"] },
];

const marcaDe = (nombre) => {
  const n = (nombre ?? "").toLowerCase();
  for (const m of MARCAS) {
    if (m.patrones.some((p) => n.includes(p))) return m.nombre;
  }
  return null;
};

const aplicar = process.argv.includes("--aplicar");

const snapshot = await db.collection("products").get();

const aAsignar = [];
const sinMarca = [];
let yaTienen = 0;

snapshot.forEach((doc) => {
  const d = doc.data();
  const nombre = d.nombre ?? d.name ?? "";

  if (d.marca) {
    yaTienen++;
    return;
  }

  const marca = marcaDe(nombre);
  if (marca) {
    aAsignar.push({ id: doc.id, marca, nombre });
  } else {
    sinMarca.push({ id: doc.id, nombre });
  }
});

console.log(`\nProductos: ${snapshot.size}`);
console.log(`Ya tienen marca: ${yaTienen}\n`);

const porMarca = aAsignar.reduce(
  (acc, a) => ({ ...acc, [a.marca]: (acc[a.marca] ?? 0) + 1 }),
  {}
);

console.log(`A asignar: ${aAsignar.length}`);
for (const [marca, n] of Object.entries(porMarca).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${marca}`);
}

console.log(`\nSin marca detectable: ${sinMarca.length}`);
sinMarca.slice(0, 15).forEach((p) => console.log(`  ${p.nombre}`));
if (sinMarca.length > 15) console.log(`  ... y ${sinMarca.length - 15} más`);
console.log("\n  Quedan sin marca y la tienda los agrupa como 'Sin marca'.");
console.log("  Se pueden asignar a mano desde el panel.\n");

if (!aplicar) {
  console.log("Esto fue solo un reporte. Para aplicar:");
  console.log("  npm run marcas -- --aplicar\n");
  process.exit(0);
}

const LOTE = 400;
let escritos = 0;

for (let i = 0; i < aAsignar.length; i += LOTE) {
  const batch = db.batch();
  for (const a of aAsignar.slice(i, i + LOTE)) {
    batch.update(db.collection("products").doc(a.id), { marca: a.marca });
    escritos++;
  }
  await batch.commit();
  console.log(`  lote confirmado: ${escritos}/${aAsignar.length}`);
}

console.log(`\nListo. ${escritos} marcas asignadas.\n`);
process.exit(0);
