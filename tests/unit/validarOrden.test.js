import { describe, it, expect } from "vitest";
import { validarOrden } from "../../api/_lib/validarOrden.js";

const SIMPLE = {
  codigo: "A12",
  nombre: "Torta 100 tiros",
  estado: "activo",
  presentaciones: {
    unitario: { precio: 8000 },
    display: { precio: 15000, unidades: 5 },
  },
};

const CON_MODELOS = {
  codigo: "H02",
  nombre: "Bengala de humo",
  estado: "activo",
  modelos: [
    {
      id: "rojo",
      etiqueta: "Rojo",
      presentaciones: { unitario: { precio: 8000 } },
    },
    {
      id: "azul",
      etiqueta: "Azul",
      presentaciones: { unitario: { precio: 9000 } },
    },
  ],
};

const catalogo = (...productos) => new Map(productos.map((p) => [p.codigo, p]));

const renglon = (extra = {}) => ({
  codigo: "A12",
  unidad: "unitario",
  modelo: null,
  cantidad: 1,
  precioVisto: 8000,
  ...extra,
});

describe("validarOrden: el camino feliz", () => {
  it("sin problemas cuando el precio coincide", () => {
    const r = validarOrden([renglon()], catalogo(SIMPLE));
    expect(r.problemas).toEqual([]);
    expect(r.total).toBe(8000);
  });

  it("multiplica por la cantidad", () => {
    const r = validarOrden([renglon({ cantidad: 3 })], catalogo(SIMPLE));
    expect(r.total).toBe(24000);
    expect(r.renglones[0].subtotal).toBe(24000);
  });

  it("suma varios renglones", () => {
    const r = validarOrden(
      [
        renglon({ cantidad: 2 }),
        renglon({ unidad: "display", cantidad: 1, precioVisto: 15000 }),
      ],
      catalogo(SIMPLE),
    );
    expect(r.total).toBe(16000 + 15000);
  });

  it("cotiza el MISMO producto en dos unidades como dos renglones", () => {
    // Review Focus 3: no se colapsan ni se descarta uno.
    const r = validarOrden(
      [
        renglon({ unidad: "unitario", cantidad: 1, precioVisto: 8000 }),
        renglon({ unidad: "display", cantidad: 1, precioVisto: 15000 }),
      ],
      catalogo(SIMPLE),
    );
    expect(r.problemas).toEqual([]);
    expect(r.renglones).toHaveLength(2);
    expect(r.total).toBe(23000);
  });

  it("copia el nombre al renglon, para que el pedido viejo siga legible", () => {
    const r = validarOrden([renglon()], catalogo(SIMPLE));
    expect(r.renglones[0].nombre).toBe("Torta 100 tiros");
  });

  it("guarda el precio de cada renglon, no solo el total", () => {
    const r = validarOrden([renglon()], catalogo(SIMPLE));
    expect(r.renglones[0].precioUnidad).toBe(8000);
  });

  it("guarda cuantas unidades trae el paquete", () => {
    const r = validarOrden(
      [renglon({ unidad: "display", precioVisto: 15000 })],
      catalogo(SIMPLE),
    );
    expect(r.renglones[0].unidadesPorPaquete).toBe(5);
  });
});

describe("validarOrden: los cuatro problemas", () => {
  it("precio_cambio con el antes y el ahora", () => {
    const r = validarOrden([renglon({ precioVisto: 7000 })], catalogo(SIMPLE));
    expect(r.problemas).toEqual([
      {
        codigo: "A12",
        modelo: null,
        unidad: "unitario",
        nombre: "Torta 100 tiros",
        tipo: "precio_cambio",
        antes: 7000,
        ahora: 8000,
      },
    ]);
  });

  it("inexistente cuando el producto no esta en el catalogo", () => {
    const r = validarOrden([renglon({ codigo: "ZZZ" })], catalogo(SIMPLE));
    expect(r.problemas[0].tipo).toBe("inexistente");
  });

  it("no_disponible con un producto oculto", () => {
    const r = validarOrden(
      [renglon()],
      catalogo({ ...SIMPLE, estado: "oculto" }),
    );
    expect(r.problemas[0].tipo).toBe("no_disponible");
  });

  it("no_disponible con un producto sin stock", () => {
    const r = validarOrden(
      [renglon()],
      catalogo({ ...SIMPLE, estado: "sin_stock" }),
    );
    expect(r.problemas[0].tipo).toBe("no_disponible");
  });

  it("sin_presentacion cuando esa unidad ya no se vende", () => {
    const r = validarOrden(
      [renglon({ unidad: "bulto", precioVisto: 140000 })],
      catalogo(SIMPLE),
    );
    expect(r.problemas[0].tipo).toBe("sin_presentacion");
  });

  it("devuelve TODOS los problemas juntos, no el primero", () => {
    // Devolverlos de a uno obligaria al cliente a reintentar por renglon.
    const r = validarOrden(
      [renglon({ precioVisto: 1 }), renglon({ codigo: "ZZZ" })],
      catalogo(SIMPLE),
    );
    expect(r.problemas).toHaveLength(2);
  });

  it("con problemas el total es 0 y no hay renglones", () => {
    // Un total a medias es peor que ninguno: nadie lo tiene que poder usar.
    const r = validarOrden([renglon({ precioVisto: 1 })], catalogo(SIMPLE));
    expect(r.total).toBe(0);
    expect(r.renglones).toEqual([]);
  });
});

