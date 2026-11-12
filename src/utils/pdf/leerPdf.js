/*
  Lee el texto de un PDF con sus coordenadas, sin ninguna dependencia.

  POR QUE CON COORDENADAS Y NO TEXTO PLANO: una lista de precios es una tabla,
  y un PDF no tiene tablas. Tiene texto tirado en posiciones. "860" y "43000"
  salen uno detras del otro en el archivo y lo unico que dice cual es el
  precio unitario y cual el del display es la X donde estan dibujados. Sin las
  coordenadas, una fila a la que le falta un dato corre todas las demas.

  POR QUE SIN LIBRERIA: pdf.js pesa cerca de un mega y trae un parser
  completo. Aca alcanza con descomprimir los streams de contenido y recorrer
  los operadores de texto, que son cuatro. El navegador descomprime solo con
  DecompressionStream.
*/

/*
  Bytes a texto latin1, que es como hay que leer un PDF: la estructura es
  ASCII y las cadenas de texto usan un byte por caracter.

  No se usa TextDecoder("latin1") porque esa etiqueta resuelve a
  windows-1252, que mapea distinto el rango 0x80-0x9F. En un PDF ese rango
  aparece dentro de los streams comprimidos y traducirlo mal rompe las
  posiciones de los marcadores.
*/
const TAMANIO_TROZO = 0x8000;

export const aLatin1 = (bytes) => {
  let salida = "";
  for (let i = 0; i < bytes.length; i += TAMANIO_TROZO) {
    salida += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + TAMANIO_TROZO),
    );
  }
  return salida;
};

/**
 * Descomprime un stream Flate. Anda igual en el navegador y en Node 18+.
 *
 * Los `.catch` de write y close no son decorativos: cuando el stream no es
 * flate esas dos promesas rechazan, y sin atenderlas queda una rejection sin
 * manejar que tumba el proceso entero, aunque el await de abajo tambien
 * rechace y alguien lo atrape. Un PDF con una imagen adentro alcanza.
 */
export const inflar = async (bytes) => {
  const ds = new DecompressionStream("deflate");
  const escritor = ds.writable.getWriter();
  escritor.write(bytes).catch(() => {});
  escritor.close().catch(() => {});
  const buffer = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buffer);
};

/*
  Los streams de contenido del PDF.

  Se recorta por el /Length que declara el diccionario del objeto y NO por la
  distancia hasta "endstream": entre el fin de los datos y esa palabra hay
  bytes de fin de linea, y DecompressionStream los rechaza como basura al
  final (zlib de Node los tolera, el navegador no). Recortar los espacios a
  ojo tampoco sirve: un stream comprimido puede terminar en un byte 0x0A que
  es dato.
*/
const streamsDe = (bytes, texto) => {
  const salida = [];
  let i = texto.indexOf("stream");

  while (i >= 0) {
    const finDic = texto.lastIndexOf("<<", i);
    const dic = finDic >= 0 ? texto.slice(finDic, i) : "";
    // Un /Length indirecto (N 0 R) exigiria resolver la tabla de referencias.
    const largo = dic.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
    // Solo los comprimidos con Flate. Una imagen JPEG adentro del PDF es un
    // stream igual que el texto, y no hay por que intentar inflarla.
    const esFlate = /\/FlateDecode/.test(dic);

    let d = i + 6;
    if (bytes[d] === 13) d++;
    if (bytes[d] === 10) d++;

    const fin = texto.indexOf("endstream", d);
    if (fin < 0) break;

    if (largo && esFlate) {
      const n = Number(largo[1]);
      if (n > 0 && d + n <= bytes.length) salida.push(bytes.subarray(d, d + n));
    }

    i = texto.indexOf("stream", fin + 9);
  }

  return salida;
};

// --------------------------------------------------------------------------
// Cadenas
// --------------------------------------------------------------------------

const decodificar = (s) =>
  s
    .replace(/\\([nrtbf])/g, (_, c) => (c === "t" ? " " : ""))
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));

