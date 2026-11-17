import { describe, it, expect } from "vitest";
import { mensajeDePedido, linkDeWhatsapp } from "@/utils/mensajeWhatsapp";

/*
  El panel es desde donde se atiende el pedido: se abre el chat y se arranca
  la conversación. Escribir "hola, te escribo por tu pedido de..." una vez por
  pedido es trabajo que la página puede hacer sola, y además evita mandar el
  mensaje al cliente equivocado.
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

const renglones = (pedido) => mensajeDePedido(pedido).split("\n");

describe("mensajeDePedido", () => {
  it("saluda por el nombre de pila", () => {
    // Por el nombre de pila y no el completo: es un mensaje, no una carta.
    expect(mensajeDePedido(PEDIDO)).toMatch(/^Hola Ana/);
  });

  it("el encabezado dice de qué pedido se trata y abre la lista", () => {
    expect(renglones(PEDIDO)[0]).toMatch(
      /pedido de pirotecnia del 16 de noviembre:$/,
    );
  });

  it("pone un renglón por producto, con guión", () => {
    // Todo seguido en un párrafo no se puede leer de un vistazo para
    // preparar el pedido, que es para lo que se manda.
    expect(renglones(PEDIDO)).toContain("- 2x Torta 100 tiros (Unidad)");
    expect(renglones(PEDIDO)).toContain("- 1x Bengala de humo (Rojo, Display)");
  });

  it("el total y la pregunta van en su propio renglón", () => {
    const lineas = renglones(PEDIDO);
    expect(lineas.some((l) => /^Total/.test(l))).toBe(true);
    expect(lineas.at(-1)).toMatch(/^¿Coordinamos/);
  });

  it("incluye el total con su formato", () => {
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
    expect(renglones(largo)).toContain("- y 6 más");
    expect(mensajeDePedido(largo)).not.toContain("Producto 11");
  });

  it("no dice 'undefined' cuando falta algo", () => {
    const pelado = { id: "x", items: [], date: null, buyer: {} };
    const mensaje = mensajeDePedido(pelado);
    expect(mensaje).not.toMatch(/undefined|NaN|null/);
    expect(mensaje.length).toBeGreaterThan(10);
  });

  it("sin productos no deja renglones vacíos ni dos puntos colgando", () => {
    const pelado = mensajeDePedido({ id: "x", items: [], buyer: {} });
    expect(pelado).not.toMatch(/\n\s*\n/);
    expect(pelado).not.toMatch(/:\s*$/m);
  });

  it("sin nombre saluda igual, sin quedar cortado", () => {
    expect(mensajeDePedido({ ...PEDIDO, buyer: { telefono: "1" } })).toMatch(
      /^Hola!/,
    );
  });
});

describe("linkDeWhatsapp", () => {
  it("arma el link con el número normalizado y el mensaje", () => {
    const link = linkDeWhatsapp("9 11 2233-4455", "Hola Ana");
    expect(link).toBe("https://wa.me/5491122334455?text=Hola%20Ana");
  });

  it("escapa los saltos de línea de la lista", () => {
    // Sin esto el mensaje llega todo pegado en un solo renglón.
    const link = linkDeWhatsapp("1122334455", "Pedido:\n- 2x Bengala");
    expect(link).toContain("%0A");
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
