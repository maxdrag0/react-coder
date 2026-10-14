import { describe, it, expect, vi, beforeEach } from "vitest";

const getIdToken = vi.fn();
vi.mock("@/utils/firebase", () => ({
  auth: { currentUser: { getIdToken: (...a) => getIdToken(...a) } },
}));

const { enviarOrden } = await import("@/services/api/ordenes");

const ITEMS = [
  {
    codigo: "A12",
    unidad: "unitario",
    modelo: null,
    cantidad: 1,
    precioVisto: 8000,
  },
];

// La idempotencia la elige quien manda el pedido, no enviarOrden.
const mandar = (extra = {}) =>
  enviarOrden({ items: ITEMS, idempotencia: "intento-1", ...extra });

const cuerpoDe = (n = 0) => JSON.parse(global.fetch.mock.calls[n][1].body);

const responder = (status, cuerpo) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  });

beforeEach(() => {
  getIdToken.mockReset().mockResolvedValue("token-valido");
});

describe("enviarOrden", () => {
  it("manda el token en la cabecera", async () => {
    global.fetch = responder(201, { id: "uuid-1", total: 8000 });
    await mandar();

    const [, opciones] = global.fetch.mock.calls[0];
    expect(opciones.headers.Authorization).toBe("Bearer token-valido");
  });

  it("devuelve el id y el total del servidor", async () => {
    global.fetch = responder(201, { id: "uuid-1", total: 8000 });
    await expect(mandar()).resolves.toEqual({ id: "uuid-1", total: 8000 });
  });

  it("NO manda el total: lo calcula el servidor", async () => {
    global.fetch = responder(201, { id: "x", total: 1 });
    await mandar();
    expect("total" in cuerpoDe()).toBe(false);
  });

  it("ante un 409 tira un error con los problemas", async () => {
    const problemas = [
      {
        codigo: "A12",
        nombre: "Torta",
        modelo: null,
        unidad: "unitario",
        tipo: "precio_cambio",
        antes: 1,
        ahora: 8000,
      },
    ];
    global.fetch = responder(409, { problemas });

    await expect(mandar()).rejects.toMatchObject({
      code: "carrito-desactualizado",
      problemas,
    });
  });

  it("ante un 422 tira un error de telefono", async () => {
    global.fetch = responder(422, { error: "sin_telefono" });
    await expect(mandar()).rejects.toMatchObject({ code: "sin_telefono" });
  });

  it("ante un 500 tira un error con un mensaje para mostrar", async () => {
    global.fetch = responder(500, { error: "No se pudo registrar el pedido." });
    await expect(mandar()).rejects.toThrow(/No se pudo/);
  });

  it("tira si no hay sesion", async () => {
    getIdToken.mockResolvedValue(null);
    global.fetch = responder(201, {});
    await expect(mandar()).rejects.toMatchObject({ code: "sin-sesion" });
  });
});

describe("enviarOrden: la idempotencia la elige quien llama", () => {
  it("manda la que le pasan, sin inventar una", async () => {
    global.fetch = responder(201, { id: "x", total: 1 });
    await mandar({ idempotencia: "mi-intento" });
    expect(cuerpoDe().idempotencia).toBe("mi-intento");
  });

  it("dos envios con la misma la repiten", async () => {
    /*
      Es lo que hace que un reintento pise el mismo pedido. Cuando esta
      funcion generaba un uuid por llamada no deduplicaba nada: un reintento
      despues de una respuesta perdida creaba un segundo pedido igual.
    */
    global.fetch = responder(201, { id: "x", total: 1 });
    await mandar({ idempotencia: "mismo" });
    await mandar({ idempotencia: "mismo" });
    expect(cuerpoDe(0).idempotencia).toBe(cuerpoDe(1).idempotencia);
  });

  it("tira sin mandar nada si no le pasan idempotencia", async () => {
    global.fetch = responder(201, {});
    await expect(enviarOrden({ items: ITEMS })).rejects.toMatchObject({
      code: "sin-idempotencia",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("enviarOrden: sin red", () => {
  it("traduce la falla de fetch a un mensaje en castellano", async () => {
    /*
      fetch solo rechaza cuando no hubo respuesta. El mensaje del navegador
      ("Failed to fetch") es tecnico y en ingles, y terminaba impreso tal cual
      en la pagina del carrito.
    */
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(mandar()).rejects.toMatchObject({ code: "sin-red" });
    await expect(mandar()).rejects.toThrow(/conexi[oó]n/i);
  });

  it("tambien cuando falla al pedir el token", async () => {
    getIdToken.mockRejectedValue(new Error("network request failed"));
    global.fetch = responder(201, {});
    await expect(mandar()).rejects.toMatchObject({ code: "sin-red" });
  });
});