/*
  Las partes de texto de un arreglo TJ. Los numeros que van entre medio son
  ajustes de interletraje y no texto, salvo que separen tanto que haya que
  leerlo como un espacio; a esta escala eso no pasa.
*/
const partesDeArray = (txt) => {
  let salida = "";
  let p = 0;

  while (p < txt.length) {
    if (txt[p] !== "(") {
      p++;
      continue;
    }
    let q = p + 1;
    let profundidad = 1;
    let s = "";
    while (q < txt.length && profundidad > 0) {
      if (txt[q] === "\\") {
        s += txt[q] + txt[q + 1];
        q += 2;
        continue;
      }
      if (txt[q] === "(") profundidad++;
      else if (txt[q] === ")") {
        profundidad--;
        if (profundidad === 0) break;
      }
      s += txt[q];
      q++;
    }
    salida += decodificar(s);
    p = q + 1;
  }

  return salida;
};

// --------------------------------------------------------------------------
// Operadores de texto
// --------------------------------------------------------------------------

/*
  Tm fija la matriz de texto (a 0 0 d e f): e y f son la posicion, a y d la
  escala. Td desplaza en espacio de texto, asi que su valor hay que
  multiplicarlo por la escala para que de puntos de pagina. T* baja una linea.
*/
const RE_OPERADOR =
  /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|(-?[\d.]+)\s+(-?[\d.]+)\s+(TD|Td)|(-?[\d.]+)\s+TL|(T\*)|\[((?:[^[\]\\]|\\.)*)\]\s*TJ|\(((?:[^()\\]|\\.)*)\)\s*Tj/g;

const itemsDe = (contenido) => {
  const items = [];
  let escalaX = 1;
  let escalaY = 1;
  let lineaX = 0;
  let lineaY = 0;
  let x = 0;
  let y = 0;
  let interlinea = 0;

  RE_OPERADOR.lastIndex = 0;
  let m;

  while ((m = RE_OPERADOR.exec(contenido)) !== null) {
    if (m[1] !== undefined) {
      escalaX = Number(m[1]);
      escalaY = Number(m[4]);
      lineaX = x = Number(m[5]);
      lineaY = y = Number(m[6]);
    } else if (m[7] !== undefined) {
      lineaX += Number(m[7]) * escalaX;
      lineaY += Number(m[8]) * escalaY;
      if (m[9] === "TD") interlinea = -Number(m[8]);
      x = lineaX;
      y = lineaY;
    } else if (m[10] !== undefined) {
      interlinea = Number(m[10]);
    } else if (m[11] !== undefined) {
      lineaY -= interlinea * escalaY;
      x = lineaX;
      y = lineaY;
    } else {
      const texto =
        m[12] !== undefined ? partesDeArray(m[12]) : decodificar(m[13]);
      if (texto.trim()) items.push({ x, y, texto });
    }
  }

  return items;
};

// --------------------------------------------------------------------------
// Filas
// --------------------------------------------------------------------------

/** Dos textos a menos de esto de distancia vertical estan en la misma fila. */
const TOLERANCIA = 3;

const filasDeItems = (items) => {
  const grupos = [];

  for (const item of items) {
    const grupo = grupos.find((g) => Math.abs(g.y - item.y) <= TOLERANCIA);
    if (grupo) grupo.celdas.push(item);
    else grupos.push({ y: item.y, celdas: [item] });
  }

  // De arriba hacia abajo, que es el orden en que se lee la pagina.
  grupos.sort((a, b) => b.y - a.y);
  for (const g of grupos) g.celdas.sort((a, b) => a.x - b.x);

  return grupos;
};

/**
 * Las filas de texto del PDF, en orden de lectura.
 *
 * @param {Uint8Array} bytes el archivo entero
 * @param {(b: Uint8Array) => Promise<Uint8Array>} descomprimir
 * @returns {Promise<Array<{y: number, celdas: Array<{x: number, y: number, texto: string}>}>>}
 */
export const filasDePdf = async (bytes, descomprimir = inflar) => {
  const texto = aLatin1(bytes);
  const filas = [];

  for (const crudo of streamsDe(bytes, texto)) {
    let contenido;
    try {
      contenido = aLatin1(await descomprimir(crudo));
    } catch {
      // Una imagen o un stream con otro filtro: no es texto y no interesa.
      continue;
    }

    if (!contenido.includes("BT") || !/T[jJ]/.test(contenido)) continue;

    filas.push(...filasDeItems(itemsDe(contenido)));
  }

  return filas;
};
