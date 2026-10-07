// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TablaPedidos from "@/pages/Admin/TablaPedidos";

const PEDIDO = {
  id: "ORD-1",
  date: "2026-10-07T12:00:00.000Z",
  total: 5000,
  buyer: { name: "Cliente", email: "c@test.com", telefono: "1123456789" },
  items: [{ cantidad: 2, nombre: "Torta 100 tiros", unidad: "display" }],
};

const onEstado = vi.fn();
const onNota = vi.fn();

const montar = (pedidos) =>
  render(<TablaPedidos pedidos={pedidos} onEstado={onEstado} onNota={onNota} />);

beforeEach(() => {
  onEstado.mockReset();
  onNota.mockReset();
});

describe("TablaPedidos: estado", () => {
  it("un pedido sin el campo arranca en Nuevo", () => {
    montar([PEDIDO]);
    expect(screen.getByLabelText(/estado del pedido ORD-1/i)).toHaveValue("nuevo");
  });

  it("avisa el cambio de estado con el id del pedido", async () => {
    const usuario = userEvent.setup();
    montar([PEDIDO]);
    await usuario.selectOptions(
      screen.getByLabelText(/estado del pedido ORD-1/i),
      "pagado"
    );
    expect(onEstado).toHaveBeenCalledWith("ORD-1", "pagado");
  });

  it("marca la fila de un pedido nuevo para que salte a la vista", () => {
    const { container } = montar([PEDIDO]);
    expect(container.querySelector("tr.admin-pedido-nuevo")).toBeInTheDocument();
  });
});

describe("TablaPedidos: nota", () => {
  it("guarda al salir del campo", async () => {
    const usuario = userEvent.setup();
    montar([PEDIDO]);
    const nota = screen.getByLabelText(/nota del pedido ORD-1/i);
    await usuario.type(nota, "Llamar a las 18");
    await usuario.tab();
    expect(onNota).toHaveBeenCalledWith("ORD-1", "Llamar a las 18");
  });

  it("NO escribe si se entra y se sale sin tocar nada", async () => {
    // Sin esto, pasar por los campos de veinte filas serían veinte
    // escrituras en Firestore que no cambian nada.
    const usuario = userEvent.setup();
    montar([{ ...PEDIDO, nota: "ya estaba" }]);
    await usuario.click(screen.getByLabelText(/nota del pedido ORD-1/i));
    await usuario.tab();
    expect(onNota).not.toHaveBeenCalled();
  });

  it("muestra la nota que ya tenía el pedido", () => {
    montar([{ ...PEDIDO, nota: "transfirió el 50%" }]);
    expect(screen.getByLabelText(/nota del pedido ORD-1/i)).toHaveValue(
      "transfirió el 50%"
    );
  });
});

describe("TablaPedidos: contacto", () => {
  it("el teléfono es un link de WhatsApp con el número normalizado", () => {
    montar([PEDIDO]);
    expect(screen.getByRole("link", { name: /1123456789/ })).toHaveAttribute(
      "href",
      "https://wa.me/5491123456789"
    );
  });

  it("marca los pedidos viejos sin teléfono, que no se pueden atender", () => {
    // Los pedidos hechos antes de que el teléfono fuera obligatorio.
    montar([{ ...PEDIDO, buyer: { name: "Viejo", email: "v@test.com" } }]);
    expect(screen.getByText(/sin tel[eé]fono/i)).toBeInTheDocument();
  });

  it("muestra el número sin link si no se puede armar el de WhatsApp", () => {
    montar([{ ...PEDIDO, buyer: { ...PEDIDO.buyer, telefono: "123" } }]);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("123")).toBeInTheDocument();
  });
});

describe("TablaPedidos: vacío", () => {
  it("lo dice en vez de mostrar una tabla pelada", () => {
    montar([]);
    expect(screen.getByText(/no hay pedidos/i)).toBeInTheDocument();
  });
});
