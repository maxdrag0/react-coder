import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebaseAdmin.mjs";
import { PARES, planDe } from "./campos.mjs";

/*
  Deja un solo idioma en el catálogo: `nombre`, `categoria`, `descripcion` y
  `fotoUrl`. El panel viejo escribía `name`, `category`, `description` e
  `image`, y cada lectura de la app terminaba siendo `p.nombre || p.name`.

  Solo toca la colección `products`. Los PEDIDOS no se tocan: un pedido es el
  registro de lo que se acordó y se guarda con el nombre que el producto tenía
  ese día. Por eso la app conserva el fallback para leer renglones viejos.

  Reporta por defecto; solo escribe con --aplicar.
*/

const aplicar = process.argv.includes("--aplicar");

const snapshot = await db.collection("products").get();

const aMigrar = [];
const conConflicto = [];
let yaLimpios = 0;

snapshot.forEach((doc) => {
  const datos = doc.data();
  const plan = planDe(datos);
  const nombre = datos.nombre ?? datos.name ?? doc.id;

  if (plan.conflictos.length > 0) {
    conConflicto.push({ id: doc.id, nombre, plan });
    return;
  }
  if (!plan.hayCambios) {
    yaLimpios++;
    return;
  }
  aMigrar.push({ id: doc.id, nombre, plan });
});

console.log(`\nProductos: ${snapshot.size}`);
console.log(`  ya limpios:      ${yaLimpios}`);
console.log(`  a migrar:        ${aMigrar.length}`);
console.log(`  con conflicto:   ${conConflicto.length}`);

if (conConflicto.length > 0) {
  console.log(
    `\nCONFLICTOS — los dos campos tienen valores distintos y no los puedo\n` +
      `elegir por vos. Corregilos en el panel y volvé a correr el script:\n`,
  );
  for (const { id, nombre, plan } of conConflicto) {
    console.log(`  ${nombre} (${id})`);
    for (const c of plan.conflictos) {
      console.log(`    ${c.campo}: "${c.canonico}"   <-->   "${c.viejo}"`);
    }
  }
}

if (aMigrar.length > 0) {
  console.log(`\nA migrar:\n`);
  for (const { id, nombre, plan } of aMigrar.slice(0, 20)) {
    const mueve = Object.keys(plan.asignar);
    const detalle = mueve.length > 0 ? `copia ${mueve.join(", ")}; ` : "";
    console.log(
      `  ${nombre} (${id}): ${detalle}borra ${plan.borrar.join(", ")}`,
    );
  }
  if (aMigrar.length > 20) console.log(`  ... y ${aMigrar.length - 20} más`);
}

if (!aplicar) {
  console.log(`\nEsto fue un reporte. Para escribir de verdad:`);
  console.log(`  npm run unificar-campos -- --aplicar\n`);
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

console.log(`\nListo: ${escritos} productos unificados.`);
console.log(`Campos canónicos: ${PARES.map(([c]) => c).join(", ")}\n`);
