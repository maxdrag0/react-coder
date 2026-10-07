import { describe, it, expect } from "vitest";
import { filtrarPedidos, contarPorEstado } from "../../src/pages/Admin/filtrarPedidos";

const pedido = (id, extra = {}) => ({
  id,
  date: "2026-10-07T12:00:00.000Z",
  total: 5000,
  buyer: { name: "Juan Perez", email: "juan@test.com", telefono: "1123456789" },
  items: [{ cantidad: 1, nombre: "Torta 100 tiros" }],
  ...extra,
});

const LISTA = [
  pedido("ORD-1", { estado: "nuevo" }),
  pedido("ORD-2", { estado: "pagado" }),
  pedido("ORD-3", { estado: "entregado" }),
  pedido("ORD-4"), // sin campo: cuenta como nuevo
];

const ids = (r) => r.map((p) => p.id);

describe("filtrarPedidos: por estado", () => {
  it("sin filtro devuelve todos", () => {
    expect(filtrarPedidos(LISTA, {})).toHaveLength(4);
  });

  it("filtra por un estado", () => {
    expect(ids(filtrarPedidos(LISTA, { estado: "pagado" }))).toEqual(["ORD-2"]);
  });

  it("un pedido sin el campo entra en 'nuevo'", () => {
    // Los pedidos que entraron antes de que existieran los estados.
    expect(ids(filtrarPedidos(LISTA, { estado: "nuevo" }))).toEqual([
      "ORD-1",
      "ORD-4",
    ]);
  });

  it("el estado 'abiertos' junta todo lo que pide atencion", () => {
    // Es el filtro que el dueno va a usar el 90% del tiempo: que falta hacer.
    expect(ids(filtrarPedidos(LISTA, { estado: "abiertos" }))).toEqual([
      "ORD-1",
      "ORD-2",
      "ORD-4",
    ]);
  });
});

describe("filtrarPedidos: por texto", () => {
  it("busca por nombre del cliente", () => {
    expect(ids(filtrarPedidos(LISTA, { texto: "juan" }))).toHaveLength(4);
  });

  it("busca por email", () => {
    const otros = [...LISTA, pedido("ORD-9", { buyer: { email: "ana@test.com" } })];
    expect(ids(filtrarPedidos(otros, { texto: "ana@" }))).toEqual(["ORD-9"]);
  });

  it("busca por telefono, que es como el dueno identifica a alguien", () => {
    expect(ids(filtrarPedidos(LISTA, { texto: "1123456789" }))).toHaveLength(4);
  });

  it("busca por numero de orden", () => {
    expect(ids(filtrarPedidos(LISTA, { texto: "ORD-2" }))).toEqual(["ORD-2"]);
  });

  it("busca por nombre de un producto del pedido", () => {
    // Para cuando alguien llama diciendo "pedi una torta" y no el numero.
    expect(ids(filtrarPedidos(LISTA, { texto: "100 tiros" }))).toHaveLength(4);
  });

  it("ignora mayusculas y espacios de sobra", () => {
    expect(ids(filtrarPedidos(LISTA, { texto: "  JUAN  " }))).toHaveLength(4);
  });

  it("no explota con un pedido al que le falta todo", () => {
    expect(() => filtrarPedidos([{ id: "X" }], { texto: "algo" })).not.toThrow();
    expect(filtrarPedidos([{ id: "X" }], { texto: "algo" })).toEqual([]);
  });
});

describe("filtrarPedidos: estado y texto juntos", () => {
  it("aplica los dos", () => {
    const otros = [
      ...LISTA,
      pedido("ORD-9", { estado: "pagado", buyer: { name: "Ana" } }),
    ];
    expect(ids(filtrarPedidos(otros, { estado: "pagado", texto: "ana" }))).toEqual([
      "ORD-9",
    ]);
  });
});

describe("contarPorEstado", () => {
  it("cuenta cuantos hay en cada estado, para los chips", () => {
    const cuenta = contarPorEstado(LISTA);
    expect(cuenta.nuevo).toBe(2);
    expect(cuenta.pagado).toBe(1);
    expect(cuenta.entregado).toBe(1);
    expect(cuenta.contactado).toBe(0);
  });

  it("cuenta los abiertos y el total", () => {
    const cuenta = contarPorEstado(LISTA);
    expect(cuenta.abiertos).toBe(3);
    expect(cuenta.todos).toBe(4);
  });
});
