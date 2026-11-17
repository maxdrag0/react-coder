import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyIdToken = vi.fn();
const getAll = vi.fn();
const set = vi.fn();
const getPerfil = vi.fn();
const getConfig = vi.fn();
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
    // La coleccion importa: config/precios y users/<uid> son dos lecturas
    // distintas y el handler hace las dos.
    collection: (nombre) => ({
      doc: (id) => ({
        id,
        set: (...a) => set(...a),
        get: (...a) =>
          nombre === "config" ? getConfig(...a) : getPerfil(...a),
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

// Los datos de envio que manda el formulario cuando el perfil no los tiene.
const ENVIO = { direccion: "San Martín 742", ciudad: "Córdoba" };

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
    email_verified: true,
  });
  getAll.mockReset().mockResolvedValue([docDe(PRODUCTO)]);
  set.mockReset().mockResolvedValue(undefined);
  update.mockReset();
  commit.mockReset().mockResolvedValue(undefined);
  getPerfil.mockReset().mockResolvedValue({
    exists: true,
    data: () => ({
      telefono: "1123456789",
      direccion: "San Martín 742",
      ciudad: "Córdoba",
    }),
  });
  // Sin documento de configuracion el recargo es cero: la tienda muestra el
  // precio de lista. Es el estado antes de que nadie toque el panel.
  getConfig.mockReset().mockResolvedValue({ exists: false });
});

describe("api/orden: el mail verificado", () => {
  /*
    Hasta ahora el mail de verificacion se mandaba y nadie lo exigia: el
    cartel del perfil decia "vas a necesitarlo para enviar un pedido" y era
    mentira. Se podia pedir sin verificar nada.

    Se exige del lado del SERVIDOR porque es el unico que no se puede
    saltear: el dato viaja en el token que Firebase firma, asi que el
    navegador no lo puede inventar.
  */
  it("403 si el mail no esta verificado, y no escribe nada", async () => {
    verifyIdToken.mockResolvedValue({
      uid: "ana",
      email: "ana@mail.com",
      name: "Ana",
      email_verified: false,
    });
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(403);
    expect(res.cuerpo.error).toBe("mail_sin_verificar");
    expect(set).not.toHaveBeenCalled();
  });

  it("deja pasar con el mail verificado", async () => {
    verifyIdToken.mockResolvedValue({
      uid: "ana",
      email: "ana@mail.com",
      name: "Ana",
      email_verified: true,
    });
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(201);
  });

  it("un token sin el dato no pasa", async () => {
    /*
      Firebase siempre lo incluye, pero si alguna vez faltara, la respuesta
      segura es NO dejar pasar: ante la duda se pide verificar, que es
      molesto y reversible, en vez de aceptar un pedido de un mail que no
      sabemos si existe.
    */
    verifyIdToken.mockResolvedValue({ uid: "ana", email: "ana@mail.com" });
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(403);
  });
});

