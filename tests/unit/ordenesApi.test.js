import { describe, it, expect, vi, beforeEach } from "vitest";

const getIdToken = vi.fn();
vi.mock("@/utils/firebase", () => ({
  auth: { currentUser: { getIdToken: (...a) => getIdToken(...a) } },
}));

const { enviarOrden } = await import("@/services/api/ordenes");

const ITEMS = [
  { codigo: "A12", unidad: "unitario", modelo: null, cantidad: 1, precioVisto: 8000 },
];

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
    await enviarOrden({ items: ITEMS });

    const [, opciones] = global.fetch.mock.calls[0];
    expect(opciones.headers.Authorization).toBe("Bearer token-valido");
  });

  it("devuelve el id y el total del servidor", async () => {
    global.fetch = responder(201, { id: "uuid-1", total: 8000 });
    await expect(enviarOrden({ items: ITEMS })).resolves.toEqual({
      id: "uuid-1",
      total: 8000,
    });
  });

  it("genera un id de idempotencia distinto por intento", async () => {
    global.fetch = responder(201, { id: "x", total: 1 });
    await enviarOrden({ items: ITEMS });
    await enviarOrden({ items: ITEMS });

    const uno = JSON.parse(global.fetch.mock.calls[0][1].body).idempotencia;
    const dos = JSON.parse(global.fetch.mock.calls[1][1].body).idempotencia;
    expect(uno).not.toBe(dos);
  });

  it("NO manda el total: lo calcula el servidor", async () => {
    global.fetch = responder(201, { id: "x", total: 1 });
    await enviarOrden({ items: ITEMS });

    const cuerpo = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect("total" in cuerpo).toBe(false);
  });

  it("ante un 409 tira un error con los problemas", async () => {
    const problemas = [
      { codigo: "A12", nombre: "Torta", tipo: "precio_cambio", antes: 1, ahora: 8000 },
    ];
    global.fetch = responder(409, { problemas });

    await expect(enviarOrden({ items: ITEMS })).rejects.toMatchObject({
      code: "carrito-desactualizado",
      problemas,
    });
  });

  it("ante un 422 tira un error de telefono", async () => {
    global.fetch = responder(422, { error: "sin_telefono" });
    await expect(enviarOrden({ items: ITEMS })).rejects.toMatchObject({
      code: "sin_telefono",
    });
  });

  it("ante un 500 tira un error con un mensaje para mostrar", async () => {
    global.fetch = responder(500, { error: "No se pudo registrar el pedido." });
    await expect(enviarOrden({ items: ITEMS })).rejects.toThrow(/No se pudo/);
  });

  it("tira si no hay sesion", async () => {
    getIdToken.mockRejectedValue(new Error("sin sesion"));
    global.fetch = responder(201, {});
    await expect(enviarOrden({ items: ITEMS })).rejects.toThrow();
  });
});
