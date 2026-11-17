// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CartContext } from "@/contexts/cart/CartContext";

/*
  El negocio es "me llega el pedido y te contacto para coordinar el pago y el
  envío". Sin la dirección hay que escribirle de nuevo a cada cliente para
  preguntársela, una vez por pedido.
*/
const useAuthMock = vi.fn();
vi.mock("@/contexts/auth/useAuth", () => ({ useAuth: () => useAuthMock() }));

const usePerfilMock = vi.fn();
vi.mock("@/hooks/usePerfil", () => ({ usePerfil: () => usePerfilMock() }));

const enviarOrdenMock = vi.fn();
vi.mock("@/services/api/ordenes", () => ({
  enviarOrden: (...a) => enviarOrdenMock(...a),
}));

vi.mock("@/components/CarritoCard/CarritoCard", () => ({
  default: ({ item }) => <li>{item.nombre}</li>,
}));

const { default: Carrito } = await import("@/pages/Carrito/Carrito");

const ITEM = {
  clave: "A1__unitario",
  codigo: "A1",
  nombre: "Torta 100 tiros",
  unidad: "unitario",
  modelo: null,
  precioElegido: 5000,
  cantidad: 1,
};

const COMPLETO = {
  telefono: "1123456789",
  direccion: "San Martín 742",
  ciudad: "Córdoba",
};

const guardarPerfilMock = vi.fn();

function montar(perfil = COMPLETO) {
  useAuthMock.mockReturnValue({
    user: {
      uid: "u1",
      email: "cliente@test.com",
      displayName: "Cliente",
      emailVerified: true,
    },
    isAdmin: false,
    loading: false,
  });
  usePerfilMock.mockReturnValue({
    perfil,
    cargando: false,
    guardar: guardarPerfilMock,
  });

  render(
    <MemoryRouter>
      <CartContext.Provider
        value={{
          cartList: [ITEM],
          total: 5000,
          removeList: vi.fn(),
          cantidadItems: 1,
          actualizarPrecio: vi.fn(),
          deleteItem: vi.fn(),
        }}
      >
        <Carrito />
      </CartContext.Provider>
    </MemoryRouter>,
  );
}

const enviar = () => screen.getByRole("button", { name: /enviar pedido/i });
const campoDireccion = () => screen.queryByLabelText(/direcci[oó]n/i);
const campoCiudad = () => screen.queryByLabelText(/ciudad/i);

beforeEach(() => {
  enviarOrdenMock.mockReset().mockResolvedValue({ id: "ORD-1", total: 5000 });
  guardarPerfilMock.mockReset().mockResolvedValue(undefined);
});

describe("Carrito: la dirección de envío es obligatoria", () => {
  it("no la pide si el perfil ya la tiene", () => {
    montar();
    expect(campoDireccion()).toBeNull();
    expect(campoCiudad()).toBeNull();
  });

  it("la pide cuando el perfil no la tiene", () => {
    montar({ telefono: "1123456789" });
    expect(campoDireccion()).toBeInTheDocument();
    expect(campoCiudad()).toBeInTheDocument();
  });

  it("pide las dos aunque solo falte la ciudad", () => {
    // Media dirección no sirve para despachar, y mezclar la calle guardada
    // con la ciudad nueva daría una dirección que nadie escribió.
    montar({ telefono: "1123456789", direccion: "San Martín 742" });
    expect(campoDireccion()).toBeInTheDocument();
    expect(campoCiudad()).toBeInTheDocument();
  });

  it("prellena lo que ya estaba guardado", () => {
    montar({ telefono: "1123456789", direccion: "San Martín 742" });
    expect(campoDireccion()).toHaveValue("San Martín 742");
  });

  it("NO manda el pedido sin dirección", async () => {
    const usuario = userEvent.setup();
    montar({ telefono: "1123456789" });
    await usuario.click(enviar());

    expect(enviarOrdenMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/necesitamos tu direcci[oó]n/i),
    ).toBeInTheDocument();
  });

  it("NO manda el pedido con dirección pero sin ciudad", async () => {
    const usuario = userEvent.setup();
    montar({ telefono: "1123456789" });
    await usuario.type(campoDireccion(), "San Martín 742");
    await usuario.click(enviar());

    expect(enviarOrdenMock).not.toHaveBeenCalled();
    expect(screen.getByText(/necesitamos la ciudad/i)).toBeInTheDocument();
  });

  it("manda lo que escribió el cliente cuando el perfil no tiene", async () => {
    const usuario = userEvent.setup();
    montar({ telefono: "1123456789" });
    await usuario.type(campoDireccion(), "Ruta 5 km 12");
    await usuario.type(campoCiudad(), "Oro Verde");
    await usuario.click(enviar());

    await waitFor(() => expect(enviarOrdenMock).toHaveBeenCalled());
    expect(enviarOrdenMock.mock.calls[0][0]).toMatchObject({
      direccion: "Ruta 5 km 12",
      ciudad: "Oro Verde",
    });
  });

  it("lo guarda en el perfil para no pedirlo de nuevo", async () => {
    const usuario = userEvent.setup();
    montar({ telefono: "1123456789" });
    await usuario.type(campoDireccion(), "  Ruta 5 km 12 ");
    await usuario.type(campoCiudad(), "Oro Verde");
    await usuario.click(enviar());

    await waitFor(() =>
      expect(guardarPerfilMock).toHaveBeenCalledWith({
        direccion: "Ruta 5 km 12",
        ciudad: "Oro Verde",
      }),
    );
  });

  it("si el perfil la tiene, no la manda: el servidor la lee del perfil", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() => expect(enviarOrdenMock).toHaveBeenCalled());
    expect(enviarOrdenMock.mock.calls[0][0].direccion).toBeUndefined();
    expect(enviarOrdenMock.mock.calls[0][0].ciudad).toBeUndefined();
  });

  it("muestra el aviso cuando el servidor rechaza por la dirección", async () => {
    // Puede pasar: el perfil se pudo haber editado en otra pestaña.
    enviarOrdenMock.mockRejectedValue(
      Object.assign(new Error("sin_direccion"), { code: "sin_direccion" }),
    );
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() =>
      expect(
        screen.getByText(/necesitamos tu direcci[oó]n/i),
      ).toBeInTheDocument(),
    );
  });
});