describe("validarOrden: modelos", () => {
  it("cotiza el modelo pedido", () => {
    const r = validarOrden(
      [renglon({ codigo: "H02", modelo: "azul", precioVisto: 9000 })],
      catalogo(CON_MODELOS),
    );
    expect(r.problemas).toEqual([]);
    expect(r.total).toBe(9000);
  });

  it("copia la etiqueta del modelo al renglon", () => {
    const r = validarOrden(
      [renglon({ codigo: "H02", modelo: "azul", precioVisto: 9000 })],
      catalogo(CON_MODELOS),
    );
    expect(r.renglones[0].modeloEtiqueta).toBe("Azul");
    expect(r.renglones[0].modelo).toBe("azul");
  });

  it("sin_presentacion si el producto tiene modelos y el renglon no trae ninguno", () => {
    // Review Focus 1: cotizar el producto como si no tuviera modelos daria un
    // precio inventado.
    const r = validarOrden(
      [renglon({ codigo: "H02", modelo: null, precioVisto: 8000 })],
      catalogo(CON_MODELOS),
    );
    expect(r.problemas[0].tipo).toBe("sin_presentacion");
  });

  it("sin_presentacion si el modelo ya no existe", () => {
    const r = validarOrden(
      [renglon({ codigo: "H02", modelo: "borrado", precioVisto: 8000 })],
      catalogo(CON_MODELOS),
    );
    expect(r.problemas[0].tipo).toBe("sin_presentacion");
  });

  it("detecta el cambio de precio DEL MODELO", () => {
    const r = validarOrden(
      [renglon({ codigo: "H02", modelo: "rojo", precioVisto: 5000 })],
      catalogo(CON_MODELOS),
    );
    expect(r.problemas[0]).toMatchObject({
      tipo: "precio_cambio",
      antes: 5000,
      ahora: 8000,
    });
  });

  it("dos modelos del mismo producto son dos renglones", () => {
    const r = validarOrden(
      [
        renglon({ codigo: "H02", modelo: "rojo", precioVisto: 8000 }),
        renglon({ codigo: "H02", modelo: "azul", precioVisto: 9000 }),
      ],
      catalogo(CON_MODELOS),
    );
    expect(r.problemas).toEqual([]);
    expect(r.total).toBe(17000);
  });
});

describe("validarOrden: esquema viejo", () => {
  const VIEJO = { codigo: "B1", nombre: "Petardo", precioUnitario: 300 };

  it("cotiza un producto con precioUnitario", () => {
    const r = validarOrden(
      [renglon({ codigo: "B1", precioVisto: 300 })],
      catalogo(VIEJO),
    );
    expect(r.total).toBe(300);
  });

  it("un producto sin estado cuenta como activo", () => {
    const r = validarOrden(
      [renglon({ codigo: "B1", precioVisto: 300 })],
      catalogo(VIEJO),
    );
    expect(r.problemas).toEqual([]);
  });

  it("rechaza el display con el precio repetido del unitario", () => {
    // La tienda no lo ofrece, asi que el servidor tampoco debe aceptarlo.
    const repetido = { ...VIEJO, precioDisplay: 300 };
    const r = validarOrden(
      [renglon({ codigo: "B1", unidad: "display", precioVisto: 300 })],
      catalogo(repetido),
    );
    expect(r.problemas[0].tipo).toBe("sin_presentacion");
  });

  it("deja la cantidad del paquete en null cuando el producto no la dice", () => {
    const conDisplay = { ...VIEJO, precioDisplay: 2700 };
    const r = validarOrden(
      [renglon({ codigo: "B1", unidad: "display", precioVisto: 2700 })],
      catalogo(conDisplay),
    );
    expect(r.renglones[0].unidadesPorPaquete).toBeNull();
  });
});

describe("validarOrden: cada problema identifica SU renglon", () => {
  /*
    El cliente tiene que poder mapear cada problema al renglon exacto del
    carrito, y el carrito identifica un renglon por codigo + modelo + unidad.
    Un problema que solo trae el codigo deja al cliente adivinando: con dos
    unidades del mismo producto corrige la equivocada, y con modelos no
    encuentra ninguna y el pedido no se puede mandar nunca.
  */
  const identidad = ({ codigo, modelo, unidad }) => ({
    codigo,
    modelo,
    unidad,
  });

  it("precio_cambio trae modelo y unidad", () => {
    const r = validarOrden(
      [renglon({ codigo: "H02", modelo: "azul", precioVisto: 1 })],
      catalogo(CON_MODELOS),
    );
    expect(identidad(r.problemas[0])).toEqual({
      codigo: "H02",
      modelo: "azul",
      unidad: "unitario",
    });
  });

  it("distingue las dos unidades del mismo producto", () => {
    const r = validarOrden(
      [
        renglon({ unidad: "unitario", precioVisto: 8000 }),
        renglon({ unidad: "display", precioVisto: 1 }),
      ],
      catalogo(SIMPLE),
    );
    expect(r.problemas).toHaveLength(1);
    expect(identidad(r.problemas[0])).toEqual({
      codigo: "A12",
      modelo: null,
      unidad: "display",
    });
  });

  it("los cuatro tipos traen la identidad del renglon", () => {
    const r = validarOrden(
      [
        renglon({ codigo: "NO-ESTA" }),
        renglon({ codigo: "H02", modelo: null }),
        renglon({ unidad: "bulto" }),
        renglon({ precioVisto: 1 }),
      ],
      catalogo(SIMPLE, CON_MODELOS),
    );
    expect(r.problemas.map((p) => p.tipo)).toEqual([
      "inexistente",
      "sin_presentacion",
      "sin_presentacion",
      "precio_cambio",
    ]);
    for (const p of r.problemas) {
      expect(p.codigo).toBeTruthy();
      expect(p.unidad).toBeTruthy();
      expect("modelo" in p).toBe(true);
    }
  });
});
