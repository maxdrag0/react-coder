import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyIdToken = vi.fn();
const getAll = vi.fn();
const set = vi.fn();
const getPerfil = vi.fn();
const update = vi.fn();
const commit = vi.fn();

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n) => ({ __incremento: n }) },
}));

vi.mock("../../api/_lib/firebaseAdmin.js", () => ({
  auth: { verifyIdToken: (...a) => verifyIdToken(...a) },
  db: {
    getAll: (...a) => getAll(...a),
    batch: () => ({
      update: (...a) => update(...a),
      commit: (...a) => commit(...a),
    }),
    collection: () => ({
      doc: (id) => ({
        id,
        set: (...a) => set(...a),
        get: (...a) => getPerfil(...a),
      }),
    }),
  },
}));

const { default: handler } = await import("../../api/orden.js");

const respuesta = () => {
  const r = { codigo: null, cuerpo: null };
  r.status = (c) => {
    r.codigo = c;
    return r;
  };
  r.json = (b) => {
    r.cuerpo = b;
    return r;
  };
  return r;
};

const PRODUCTO = {
  codigo: "A12",
  nombre: "Torta 100 tiros",
  estado: "activo",
  presentaciones: { unitario: { precio: 8000 } },
};

const docDe = (p) => ({ exists: true, id: p.codigo, data: () => p });

const pedido = (extra = {}) => ({
  method: "POST",
  headers: { authorization: "Bearer token-valido" },
  body: {
    idempotencia: "uuid-1",
    items: [
      {
        codigo: "A12",
        unidad: "unitario",
        modelo: null,
        cantidad: 1,
        precioVisto: 8000,
      },
    ],
    ...extra,
  },
});

beforeEach(() => {
  verifyIdToken.mockReset().mockResolvedValue({
    uid: "ana",
    email: "ana@mail.com",
    name: "Ana",
  });
  getAll.mockReset().mockResolvedValue([docDe(PRODUCTO)]);
  set.mockReset().mockResolvedValue(undefined);
  update.mockReset();
  commit.mockReset().mockResolvedValue(undefined);
  getPerfil.mockReset().mockResolvedValue({
    exists: true,
    data: () => ({ telefono: "1123456789" }),
  });
});

describe("api/orden: metodo y token", () => {
  it("405 si no es POST", async () => {
    const res = respuesta();
    await handler({ ...pedido(), method: "GET" }, res);
    expect(res.codigo).toBe(405);
  });

  it("401 sin cabecera de autorizacion", async () => {
    const res = respuesta();
    await handler({ ...pedido(), headers: {} }, res);
    expect(res.codigo).toBe(401);
  });

  it("401 con un token que no verifica", async () => {
    verifyIdToken.mockRejectedValue(new Error("token vencido"));
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(401);
  });
});

describe("api/orden: cuerpo", () => {
  it("400 con el carrito vacio", async () => {
    const res = respuesta();
    await handler(pedido({ items: [] }), res);
    expect(res.codigo).toBe(400);
    expect(res.cuerpo.error).toBeTruthy();
  });

  it("400 no escribe nada", async () => {
    const res = respuesta();
    await handler(pedido({ items: [] }), res);
    expect(set).not.toHaveBeenCalled();
  });
});

describe("api/orden: telefono", () => {
  it("usa el del perfil", async () => {
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(201);
    expect(set.mock.calls[0][0].buyer.telefono).toBe("1123456789");
  });

  it("422 si el perfil no tiene y el cuerpo tampoco", async () => {
    getPerfil.mockResolvedValue({ exists: true, data: () => ({}) });
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(422);
    expect(res.cuerpo.error).toBe("sin_telefono");
  });

  it("422 si el documento del perfil no existe", async () => {
    // Review Focus 5: un alta por Google que fallo al crear el perfil. No
    // tiene que reventar leyendo undefined.telefono.
    getPerfil.mockResolvedValue({ exists: false, data: () => undefined });
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(422);
  });

  it("acepta el telefono del cuerpo si el perfil no tiene", async () => {
    getPerfil.mockResolvedValue({ exists: true, data: () => ({}) });
    const res = respuesta();
    await handler(pedido({ telefono: "11 2345-6789" }), res);
    expect(res.codigo).toBe(201);
    // La orden es la ULTIMA escritura: antes el handler guarda el telefono en
    // el perfil, para no volver a pedirlo en el proximo pedido.
    expect(set.mock.calls.at(-1)[0].buyer.telefono).toBe("1123456789");
  });

  it("guarda en el perfil el telefono que llego en el cuerpo", async () => {
    getPerfil.mockResolvedValue({ exists: true, data: () => ({}) });
    await handler(pedido({ telefono: "11 2345-6789" }), respuesta());
    expect(set.mock.calls[0]).toEqual([
      { telefono: "1123456789" },
      { merge: true },
    ]);
  });

  it("422 con un telefono del cuerpo que no sirve", async () => {
    getPerfil.mockResolvedValue({ exists: true, data: () => ({}) });
    const res = respuesta();
    await handler(pedido({ telefono: "123" }), res);
    expect(res.codigo).toBe(422);
  });
});

describe("api/orden: validacion contra el catalogo", () => {
  it("409 con los problemas y sin escribir", async () => {
    const res = respuesta();
    await handler(
      pedido({
        items: [
          {
            codigo: "A12",
            unidad: "unitario",
            modelo: null,
            cantidad: 1,
            precioVisto: 1,
          },
        ],
      }),
      res,
    );
    expect(res.codigo).toBe(409);
    expect(res.cuerpo.problemas[0].tipo).toBe("precio_cambio");
    expect(set).not.toHaveBeenCalled();
  });
});

