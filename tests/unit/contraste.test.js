import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/tokens.css", "utf8");

// Extrae el valor de una variable dentro de un bloque (:root o [data-theme="light"]).
function token(bloque, nombre) {
  const inicio = css.indexOf(bloque);
  if (inicio === -1) throw new Error(`No existe el bloque ${bloque}`);
  const fin = css.indexOf("\n}", inicio);
  const cuerpo = css.slice(inicio, fin);
  const m = cuerpo.match(new RegExp(`${nombre}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`No se encontró ${nombre} en ${bloque}`);
  return m[1];
}

// Luminancia relativa segun WCAG 2.1
function luminancia(hex) {
  const canal = (c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = canal(hex.slice(1, 3));
  const g = canal(hex.slice(3, 5));
  const b = canal(hex.slice(5, 7));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const OSCURO = ":root {";
const CLARO = '[data-theme="light"] {';

describe("contraste de los tokens — tema oscuro", () => {
  it("el texto principal sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--text"), token(OSCURO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el texto secundario sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--text-suave"), token(OSCURO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el dorado sobre el fondo supera 4.5:1 (es donde va el precio)", () => {
    expect(contraste(token(OSCURO, "--gold"), token(OSCURO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el texto principal sobre la superficie de card supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--text"), token(OSCURO, "--surface")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el dorado sobre la superficie de card supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--gold"), token(OSCURO, "--surface")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el rojo de peligro sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(OSCURO, "--danger"), token(OSCURO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });
});

describe("contraste de los tokens — tema claro", () => {
  it("el texto principal sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(CLARO, "--text"), token(CLARO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el texto secundario sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(CLARO, "--text-suave"), token(CLARO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("EL DORADO SOBRE BLANCO supera 4.5:1", () => {
    // Review Focus #4: el dorado de marca da 2.1:1 sobre blanco. Si alguien
    // olvida oscurecerlo en el tema claro, el precio —el dato más importante
    // de la card— se vuelve ilegible y nadie se da cuenta porque en oscuro
    // se ve perfecto.
    expect(contraste(token(CLARO, "--gold"), token(CLARO, "--surface")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("el rojo de peligro sobre el fondo supera 4.5:1", () => {
    expect(contraste(token(CLARO, "--danger"), token(CLARO, "--ground")))
      .toBeGreaterThanOrEqual(4.5);
  });
});

describe("el dorado de marca sin corregir NO pasaría en claro", () => {
  it("documenta por qué el tema claro necesita su propio dorado", () => {
    expect(contraste("#E6B32E", "#FFFFFF")).toBeLessThan(3);
  });
});

describe("texto sobre el dorado — el botón primario", () => {
  it("es legible en tema oscuro", () => {
    expect(contraste(token(OSCURO, "--sobre-gold"), token(OSCURO, "--gold")))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("es legible en tema claro", () => {
    // En claro el dorado se oscurece para ser legible como texto, así que el
    // texto ENCIMA del dorado tiene que invertirse. Fijarlo en un literal
    // dejaba el botón primario ilegible justo en el tema que menos se prueba.
    expect(contraste(token(CLARO, "--sobre-gold"), token(CLARO, "--gold")))
      .toBeGreaterThanOrEqual(4.5);
  });
});
