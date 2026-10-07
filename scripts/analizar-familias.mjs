import { db } from "./firebaseAdmin.mjs";

/*
  Solo lee. Busca "familias": productos cuyo nombre es el mismo salvo una
  medida o un color al final. Son modelos del mismo producto cargados como
  productos sueltos.

  Sirve para decidir si vale la pena un campo de variantes o si conviene
  dejarlos planos.
*/

// Lo que distingue un modelo de otro suele estar al final del nombre.
const COLAS = [
  /\s+\d+([.,]\d+)?\s*(cm|mm|pulgadas?|")\s*$/i, // medidas
  /\s+n\s*°?\s*\d+\s*$/i, // "N 5"
  /\s+(chica?|chico|mediana?|mediano|grande|xl)\s*$/i, // tamanios
  /\s+(roja?|verde|azul|dorada?|plateada?|blanca?|multicolor)\s*$/i, // colores
  /\s+x\s*\d+\s*$/i, // "x 8"
];

const raiz = (nombre) => {
  let n = nombre.trim();
  let cambio = true;
  // Se saca una cola por vez hasta que no quede ninguna: hay nombres como
  // "Mortero 3 Pulgadas Chico" con dos.
  while (cambio) {
    cambio = false;
    for (const patron of COLAS) {
      const corto = n.replace(patron, "");
      if (corto !== n) {
        n = corto;
        cambio = true;
      }
    }
  }
  return n.toLowerCase();
};

const snap = await db.collection("products").get();

const familias = new Map();
const porNombre = new Map();

snap.forEach((doc) => {
  const d = doc.data();
  const nombre = (d.nombre ?? d.name ?? "").trim();
  if (!nombre) return;

  porNombre.set(nombre, (porNombre.get(nombre) ?? 0) + 1);

  const clave = raiz(nombre);
  if (!familias.has(clave)) familias.set(clave, []);
  familias.get(clave).push({
    nombre,
    precio: d.precioUnitario ?? d.price,
    display: d.precioDisplay ?? null,
    bulto: d.precioBulto ?? null,
  });
});

const conVarios = [...familias.entries()]
  .filter(([, miembros]) => miembros.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

const enFamilias = conVarios.reduce((n, [, m]) => n + m.length, 0);

console.log(`\nProductos: ${snap.size}`);
console.log(`Familias con mas de un modelo: ${conVarios.length}`);
console.log(`Productos que caen en una familia: ${enFamilias}`);
console.log(`Productos sueltos: ${snap.size - enFamilias}\n`);

console.log("Las 12 familias mas grandes:\n");
for (const [clave, miembros] of conVarios.slice(0, 12)) {
  console.log(`  ${miembros.length}x  ${clave}`);
  miembros.slice(0, 4).forEach((m) => {
    const extras = [
      m.display ? "display" : null,
      m.bulto ? "bulto" : null,
    ].filter(Boolean);
    console.log(
      `        ${m.nombre}  ->  ${m.precio}${extras.length ? ` (+${extras.join(", ")})` : ""}`
    );
  });
  if (miembros.length > 4) console.log(`        ... y ${miembros.length - 4} mas`);
}

// Nombres exactamente repetidos: son duplicados de carga, no modelos.
const repetidos = [...porNombre.entries()].filter(([, n]) => n > 1);
console.log(`\nNombres EXACTAMENTE repetidos (duplicados de carga): ${repetidos.length}`);
repetidos.slice(0, 10).forEach(([n, c]) => console.log(`  ${c}x  ${n}`));

// Cuantos usan hoy display y bulto.
let conDisplay = 0;
let conBulto = 0;
snap.forEach((doc) => {
  const d = doc.data();
  if (typeof d.precioDisplay === "number" && d.precioDisplay > 0) conDisplay++;
  if (typeof d.precioBulto === "number" && d.precioBulto > 0) conBulto++;
});
console.log(`\nCon precio de display cargado: ${conDisplay} de ${snap.size}`);
console.log(`Con precio de bulto cargado:   ${conBulto} de ${snap.size}`);

process.exit(0);
