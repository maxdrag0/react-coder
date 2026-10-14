// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CartContext } from "@/contexts/cart/CartContext";

const enviarOrden = vi.fn();
vi.mock("@/services/api/ordenes", () => ({
  enviarOrden: (...a) => enviarOrden(...a),
}));

vi.mock("@/contexts/auth/useAuth", () => ({
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

const montar = (cartList = [RENGLON]) =>
  render(
    <MemoryRouter>
      <CartContext.Provider
        value={{
          cartList,
          total: cartList.reduce((a, i) => a + i.precioElegido * i.cantidad, 0),
          removeList: vi.fn(),
          cantidadItems: cartList.reduce((a, i) => a + i.cantidad, 0),
          actualizarPrecio,
          deleteItem,
        }}
      >
        <Carrito />
      </CartContext.Provider>
    </MemoryRouter>,
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
          modelo: null,
          unidad: "unitario",
          tipo: "precio_cambio",
          antes: 8000,
          ahora: 9000,
        },
      ]),
    );
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() =>
      expect(screen.getByText(/Cambió algo de tu pedido/)).toBeInTheDocument(),
    );
  });

  it("actualiza el precio del renglon que cambio", async () => {
    enviarOrden.mockRejectedValue(
      con409([
        {
          codigo: "A12",
          nombre: "Torta",
          modelo: null,
          unidad: "unitario",
          tipo: "precio_cambio",
          antes: 8000,
          ahora: 9000,
        },
      ]),
    );
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() =>
      expect(actualizarPrecio).toHaveBeenCalledWith("A12____unitario", 9000),
    );
  });

  it("saca del carrito el renglon que ya no esta disponible", async () => {
    enviarOrden.mockRejectedValue(
      con409([
        {
          codigo: "A12",
          nombre: "Torta",
          modelo: null,
          unidad: "unitario",
          tipo: "no_disponible",
        },
      ]),
    );
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());

    await waitFor(() =>
      expect(deleteItem).toHaveBeenCalledWith("A12____unitario"),
    );
  });

  it("no crea el pedido hasta que el cliente confirma", async () => {
    enviarOrden.mockRejectedValue(
      con409([
        {
          codigo: "A12",
          nombre: "Torta",
          modelo: null,
          unidad: "unitario",
          tipo: "precio_cambio",
          antes: 8000,
          ahora: 9000,
        },
      ]),
    );
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());
    await waitFor(() =>
      expect(screen.getByText(/Cambió algo/)).toBeInTheDocument(),
    );

    expect(enviarOrden).toHaveBeenCalledTimes(1);
  });

  it("al confirmar reintenta", async () => {
    enviarOrden
      .mockRejectedValueOnce(
        con409([
          {
            codigo: "A12",
            nombre: "Torta",
            modelo: null,
            unidad: "unitario",
            tipo: "precio_cambio",
            antes: 8000,
            ahora: 9000,
          },
        ]),
      )
      .mockResolvedValueOnce({ id: "uuid-2", total: 18000 });

    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());
    await waitFor(() =>
      expect(screen.getByText(/Cambió algo/)).toBeInTheDocument(),
    );

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
      expect(
        screen.getByText(/No se pudo registrar el pedido/),
      ).toBeInTheDocument(),
    );
    expect(alerta).not.toHaveBeenCalled();
    alerta.mockRestore();
  });
});

