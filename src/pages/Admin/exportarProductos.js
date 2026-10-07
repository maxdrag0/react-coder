import { estadoDe, ACTIVO } from "@/constants/estadoProducto";
import { presentacionesDe } from "@/constants/unidades";
import { modelosDe } from "@/constants/modelos";

/*
  Exporta los productos activos a CSV.

  Dos decisiones de formato que no son cosmeticas:

  - Separador punto y coma, no coma. Excel en español usa `;` como separador
    de listas: con coma mete toda la fila en una sola celda.
  - BOM al principio. Sin el, Excel abre "Cumpleaños" como "CumpleaÃ±os".

  Los precios van como numeros pelados, sin simbolo ni separador de miles: si
  fueran "$ 8.000" Excel los leeria como texto y no se podrian sumar.

  Los precios salen de presentacionesDe y no de los campos crudos, asi la
  planilla dice lo que la tienda realmente ofrece. Importa: 171 productos
  tienen precioDisplay igual al unitario y la tienda lo ignora, asi que
  exportarlo afirmaria que se vende de una forma en que no se vende.
*/

const COLUMNAS = [
  "Codigo",
  "Modelo",
  "Nombre",
  "Precio unidad",
  "Precio display",
  "Unidades por display",
  "Precio bulto",
  "Unidades por bulto",
];

const SEPARADOR = ";";

// U+FEFF, construido por codigo y no escrito como caracter: un BOM literal
// en el fuente es invisible al leer el archivo y lo marca el linter.
const BOM = String.fromCharCode(0xfeff);

/** Entrecomilla solo si hace falta, y duplica las comillas internas. */
const celda = (valor) => {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  if (!/[;"\n\r]/.test(texto)) return texto;
  return `"${texto.replace(/"/g, '""')}"`;
};

const filaDe = (producto, modelo = null) => {
  const p = presentacionesDe(producto, modelo?.id ?? null);

  return [
    producto.codigo,
    modelo?.etiqueta ?? "",
    producto.nombre ?? producto.name ?? "",
    p.unitario?.precio,
    p.display?.precio,
    p.display?.unidades,
    p.bulto?.precio,
    p.bulto?.unidades,
  ]
    .map(celda)
    .join(SEPARADOR);
};

/*
  Un producto con modelos da una fila por modelo: el precio vive en el modelo,
  asi que una sola fila no podria decir ninguno. El codigo y el nombre se
  repiten, que es lo que hace util la planilla para leerla de corrido.
*/
const filasDe = (producto) => {
  const modelos = modelosDe(producto);
  if (modelos.length === 0) return [filaDe(producto)];
  return modelos.map((m) => filaDe(producto, m));
};

export const aCsv = (productos) => {
  const activos = productos.filter((p) => estadoDe(p) === ACTIVO);
  const lineas = [COLUMNAS.join(SEPARADOR), ...activos.flatMap(filasDe)];
  return `${BOM}${lineas.join("\n")}\n`;
};

export const nombreDelArchivo = (fecha = new Date()) => {
  const dia = [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
  return `productos-activos-${dia}.csv`;
};

/**
 * Dispara la descarga en el navegador. Separado de aCsv para que la parte con
 * la logica se pueda probar sin DOM.
 */
export const descargarCsv = (productos) => {
  const blob = new Blob([aCsv(productos)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreDelArchivo();
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  // Sin esto el blob queda en memoria hasta que se recargue la pagina.
  URL.revokeObjectURL(url);
};
