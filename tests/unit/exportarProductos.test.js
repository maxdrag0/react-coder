import { describe, it, expect } from "vitest";
import { aCsv, nombreDelArchivo } from "../../src/pages/Admin/exportarProductos";

const producto = (extra = {}) => ({
  codigo: "A12",
  nombre: "Torta 100 tiros",
  estado: "activo",
  precioUnitario: 8000,
  ...extra,
});

const filas = (csv) => csv.replace(/^﻿/, "").trim().split("\n");

describe("aCsv: qué productos entran", () => {
  it("exporta los activos", () => {
    expect(filas(aCsv([producto()]))).toHaveLength(2); // cabecera + 1
  });

  it("NO exporta los ocultos ni los sin stock", () => {
    const lista = [
      producto({ codigo: "A1" }),
      producto({ codigo: "A2", estado: "oculto" }),
      producto({ codigo: "A3", estado: "sin_stock" }),
    ];
    const csv = aCsv(lista);
    expect(csv).toContain("A1");
    expect(csv).not.toContain("A2");
    expect(csv).not.toContain("A3");
  });

  it("un producto sin el campo estado cuenta como activo", () => {
    const sinEstado = { codigo: "A9", nombre: "Viejo", precioUnitario: 100 };
    expect(aCsv([sinEstado])).toContain("A9");
  });

  it("con la lista vacía devuelve solo la cabecera", () => {
    expect(filas(aCsv([]))).toHaveLength(1);
  });
});

describe("aCsv: formato que Excel abre bien", () => {
  it("usa punto y coma, que es el separador de Excel en español", () => {
    // Con coma, Excel en es-AR mete toda la fila en una sola celda.
    expect(aCsv([producto()])).toContain("A12;;Torta 100 tiros;8000");
  });

  it("arranca con BOM para que los acentos no se rompan en Excel", () => {
    // Sin BOM, "Cumpleaños" se abre como "CumpleaÃ±os".
    expect(aCsv([producto({ nombre: "Bengala Cumpleaños" })]).startsWith("﻿")).toBe(
      true
    );
  });

  it("entrecomilla un nombre que tiene punto y coma", () => {
    const csv = aCsv([producto({ nombre: "Torta; la grande" })]);
    expect(csv).toContain('"Torta; la grande"');
  });

  it("duplica las comillas internas, como manda el formato", () => {
    const csv = aCsv([producto({ nombre: 'Torta "Premium"' })]);
    expect(csv).toContain('"Torta ""Premium"""');
  });

  it("los precios van como números pelados, sin símbolo ni separador de miles", () => {
    // Si fueran "$ 8.000" Excel los lee como texto y no se pueden sumar.
    const fila = filas(aCsv([producto()]))[1];
    expect(fila).not.toContain("$");
    expect(fila).not.toContain("8.000");
  });
});

describe("aCsv: las columnas", () => {
  it("tiene las siete en orden", () => {
    expect(filas(aCsv([]))[0]).toBe(
      "Codigo;Modelo;Nombre;Precio unidad;Precio display;Unidades por display;Precio bulto;Unidades por bulto"
    );
  });

  it("exporta los precios de las tres presentaciones y sus cantidades", () => {
    const con = producto({
      presentaciones: {
        unitario: { precio: 8000 },
        display: { precio: 15000, unidades: 5 },
        bulto: { precio: 140000, unidades: 50 },
      },
    });
    expect(filas(aCsv([con]))[1]).toBe("A12;;Torta 100 tiros;8000;15000;5;140000;50");
  });

  it("deja la celda vacía donde el producto no se vende así", () => {
    const fila = filas(aCsv([producto()]))[1];
    expect(fila).toBe("A12;;Torta 100 tiros;8000;;;;");
  });

  it("deja vacía la cantidad cuando el producto no la dice", () => {
    // Los 323 del esquema viejo tienen precio de display pero no cuántas trae.
    const viejo = producto({ precioDisplay: 15000 });
    expect(filas(aCsv([viejo]))[1]).toBe("A12;;Torta 100 tiros;8000;15000;;;");
  });

  it("no exporta un display con el precio repetido del unitario", () => {
    // La tienda lo ignora: 171 productos lo tienen asi. Exportarlo diria
    // que se vende de una forma en que no se vende.
    const repetido = producto({ precioDisplay: 8000 });
    expect(filas(aCsv([repetido]))[1]).toBe("A12;;Torta 100 tiros;8000;;;;");
  });

  it("acepta el esquema viejo con `name` y `price`", () => {
    const antiguo = { codigo: "B1", name: "Petardo", price: 300 };
    expect(filas(aCsv([antiguo]))[1]).toBe("B1;;Petardo;300;;;;");
  });
});

describe("nombreDelArchivo", () => {
  it("lleva la fecha para no pisar la descarga anterior", () => {
    expect(nombreDelArchivo(new Date("2026-10-07T15:00:00"))).toBe(
      "productos-activos-2026-10-07.csv"
    );
  });
});

describe("aCsv: productos con modelos", () => {
  const conModelos = {
    codigo: "M100",
    nombre: "Mortero",
    estado: "activo",
    modelos: [
      {
        id: "tres",
        etiqueta: "3 pulgadas",
        presentaciones: {
          unitario: { precio: 8000 },
          display: { precio: 15000, unidades: 5 },
        },
      },
      {
        id: "cinco",
        etiqueta: "5 pulgadas",
        presentaciones: { unitario: { precio: 20000 } },
      },
    ],
  };

  it("da una fila por modelo", () => {
    // Con una sola fila no se podria decir ningun precio: el precio vive en
    // el modelo, no en el producto.
    expect(filas(aCsv([conModelos]))).toHaveLength(3); // cabecera + 2
  });

  it("cada fila lleva la etiqueta del modelo y sus precios", () => {
    const f = filas(aCsv([conModelos]));
    expect(f[1]).toBe("M100;3 pulgadas;Mortero;8000;15000;5;;");
    expect(f[2]).toBe("M100;5 pulgadas;Mortero;20000;;;;");
  });

  it("repite codigo y nombre en cada fila, para poder leerla de corrido", () => {
    const f = filas(aCsv([conModelos]));
    expect(f[1].startsWith("M100;")).toBe(true);
    expect(f[2].startsWith("M100;")).toBe(true);
  });

  it("deja la columna Modelo vacía en un producto sin modelos", () => {
    expect(filas(aCsv([producto()]))[1]).toBe("A12;;Torta 100 tiros;8000;;;;");
  });
});
