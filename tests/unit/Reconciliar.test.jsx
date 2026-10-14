// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Reconciliar from "@/pages/Carrito/Reconciliar";

const PROBLEMAS = [
  {
    codigo: "A12",
    nombre: "Torta 100 tiros",
    tipo: "precio_cambio",
    antes: 7000,
    ahora: 8000,
  },
  { codigo: "B07", nombre: "Bengala", tipo: "no_disponible" },
  { codigo: "C01", nombre: "Mortero", tipo: "sin_presentacion" },
  { codigo: "D09", nombre: "", tipo: "inexistente" },
];

describe("Reconciliar", () => {
  it("explica el cambio de precio con las dos cifras", () => {
    render(
      <Reconciliar
        problemas={[PROBLEMAS[0]]}
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />
    );
    expect(screen.getByText(/Torta 100 tiros/)).toBeInTheDocument();
    expect(screen.getByText(/\$7\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\$8\.000/)).toBeInTheDocument();
  });

  it("dice que un producto ya no está disponible", () => {
    render(
      <Reconciliar
        problemas={[PROBLEMAS[1]]}
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />
    );
    expect(screen.getByText(/ya no est[aá] disponible/i)).toBeInTheDocument();
  });

  it("tiene un texto para cada uno de los cuatro tipos", () => {
    // Un tipo sin texto mostraría un renglón vacío, que se lee como un error
    // de la tienda y no como una explicación.
    const { container } = render(
      <Reconciliar problemas={PROBLEMAS} onConfirmar={vi.fn()} onCancelar={vi.fn()} />
    );
    const renglones = container.querySelectorAll(".reconciliar-item");
    expect(renglones).toHaveLength(4);
    renglones.forEach((r) => expect(r.textContent.trim()).not.toBe(""));
  });

  it("confirmar avisa", async () => {
    const onConfirmar = vi.fn();
    const usuario = userEvent.setup();
    render(
      <Reconciliar
        problemas={PROBLEMAS}
        onConfirmar={onConfirmar}
        onCancelar={vi.fn()}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /seguir/i }));
    expect(onConfirmar).toHaveBeenCalled();
  });

  it("cancelar avisa", async () => {
    const onCancelar = vi.fn();
    const usuario = userEvent.setup();
    render(
      <Reconciliar
        problemas={PROBLEMAS}
        onConfirmar={vi.fn()}
        onCancelar={onCancelar}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /revisar/i }));
    expect(onCancelar).toHaveBeenCalled();
  });
});
