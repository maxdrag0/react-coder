import { describe, it, expect } from "vitest";
import { mensajeDePedido, linkDeWhatsapp } from "@/utils/mensajeWhatsapp";

/*
  El panel es desde donde se atiende el pedido: se abre el chat y se arranca
  la conversación. Escribir a mano "hola, te escribo por tu pedido de..." una
  vez por pedido es trabajo que la página puede hacer sola, y además evita
  mandar el mensaje al cliente equivocado.
*/
const PEDIDO = {
  id: "a1b2c3d4-0000-4444-8888-999999999999",
  date: "2026-11-16T15:30:00.000Z",
  total: 45000,
  buyer: { name: "Ana Pérez", telefono: "1122334455" },
  items: [
    { cantidad: 2, nombre: "Torta 100 tiros", unidad: "unitario" },
    {
      cantidad: 1,
      nombre: "Bengala de humo",
      modeloEtiqueta: "Rojo",
      unidad: "display",
    },
  ],
};

describe("mensajeDePedido", () => {
  it("saluda por el nombre de pila", () => {
    // Por el nombre de pila y no el completo: es un mensaje, no una carta.
    expect(mensajeDePedido(PEDIDO)).toMatch(/^Hola Ana/);
  });

  it("dice de qué se trata", () => {
    expect(mensajeDePedido(PEDIDO)).toMatch(/pedido de pirotecnia/i);
  });

  it("lista lo que pidió, como lo muestra el panel", () => {
    const mensaje = mensajeDePedido(PEDIDO);
    expect(mensaje).toContain("2x Torta 100 tiros (Unidad)");
    expect(mensaje).toContain("1x Bengala de humo (Rojo, Display)");
  });

  it("incluye el total", () => {
    expect(mensajeDePedido(PEDIDO)).toContain("45.000");
  });

  it("cierra proponiendo el paso siguiente", () => {
    // El pedido existe justo para coordinar esto.
    expect(mensajeDePedido(PEDIDO)).toMatch(/pago y el env[ií]o/i);
  });

  it("corta la lista cuando el pedido es largo", () => {
    // Un mayorista con treinta renglones llenaría la pantalla del chat.
    const largo = {
      ...PEDIDO,
      items: Array.from({ length: 12 }, (_, i) => ({
        cantidad: 1,
        nombre: `Producto ${i}`,
        unidad: "unitario",
      })),
    };
    const mensaje = mensajeDePedido(largo);
    expect(mensaje).toMatch(/y 6 m[aá]s/);
    expect(mensaje).not.toContain("Producto 11");
  });

  it("no dice 'undefined' cuando falta algo", () => {
    const pelado = { id: "x", items: [], date: null, buyer: {} };
    const mensaje = mensajeDePedido(pelado);
    expect(mensaje).not.toMatch(/undefined|NaN|null/);
    expect(mensaje.length).toBeGreaterThan(10);
  });

  it("sin nombre saluda igual, sin quedar cortado", () => {
    const mensaje = mensajeDePedido({ ...PEDIDO, buyer: { telefono: "1" } });
    expect(mensaje).toMatch(/^Hola!/);
  });
});

describe("linkDeWhatsapp", () => {
  it("arma el link con el número normalizado y el mensaje", () => {
    const link = linkDeWhatsapp("9 11 2233-4455", "Hola Ana");
    expect(link).toBe("https://wa.me/5491122334455?text=Hola%20Ana");
  });

  it("escapa lo que rompería la URL", () => {
    const link = linkDeWhatsapp("1122334455", "Total: $45.000 & envío");
    expect(link).toContain("%24"); // $
    expect(link).toContain("%26"); // &
    expect(link).not.toMatch(/ /);
  });

  it("sin mensaje abre el chat igual", () => {
    expect(linkDeWhatsapp("1122334455")).toBe("https://wa.me/5491122334455");
  });

  it("devuelve null si el número no sirve", () => {
    // Sin esto el panel mostraría un link que lleva a un chat inexistente.
    expect(linkDeWhatsapp("1234", "Hola")).toBeNull();
  });
});
