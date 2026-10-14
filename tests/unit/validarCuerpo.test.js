import { describe, it, expect } from "vitest";
import { validarCuerpo } from "../../api/_lib/validarCuerpo.js";

const item = (extra = {}) => ({
  codigo: "A12",
  unidad: "unitario",
  cantidad: 1,
  precioVisto: 8000,
  ...extra,
});

const cuerpo = (extra = {}) => ({
  idempotencia: "0f8c1234-uuid",
  items: [item()],
  ...extra,
});

const malo = (c) => {
  const r = validarCuerpo(c);
  expect(r.ok).toBe(false);
  expect(typeof r.error).toBe("string");
  return r.error;
};

describe("validarCuerpo: lo que acepta", () => {
  it("un cuerpo bien formado", () => {
    const r = validarCuerpo(cuerpo());
    expect(r.ok).toBe(true);
    expect(r.datos.items[0].codigo).toBe("A12");
  });

  it("normaliza el modelo ausente a null", () => {
    expect(validarCuerpo(cuerpo()).datos.items[0].modelo).toBeNull();
  });

  it("acepta el telefono opcional", () => {
    const r = validarCuerpo(cuerpo({ telefono: "11 2345-6789" }));
    expect(r.datos.telefono).toBe("11 2345-6789");
  });

  it("acepta las tres unidades", () => {
    for (const u of ["unitario", "display", "bulto"]) {
      expect(validarCuerpo(cuerpo({ items: [item({ unidad: u })] })).ok).toBe(true);
    }
  });

  it("devuelve la idempotencia tal cual", () => {
    expect(validarCuerpo(cuerpo()).datos.idempotencia).toBe("0f8c1234-uuid");
  });
});

describe("validarCuerpo: lo que rechaza", () => {
  it("sin cuerpo", () => malo(null));
  it("un cuerpo que no es objeto", () => malo("A12"));
  it("sin idempotencia", () => malo(cuerpo({ idempotencia: undefined })));
  it("idempotencia que no es texto", () => malo(cuerpo({ idempotencia: 42 })));
  it("idempotencia demasiado larga", () =>
    malo(cuerpo({ idempotencia: "x".repeat(65) })));

  it("items que no es un array", () => malo(cuerpo({ items: "A12" })));
  it("items vacio", () => malo(cuerpo({ items: [] })));
  it("mas de 50 items", () =>
    malo(cuerpo({ items: Array.from({ length: 51 }, () => item()) })));

  it("un renglon que no es objeto", () => malo(cuerpo({ items: ["A12"] })));
  it("codigo vacio", () => malo(cuerpo({ items: [item({ codigo: "" })] })));
  it("codigo que no es texto", () => malo(cuerpo({ items: [item({ codigo: 12 })] })));
  it("codigo demasiado largo", () =>
    malo(cuerpo({ items: [item({ codigo: "x".repeat(101) })] })));

  it("unidad desconocida", () => malo(cuerpo({ items: [item({ unidad: "caja" })] })));
  it("unidad ausente", () => malo(cuerpo({ items: [item({ unidad: undefined })] })));

  it("cantidad en cero", () => malo(cuerpo({ items: [item({ cantidad: 0 })] })));
  it("cantidad negativa", () => malo(cuerpo({ items: [item({ cantidad: -1 })] })));
  it("cantidad con decimales", () => malo(cuerpo({ items: [item({ cantidad: 1.5 })] })));
  it("cantidad arriba de 999", () => malo(cuerpo({ items: [item({ cantidad: 1000 })] })));

  it("cantidad como TEXTO, no se convierte en silencio", () => {
    // Review Focus 2: un cliente manipulado manda "2" y la coercion
    // silenciosa es justo lo que no se quiere en el borde de confianza.
    malo(cuerpo({ items: [item({ cantidad: "2" })] }));
  });

  it("precioVisto como TEXTO", () =>
    malo(cuerpo({ items: [item({ precioVisto: "8000" })] })));
  it("precioVisto negativo", () =>
    malo(cuerpo({ items: [item({ precioVisto: -1 })] })));
  it("precioVisto NaN", () => malo(cuerpo({ items: [item({ precioVisto: NaN })] })));
  it("precioVisto ausente", () =>
    malo(cuerpo({ items: [item({ precioVisto: undefined })] })));

  it("modelo que no es texto", () => malo(cuerpo({ items: [item({ modelo: 5 })] })));

  it("dos renglones con el mismo codigo, unidad y modelo", () => {
    // El carrito del cliente nunca los genera: los suma. Que lleguen dos es
    // senal de manipulacion o de un bug, y sumarlos dos veces seria peor.
    malo(cuerpo({ items: [item(), item()] }));
  });
});

describe("validarCuerpo: duplicados que SI son validos", () => {
  it("el mismo producto en dos unidades distintas", () => {
    const r = validarCuerpo(
      cuerpo({ items: [item({ unidad: "unitario" }), item({ unidad: "display" })] })
    );
    expect(r.ok).toBe(true);
  });

  it("el mismo producto en dos modelos distintos", () => {
    const r = validarCuerpo(
      cuerpo({ items: [item({ modelo: "rojo" }), item({ modelo: "azul" })] })
    );
    expect(r.ok).toBe(true);
  });
});
