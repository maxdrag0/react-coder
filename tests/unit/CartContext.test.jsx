// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CartProvider from "@/contexts/cart/CartProvider";
import { useCart } from "@/contexts/cart/useCart";

const PRODUCTO = {
  codigo: "201",
  nombre: "Torta 100 tiros",
  precioUnitario: 4500,
  precioDisplay: 45000,
  precioBulto: 390000,
};

function Sonda() {
  const {
    cartList,
    total,
    cantidadItems,
    addToCart,
    deleteItem,
    updateQuantity,
    actualizarPrecio,
  } = useCart();

  return (
    <div>
      <p data-testid="renglones">{cartList.length}</p>
      <p data-testid="total">{total}</p>
      <p data-testid="cantidad">{cantidadItems}</p>
      <p data-testid="precio-primero">{cartList[0]?.precioElegido}</p>
      <button onClick={() => addToCart(PRODUCTO, 1, "unitario")}>
        +unidad
      </button>
      <button onClick={() => addToCart(PRODUCTO, 1, "bulto")}>+bulto</button>
      <button onClick={() => updateQuantity(cartList[0]?.clave, 5)}>
        poner 5
      </button>
      <button onClick={() => deleteItem(cartList[0]?.clave)}>
        borrar primero
      </button>
      <button onClick={() => actualizarPrecio(cartList[0]?.clave, 9000)}>
        precio 9000
      </button>
      <button onClick={() => actualizarPrecio("no-existe", 1)}>
        precio fantasma
      </button>
    </div>
  );
}

beforeEach(() => localStorage.clear());

const montar = () =>
  render(
    <CartProvider>
      <Sonda />
    </CartProvider>,
  );

describe("CartContext", () => {
  it("junta el mismo producto comprado en la misma unidad", async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByText("+unidad"));
    await user.click(screen.getByText("+unidad"));

    expect(screen.getByTestId("renglones")).toHaveTextContent("1");
    expect(screen.getByTestId("cantidad")).toHaveTextContent("2");
    expect(screen.getByTestId("total")).toHaveTextContent("9000");
  });

  it("separa el mismo producto comprado en unidades distintas", async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByText("+unidad"));
    await user.click(screen.getByText("+bulto"));

    expect(screen.getByTestId("renglones")).toHaveTextContent("2");
    expect(screen.getByTestId("total")).toHaveTextContent("394500");
  });

  it("usa el precio de la unidad elegida, no el unitario", async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByText("+bulto"));
    expect(screen.getByTestId("total")).toHaveTextContent("390000");
  });

  it("actualiza la cantidad por clave", async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByText("+unidad"));
    await user.click(screen.getByText("poner 5"));
    expect(screen.getByTestId("cantidad")).toHaveTextContent("5");
  });

  it("borra el renglón por clave sin tocar los otros", async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByText("+unidad"));
    await user.click(screen.getByText("+bulto"));
    await user.click(screen.getByText("borrar primero"));

    expect(screen.getByTestId("renglones")).toHaveTextContent("1");
    expect(screen.getByTestId("total")).toHaveTextContent("390000");
  });

  it("actualizarPrecio cambia el precio de un renglón y recalcula el total", async () => {
    // Es lo que hace la reconciliación cuando el servidor avisa que el precio
    // cambió: el renglón se queda, con el precio nuevo.
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByText("+unidad"));
    await user.click(screen.getByText("+unidad"));
    await user.click(screen.getByText("precio 9000"));

    expect(screen.getByTestId("precio-primero")).toHaveTextContent("9000");
    expect(screen.getByTestId("total")).toHaveTextContent("18000");
  });

  it("actualizarPrecio ignora una clave que no está", async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByText("+unidad"));
    await user.click(screen.getByText("precio fantasma"));

    expect(screen.getByTestId("precio-primero")).toHaveTextContent("4500");
  });
});

describe("CartContext — persistencia", () => {
  it("guarda el carrito en localStorage al agregar", async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByText("+bulto"));

    const guardado = JSON.parse(localStorage.getItem("carrito"));
    expect(guardado).toHaveLength(1);
    expect(guardado[0].unidad).toBe("bulto");
    expect(guardado[0].precioElegido).toBe(390000);
  });

  it("recupera el carrito al volver a montar", async () => {
    const user = userEvent.setup();
    const { unmount } = montar();
    await user.click(screen.getByText("+unidad"));
    await user.click(screen.getByText("+unidad"));
    unmount();

    montar();
    expect(screen.getByTestId("cantidad")).toHaveTextContent("2");
    expect(screen.getByTestId("total")).toHaveTextContent("9000");
  });

  it("refleja el borrado en localStorage", async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByText("+unidad"));
    await user.click(screen.getByText("borrar primero"));

    expect(JSON.parse(localStorage.getItem("carrito"))).toEqual([]);
  });

  it("arranca vacío si lo guardado está corrupto, sin romper la app", () => {
    localStorage.setItem("carrito", "esto no es json");
    montar();
    expect(screen.getByTestId("renglones")).toHaveTextContent("0");
  });

  it("ignora lo guardado si no es un arreglo", () => {
    localStorage.setItem("carrito", JSON.stringify({ truco: true }));
    montar();
    expect(screen.getByTestId("renglones")).toHaveTextContent("0");
  });

  it("descarta renglones sin clave o sin precio", () => {
    localStorage.setItem(
      "carrito",
      JSON.stringify([
        { clave: "1__unitario", precioElegido: 100, cantidad: 2, codigo: "1" },
        { codigo: "2", cantidad: 1 },
        { clave: "3__bulto", precioElegido: 0, cantidad: 1, codigo: "3" },
      ]),
    );
    montar();
    expect(screen.getByTestId("renglones")).toHaveTextContent("1");
    expect(screen.getByTestId("total")).toHaveTextContent("200");
  });
});
