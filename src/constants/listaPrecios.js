/*
  Convierte las filas de texto de la lista del proveedor en productos.

  LO QUE HAY QUE INTERPRETAR Y NO ESTA ESCRITO EN LA LISTA:

  1. UNIDADES POR DISPLAY. La columna "DISPLAY" dice cosas como "10x5" o
     "1X10", y es ambigua: el mismo "10X5" vale 50 en un producto y 10 en
     otro. El cociente $display / $unidad SI es exacto en toda la lista,
     porque el display se cobra al mismo precio unitario. Esa es la cantidad.

  2. DISPLAYS POR BULTO. La columna "BULTO" no son unidades, son displays.
     Entonces unidades por bulto = unidades por display x displays por bulto,
     y eso tiene que dar $bulto / $unidad. Se verifica fila por fila y lo que
     no cierra queda marcado.

  3. LA CATEGORIA sale de las bandas de rubro de la propia lista, no de cada
     fila.

  Esto es puro: recibe filas y devuelve datos. No sabe de PDF ni de Firestore.
*/

/*
  Las columnas, por la X donde el PDF las dibuja. Esta es la unica parte atada
  al diseño de ESTA lista: si el proveedor rediseña la planilla, estos numeros
  cambian y es lo que hay que tocar.
*/
export const COLUMNAS = [
  { hasta: 40, clave: "codigo" },
  { hasta: 480, clave: "nombre" },
  { hasta: 530, clave: "duracion" },
  { hasta: 570, clave: "pUnidad" },
  { hasta: 605, clave: "display" },
  { hasta: 650, clave: "pDisplay" },
  { hasta: 686, clave: "bulto" },
  { hasta: Infinity, clave: "pBulto" },
];

const columnaDe = (x) => COLUMNAS.find((c) => x < c.hasta).clave;

/** Las bandas de rubro de la lista, y a que categoria de la tienda van. */
const SECCIONES = [
  [/^PETARDOS$/i, "Petardos", null],
  [/^FOSFOROS$/i, "Fosforos", null],
  [/^BATERIAS$/i, "Baterias", null],
  [/^ESTALLOS E INFANTILES$/i, "Estallos E Infantiles", null],
  [/^VARIOS$/i, "Varios", null],
  [/^BOMBAS$/i, "Bombas", null],
  [/^GIRATORIOS Y VOLADORES$/i, "Giratorios Y Voladores", null],
  [/^MORTEROS$/i, "Morteros", null],
  [/^TRES TIROS Y GIRANDOLAS$/i, "Tres Tiros Y Girandolas", null],
  [/^MISILES Y SILBADORES$/i, "Misiles Y Silbadores", null],
  [/^CANDELAS$/i, "Candelas", null],
  [/^BENGALAS Y ESTRELLITAS$/i, "Bengalas", null],
  [/^VOLCANES$/i, "Volcanes", null],
  [/^CAÑAS VOLADORAS$/i, "Cañas Voladoras", null],
  [/^TORTAS POPULARES$/i, "Tortas", "Populares"],
  [/TORTAS .*PUNTO AUSTRAL/i, "Tortas", "Chicas e intermedias"],
  [/CHICAS E INTERMEDIAS/i, "Tortas", "Chicas e intermedias"],
  [/TORTAS GRANDES/i, "Tortas", "Grandes y profesionales"],
  [/TORTAS BAJO IMPACTO/i, "Tortas", "Bajo impacto sonoro"],
];

const seccionDe = (texto) => {
  for (const [re, categoria, subcategoria] of SECCIONES) {
    if (re.test(texto.trim())) return { categoria, subcategoria };
  }
  return null;
};

/** El orden importa: "Punto Austral" tiene que probarse antes que "Austral". */
const MARCAS = [
  ["Punto Austral", /punto austra|pto austra|p\.a\.|\bpa\b|austral/i],
  ["Cienfuegos", /cienfuegos|cfueg/i],
  ["Jupiter", /jupiter/i],
  ["Siglo XXI", /siglo xx/i],
  ["Thunder King", /thunder king/i],
  ["Akill", /akill/i],
];

const marcaDe = (nombre) => {
  for (const [marca, re] of MARCAS) if (re.test(nombre)) return marca;
  return null;
};

const RUIDO =
  /^(CODIGO|DURACION|\$\s*UNIDAD|\$UNIDAD|DISPLAY|\$\s*DISPLAY|BULTO|\$\s*BULTO|P.gina \d+ de \d+|FUEGOS ARTIFICIALES|LISTA DE PRECIOS.*|SIGLO XXI|LOS PRECIOS.*|ESTAN EXPRESADOS.*|FORMA DE PAGO.*|MODIFICACIONES.*)$/i;

