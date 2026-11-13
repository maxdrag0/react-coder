// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CartContext } from "@/contexts/cart/CartContext";

/*
  El carrito de alguien que todavía no verificó su email.

  Quien decide es el servidor: el dato viaja en el token firmado y el
  navegador no lo puede inventar. Pero enterarse recién al apretar "Enviar
  pedido", con el carrito lleno, es maltrato. Acá se avisa antes.

  Va en su propio archivo porque el usuario se moquea a nivel de módulo: no
  se puede cambiar de un test a otro dentro del mismo archivo.
*/

const enviarOrden = vi.fn();
vi.mock("@/services/api/ordenes", () => ({
  enviarOrden: (...a) => enviarOrden(...a),
}));

vi.mock("@/contexts/auth/useAuth", () => ({
  useAuth: () => ({
    user: {
      uid: "ana",
      email: "ana@mail.com",
      displayName: "Ana",
      emailVerified: false,
    },
    loading: false,
  }),
}));

vi.mock("@/hooks/usePerfil", () => ({
  usePerfil: () => ({
    perfil: { telefono: "1123456789" },
    cargando: false,
    guardar: vi.fn(),
  }),
}));

vi.mock("@/components/CarritoCard/CarritoCard", () => ({
  default: ({ item }) => <li>{item.nombre}</li>,
}));

const { default: Carrito } = await import("@/pages/Carrito/Carrito");

const RENGLON = {
  clave: "A12____unitario",
  codigo: "A12",
  nombre: "Torta 100 tiros",
  unidad: "unitario",
  modelo: null,
  precioElegido: 8000,
  cantidad: 2,
};

const montar = () =>
  render(
    <MemoryRouter>
      <CartContext.Provider
        value={{
          cartList: [RENGLON],
          total: 16000,
          removeList: vi.fn(),
          cantidadItems: 2,
          actualizarPrecio: vi.fn(),
          deleteItem: vi.fn(),
        }}
      >
        <Carrito />
      </CartContext.Provider>
    </MemoryRouter>,
  );

beforeEach(() => {
  enviarOrden.mockReset();
});

describe("Carrito sin el email verificado", () => {
  it("no deja enviar el pedido", () => {
    montar();
    expect(
      screen.getByRole("button", { name: /enviar pedido/i }),
    ).toBeDisabled();
  });

  it("explica por qué y ofrece reenviar el correo", () => {
    // Un botón apagado sin motivo es peor que uno que falla: la persona no
    // sabe qué hacer para destrabarlo.
    montar();
    expect(screen.getByText(/no está verificado/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reenviar el mail/i }),
    ).toBeInTheDocument();
  });

  it("no llama a la API", () => {
    montar();
    expect(enviarOrden).not.toHaveBeenCalled();
  });
});
