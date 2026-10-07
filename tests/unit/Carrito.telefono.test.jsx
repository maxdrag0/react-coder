// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CartContext } from "@/contexts/cart/CartContext";

const useAuthMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => useAuthMock() }));

const usePerfilMock = vi.fn();
vi.mock("@/hooks/usePerfil", () => ({ usePerfil: () => usePerfilMock() }));

const crearCompraMock = vi.fn();
vi.mock("@/services", () => ({
  services: { firebase: { crearCompra: (...a) => crearCompraMock(...a) } },
}));

vi.mock("@/components/CarritoCard/CarritoCard", () => ({
  default: ({ item }) => <li>{item.nombre}</li>,
}));

const { default: Carrito } = await import("@/pages/Carrito/Carrito");

const ITEM = { clave: "A1__unitario", nombre: "Torta 100 tiros", precioElegido: 5000, cantidad: 1 };

const guardarPerfilMock = vi.fn();

function montar({ telefono = null } = {}) {
  useAuthMock.mockReturnValue({
    user: { uid: "u1", email: "cliente@test.com", displayName: "Cliente" },
    isAdmin: false,
    loading: false,
  });
  usePerfilMock.mockReturnValue({
    perfil: telefono ? { telefono } : {},
    cargando: false,
    guardar: guardarPerfilMock,
  });

  render(
    <MemoryRouter>
      <CartContext.Provider
        value={{ cartList: [ITEM], total: 5000, removeList: vi.fn(), cantidadItems: 1 }}
      >
        <Carrito />
      </CartContext.Provider>
    </MemoryRouter>
  );
}

const enviar = () => screen.getByRole("button", { name: /enviar pedido/i });
const campoTelefono = () => screen.queryByLabelText(/tu tel[eé]fono/i);

beforeEach(() => {
  crearCompraMock.mockReset();
  crearCompraMock.mockResolvedValue("ORD-1");
  guardarPerfilMock.mockReset();
  guardarPerfilMock.mockResolvedValue(undefined);
});

describe("Carrito: el teléfono es obligatorio para mandar el pedido", () => {
  it("no pide el teléfono si el perfil ya lo tiene", () => {
    montar({ telefono: "1123456789" });
    expect(campoTelefono()).toBeNull();
  });

  it("lo pide cuando el perfil no lo tiene", () => {
    // Pasa con todos los usuarios que ya existían y con los que entran por
    // Google, que nunca vieron un formulario que lo pidiera.
    montar();
    expect(campoTelefono()).toBeInTheDocument();
  });

  it("copia el teléfono del perfil al pedido", async () => {
    const usuario = userEvent.setup();
    montar({ telefono: "1123456789" });
    await usuario.click(enviar());

    await waitFor(() => expect(crearCompraMock).toHaveBeenCalled());
    expect(crearCompraMock.mock.calls[0][0].buyer.telefono).toBe("1123456789");
  });

  it("NO crea el pedido si falta el teléfono", async () => {
    // Un pedido sin teléfono no se puede atender: el negocio es llamar al
    // cliente. Dejarlo entrar seria guardar algo inservible.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    expect(crearCompraMock).not.toHaveBeenCalled();
    expect(screen.getByText(/necesitamos tu tel[eé]fono/i)).toBeInTheDocument();
  });

  it("NO crea el pedido con un teléfono incompleto", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.type(campoTelefono(), "123");
    await usuario.click(enviar());

    expect(crearCompraMock).not.toHaveBeenCalled();
    expect(screen.getByText(/incompleto/i)).toBeInTheDocument();
  });

  it("acepta el teléfono escrito en el carrito y lo manda normalizado", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.type(campoTelefono(), "11 2345-6789");
    await usuario.click(enviar());

    await waitFor(() => expect(crearCompraMock).toHaveBeenCalled());
    expect(crearCompraMock.mock.calls[0][0].buyer.telefono).toBe("1123456789");
  });

  it("lo guarda en el perfil para no pedirlo de nuevo", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.type(campoTelefono(), "11 2345-6789");
    await usuario.click(enviar());

    await waitFor(() => expect(guardarPerfilMock).toHaveBeenCalledWith({
      telefono: "1123456789",
    }));
  });
});
