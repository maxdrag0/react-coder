// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const useProductsMock = vi.fn();
vi.mock("@/hooks/useProducts", () => ({
  useProducts: (...a) => useProductsMock(...a),
}));

vi.mock("@/components/ItemListContainer/ItemListContainer", () => ({
  default: ({ items }) => (
    <ul data-testid="grilla">
      {items.map((i) => (
        <li key={i.codigo}>{i.nombre}</li>
      ))}
    </ul>
  ),
}));

const { default: Home } = await import("@/pages/Home/Home");

const producto = (n, extra = {}) => ({
  codigo: String(n),
  nombre: `Producto ${n}`,
  precioUnitario: 100,
  ...extra,
});

function montar(items) {
  useProductsMock.mockReturnValue({ items, loading: false });
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

const enGrilla = () =>
  [...screen.getByTestId("grilla").querySelectorAll("li")].map((li) => li.textContent);

describe("Home: destacados", () => {
  it("pide el catálogo completo, no una página", () => {
    // Pedir 8 y filtrar después deja la home vacía cuando esos 8 están
    // ocultos, y hace que "más vendidos" ordene sobre 8 productos al azar.
    montar([producto(1)]);
    expect(useProductsMock).toHaveBeenCalledWith(undefined, { traerTodo: true });
  });

  it("muestra un producto activo aunque los primeros del catálogo estén ocultos", () => {
    // El bug real: 317 de 321 ocultos, los 4 activos en las posiciones 161 a
    // 177, y la home quedaba en blanco.
    const items = [
      ...Array.from({ length: 20 }, (_, i) => producto(i, { estado: "oculto" })),
      producto(99, { estado: "activo" }),
    ];
    montar(items);
    expect(enGrilla()).toContain("Producto 99");
  });

  it("no muestra ningún oculto", () => {
    montar([producto(1, { estado: "oculto" }), producto(2, { estado: "activo" })]);
    expect(enGrilla()).toEqual(["Producto 2"]);
  });

  it("ordena por compras sobre todo el catálogo", () => {
    montar([
      producto(1, { compras: 2 }),
      producto(2, { compras: 50 }),
      producto(3, { compras: 10 }),
    ]);
    expect(enGrilla()).toEqual(["Producto 2", "Producto 3", "Producto 1"]);
  });

  it("corta en 12 para no volcar 321 productos en la portada", () => {
    montar(Array.from({ length: 40 }, (_, i) => producto(i)));
    expect(enGrilla()).toHaveLength(12);
  });

  it("manda al catálogo en vez de paginar, que ya tiene todo cargado", () => {
    montar(Array.from({ length: 40 }, (_, i) => producto(i)));
    expect(screen.getByRole("link", { name: /catálogo/i })).toHaveAttribute(
      "href",
      "/products"
    );
  });

  it("no muestra la grilla vacía con un cartel de más vendidos si no hay nada", () => {
    montar([producto(1, { estado: "oculto" })]);
    expect(screen.queryByTestId("grilla")).toBeNull();
    expect(screen.getByText(/todav[íi]a no hay productos/i)).toBeInTheDocument();
  });
});
