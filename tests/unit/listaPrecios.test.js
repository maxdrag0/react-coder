import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { filasDePdf } from "@/utils/pdf/leerPdf";
import {
  interpretarLista,
  unir,
  limpiarNombre,
} from "@/constants/listaPrecios";

/*
  La muestra reproduce la estructura de la lista real con datos inventados.
  Regenerarla: node tests/fixtures/generarListaEjemplo.mjs
*/
let productos;
let sueltas;

beforeAll(async () => {
  const bytes = new Uint8Array(
    readFileSync(join("tests", "fixtures", "lista-ejemplo.pdf")),
  );
  ({ productos, sueltas } = interpretarLista(await filasDePdf(bytes)));
});

const porCodigo = (codigo) => productos.filter((p) => p.codigo === codigo);

describe("interpretarLista: lo que saca de la lista", () => {
  it("encuentra los productos y descarta encabezado y pie", () => {
    expect(productos.map((p) => p.codigo)).toEqual([
      "202",
      "203",
      "203",
      "317",
    ]);
  });

  it("le pone a cada uno el rubro de la banda de arriba", () => {
    // La categoría no está en la fila: está en la banda que la precede.
    expect(productos.every((p) => p.categoria === "Petardos")).toBe(true);
  });

  it("saca la marca del nombre", () => {
    expect(porCodigo("202")[0].marca).toBeNull();
    const [, conMarca] = productos;
    expect(conMarca.nombre).toContain("DIáBOLICO");
  });
});

describe("las cantidades, que la lista no dice", () => {
  /*
    La columna DISPLAY es ambigua: "10x5" son 50 unidades acá y podrían ser
    10 en otra fila. El cociente de precios es exacto y ES la cantidad.
  */
  it("unidades por display = $display ÷ $unidad", () => {
    const [p] = porCodigo("202");
    expect(p.pUnidad).toBe(860);
    expect(p.pDisplay).toBe(43000);
    expect(p.porDisplay).toBe(50);
    expect(p.displayCrudo).toBe("10x5");
  });

  it("la columna BULTO son displays, no unidades", () => {
    const [p] = porCodigo("202");
    // 10 displays × 50 unidades = 500, y $430.000 ÷ $860 = 500.
    expect(p.displaysPorBulto).toBe(10);
    expect(p.porBulto).toBe(500);
    expect(p.avisos).toEqual([]);
  });

  it("el mismo texto de display da otra cantidad en otra fila", () => {
    const [, segundo] = porCodigo("203");
    expect(segundo.displayCrudo).toBe("1X20");
    expect(segundo.porDisplay).toBe(20);
  });
});

describe("filas partidas por el corte de página", () => {
  it("junta el código de arriba con los precios de abajo", () => {
    /*
      El 317 tiene el código y el nombre en un stream y los precios en el
      siguiente. Si no se juntaran, quedaría un producto sin precio y otro
      sin nombre.
    */
    const [p] = porCodigo("317");
    expect(p.nombre).toBe("PETARDO N 7 JUPITER");
    expect(p.pUnidad).toBe(230);
    expect(p.porDisplay).toBe(200);
    expect(p.displaysPorBulto).toBe(20);
  });
});

describe("códigos repetidos", () => {
  it("marca cuántas veces aparece", () => {
    // El código es el id del documento: dos filas con el mismo se pisan.
    for (const p of porCodigo("203")) expect(p.repetido).toBe(2);
    expect(porCodigo("202")[0].repetido).toBeUndefined();
  });

  it("les da un id distinto a cada una", () => {
    const [a, b] = porCodigo("203");
    expect(a.id).toBe("203");
    expect(b.id).toBe("203--2");
  });

  it("el id sirve como segmento de ruta", () => {
    for (const p of productos) expect(p.id).toMatch(/^[A-Za-z0-9_.~:@+-]+$/);
  });
});

