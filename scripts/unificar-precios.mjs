import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebaseAdmin.mjs";
import { LEGADOS, planDe } from "./precios.mjs";

/*
  Deja un solo esquema de precios en el catalogo: `presentaciones`. Se van los
  cuatro campos sueltos (price, precioUnitario, precioDisplay, precioBulto),
  que son de antes de que una presentacion supiera cuantas unidades trae.

  Solo toca la coleccion `products`. Los PEDIDOS no se tocan: un pedido guarda
  el precio que se acordo ese dia y no se recalcula nunca.

  Ningun precio que la tienda muestre cambia: ver la invariante en precios.mjs.

  Reporta por defecto; solo escribe con --aplicar.
*/

const aplicar = process.argv.includes("--aplicar");

const snapshot = await db.collection("products").get();

const aDerivar = [];
const soloLimpieza = [];
const conDiscrepancia = [];
let yaLimpios = 0;

snapshot.forEach((doc) => {
  const datos = doc.data();
  const plan = planDe(datos);
  const nombre = datos.nombre ?? doc.id;

  if (plan.discrepancias.length > 0) conDiscrepancia.push({ nombre, plan });

  if (!plan.hayCambios) {
    yaLimpios++;
    return;
  }

  const fila = { id: doc.id, nombre, plan };
  if (plan.asignar.presentaciones) aDerivar.push(fila);
  else soloLimpieza.push(fila);
});

const aMigrar = [...aDerivar, ...soloLimpieza];

console.log(`\nProductos: ${snapshot.size}`);
console.log(`  ya limpios:              ${yaLimpios}`);
console.log(`  a derivar presentaciones: ${aDerivar.length}`);
console.log(`  solo borrar los sueltos:  ${soloLimpieza.length}`);

if (conDiscrepancia.length > 0) {
  /*
    No frena nada: la tienda lee `presentaciones` desde que existen, asi que
    estos valores nunca se mostraron. Se avisa por si alguno se edito a mano
    esperando que aplicara.
  */
  console.log(
    `\nAVISO — campos sueltos que la tienda NO estaba usando. Borrarlos no\n` +
      `cambia ningun precio, pero conviene mirar que no haya uno que quisieras:\n`,
  );
  for (const { nombre, plan } of conDiscrepancia.slice(0, 15)) {
    console.log(`  ${nombre}`);
    for (const d of plan.discrepancias) {
      const muestra = d.muestra === null ? "no se vende asi" : `$${d.muestra}`;
      console.log(
        `    ${d.campo}: $${d.suelto}   la tienda muestra: ${muestra}`,
      );
    }
  }
  if (conDiscrepancia.length > 15) {
    console.log(`  ... y ${conDiscrepancia.length - 15} mas`);
  }
}

if (aDerivar.length > 0) {
  console.log(`\nPresentaciones a derivar:\n`);
  for (const { id, nombre, plan } of aDerivar.slice(0, 20)) {
    const formas = Object.entries(plan.asignar.presentaciones)
      .map(([clave, p]) => `${clave} $${p.precio}`)
      .join(", ");
    console.log(`  ${nombre} (${id}): ${formas}`);
  }
  if (aDerivar.length > 20) console.log(`  ... y ${aDerivar.length - 20} mas`);
}

if (!aplicar) {
  console.log(`\nEsto fue un reporte. Para escribir de verdad:`);
  console.log(`  npm run unificar-precios -- --aplicar\n`);
  process.exit(0);
}

if (aMigrar.length === 0) {
  console.log(`\nNada que escribir.\n`);
  process.exit(0);
}

// En lotes: Firestore topea en 500 operaciones por batch.
const TAMANIO = 400;
let escritos = 0;

for (let i = 0; i < aMigrar.length; i += TAMANIO) {
  const lote = db.batch();
  for (const { id, plan } of aMigrar.slice(i, i + TAMANIO)) {
    const campos = { ...plan.asignar };
    for (const campo of plan.borrar) campos[campo] = FieldValue.delete();
    lote.update(db.collection("products").doc(id), campos);
  }
  await lote.commit();
  escritos += Math.min(TAMANIO, aMigrar.length - i);
  console.log(`  escritos ${escritos}/${aMigrar.length}`);
}

console.log(`\nListo: ${escritos} productos con un solo esquema de precios.`);
console.log(`Campos que se fueron: ${LEGADOS.join(", ")}\n`);
