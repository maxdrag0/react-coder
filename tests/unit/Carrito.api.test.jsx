// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CartContext } from "@/contexts/cart/CartContext";

const enviarOrden = vi.fn();
vi.mock("@/services/api/ordenes", () => ({ enviarOrden: (...a) => enviarOrden(...a) }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "ana", email: "ana@mail.com", displayName: "Ana" },
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

const actualizarPrecio = vi.fn();
const deleteItem = vi.fn();

const montar = () =>
  render(
    <MemoryRouter>
      <CartContext.Provider
        value={{
          cartList: [RENGLON],
          total: 16000,
          removeList: vi.fn(),
          cantidadItems: 2,
          actualizarPrecio,
          deleteItem,
        }}
      >
        <Carrito />
      </CartContext.Provider>
    </MemoryRouter>
  );

const enviar = () => screen.getByRole("button", { name: /enviar pedido/i });

beforeEach(() => {
  enviarOrden.mockReset().mockResolvedValue({ id: "uuid-1", total: 16000 });
  actualizarPrecio.mockReset();
  deleteItem.mockReset();
});

describe("Carrito: manda a la API", () => {
  it("manda codigos, cantidades y el precio visto, sin el total", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() => expect(enviarOrden).toHaveBeenCalled());
    const enviado = enviarOrden.mock.calls[0][0];
    expect(enviado.items).toEqual([
      {
        codigo: "A12",
        unidad: "unitario",
        modelo: null,
        cantidad: 2,
        precioVisto: 8000,
      },
    ]);
    expect("total" in enviado).toBe(false);
  });

  it("muestra el numero de orden que devuelve el servidor", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());
    await waitFor(() => expect(screen.getByText(/uuid-1/)).toBeInTheDocument());
  });
});

describe("Carrito: reconciliacion", () => {
  const con409 = (problemas) => {
    const e = new Error("desactualizado");
    e.code = "carrito-desactualizado";
    e.problemas = problemas;
    return e;
  };

  it("muestra la pantalla de cambios ante un 409", async () => {
    enviarOrden.mockRejectedValue(
      con409([
        {
          codigo: "A12",
          nombre: "Torta 100 tiros",
          tipo: "precio_cambio",
          antes: 8000,
          ahora: 9000,
        },
      ])
    );
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() =>
      expect(screen.getByText(/Cambió algo de tu pedido/)).toBeInTheDocument()
    );
  });

  it("actualiza el precio del renglon que cambio", async () => {
    enviarOrden.mockRejectedValue(
      con409([
        { codigo: "A12", nombre: "Torta", tipo: "precio_cambio", antes: 8000, ahora: 9000 },
      ])
    );
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() =>
      expect(actualizarPrecio).toHaveBeenCalledWith("A12____unitario", 9000)
    );
  });

  it("saca del carrito el renglon que ya no esta disponible", async () => {
    enviarOrden.mockRejectedValue(
      con409([{ codigo: "A12", nombre: "Torta", tipo: "no_disponible" }])
    );
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() => expect(deleteItem).toHaveBeenCalledWith("A12____unitario"));
  });

  it("no crea el pedido hasta que el cliente confirma", async () => {
    enviarOrden.mockRejectedValue(
      con409([
        { codigo: "A12", nombre: "Torta", tipo: "precio_cambio", antes: 8000, ahora: 9000 },
      ])
    );
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());
    await waitFor(() => expect(screen.getByText(/Cambió algo/)).toBeInTheDocument());

    expect(enviarOrden).toHaveBeenCalledTimes(1);
  });

  it("al confirmar reintenta", async () => {
    enviarOrden
      .mockRejectedValueOnce(
        con409([
          {
            codigo: "A12",
            nombre: "Torta",
            tipo: "precio_cambio",
            antes: 8000,
            ahora: 9000,
          },
        ])
      )
      .mockResolvedValueOnce({ id: "uuid-2", total: 18000 });

    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());
    await waitFor(() => expect(screen.getByText(/Cambió algo/)).toBeInTheDocument());

    await usuario.click(screen.getByRole("button", { name: /seguir/i }));
    await waitFor(() => expect(enviarOrden).toHaveBeenCalledTimes(2));
  });
});

describe("Carrito: errores", () => {
  it("muestra el mensaje del servidor sin un alert del navegador", async () => {
    const e = new Error("No se pudo registrar el pedido.");
    e.code = "error-servidor";
    enviarOrden.mockRejectedValue(e);

    const alerta = vi.spyOn(window, "alert").mockImplementation(() => {});
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() =>
      expect(screen.getByText(/No se pudo registrar el pedido/)).toBeInTheDocument()
    );
    expect(alerta).not.toHaveBeenCalled();
    alerta.mockRestore();
  });
});