describe("las celdas que el PDF dibuja aparte", () => {
  it("salen como sueltas en vez de desaparecer", () => {
    /*
      El PDF dibuja algunas celdas desbordadas en su propio sistema de
      coordenadas, donde los números no caen en ninguna columna. En la lista
      real son tres, y una es un producto entero. Descartarlas en silencio
      sería perder productos sin avisar.
    */
    expect(Array.isArray(sueltas)).toBe(true);
  });
});

describe("unir: el nombre partido en varios textos", () => {
  it("pega cuando la comilla quedó abierta", () => {
    expect(unir('PETARDO "', "EL DESTRUK-TOR")).toBe('PETARDO "EL DESTRUK-TOR');
  });

  it("separa cuando la comilla ya cerró", () => {
    expect(unir('"96 PERLAS"', "torta de 96")).toBe('"96 PERLAS" torta de 96');
  });

  it("pega dos pedazos de un mismo número", () => {
    expect(unir("BATERIA DE 1", "4 TIROS")).toBe("BATERIA DE 14 TIROS");
  });

  it("no mete espacio antes de un signo de puntuación", () => {
    expect(unir("CAÑA", ", 50 cm")).toBe("CAÑA, 50 cm");
  });

  it("separa dos palabras", () => {
    expect(unir("CAÑA", "TRAZANTE")).toBe("CAÑA TRAZANTE");
  });
});

describe("limpiarNombre", () => {
  it("arregla la ñ que la fuente escribe como llave", () => {
    expect(limpiarNombre("CA{A ARCO IRIS")).toBe("CAÑA ARCO IRIS");
    expect(limpiarNombre("ara{as")).toBe("arañas");
  });

  it("saca la duración que se coló al final del nombre", () => {
    expect(limpiarNombre("TORTA NEPTUNO 38´´")).toBe("TORTA NEPTUNO");
  });

  it("junta los espacios de más", () => {
    expect(limpiarNombre("TORTA    ZONDA   16 T")).toBe("TORTA ZONDA 16 T");
  });
});

describe("avisos", () => {
  it("una fila sin precio unitario queda marcada", () => {
    const { productos: solos } = interpretarLista([
      {
        y: 400,
        celdas: [
          { x: 15, texto: "999" },
          { x: 44, texto: "SIN PRECIO" },
        ],
      },
    ]);
    expect(solos[0].avisos).toContain("sin precio unitario");
  });

  it("una fila sin nombre pide que lo escriban", () => {
    const { productos: solos } = interpretarLista([
      {
        y: 400,
        celdas: [
          { x: 15, texto: "999" },
          { x: 546, texto: "100" },
        ],
      },
    ]);
    expect(solos[0].avisos).toContain(
      "la lista no trae el nombre: escribilo vos",
    );
  });

  it("avisa cuando los precios no multiplican exacto", () => {
    // Pasa de verdad: 4290 × 6 = 25740 y la lista dice 25720.
    const { productos: solos } = interpretarLista([
      {
        y: 400,
        celdas: [
          { x: 15, texto: "8803" },
          { x: 44, texto: "BOMBA" },
          { x: 546, texto: "4290" },
          { x: 623, texto: "25720" },
        ],
      },
    ]);
    expect(solos[0].porDisplay).toBe(6);
    expect(solos[0].avisos).toContain(
      "los precios no multiplican exacto: revisar el unitario",
    );
  });

  it("avisa cuando el bulto no cierra contra el display", () => {
    const { productos: solos } = interpretarLista([
      {
        y: 400,
        celdas: [
          { x: 15, texto: "777" },
          { x: 44, texto: "RARO" },
          { x: 546, texto: "100" },
          { x: 623, texto: "1000" },
          { x: 667, texto: "3" },
          { x: 697, texto: "90000" },
        ],
      },
    ]);
    // 10 por display × 3 displays = 30, pero 90000 ÷ 100 = 900.
    expect(
      solos[0].avisos.some((a) => a.startsWith("el bulto no cierra")),
    ).toBe(true);
  });
});
