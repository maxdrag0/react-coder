import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aLatin1, inflar, filasDePdf } from "@/utils/pdf/leerPdf";

/*
  La muestra reproduce la estructura de la lista del proveedor con datos
  inventados. La real no va al repo: son precios de costo.

  Para regenerarla: node tests/fixtures/generarListaEjemplo.mjs
*/
const MUESTRA = new Uint8Array(
  readFileSync(join("tests", "fixtures", "lista-ejemplo.pdf")),
);

const porY = (filas, y) => filas.filter((f) => Math.round(f.y) === y);
const celda = (fila, x) =>
  fila.celdas.find((c) => Math.round(c.x) === x)?.texto;

describe("aLatin1", () => {
  it("traduce byte a byte", () => {
    expect(aLatin1(new Uint8Array([72, 111, 108, 97]))).toBe("Hola");
  });

  it("no toca el rango alto, que windows-1252 traduciría mal", () => {
    /*
      TextDecoder("latin1") resuelve a windows-1252 y mapea 0x80-0x9F a
      comillas y guiones tipográficos. Dentro de un stream comprimido esos
      bytes son datos, y traducirlos corre las posiciones de los marcadores.
    */
    expect(aLatin1(new Uint8Array([0x80, 0x92, 0x9f])).charCodeAt(0)).toBe(
      0x80,
    );
    expect(aLatin1(new Uint8Array([0x92])).charCodeAt(0)).toBe(0x92);
  });

  it("aguanta un arreglo más largo que un trozo", () => {
    // String.fromCharCode.apply revienta con arreglos muy grandes: se parte.
    const largo = new Uint8Array(200000).fill(65);
    expect(aLatin1(largo)).toHaveLength(200000);
  });
});

describe("inflar", () => {
  it("descomprime lo que el navegador descomprimiría", async () => {
    const { deflateSync } = await import("node:zlib");
    const original = "BT /F1 1 Tf (hola) Tj ET";
    const comprimido = new Uint8Array(deflateSync(Buffer.from(original)));
    expect(aLatin1(await inflar(comprimido))).toBe(original);
  });
});

describe("filasDePdf: la tabla reconstruida", () => {
  it("devuelve las filas de arriba hacia abajo", async () => {
    const filas = await filasDePdf(MUESTRA);
    const ys = filas.map((f) => Math.round(f.y));
    // Cada stream se ordena solo; el primero baja de 493 a 39.
    expect(ys.slice(0, 5)).toEqual([493, 480, 469, 458, 447]);
  });

  it("pone cada dato en su columna", async () => {
    const [fila] = porY(await filasDePdf(MUESTRA), 480);
    expect(celda(fila, 15)).toBe("202");
    expect(celda(fila, 44)).toBe("PETARDO ROMPEPORTONES");
    expect(celda(fila, 546)).toBe("860");
    expect(celda(fila, 583)).toBe("10x5");
    expect(celda(fila, 623)).toBe("43000");
    expect(celda(fila, 667)).toBe("10");
    expect(celda(fila, 697)).toBe("430000");
  });

  it("rearma el texto partido en un arreglo TJ", async () => {
    // El PDF escribe (PET)-12.2 (ARDO "DI\341BOLICO"): los números son
    // interletraje, no texto, y el \341 es la á.
    const [fila] = porY(await filasDePdf(MUESTRA), 469);
    expect(celda(fila, 44)).toBe('PETARDO "DIáBOLICO"');
  });

  it("conserva la fila partida entre dos streams", async () => {
    /*
      En los cortes de página el código queda en un stream y los precios en
      el siguiente, con la misma Y. Las dos tienen que llegar: juntarlas es
      trabajo del intérprete, no del lector.
    */
    const partidas = porY(await filasDePdf(MUESTRA), 447);
    expect(partidas).toHaveLength(2);
    expect(celda(partidas[0], 15)).toBe("317");
    expect(celda(partidas[0], 546)).toBeUndefined();
    expect(celda(partidas[1], 546)).toBe("230");
  });

  it("trae las dos filas que comparten código", async () => {
    const filas = await filasDePdf(MUESTRA);
    const con203 = filas.filter((f) => celda(f, 15) === "203");
    expect(con203).toHaveLength(2);
    expect(celda(con203[0], 583)).toBe("1X10");
    expect(celda(con203[1], 583)).toBe("1X20");
  });

  it("no se traga el pie de página", async () => {
    const [pie] = porY(await filasDePdf(MUESTRA), 39);
    expect(celda(pie, 355)).toBe("Página 1 de 1");
  });
});

describe("filasDePdf: lo que no es un PDF", () => {
  it("un archivo cualquiera devuelve cero filas en vez de romper", async () => {
    const basura = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(filasDePdf(basura)).resolves.toEqual([]);
  });

  it("un stream que no se puede descomprimir se saltea", async () => {
    // Una imagen dentro del PDF entra por acá y no es texto.
    const falla = () => Promise.reject(new Error("no es flate"));
    await expect(filasDePdf(MUESTRA, falla)).resolves.toEqual([]);
  });
});
