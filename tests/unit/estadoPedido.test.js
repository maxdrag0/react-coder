import { describe, it, expect } from "vitest";
import {
  ESTADOS_PEDIDO,
  NUEVO,
  CONTACTADO,
  PAGADO,
  ENTREGADO,
  CANCELADO,
  estadoDePedido,
  etiquetaDePedido,
  estaAbierto,
} from "../../src/constants/estadoPedido";

describe("estadoDePedido", () => {
  it("un pedido sin el campo es nuevo, así los que ya entraron no se migran", () => {
    expect(estadoDePedido({ id: "ORD-1" })).toBe(NUEVO);
    expect(estadoDePedido({})).toBe(NUEVO);
  });

  it("lee el estado cuando está", () => {
    expect(estadoDePedido({ estado: PAGADO })).toBe(PAGADO);
    expect(estadoDePedido({ estado: CANCELADO })).toBe(CANCELADO);
  });

  it("cae en nuevo ante un valor que no reconoce, en vez de esconder el pedido", () => {
    // Un pedido que desaparece de la vista es una venta perdida. Ante la
    // duda tiene que aparecer como pendiente de atender.
    expect(estadoDePedido({ estado: "cualquiera" })).toBe(NUEVO);
    expect(estadoDePedido({ estado: null })).toBe(NUEVO);
    expect(estadoDePedido(null)).toBe(NUEVO);
  });
});

describe("ESTADOS_PEDIDO", () => {
  it("van en el orden del proceso real, para que el selector se lea solo", () => {
    expect(ESTADOS_PEDIDO.map((e) => e.clave)).toEqual([
      NUEVO,
      CONTACTADO,
      PAGADO,
      ENTREGADO,
      CANCELADO,
    ]);
  });

  it("cada uno tiene etiqueta", () => {
    ESTADOS_PEDIDO.forEach((e) => {
      expect(typeof e.etiqueta).toBe("string");
      expect(e.etiqueta.length).toBeGreaterThan(0);
    });
  });
});

describe("etiquetaDePedido", () => {
  it("devuelve el texto que ve el dueño", () => {
    expect(etiquetaDePedido(NUEVO)).toBe("Nuevo");
    expect(etiquetaDePedido(CONTACTADO)).toBe("Contactado");
    expect(etiquetaDePedido(ENTREGADO)).toBe("Entregado");
  });

  it("ante algo desconocido dice Nuevo, igual que estadoDePedido", () => {
    expect(etiquetaDePedido("ni idea")).toBe("Nuevo");
  });
});

describe("estaAbierto", () => {
  // Sirve para el contador de la pestaña: cuántos pedidos piden atención.
  it("cuenta como abierto lo que todavía hay que atender", () => {
    expect(estaAbierto({ estado: NUEVO })).toBe(true);
    expect(estaAbierto({ estado: CONTACTADO })).toBe(true);
    expect(estaAbierto({ estado: PAGADO })).toBe(true);
  });

  it("no cuenta lo que ya terminó", () => {
    expect(estaAbierto({ estado: ENTREGADO })).toBe(false);
    expect(estaAbierto({ estado: CANCELADO })).toBe(false);
  });

  it("un pedido sin estado está abierto: es lo que acaba de entrar", () => {
    expect(estaAbierto({})).toBe(true);
  });
});
