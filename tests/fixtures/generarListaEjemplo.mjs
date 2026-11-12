import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

/*
  Genera lista-ejemplo.pdf, la muestra que usan los tests del lector de PDF.

  La lista real del proveedor NO va al repo: son precios de costo. Esta
  muestra reproduce su estructura con datos inventados, incluidas las tres
  rarezas que importan:

  - una fila partida, con el codigo en un stream y los precios en otro,
    que es lo que pasa en los cortes de pagina;
  - dos filas con el mismo codigo, que en la lista real son 34;
  - texto en un arreglo TJ con interletraje y un escape octal, que es como
    el PDF escribe los acentos.

  Para regenerarla:  node tests/fixtures/generarListaEjemplo.mjs
*/

// Las X son las mismas columnas de la lista real.
const X = {
  codigo: 15,
  nombre: 44,
  duracion: 503,
  unidad: 546,
  display: 583,
  pDisplay: 623,
  bulto: 667,
  pBulto: 697,
};

const texto = (x, y, s) =>
  `BT /F1 1 Tf 8.28 0 0 8.28 ${x} ${y} Tm (${s})Tj ET\n`;

/** Un arreglo TJ con interletraje, que es como el PDF real escribe. */
const textoConKerning = (x, y, partes) =>
  `BT /F1 1 Tf 8.28 0 0 8.28 ${x} ${y} Tm [${partes}]TJ ET\n`;

const fila = (
  y,
  { codigo, nombre, unidad, display, pDisplay, bulto, pBulto },
) =>
  [
    codigo !== undefined ? texto(X.codigo, y, codigo) : "",
    nombre !== undefined ? texto(X.nombre, y, nombre) : "",
    unidad !== undefined ? texto(X.unidad, y, unidad) : "",
    display !== undefined ? texto(X.display, y, display) : "",
    pDisplay !== undefined ? texto(X.pDisplay, y, pDisplay) : "",
    bulto !== undefined ? texto(X.bulto, y, bulto) : "",
    pBulto !== undefined ? texto(X.pBulto, y, pBulto) : "",
  ].join("");

// --- primer stream: encabezado y tres filas -------------------------------
const encabezado =
  texto(10, 493, "CODIGO") +
  texto(239, 493, "PETARDOS") +
  texto(534, 493, "$ UNIDAD") +
  texto(575, 493, "DISPLAY") +
  texto(613, 493, "$ DISPLAY") +
  texto(658, 493, "BULTO") +
  texto(695, 493, "$ BULTO");

const contenidoA =
  encabezado +
  fila(480, {
    codigo: "202",
    nombre: "PETARDO ROMPEPORTONES",
    unidad: "860",
    display: "10x5",
    pDisplay: "43000",
    bulto: "10",
    pBulto: "430000",
  }) +
  // Nombre partido en un TJ con interletraje y un escape octal (\341 = a con tilde).
  textoConKerning(X.nombre, 469, '(PET)-12.2 (ARDO "DI\\341BOLICO")') +
  fila(469, {
    codigo: "203",
    unidad: "425",
    display: "1X10",
    pDisplay: "4250",
    bulto: "100",
    pBulto: "425000",
  }) +
  // Mismo codigo que la anterior: el display cambia. Pasa 34 veces en la real.
  fila(458, {
    codigo: "203",
    nombre: "PETARDO DIABOLICO",
    unidad: "425",
    display: "1X20",
    pDisplay: "8500",
    bulto: "50",
    pBulto: "425000",
  }) +
  // Fila partida: aca solo el codigo y el nombre.
  fila(447, { codigo: "317", nombre: "PETARDO N 7 JUPITER" }) +
  texto(355, 39, "P\\341gina 1 de 1");

// --- segundo stream: los precios de la fila partida -----------------------
const contenidoB = fila(447, {
  unidad: "230",
  display: "20X10",
  pDisplay: "46000",
  bulto: "20",
  pBulto: "920000",
});

// --------------------------------------------------------------------------
// Armado del PDF
// --------------------------------------------------------------------------

const objetos = [];
const agregar = (cuerpo) => {
  objetos.push(cuerpo);
  return objetos.length; // los numeros de objeto arrancan en 1
};

const streamComprimido = (contenido) => {
  const datos = deflateSync(Buffer.from(contenido, "latin1"));
  return {
    cabecera: `<< /Length ${datos.length} /Filter /FlateDecode >>`,
    datos,
  };
};

const a = streamComprimido(contenidoA);
const b = streamComprimido(contenidoB);

const nCatalogo = agregar(null); // 1, se completa abajo
const nPaginas = agregar(null); // 2
const nPagina = agregar(null); // 3
const nA = agregar(null); // 4
const nB = agregar(null); // 5
const nFuente = agregar(null); // 6

objetos[nCatalogo - 1] = `<< /Type /Catalog /Pages ${nPaginas} 0 R >>`;
objetos[nPaginas - 1] = `<< /Type /Pages /Kids [${nPagina} 0 R] /Count 1 >>`;
objetos[nPagina - 1] =
  `<< /Type /Page /Parent ${nPaginas} 0 R /MediaBox [0 0 842 595] ` +
  `/Contents [${nA} 0 R ${nB} 0 R] ` +
  `/Resources << /Font << /F1 ${nFuente} 0 R >> >> >>`;
objetos[nA - 1] = a;
objetos[nB - 1] = b;
objetos[nFuente - 1] =
  `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;

const trozos = [];
const posiciones = [];
let desplazamiento = 0;

const escribir = (buf) => {
  trozos.push(buf);
  desplazamiento += buf.length;
};

escribir(Buffer.from("%PDF-1.4\n", "latin1"));

objetos.forEach((obj, i) => {
  posiciones[i] = desplazamiento;
  const numero = i + 1;
  if (typeof obj === "string") {
    escribir(Buffer.from(`${numero} 0 obj\n${obj}\nendobj\n`, "latin1"));
    return;
  }
  escribir(Buffer.from(`${numero} 0 obj\n${obj.cabecera}\nstream\n`, "latin1"));
  escribir(obj.datos);
  escribir(Buffer.from("\nendstream\nendobj\n", "latin1"));
});

const inicioXref = desplazamiento;
let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
for (const pos of posiciones) {
  xref += `${String(pos).padStart(10, "0")} 00000 n \n`;
}
xref +=
  `trailer\n<< /Size ${objetos.length + 1} /Root ${nCatalogo} 0 R >>\n` +
  `startxref\n${inicioXref}\n%%EOF\n`;
escribir(Buffer.from(xref, "latin1"));

const salida = new URL("./lista-ejemplo.pdf", import.meta.url);
writeFileSync(salida, Buffer.concat(trozos));
console.log(
  "lista-ejemplo.pdf escrito:",
  Buffer.concat(trozos).length,
  "bytes",
);
