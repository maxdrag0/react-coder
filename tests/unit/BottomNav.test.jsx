// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CartContext } from "@/contexts/cart/CartContext";

const useAuthMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => useAuthMock() }));

const { default: BottomNav } = await import("@/components/BottomNav/BottomNav");

function montar({ user = null, cantidadItems = 0, ruta = "/" } = {}) {
  useAuthMock.mockReturnValue({ user, isAdmin: false, loading: false });
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <CartContext.Provider value={{ cantidadItems }}>
        <BottomNav />
      </CartContext.Provider>
    </MemoryRouter>
  );
}

describe("BottomNav", () => {
  it("tiene los cinco destinos en orden", () => {
    montar();
    const textos = screen.getAllByRole("link").map((a) => a.textContent);
    expect(textos).toEqual(["Inicio", "Productos", "Carrito", "Contacto", "Ingresar"]);
  });

  it("manda al login al visitante y dice Ingresar, no Perfil", () => {
    // Decir "Perfil" a alguien sin sesión promete una pantalla que no va a
    // ver: toca y cae en el login.
    montar();
    expect(screen.getByRole("link", { name: "Ingresar" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("manda al perfil cuando hay sesión", () => {
    montar({ user: { uid: "u1" } });
    expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute(
      "href",
      "/profile"
    );
  });

  it("no muestra contador cuando el carrito está vacío", () => {
    montar({ cantidadItems: 0 });
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("muestra el contador del carrito", () => {
    montar({ cantidadItems: 3 });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("dice la cantidad en el nombre accesible, no solo en el número pintado", () => {
    montar({ cantidadItems: 3 });
    expect(
      screen.getByRole("link", { name: /Carrito, 3 productos/ })
    ).toBeInTheDocument();
  });

  it("marca la ruta activa para que se sepa dónde estás parado", () => {
    montar({ ruta: "/products" });
    expect(screen.getByRole("link", { name: "Productos" })).toHaveClass("activa");
  });

  it("no marca Inicio como activo estando en otra ruta", () => {
    // La raíz hace prefijo con todo, así que sin `end` queda siempre activa.
    montar({ ruta: "/products" });
    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveClass("activa");
  });
});