describe("api/orden: la orden que escribe", () => {
  it("201 con el id y el total", async () => {
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(201);
    expect(res.cuerpo).toEqual({ id: "uuid-1", total: 8000 });
  });

  it("usa la idempotencia como id del documento", async () => {
    // Review Focus 4: un reintento sobrescribe en vez de crear otro pedido.
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.cuerpo.id).toBe("uuid-1");
  });

  it("el total lo calcula el servidor, no el cliente", async () => {
    const res = respuesta();
    await handler(pedido(), res);
    expect(set.mock.calls[0][0].total).toBe(8000);
  });

  it("la fecha la pone el servidor", async () => {
    const res = respuesta();
    await handler(pedido(), res);
    expect(typeof set.mock.calls[0][0].date).toBe("string");
  });

  it("el pedido arranca en estado nuevo", async () => {
    const res = respuesta();
    await handler(pedido(), res);
    expect(set.mock.calls[0][0].estado).toBe("nuevo");
  });

  it("guarda el precio de cada renglon", async () => {
    const res = respuesta();
    await handler(pedido(), res);
    expect(set.mock.calls[0][0].items[0].precioUnidad).toBe(8000);
  });

  it("el uid y el email salen del TOKEN, no del cuerpo", async () => {
    const res = respuesta();
    await handler(pedido(), res);
    expect(set.mock.calls[0][0].buyer.uid).toBe("ana");
    expect(set.mock.calls[0][0].buyer.email).toBe("ana@mail.com");
  });
});

describe("api/orden: errores inesperados", () => {
  it("500 generico, sin filtrar el detalle", async () => {
    getAll.mockRejectedValue(
      new Error("Firestore: PERMISSION_DENIED en products"),
    );
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(500);
    expect(JSON.stringify(res.cuerpo)).not.toMatch(/PERMISSION_DENIED/);
  });
});

describe("api/orden: un codigo repetido se pide una sola vez", () => {
  const DOS_UNIDADES = {
    ...PRODUCTO,
    presentaciones: {
      unitario: { precio: 8000 },
      bulto: { precio: 90000, unidades: 12 },
    },
  };

  const enDosUnidades = () =>
    pedido({
      items: [
        {
          codigo: "A12",
          unidad: "unitario",
          modelo: null,
          cantidad: 1,
          precioVisto: 8000,
        },
        {
          codigo: "A12",
          unidad: "bulto",
          modelo: null,
          cantidad: 1,
          precioVisto: 90000,
        },
      ],
    });

  it("le pasa una sola referencia a getAll", async () => {
    // Dos refs iguales son dos lecturas cobradas por el mismo documento, y el
    // comportamiento de getAll con referencias repetidas no esta documentado.
    getAll.mockResolvedValue([docDe(DOS_UNIDADES)]);
    await handler(enDosUnidades(), respuesta());
    expect(getAll.mock.calls[0]).toHaveLength(1);
  });

  it("cotiza los dos renglones igual", async () => {
    getAll.mockResolvedValue([docDe(DOS_UNIDADES)]);
    const res = respuesta();
    await handler(enDosUnidades(), res);
    expect(res.codigo).toBe(201);
    expect(set.mock.calls[0][0].items).toHaveLength(2);
    expect(set.mock.calls[0][0].total).toBe(98000);
  });
});

describe("api/orden: el contador de mas vendidos", () => {
  /*
    "Mas vendidos" ordenaba por un campo que nadie escribia: valia 0 en los 29
    productos, asi que la portada mostraba los primeros doce en orden
    arbitrario con un titulo que afirmaba otra cosa.

    Se cuenta UN pedido por producto y no las unidades: un mayorista que
    compra diez bultos de lo mismo no tiene que decidir la portada para
    siempre, y "12 unidades" contra "1 bulto de 12" son la misma venta
    contada de dos maneras.
  */
  it("suma uno al producto del pedido", async () => {
    await handler(pedido(), respuesta());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "A12" }),
      { compras: { __incremento: 1 } },
    );
    expect(commit).toHaveBeenCalled();
  });

  it("suma UNO aunque se pidan doce", async () => {
    await handler(
      pedido({
        items: [
          {
            codigo: "A12",
            unidad: "unitario",
            modelo: null,
            cantidad: 12,
            precioVisto: 8000,
          },
        ],
      }),
      respuesta(),
    );
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      compras: { __incremento: 1 },
    });
  });

  it("suma UNO por producto, no por renglon", async () => {
    // El mismo producto en dos presentaciones es una sola venta de ese
    // producto.
    getAll.mockResolvedValue([
      docDe({
        ...PRODUCTO,
        presentaciones: {
          unitario: { precio: 8000 },
          bulto: { precio: 90000, unidades: 12 },
        },
      }),
    ]);
    await handler(
      pedido({
        items: [
          {
            codigo: "A12",
            unidad: "unitario",
            modelo: null,
            cantidad: 1,
            precioVisto: 8000,
          },
          {
            codigo: "A12",
            unidad: "bulto",
            modelo: null,
            cantidad: 1,
            precioVisto: 90000,
          },
        ],
      }),
      respuesta(),
    );
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("NO cuenta cuando el pedido se rechaza", async () => {
    await handler(
      pedido({
        items: [
          {
            codigo: "A12",
            unidad: "unitario",
            modelo: null,
            cantidad: 1,
            precioVisto: 1,
          },
        ],
      }),
      respuesta(),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("si el contador falla, el pedido SIGUE entrando", async () => {
    /*
      El pedido ya esta escrito y el dueno lo ve en el panel. Devolver un 500
      por un contador de portada le haria creer al cliente que no se mando, y
      volveria a mandarlo.
    */
    commit.mockRejectedValue(new Error("Firestore caido"));
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(201);
  });
});
