import { db } from "./firebaseAdmin.mjs";
import { products } from "../src/constants/products.js";

const LOTE = 400; // Firestore admite 500 operaciones por batch; margen de seguridad.

const existentes = await db.collection("products").limit(1).get();
if (!existentes.empty && !process.argv.includes("--forzar")) {
  console.log(`
La colección products ya tiene documentos. No se hace nada.
Para sobrescribir de todas formas: npm run seed -- --forzar
`);
  process.exit(0);
}

let escritos = 0;

for (let i = 0; i < products.length; i += LOTE) {
  const batch = db.batch();

  for (const producto of products.slice(i, i + LOTE)) {
    const adaptado = { ...producto, category: producto.categoria };
    delete adaptado.categoria;

    // Las '/' no son válidas en un ID de documento de Firestore.
    const idSeguro = String(producto.codigo).replace(/\//g, "-");
    batch.set(db.collection("products").doc(idSeguro), adaptado);
    escritos++;
  }

  await batch.commit();
  console.log(`  lote confirmado: ${escritos}/${products.length}`);
}

console.log(`\nListo. ${escritos} productos cargados en Firestore.`);
process.exit(0);
