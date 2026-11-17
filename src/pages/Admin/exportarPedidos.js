import { estadoDePedido, etiquetaDePedido } from "@/constants/estadoPedido";
import { renglonDe } from "@/constants/renglon";

/*
  Exporta a CSV los pedidos que el panel está mostrando.

  LO QUE SE BAJA ES LO QUE SE VE: la lista ya viene filtrada por la pantalla,
  así que "abiertos" baja los abiertos y "todos" baja todos. Exportar siempre
  el total obligaría a volver a filtrar en Excel, que es justo lo que se
  acaba de hacer en el panel.

  El formato es el mismo que el de productos, por las mismas razones:

  - Separador punto y coma, no coma. Excel en español usa `;` como separador
    de listas: con coma mete toda la fila en una sola celda.
  - BOM al principio. Sin él, Excel abre "Córdoba" como "CÃ³rdoba".
  - El total va como número pelado, sin símbolo ni separador de miles: con
    "$ 45.000" Excel lo lee como texto y la columna no suma.

  Una fila por PEDIDO y no por producto: es la misma unidad que muestra el
  panel, que es lo que se estaba mirando al apretar el botón. Los productos
  van listados en una columna, como se leen en la tabla.
*/

const COLUMNAS = [
  "N° de orden",
  "Fecha",
  "Estado",
  "Cliente",
  "Email",
  "Telefono",
  "Direccion",
  "Ciudad",
  "Productos",
  "Total",
  "Nota",
];

const SEPARADOR = ";";

// U+FEFF por código y no como caracter: un BOM literal en el fuente es
// invisible al leer el archivo y lo marca el linter.
const BOM = String.fromCharCode(0xfeff);

/** Entrecomilla solo si hace falta, y duplica las comillas internas. */
const celda = (valor) => {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  if (!/[;"\n\r]/.test(texto)) return texto;
  return `"${texto.replace(/"/g, '""')}"`;
};

// La fecha legible y ordenable: "16/11/2026 12:30". Un ISO crudo es correcto
// pero nadie lo lee, y Excel tampoco lo reconoce como fecha.
const fechaDe = (iso) => {
  const fecha = new Date(iso ?? "");
  return Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleString("es-AR");
};

const filaDe = (pedido) =>
  [
    pedido.id,
    fechaDe(pedido.date),
    etiquetaDePedido(estadoDePedido(pedido)),
    pedido.buyer?.name,
    pedido.buyer?.email,
    pedido.buyer?.telefono,
    pedido.envio?.direccion,
    pedido.envio?.ciudad,
    (pedido.items ?? []).map(renglonDe).join(", "),
    pedido.total,
    pedido.nota,
  ]
    .map(celda)
    .join(SEPARADOR);

export const aCsv = (pedidos = []) => {
  const lineas = [COLUMNAS.join(SEPARADOR), ...pedidos.map(filaDe)];
  return `${BOM}${lineas.join("\n")}\n`;
};

/**
 * El nombre dice qué filtro se bajó: con varios archivos en Descargas,
 * "pedidos.csv" no distingue el de abiertos del de todos.
 */
export const nombreDelArchivo = (filtro = "todos", fecha = new Date()) => {
  const dia = [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
  return `pedidos-${filtro}-${dia}.csv`;
};

/**
 * Dispara la descarga. Separado de aCsv para que la lógica se pruebe sin DOM.
 */
export const descargarPedidos = (pedidos, filtro) => {
  const blob = new Blob([aCsv(pedidos)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreDelArchivo(filtro);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  // Sin esto el blob queda en memoria hasta recargar la página.
  URL.revokeObjectURL(url);
};
