// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TablaPedidos from "@/pages/Admin/TablaPedidos";

/*
  El panel es donde el dueño lee el pedido para despacharlo. Si la dirección
  no aparece acá, da lo mismo haberla pedido.
*/
const PEDIDO = {
  id: "ORD-1",
  date: "2026-11-16T12:00:00.000Z",
  total: 5000,
  estado: "nuevo",
  buyer: { name: "Cliente", email: "c@test.com", telefono: "1123456789" },
  envio: { direccion: "San Martín 742", ciudad: "Córdoba" },
  items: [{ codigo: "A1", nombre: "Torta", unidad: "unitario", cantidad: 1 }],
};

const montar = (pedido = PEDIDO) =>
  render(
    <TablaPedidos
      pedidos={[pedido]}
      onEstado={vi.fn()}
      onNota={vi.fn()}
      seleccion={new Set()}
      onSeleccion={vi.fn()}
    />,
  );

describe("TablaPedidos: la dirección de envío", () => {
  it("muestra la dirección y la ciudad", () => {
    montar();
    expect(screen.getByText(/San Martín 742/)).toBeInTheDocument();
    expect(screen.getByText(/Córdoba/)).toBeInTheDocument();
  });

  it("avisa cuando el pedido no la tiene", () => {
    // Los pedidos hechos antes de que fuera obligatoria no la tienen.
    const { envio, ...viejo } = PEDIDO;
    expect(envio).toBeDefined();
    montar(viejo);
    expect(screen.getByText(/sin direcci[oó]n/i)).toBeInTheDocument();
  });
});

describe("TablaPedidos: el chat de WhatsApp", () => {
  it("abre con el mensaje del pedido ya escrito", () => {
    // Escribir "hola, te escribo por tu pedido de..." una vez por pedido es
    // trabajo que la página puede hacer sola.
    montar();
    const link = screen.getByRole("link", { name: /1123456789/ });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/5491123456789?text="),
    );
    expect(decodeURIComponent(link.getAttribute("href"))).toContain(
      "pedido de pirotecnia",
    );
  });

  it("usa el número que WhatsApp entiende, no el que escribió el cliente", () => {
    // "9 11 2233 4455" es como se escribe para el exterior: sin normalizar,
    // el link llevaba a 54991122334455 y WhatsApp decía que no existe.
    montar({
      ...PEDIDO,
      buyer: { ...PEDIDO.buyer, telefono: "9 11 2233-4455" },
    });
    const link = screen.getByRole("link", { name: /2233/ });
    expect(link.getAttribute("href")).toContain("wa.me/5491122334455");
  });

  it("sin un número usable no pone link", () => {
    montar({ ...PEDIDO, buyer: { ...PEDIDO.buyer, telefono: "1234" } });
    expect(screen.queryByRole("link", { name: /1234/ })).toBeNull();
    expect(screen.getByText("1234")).toBeInTheDocument();
  });
});