const numero = (valor) => {
  const limpio = String(valor ?? "").replace(/[^\d]/g, "");
  if (!limpio) return null;
  const n = parseInt(limpio, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// --------------------------------------------------------------------------
// Nombres
// --------------------------------------------------------------------------

/*
  El PDF parte un nombre en varios textos y hay que decidir si van pegados o
  con espacio. Una comilla al final puede abrir o cerrar: si las comillas
  quedan pareadas la ultima cerro y lo que sigue lleva espacio
  ("96 PERLAS" + torta); si quedan impares, abrio y va pegado
  (PETARDO " + EL DESTRUK-TOR).
*/
export const unir = (a, b) => {
  if (!a) return b;

  const comillas = (a.match(/["']/g) ?? []).length;
  const abrioComilla = /["']$/.test(a) && comillas % 2 === 1;
  const cierra = /^["'´]($|\s)/.test(b);

  const pegado =
    abrioComilla ||
    (!/["']$/.test(a) && /[\s(\-/]$/.test(a)) ||
    cierra ||
    /^[)\].,;:]/.test(b) ||
    (/\d$/.test(a) && /^\d/.test(b));

  return a + (pegado ? "" : " ") + b;
};

export const limpiarNombre = (s) =>
  String(s ?? "")
    /*
      En esta fuente el 0x7B cae donde deberia ir una eñe: "CA{A", "ara{as".
      La caja la decide la letra de al lado: en un nombre en mayusculas va Ñ
      ("CAÑA") y en uno en minusculas va ñ ("arañas").
    */
    .replace(
      /(.?)\{/g,
      (_, previa) => previa + (/[A-ZÁÉÍÓÚ]/.test(previa) ? "Ñ" : "ñ"),
    )
    .replace(/\s+/g, " ")
    .replace(/\s+\d+\s*´+\s*$/g, "")
    .replace(/\s*´+\s*$/g, "")
    .replace(/\s*,\s*$/, "")
    .trim();

// --------------------------------------------------------------------------
// Cantidades
// --------------------------------------------------------------------------

/*
  Se admite hasta 1% de error porque alguna fila trae el precio de display mal
  redondeado (4290 x 6 = 25740 y la lista dice 25720). Se redondea y se avisa,
  en vez de descartar la presentacion.
*/
const TOLERANCIA = 0.01;

const cantidad = (total, unitario) => {
  if (!unitario || !total) return null;
  const exacto = total / unitario;
  const n = Math.round(exacto);
  if (n < 1) return null;
  return Math.abs(exacto - n) / n <= TOLERANCIA ? n : null;
};

// --------------------------------------------------------------------------
// Interpretacion
// --------------------------------------------------------------------------

const celdasDe = (fila) => {
  const celdas = {};
  for (const { x, texto } of fila.celdas) {
    const t = texto.trim();
    if (!t) continue;
    const clave = columnaDe(x);
    if (clave === "nombre") celdas.nombre = unir(celdas.nombre ?? "", t);
    else celdas[clave] = (celdas[clave] ?? "") + t;
  }
  return celdas;
};

const soloTexto = (celdas) =>
  Object.keys(celdas).length === 1 && Boolean(celdas.nombre);

const esEncabezado = (celdas) =>
  /^CODIGO$/i.test(celdas.codigo ?? "") ||
  /\$\s*BULTO/i.test(celdas.pBulto ?? "");

const tieneAlgunPrecio = (celdas) =>
  Boolean(celdas.pUnidad || celdas.pDisplay || celdas.pBulto);

/**
 * Las filas crudas, agrupadas en productos.
 *
 * `sueltas` son las filas que no se pudieron ubicar: el PDF dibuja algunas
 * celdas que desbordaron en su propio sistema de coordenadas, y ahi los
 * numeros no corresponden a ninguna columna. En la lista 2026 son tres. Se
 * devuelven aparte en vez de descartarse para que una persona las vea.
 */
export const interpretarLista = (filas) => {
  const crudos = [];
  const sueltas = [];
  let categoria = null;
  let subcategoria = null;

  for (const fila of filas) {
    // Una celda que desbordo: el PDF la dibuja aparte, con su propia matriz.
    if (fila.y < 5) {
      sueltas.push(fila.celdas.map((c) => c.texto.trim()).filter(Boolean));
      continue;
    }

    const celdas = celdasDe(fila);

    if (soloTexto(celdas)) {
      const seccion = seccionDe(celdas.nombre);
      if (seccion) {
        categoria = seccion.categoria;
        subcategoria = seccion.subcategoria;
        continue;
      }
    }

    if (esEncabezado(celdas)) {
      const seccion = celdas.nombre ? seccionDe(celdas.nombre) : null;
      if (seccion) {
        categoria = seccion.categoria;
        subcategoria = seccion.subcategoria;
      }
      continue;
    }

    if (celdas.nombre && RUIDO.test(celdas.nombre.trim())) continue;
    if (!celdas.codigo && !celdas.nombre && !tieneAlgunPrecio(celdas)) continue;

    const ultimo = crudos[crudos.length - 1];

    /*
      Filas partidas por el corte de pagina. Sin codigo, lo que llega es la
      continuacion de la anterior: los precios que quedaron abajo, el nombre
      que siguio en la linea siguiente, o solo las columnas del bulto.
    */
    if (!celdas.codigo && ultimo) {
      if (celdas.pUnidad && !ultimo.pUnidad) {
        Object.assign(ultimo, celdas);
        continue;
      }
      if (celdas.nombre && !celdas.pUnidad) {
        ultimo.nombre = unir(ultimo.nombre ?? "", celdas.nombre);
        continue;
      }
      if (!celdas.nombre && celdas.pBulto && !ultimo.pBulto) {
        ultimo.bulto = celdas.bulto;
        ultimo.pBulto = celdas.pBulto;
        continue;
      }
    }

    crudos.push({ ...celdas, categoria, subcategoria });
  }

  return { productos: aProductos(crudos), sueltas };
};

const aProductos = (crudos) => {
  const productos = [];

  for (const crudo of crudos) {
    const codigo = (crudo.codigo ?? "").trim();
    const nombre = limpiarNombre(crudo.nombre);
    if (!codigo && !nombre) continue;

    const pUnidad = numero(crudo.pUnidad);
    const pDisplay = numero(crudo.pDisplay);
    const pBulto = numero(crudo.pBulto);
    const displaysPorBulto = numero(crudo.bulto);

    const porDisplay = cantidad(pDisplay, pUnidad);
    const porBulto = cantidad(pBulto, pUnidad);

    const avisos = [];
    if (!pUnidad) avisos.push("sin precio unitario");
    if (pDisplay && !porDisplay) {
      avisos.push("el display no es múltiplo del unitario");
    }
    if (pBulto && !porBulto) {
      avisos.push("el bulto no es múltiplo del unitario");
    }
    if (
      (porDisplay && pDisplay !== porDisplay * pUnidad) ||
      (porBulto && pBulto !== porBulto * pUnidad)
    ) {
      avisos.push("los precios no multiplican exacto: revisar el unitario");
    }
    if (porDisplay && porBulto && displaysPorBulto) {
      const esperado = porDisplay * displaysPorBulto;
      if (esperado !== porBulto) {
        avisos.push(
          `el bulto no cierra: ${porDisplay} × ${displaysPorBulto} = ${esperado}, pero $bulto ÷ $unidad = ${porBulto}`,
        );
      }
    }
    if (!nombre) avisos.push("la lista no trae el nombre: escribilo vos");

    productos.push({
      codigo,
      nombre,
      categoria: crudo.categoria,
      subcategoria: crudo.subcategoria,
      marca: marcaDe(nombre),
      duracion: numero(crudo.duracion),
      pUnidad,
      pDisplay,
      pBulto,
      porDisplay,
      porBulto,
      displaysPorBulto,
      displayCrudo: (crudo.display ?? "").trim() || null,
      avisos,
    });
  }

  return conIdYRepetidos(productos);
};

/*
  Un id valido como clave y estable entre corridas. El codigo del proveedor
  trae barras y comas ("0001/20", "654,1") que no sirven como id de documento,
  y ademas se repite: 34 veces en la lista 2026. Los repetidos se desempatan
  por orden de aparicion.

  Importa marcarlos porque el codigo ES el id del documento: dos filas con el
  mismo codigo escriben el mismo producto y la segunda pisa a la primera.
*/
const conIdYRepetidos = (productos) => {
  const usados = {};
  for (const p of productos) {
    const base = p.codigo.replace(/[^A-Za-z0-9_.~:@+-]/g, "-") || "sin-codigo";
    usados[base] = (usados[base] ?? 0) + 1;
    p.id = usados[base] === 1 ? base : `${base}--${usados[base]}`;
  }

  const porCodigo = {};
  for (const p of productos)
    porCodigo[p.codigo] = (porCodigo[p.codigo] ?? 0) + 1;
  for (const p of productos) {
    if (porCodigo[p.codigo] > 1) p.repetido = porCodigo[p.codigo];
  }

  return productos;
};
