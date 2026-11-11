import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "./firebaseAdmin.mjs";
import {
  aProductoNuevo,
  aActualizacion,
  modelosActualizados,
  planDeAplicacion,
} from "./desdeLista.mjs";

/*
  Crea, actualiza, renombra y borra productos según la selección del tablero
  de la lista de precios.

  El tablero vive en un artifact y guarda la selección en su propia base; yo
  la bajo a un archivo JSON y este script la ejecuta. El archivo es la fuente
  de verdad de lo que va a pasar.

  Reporta por defecto; solo escribe con --aplicar.

    npm run aplicar-lista                      reporte
    npm run aplicar-lista -- --aplicar         ejecuta
    npm run aplicar-lista -- --aplicar --activos   crea publicados en vez de ocultos
    npm run aplicar-lista -- --archivo otra.json

  LO QUE NO HACE, a propósito:
  - No toca fotos, descripción, estado ni el contador de compras de un
    producto que ya existe. La lista no los conoce.
  - No activa los productos nuevos: nacen ocultos porque no tienen foto.
*/

const argumento = (nombre, porDefecto = null) => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
};

const aplicar = process.argv.includes("--aplicar");
const activo = process.argv.includes("--activos");
const ruta = resolve(argumento("--archivo", "seleccion.json"));

if (!existsSync(ruta)) {
  console.error(`
No se encontró la selección en:
  ${ruta}

Ese archivo lo genero yo a partir del tablero de la lista de precios.
Pedímelo y lo dejo en la raíz del proyecto, o pasá otra ruta:
  npm run aplicar-lista -- --archivo ruta/al/archivo.json
`);
  process.exit(1);
}

let items;
try {
  const crudo = JSON.parse(readFileSync(ruta, "utf8"));
  items = crudo.items ?? crudo;
} catch (error) {
  console.error(`\nEl archivo existe pero no se pudo leer: ${error.message}\n`);
  process.exit(1);
}

const plan = planDeAplicacion(items);
const pesos = (n) => "$" + Number(n).toLocaleString("es-AR");

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------

console.log(`\nSelección: ${ruta}`);
console.log(`  a crear:      ${plan.crear.length}`);
console.log(`  a actualizar: ${plan.actualizar.length}`);
console.log(`  a renombrar:  ${plan.renombrar.length}`);
console.log(`  a BORRAR:     ${plan.borrar.length}`);

if (plan.choques.length > 0) {
  console.error(
    `\nNO SE PUEDE APLICAR. ${plan.choques.length} documento(s) recibirían dos\n` +
      `renglones distintos, y el segundo pisaría al primero:\n`,
  );
  for (const c of plan.choques) {
    console.error(`  ${c.idDoc}: ${c.cuantos} renglones`);
    for (const f of [...plan.crear, ...plan.actualizar, ...plan.renombrar]) {
      if (f.idDoc === c.idDoc) console.error(`     - ${f.nombre}`);
    }
  }
  console.error(`\nCambiale el código a uno de los dos en el tablero.\n`);
  process.exit(1);
}

const muestra = (lista, cuantas = 12) => {
  for (const f of lista.slice(0, cuantas)) {
    const partes = [];
    if (f.unidad) partes.push(`unidad ${pesos(f.unidad)}`);
    if (f.display)
      partes.push(
        `display ${pesos(f.display.precio)} x${f.display.unidades ?? "?"}`,
      );
    if (f.bulto)
      partes.push(`bulto ${pesos(f.bulto.precio)} x${f.bulto.unidades ?? "?"}`);
    const mods = f.modelos?.length ? `  [${f.modelos.length} modelos]` : "";
    console.log(
      `  ${String(f.idDoc).padEnd(10)} ${String(f.nombre).slice(0, 44).padEnd(45)} ${partes.join(" / ")}${mods}`,
    );
  }
  if (lista.length > cuantas)
    console.log(`  ... y ${lista.length - cuantas} más`);
};

if (plan.crear.length > 0) {
  console.log(`\nA CREAR (nacen ${activo ? "PUBLICADOS" : "ocultos"}):\n`);
  muestra(plan.crear);
}

if (plan.actualizar.length > 0) {
  console.log(`\nA ACTUALIZAR (solo precios, más lo que hayas editado):\n`);
  muestra(plan.actualizar);
  const editados = plan.actualizar.filter((f) =>
    Object.values(f.editado ?? {}).some(Boolean),
  );
  if (editados.length > 0) {
    console.log(`\n  Con campos editados:`);
    for (const f of editados) {
      const cuales = Object.entries(f.editado)
        .filter(([, v]) => v)
        .map(([k]) => k);
      console.log(`    ${f.idDoc}: ${cuales.join(", ")} -> "${f.nombre}"`);
    }
  }
}

if (plan.renombrar.length > 0) {
  console.log(`\nA RENOMBRAR — cambia el id del documento:\n`);
  for (const f of plan.renombrar) {
    console.log(`  ${f.webId} -> ${f.idDoc}   ${f.nombre}`);
  }
  console.log(
    `\n  OJO: los pedidos ya hechos guardan el código viejo, y un link a\n` +
      `  /product/${plan.renombrar[0].webId} deja de funcionar.`,
  );
}