describe("api/orden: el recargo", () => {
  /*
    La tienda muestra el precio de lista mas un recargo, y el servidor cotiza
    con el MISMO. Si cotizara sin el, todos los pedidos volverian con 409
    "tu carrito esta desactualizado" y la tienda no podria vender.
  */
  it("cotiza con el recargo guardado", async () => {
    getConfig.mockResolvedValue({
      exists: true,
      data: () => ({ recargo: 100 }),
    });
    const res = respuesta();
    await handler(
      pedido({
        items: [
          {
            codigo: "A12",
            unidad: "unitario",
            modelo: null,
            cantidad: 1,
            precioVisto: 16000,
          },
        ],
      }),
      res,
    );
    expect(res.codigo).toBe(201);
    expect(res.cuerpo.total).toBe(16000);
  });

  it("rechaza el carrito que trae el precio de lista sin recargo", async () => {
    getConfig.mockResolvedValue({
      exists: true,
      data: () => ({ recargo: 100 }),
    });
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(409);
    expect(set).not.toHaveBeenCalled();
  });

  it("sin configuracion cotiza el precio de lista", async () => {
    const res = respuesta();
    await handler(pedido(), res);
    expect(res.codigo).toBe(201);
    expect(res.cuerpo.total).toBe(8000);
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
    // Con el perfil vacio tambien falta el envio, y sin eso el pedido no
    // entra: el formulario manda los dos juntos.
    await handler(pedido({ telefono: "11 2345-6789", ...ENVIO }), res);
    expect(res.codigo).toBe(201);
    // La orden es la ULTIMA escritura: antes el handler guarda el telefono en
    // el perfil, para no volver a pedirlo en el proximo pedido.
    expect(set.mock.calls.at(-1)[0].buyer.telefono).toBe("1123456789");
  });

  it("guarda en el perfil lo que llego en el cuerpo, en una sola escritura", async () => {
    getPerfil.mockResolvedValue({ exists: true, data: () => ({}) });
    await handler(pedido({ telefono: "11 2345-6789", ...ENVIO }), respuesta());
    expect(set.mock.calls[0]).toEqual([
      { telefono: "1123456789", ...ENVIO },
      { merge: true },
    ]);
  });

  it("422 con un telefono del cuerpo que no sirve", async () => {
    getPerfil.mockResolvedValue({ exists: true, data: () => ({}) });
    const res = respuesta();
    await handler(pedido({ telefono: "123", ...ENVIO }), res);
    expect(res.codigo).toBe(422);
    expect(res.cuerpo.error).toBe("sin_telefono");
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

/*
  El negocio es "me llega el pedido y te contacto para coordinar el pago y el
  envio". El telefono resuelve el contacto; la direccion resuelve el envio.
  Sin ella hay que escribirle de nuevo a cada cliente para preguntarsela, una
  vez por pedido.

  Se exige ACA y no solo en el formulario por la misma razon que el telefono:
  es el unico lugar que no se puede saltear.
*/
describe("api/orden: la dirección de envío", () => {
  const sinEnvio = () =>
    getPerfil.mockResolvedValue({
      exists: true,
      data: () => ({ telefono: "1123456789" }),
    });

  it("rechaza el pedido si no hay dirección en ninguna parte", async () => {
    sinEnvio();
    const res = respuesta();
    await handler(pedido(), res);

    expect(res.codigo).toBe(422);
    expect(res.cuerpo.error).toBe("sin_direccion");
  });

  it("rechaza el pedido si falta la ciudad", async () => {
    sinEnvio();
    const res = respuesta();
    await handler(pedido({ direccion: "San Martín 742" }), res);

    expect(res.codigo).toBe(422);
    expect(res.cuerpo.error).toBe("sin_direccion");
  });

  it("rechaza una dirección que no puede ser una dirección", async () => {
    sinEnvio();
    const res = respuesta();
    await handler(pedido({ direccion: "1234", ciudad: "Córdoba" }), res);

    expect(res.codigo).toBe(422);
    expect(res.cuerpo.error).toBe("sin_direccion");
  });

  it("no escribe el pedido cuando falta la dirección", async () => {
    sinEnvio();
    await handler(pedido(), respuesta());
    expect(set).not.toHaveBeenCalledWith(
      expect.objectContaining({ items: expect.anything() }),
    );
  });

  it("acepta la del cuerpo cuando el perfil no la tiene", async () => {
    sinEnvio();
    const res = respuesta();
    await handler(
      pedido({ direccion: "  Ruta 5 km 12 ", ciudad: " Oro Verde " }),
      res,
    );

    expect(res.codigo).toBe(201);
  });

  it("la guarda en el perfil, limpia, para no pedirla de nuevo", async () => {
    sinEnvio();
    await handler(
      pedido({ direccion: "  San  Martín 742 ", ciudad: " Córdoba " }),
      respuesta(),
    );

    expect(set).toHaveBeenCalledWith(
      { direccion: "San Martín 742", ciudad: "Córdoba" },
      { merge: true },
    );
  });

  it("el perfil manda sobre lo que diga el cuerpo", async () => {
    // Igual que el telefono: lo guardado es lo que el dueno ya conoce.
    const res = respuesta();
    await handler(
      pedido({ direccion: "Otra calle 1", ciudad: "Otra ciudad" }),
      res,
    );

    const orden = set.mock.calls.find((c) => c[0]?.items)?.[0];
    expect(orden.envio).toEqual({
      direccion: "San Martín 742",
      ciudad: "Córdoba",
    });
  });

  it("queda guardada en el pedido, que es donde el dueño la lee", async () => {
    // En el pedido y no solo en el perfil: si alguien se muda, los pedidos
    // viejos tienen que seguir diciendo adónde se mandaron.
    const res = respuesta();
    await handler(pedido(), res);

    const orden = set.mock.calls.find((c) => c[0]?.items)?.[0];
    expect(res.codigo).toBe(201);
    expect(orden.envio).toEqual({
      direccion: "San Martín 742",
      ciudad: "Córdoba",
    });
  });
});
