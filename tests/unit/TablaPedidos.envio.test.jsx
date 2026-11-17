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