if (plan.borrar.length > 0) {
  console.log(`\n*** A BORRAR — esto no se puede deshacer ***\n`);
  for (const f of plan.borrar) {
    console.log(`  ${f.webId}   ${f.nombre}`);
  }
  console.log(
    `\n  Los pedidos ya hechos no se rompen: guardan nombre y precio del día.\n` +
      `  Si lo que querés es sacarlo de la vista pero poder volver, es mejor\n` +
      `  ponerlo en "oculto" desde el panel que borrarlo.`,
  );
}

const total =
  plan.crear.length +
  plan.actualizar.length +
  plan.renombrar.length +
  plan.borrar.length;

if (!aplicar) {
  console.log(`\nEsto fue un reporte, no se escribió nada. Para ejecutar:`);
  console.log(`  npm run aplicar-lista -- --aplicar\n`);
  process.exit(0);
}

if (total === 0) {
  console.log(`\nNada que hacer.\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

const productos = db.collection("products");

/*
  Los documentos que hay que leer antes de escribir: los que se actualizan
  (para conservar los modelos con su id y su foto) y los que se renombran
  (para llevarse todo lo que la lista no conoce).
*/
const aLeer = [
  ...plan.actualizar.map((f) => f.webId),
  ...plan.renombrar.map((f) => f.webId),
].filter(Boolean);

const vivos = new Map();
if (aLeer.length > 0) {
  const refs = [...new Set(aLeer)].map((id) => productos.doc(id));
  const docs = await db.getAll(...refs);
  for (const d of docs) if (d.exists) vivos.set(d.id, d.data());
}

const faltantes = aLeer.filter((id) => !vivos.has(id));
if (faltantes.length > 0) {
  console.error(
    `\nNo existen estos productos que había que actualizar: ${faltantes.join(", ")}\n` +
      `Volvé a pedirme el archivo: el tablero está mirando un catálogo viejo.\n`,
  );
  process.exit(1);
}

// Un renombre no puede pisar un documento que ya existe.
const ocupados = [];
for (const f of plan.renombrar) {
  const d = await productos.doc(f.idDoc).get();
  if (d.exists) ocupados.push(`${f.webId} -> ${f.idDoc}`);
}
if (ocupados.length > 0) {
  console.error(`\nEl código nuevo ya está ocupado: ${ocupados.join(", ")}\n`);
  process.exit(1);
}

const escrituras = [];

for (const f of plan.crear) {
  escrituras.push({
    tipo: "set",
    ref: productos.doc(f.idDoc),
    datos: aProductoNuevo(f, { activo }),
  });
}

for (const f of plan.actualizar) {
  const campos = aActualizacion(f);
  if (f.modelos?.length) {
    // Con modelos el precio vive en cada uno, y el del producto va en null.
    campos.modelos = modelosActualizados(
      vivos.get(f.webId).modelos,
      f.modelos,
      {
        unitario: f.unidad ? { precio: f.unidad } : null,
        display: f.display
          ? { precio: f.display.precio, unidades: f.display.unidades ?? null }
          : null,
        bulto: f.bulto
          ? { precio: f.bulto.precio, unidades: f.bulto.unidades ?? null }
          : null,
      },
    );
    campos.presentaciones = { unitario: null, display: null, bulto: null };
  }
  escrituras.push({
    tipo: "update",
    ref: productos.doc(f.webId),
    datos: campos,
  });
}

for (const f of plan.renombrar) {
  // Se lleva todo lo que la lista no conoce (fotos, descripción, estado,
  // compras) y encima los precios nuevos.
  const previo = vivos.get(f.webId);
  const campos = aActualizacion(f);
  escrituras.push({
    tipo: "set",
    ref: productos.doc(f.idDoc),
    datos: { ...previo, ...campos, codigo: f.codigo },
  });
  escrituras.push({ tipo: "delete", ref: productos.doc(f.webId) });
}

for (const f of plan.borrar) {
  escrituras.push({ tipo: "delete", ref: productos.doc(f.webId) });
}

// En lotes: Firestore topea en 500 operaciones por batch.
const TAMANIO = 400;
let hechas = 0;

for (let i = 0; i < escrituras.length; i += TAMANIO) {
  const lote = db.batch();
  for (const e of escrituras.slice(i, i + TAMANIO)) {
    if (e.tipo === "set") lote.set(e.ref, e.datos);
    else if (e.tipo === "update") lote.update(e.ref, e.datos);
    else lote.delete(e.ref);
  }
  await lote.commit();
  hechas += Math.min(TAMANIO, escrituras.length - i);
  console.log(`  ${hechas}/${escrituras.length} operaciones`);
}

console.log(`\nListo.`);
console.log(
  `  creados:      ${plan.crear.length}${activo ? " (publicados)" : " (ocultos)"}`,
);
console.log(`  actualizados: ${plan.actualizar.length}`);
console.log(`  renombrados:  ${plan.renombrar.length}`);
console.log(`  borrados:     ${plan.borrar.length}`);
if (plan.crear.length > 0 && !activo) {
  console.log(
    `\nLos nuevos están ocultos. Para publicarlos: npm run activar-ocultos`,
  );
}
console.log();
process.exit(0);
