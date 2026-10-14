// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Confirmar from "@/components/common/Confirmar/Confirmar";
import { useConfirmacion } from "@/hooks/useConfirmacion";

// Componente de prueba que usa el hook igual que el panel: pide confirmación
// y guarda la respuesta.
const Prueba = ({ alResponder }) => {
  const c = useConfirmacion();

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const r = await c.pedir({
            titulo: "Eliminar el producto",
            mensaje: "No se puede recuperar.",
            detalles: ["Si solo querés que deje de venderse, usá Ocultar."],
            textoConfirmar: "Eliminar",
            peligro: true,
          });
          alResponder(r);
        }}
      >
        Borrar
      </button>

      <Confirmar
        abierto={Boolean(c.pedido)}
        {...(c.pedido ?? {})}
        onConfirmar={c.confirmar}
        onCancelar={c.cancelar}
      />
    </>
  );
};

const abrir = async (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Borrar" }));

describe("Confirmar: la respuesta que devuelve", () => {
  it("no muestra nada hasta que se pide", () => {
    render(<Prueba alResponder={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resuelve true al confirmar", async () => {
    const alResponder = vi.fn();
    const usuario = userEvent.setup();
    render(<Prueba alResponder={alResponder} />);

    await abrir(usuario);
    await usuario.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(alResponder).toHaveBeenCalledWith(true);
  });

  it("resuelve false al cancelar", async () => {
    const alResponder = vi.fn();
    const usuario = userEvent.setup();
    render(<Prueba alResponder={alResponder} />);

    await abrir(usuario);
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(alResponder).toHaveBeenCalledWith(false);
  });

  it("resuelve false con Escape", async () => {
    const alResponder = vi.fn();
    const usuario = userEvent.setup();
    render(<Prueba alResponder={alResponder} />);

    await abrir(usuario);
    await usuario.keyboard("{Escape}");

    expect(alResponder).toHaveBeenCalledWith(false);
  });

  it("se cierra después de responder", async () => {
    const usuario = userEvent.setup();
    render(<Prueba alResponder={vi.fn()} />);

    await abrir(usuario);
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("se puede volver a pedir después de cerrar", async () => {
    // Si el estado no se limpiara bien, el segundo pedido no abriria nada y
    // eliminar dejaria de funcionar despues del primer intento.
    const alResponder = vi.fn();
    const usuario = userEvent.setup();
    render(<Prueba alResponder={alResponder} />);

    await abrir(usuario);
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    await abrir(usuario);
    await usuario.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(alResponder).toHaveBeenNthCalledWith(1, false);
    expect(alResponder).toHaveBeenNthCalledWith(2, true);
  });
});

describe("Confirmar: lo que muestra", () => {
  it("muestra título, mensaje y detalles", async () => {
    const usuario = userEvent.setup();
    render(<Prueba alResponder={vi.fn()} />);
    await abrir(usuario);

    expect(screen.getByText("Eliminar el producto")).toBeInTheDocument();
    expect(screen.getByText("No se puede recuperar.")).toBeInTheDocument();
    expect(screen.getByText(/usá Ocultar/)).toBeInTheDocument();
  });

  it("arranca con el foco en Cancelar, no en la acción destructiva", async () => {
    // Un Enter de reflejo sobre un diálogo que aparecio de golpe no tiene que
    // borrar nada.
    const usuario = userEvent.setup();
    render(<Prueba alResponder={vi.fn()} />);
    await abrir(usuario);

    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("usa el texto de confirmación que se le pasa", async () => {
    const usuario = userEvent.setup();
    render(<Prueba alResponder={vi.fn()} />);
    await abrir(usuario);

    expect(
      screen.getByRole("button", { name: "Eliminar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
  });
});
