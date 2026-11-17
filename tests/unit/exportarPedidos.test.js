import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { aCsv, nombreDelArchivo } from "@/pages/Admin/exportarPedidos";
import { ABIERTOS, TODOS } from "@/pages/Admin/filtrarPedidos";

/*
  La planilla de pedidos sale de lo que el panel está mostrando: si el filtro
  dice "abiertos", se bajan los abiertos. Exportar siempre todo obligaría a
  filtrar de nuevo en Excel, que es justo lo que ya se hizo en la pantalla.
*/
const PEDIDO = {
  id: "a1b2c3d4",
  date: "2026-11-16T15:30:00.000Z",
  estado: "nuevo",
  total: 45000,
  nota: "Llamar después de las 18",
  buyer: {
    name: "Ana Pérez",
    email: "ana@mail.com",
    telefono: "1122334455",
  },
  envio: { direccion: "San Martín 742", ciudad: "Córdoba" },
  items: [
    { cantidad: 2, nombre: "Torta 100 tiros", unidad: "unitario" },
    {
      cantidad: 1,
      nombre: "Bengala de humo",
      modeloEtiqueta: "Rojo",
      unidad: "display",
    },
  ],
};

const lineas = (csv) => csv.trim().split("\n");
const celdas = (linea) => linea.split(";");

describe("exportarPedidos: el formato que Excel entiende", () => {
  it("arranca con el BOM, o Excel escribe CumpleaÃ±os", () => {
    expect(aCsv([PEDIDO]).charCodeAt(0)).toBe(0xfeff);
  });

  it("separa con punto y coma, que es lo que usa Excel en español", () => {
    // Con coma, Excel mete la fila entera en una sola celda.
    expect(celdas(lineas(aCsv([PEDIDO]))[0]).length).toBeGreaterThan(5);
  });

  it("pone una fila por pedido, con el encabezado arriba", () => {
    expect(lineas(aCsv([PEDIDO, { ...PEDIDO, id: "otro" }]))).toHaveLength(3);
  });

  it("el total va como número pelado, para poder sumarlo", () => {
    // "$ 45.000" lo lee como texto y la columna no suma.
    expect(aCsv([PEDIDO])).toContain(";45000;");
  });

  it("trae lo que hace falta para atender el pedido", () => {
    const fila = lineas(aCsv([PEDIDO]))[1];
    expect(fila).toContain("Ana Pérez");
    expect(fila).toContain("ana@mail.com");
    expect(fila).toContain("1122334455");
    expect(fila).toContain("San Martín 742");
    expect(fila).toContain("Córdoba");
  });

  it("lista los productos como los muestra el panel", () => {
    const fila = lineas(aCsv([PEDIDO]))[1];
    expect(fila).toContain("2x Torta 100 tiros (Unidad)");
    expect(fila).toContain("1x Bengala de humo (Rojo, Display)");
  });

  it("entrecomilla lo que trae punto y coma", () => {
    const conPuntoYComa = {
      ...PEDIDO,
      nota: "Pagó; falta enviar",
    };
    expect(aCsv([conPuntoYComa])).toContain('"Pagó; falta enviar"');
  });

  it("no escribe undefined cuando faltan datos viejos", () => {
    const viejo = { id: "x", date: null, total: 0, buyer: {}, items: [] };
    const csv = aCsv([viejo]);
    expect(csv).not.toMatch(/undefined|NaN/);
  });

  it("sin pedidos deja el encabezado solo", () => {
    expect(lineas(aCsv([]))).toHaveLength(1);
  });
});

describe("nombreDelArchivo", () => {
  it("dice qué filtro se bajó", () => {
    // Con varios archivos en Descargas, "pedidos.csv" no dice cuál es cuál.
    const fecha = new Date("2026-11-17T10:00:00");
    expect(nombreDelArchivo(ABIERTOS, fecha)).toBe(
      "pedidos-abiertos-2026-11-17.csv",
    );
    expect(nombreDelArchivo(TODOS, fecha)).toBe("pedidos-todos-2026-11-17.csv");
  });

  it("usa el nombre del estado cuando el filtro es uno solo", () => {
    const fecha = new Date("2026-11-17T10:00:00");
    expect(nombreDelArchivo("pagado", fecha)).toBe(
      "pedidos-pagado-2026-11-17.csv",
    );
  });
});

/*
  Lo que se baja tiene que ser lo que se ve. El bug que esto evita es el mas
  facil de cometer: pasarle `pedidos` —la lista completa, que esta ahi al
  lado— en vez de `pedidosFiltrados`. No se nota en pantalla, y el archivo
  sale con pedidos que el filtro habia dejado afuera.
*/
describe("el boton del panel baja lo que esta filtrado", () => {
  const panel = readFileSync("src/pages/Admin/AdminDashboard.jsx", "utf8");

  it("llama a descargarPedidos con la lista filtrada y el filtro puesto", () => {
    expect(panel).toMatch(
      /descargarPedidos\(\s*pedidosFiltrados\s*,\s*filtroEstado\s*\)/,
    );
  });

  it("no le pasa la lista completa", () => {
    expect(panel).not.toMatch(/descargarPedidos\(\s*pedidos\s*[,)]/);
  });
});
