import { db } from "./firebaseAdmin.mjs";

// Diagnostico: que ve la tienda realmente. Solo lee.

const snap = await db.collection("products").get();

const porEstado = {};
const sinPrecio = [];
const ocultos = [];
const sinStock = [];
const estadosRaros = [];

snap.forEach((doc) => {
  const d = doc.data();
  const estado = d.estado;
  const clave = estado === undefined ? "(sin campo)" : JSON.stringify(estado);
  porEstado[clave] = (porEstado[clave] ?? 0) + 1;

  if (estado !== undefined && !["activo", "sin_stock", "oculto"].includes(estado)) {
    estadosRaros.push({ id: doc.id, estado });
  }
  if (estado === "oculto") ocultos.push(d.nombre ?? d.name ?? doc.id);
  if (estado === "sin_stock") sinStock.push(d.nombre ?? d.name ?? doc.id);

  const unitario = d.precioUnitario ?? d.price;
  if (typeof unitario !== "number" || !Number.isFinite(unitario) || unitario <= 0) {
    sinPrecio.push({ id: doc.id, nombre: d.nombre ?? d.name, unitario });
  }
});

console.log(`\nProductos totales: ${snap.size}\n`);

console.log("Campo `estado` en la base:");
for (const [k, n] of Object.entries(porEstado).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}

console.log(`\nOcultos (la tienda NO los muestra): ${ocultos.length}`);
ocultos.slice(0, 10).forEach((n) => console.log(`     ${n}`));

console.log(`\nSin stock (se ven, no se compran): ${sinStock.length}`);
sinStock.slice(0, 10).forEach((n) => console.log(`     ${n}`));

if (estadosRaros.length) {
  console.log(`\n!! Estados que el codigo no reconoce: ${estadosRaros.length}`);
  estadosRaros.slice(0, 10).forEach((p) => console.log(`     ${p.id} -> ${p.estado}`));
}

// Esto importa: el filtro de precio de /products usa el precio unitario, y si
// NINGUN producto tiene uno valido el tope queda en 0 y filtra todo.
console.log(`\nSin precio unitario valido: ${sinPrecio.length} de ${snap.size}`);
sinPrecio.slice(0, 5).forEach((p) =>
  console.log(`     ${p.nombre} -> ${JSON.stringify(p.unitario)}`)
);

const conPrecio = snap.size - sinPrecio.length;
console.log(`Con precio unitario valido: ${conPrecio}`);
if (conPrecio === 0) {
  console.log("  !! Con cero, el tope del filtro de precio queda en 0 y la");
  console.log("     pagina de productos no muestra NADA. Seria el bug.");
}

process.exit(0);
