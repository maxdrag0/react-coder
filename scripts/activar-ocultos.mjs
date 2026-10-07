import { db } from "./firebaseAdmin.mjs";

/*
  Pone en `activo` todo lo que esté `oculto`.

  Para cuando un "seleccionar todos" + Ocultar en el panel deja la tienda
  vacía y volver a tildar 300 casillas a mano no es un plan.

  No toca los `sin_stock`: ese estado es una decisión distinta (se ve pero no
  se compra) y se vería mal pisarla de arriba.

  Reporta por defecto; solo escribe con --aplicar.
  Para hacer lo contrario está el panel: seleccionar todos y Ocultar.
*/

const OCULTO = "oculto";
const ACTIVO = "activo";

const aplicar = process.argv.includes("--aplicar");

const snapshot = await db.collection("products").get();

const aActivar = [];
const conteo = {};

snapshot.forEach((doc) => {
  const d = doc.data();
  const estado = d.estado ?? "(sin campo)";
  conteo[estado] = (conteo[estado] ?? 0) + 1;
  if (d.estado === OCULTO) {
    aActivar.push({ id: doc.id, nombre: d.nombre ?? d.name ?? doc.id });
  }
});

console.log(`\nProductos: ${snapshot.size}`);
console.log("\nEstado actual:");
for (const [k, n] of Object.entries(conteo).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}

if (aActivar.length === 0) {
  console.log("\nNo hay nada oculto. Nada que hacer.\n");
  process.exit(0);
}

console.log(`\nA pasar de oculto a activo: ${aActivar.length}`);
aActivar.slice(0, 10).forEach((p) => console.log(`     ${p.nombre}`));
if (aActivar.length > 10) console.log(`     ... y ${aActivar.length - 10} más`);

if (!aplicar) {
  console.log("\nEsto fue solo un reporte. Para aplicar:");
  console.log("  npm run activar-ocultos -- --aplicar\n");
  process.exit(0);
}

const LOTE = 400;
let escritos = 0;

for (let i = 0; i < aActivar.length; i += LOTE) {
  const batch = db.batch();
  for (const p of aActivar.slice(i, i + LOTE)) {
    batch.update(db.collection("products").doc(p.id), { estado: ACTIVO });
    escritos++;
  }
  await batch.commit();
  console.log(`  lote confirmado: ${escritos}/${aActivar.length}`);
}

console.log(`\nListo. ${escritos} productos activados.\n`);
process.exit(0);
