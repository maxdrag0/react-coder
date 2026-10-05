// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "@/components/common/Modal/Modal";

function montar(props = {}) {
  const onClose = vi.fn();
  const onAccept = vi.fn();
  render(
    <>
      <button>boton de afuera</button>
      <Modal
        isOpen
        onClose={onClose}
        onAccept={onAccept}
        tittle="Compra exitosa"
        message="Tu pedido está hecho."
        {...props}
      />
    </>
  );
  return { onClose, onAccept };
}

describe("Modal", () => {
  it("no renderiza nada cuando está cerrado", () => {
    render(<Modal isOpen={false} tittle="x" message="y" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se anuncia como diálogo modal", () => {
    montar();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("usa el título como nombre accesible", () => {
    montar();
    expect(screen.getByRole("dialog", { name: /compra exitosa/i })).toBeInTheDocument();
  });

  it("cierra con Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = montar();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("mueve el foco adentro al abrirse", () => {
    montar();
    const dialogo = screen.getByRole("dialog");
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it("atrapa el foco: Tab repetido no se va afuera", async () => {
    const user = userEvent.setup();
    montar();
    const dialogo = screen.getByRole("dialog");
    await user.tab();
    await user.tab();
    await user.tab();
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it("llama onAccept al aceptar", async () => {
    const user = userEvent.setup();
    const { onAccept } = montar();
    await user.click(screen.getByRole("button", { name: /entendido/i }));
    expect(onAccept).toHaveBeenCalled();
  });
});