describe("Carrito: reconciliacion del renglon correcto", () => {
  const con409 = (problemas) => {
    const e = new Error("desactualizado");
    e.code = "carrito-desactualizado";
    e.problemas = problemas;
    return e;
  };

  const BENGALA_ROJA = {
    clave: "H02__rojo__unitario",
    codigo: "H02",
    nombre: "Bengala de humo",
    unidad: "unitario",
    modelo: "rojo",
    modeloEtiqueta: "Rojo",
    precioElegido: 8000,
    cantidad: 1,
  };

  it("corrige el precio de un renglon CON modelo", async () => {
    /*
      Si el problema no se puede mapear al renglon, el carrito queda igual: el
      cliente ve la pantalla de cambios, aprieta "seguir" y el servidor lo
      rechaza de nuevo, para siempre. Las bengalas son diez modelos de color,
      asi que esto deja una linea entera de productos sin poder comprarse.
    */
    enviarOrden.mockRejectedValue(
      con409([
        {
          codigo: "H02",
          nombre: "Bengala de humo",
          modelo: "rojo",
          unidad: "unitario",
          tipo: "precio_cambio",
          antes: 8000,
          ahora: 9000,
        },
      ]),
    );
    const usuario = userEvent.setup();
    montar([BENGALA_ROJA]);
    await usuario.click(enviar());

    await waitFor(() =>
      expect(actualizarPrecio).toHaveBeenCalledWith(
        "H02__rojo__unitario",
        9000,
      ),
    );
  });

  it("con el mismo producto en dos unidades, corrige la que cambio", async () => {
    // Corregir la equivocada le muestra al cliente el precio del bulto en el
    // renglon de la unidad suelta, y el reenvio vuelve a fallar.
    const BULTO = {
      ...RENGLON,
      clave: "A12____bulto",
      unidad: "bulto",
      precioElegido: 90000,
      cantidad: 1,
    };
    enviarOrden.mockRejectedValue(
      con409([
        {
          codigo: "A12",
          nombre: "Torta 100 tiros",
          modelo: null,
          unidad: "bulto",
          tipo: "precio_cambio",
          antes: 90000,
          ahora: 95000,
        },
      ]),
    );
    const usuario = userEvent.setup();
    montar([RENGLON, BULTO]);
    await usuario.click(enviar());

    await waitFor(() => expect(actualizarPrecio).toHaveBeenCalled());
    expect(actualizarPrecio).toHaveBeenCalledWith("A12____bulto", 95000);
    expect(actualizarPrecio).not.toHaveBeenCalledWith("A12____unitario", 95000);
  });

  it("saca del carrito la unidad que ya no se vende, no la otra", async () => {
    const BULTO = {
      ...RENGLON,
      clave: "A12____bulto",
      unidad: "bulto",
      precioElegido: 90000,
      cantidad: 1,
    };
    enviarOrden.mockRejectedValue(
      con409([
        {
          codigo: "A12",
          nombre: "Torta 100 tiros",
          modelo: null,
          unidad: "bulto",
          tipo: "sin_presentacion",
        },
      ]),
    );
    const usuario = userEvent.setup();
    montar([RENGLON, BULTO]);
    await usuario.click(enviar());

    await waitFor(() =>
      expect(deleteItem).toHaveBeenCalledWith("A12____bulto"),
    );
    expect(deleteItem).not.toHaveBeenCalledWith("A12____unitario");
  });
});

describe("Carrito: idempotencia por intento de compra", () => {
  const con409 = (problemas) => {
    const e = new Error("desactualizado");
    e.code = "carrito-desactualizado";
    e.problemas = problemas;
    return e;
  };

  const CAMBIO = [
    {
      codigo: "A12",
      nombre: "Torta",
      modelo: null,
      unidad: "unitario",
      tipo: "precio_cambio",
      antes: 8000,
      ahora: 9000,
    },
  ];

  it("reintenta con la MISMA idempotencia despues de un 409", async () => {
    /*
      Un id nuevo por request no deduplica nada: el reintento crearia un
      segundo pedido en vez de pisar el primero, y el dueno veria dos pedidos
      iguales sin saber cual atender.
    */
    enviarOrden
      .mockRejectedValueOnce(con409(CAMBIO))
      .mockResolvedValueOnce({ id: "uuid-2", total: 18000 });

    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());
    await waitFor(() =>
      expect(screen.getByText(/Cambió algo/)).toBeInTheDocument(),
    );

    await usuario.click(screen.getByRole("button", { name: /seguir/i }));
    await waitFor(() => expect(enviarOrden).toHaveBeenCalledTimes(2));

    const [primero, segundo] = enviarOrden.mock.calls.map(
      (c) => c[0].idempotencia,
    );
    expect(primero).toBeTruthy();
    expect(segundo).toBe(primero);
  });

  it("el pedido siguiente usa una idempotencia nueva", async () => {
    // El modal se cierra con Escape sin vaciar el carrito: si el id se
    // reusara, el pedido nuevo sobrescribiria el anterior.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(enviar());
    await waitFor(() => expect(screen.getByText(/uuid-1/)).toBeInTheDocument());

    await usuario.keyboard("{Escape}");
    await usuario.click(enviar());
    await waitFor(() => expect(enviarOrden).toHaveBeenCalledTimes(2));

    const [primero, segundo] = enviarOrden.mock.calls.map(
      (c) => c[0].idempotencia,
    );
    expect(segundo).not.toBe(primero);
  });
});
