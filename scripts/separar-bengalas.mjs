import { db } from "./firebaseAdmin.mjs";

/*
  "Bengalas Y Estrellitas" era una sola categoría con dos productos muy
  distintos: la bengala de mano que dura y chispea, y la estrellita de
  alambre. Este script la parte en dos.

  Clasifica por el nombre del producto. Lo que no se puede decidir queda en
  Bengalas, que es la categoría más general de las dos, y se lista aparte
  para revisarlo a mano desde el panel.

  Reporta por defecto; solo escribe con --aplicar.
*/

const ORIGEN = "Bengalas Y Estrellitas";
const BENGALAS = "Bengalas";
const ESTRELLITAS = "Estrellitas";

/*
  Las estrellitas se prueban primero porque son el caso más específico.

  "varita magica" entra acá: es de la familia de la estrellita de mano, no
  de la bengala. "estrellon" entra por el nombre, pero es el que menos
  seguro está: revisalos desde el panel.

  "bengalit" está aparte de "bengala" porque "bengalita" no contiene la
  cadena "bengala" y se colaba entre los dudosos.
*/
const PATRONES_ESTRELLITAS = [
  "estrellita",
  "estrellas de alambre",
  "varita magica",
  "varita mágica",
  "estrellon",
  "estrellón",
  "sparkler",
];

const PATRONES_BENGALAS = ["bengala", "bengalit"];

const clasificar = (nombre) => {
  const n = (nombre ?? "").toLowerCase();
  if (PATRONES_ESTRELLITAS.some((p) => n.includes(p))) return ESTRELLITAS;
  if (PATRONES_BENGALAS.some((p) => n.includes(p))) return BENGALAS;
  return null;
};

const aplicar = process.argv.includes("--aplicar");

const snapshot = await db.collection("products").get();

const enCategoria = [];
snapshot.forEach((doc) => {
  const d = doc.data();
  const categoria = d.categoria ?? d.category ?? "";
  if (categoria.toLowerCase() !== ORIGEN.toLowerCase()) return;
  enCategoria.push({ id: doc.id, nombre: d.nombre ?? d.name ?? "" });
});

if (enCategoria.length === 0) {
  console.log(`\nNo hay productos en "${ORIGEN}". Nada que hacer.\n`);
  process.exit(0);
}

const grupos = { [ESTRELLITAS]: [], [BENGALAS]: [], dudosos: [] };

for (const p of enCategoria) {
  const destino = clasificar(p.nombre);
  if (destino === ESTRELLITAS) grupos[ESTRELLITAS].push(p);
  else if (destino === BENGALAS) grupos[BENGALAS].push(p);
  else grupos.dudosos.push(p);
}

console.log(`\nProductos en "${ORIGEN}": ${enCategoria.length}\n`);

for (const destino of [ESTRELLITAS, BENGALAS]) {
  console.log(`-> ${destino} (${grupos[destino].length})`);
  grupos[destino].forEach((p) => console.log(`     ${p.nombre}`));
  console.log("");
}

if (grupos.dudosos.length > 0) {
  console.log(`-> ${BENGALAS}, sin poder decidir por el nombre (${grupos.dudosos.length})`);
  grupos.dudosos.forEach((p) => console.log(`     ${p.nombre}`));
  console.log("\n   Revisalos a mano desde el panel si alguno está mal.\n");
}

// Los dudosos van a Bengalas: la categoría más general de las dos.
const aEscribir = [
  ...grupos[ESTRELLITAS].map((p) => ({ ...p, destino: ESTRELLITAS })),
  ...grupos[BENGALAS].map((p) => ({ ...p, destino: BENGALAS })),
  ...grupos.dudosos.map((p) => ({ ...p, destino: BENGALAS })),
];

if (!aplicar) {
  console.log("Esto fue solo un reporte. Para aplicar:");
  console.log("  npm run separar-bengalas -- --aplicar\n");
  process.exit(0);
}

const LOTE = 400;
let escritos = 0;

for (let i = 0; i < aEscribir.length; i += LOTE) {
  const batch = db.batch();
  for (const p of aEscribir.slice(i, i + LOTE)) {
    // Los dos esquemas en paralelo, igual que escribe el panel.
    batch.update(db.collection("products").doc(p.id), {
      categoria: p.destino,
      category: p.destino,
    });
    escritos++;
  }
  await batch.commit();
  console.log(`  lote confirmado: ${escritos}/${aEscribir.length}`);
}

console.log(`\nListo. ${escritos} productos reclasificados.\n`);
process.exit(0);
