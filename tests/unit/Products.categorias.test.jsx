// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SIN_STOCK, OCULTO } from "@/constants/estadoProducto";

/*
  EL BUG: el panel de filtros ofrecía las dieciséis categorías de la
  constante, cargadas o no. De dieciséis se usan menos de la mitad, así que
  la mayoría de las opciones llevaban a "No encontramos nada".
*/
const CATALOGO = [
  {
    codigo: "1",
    nombre: "Torta Uno",
    categoria: "Tortas",
    precioUnitario: 100,
  },
  {
    codigo: "2",
    nombre: "Torta Dos",
    categoria: "Tortas",
    precioUnitario: 200,
  },
  // Mayúsculas: así quedó parte del catálogo.
  {
    codigo: "3",
    nombre: "Torta Tres",
    categoria: "TORTAS",
    precioUnitario: 300,
  },
  {
    codigo: "4",
    nombre: "Bengala Humo",
    categoria: "Bengalas",
    estado: SIN_STOCK,
    precioUnitario: 400,
  },
  {
    codigo: "5",
    nombre: "Mortero Secreto",
    categoria: "Morteros",
    estado: OCULTO,
    precioUnitario: 500,
  },
];

vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({ items: CATALOGO, loading: false }),
}));

vi.mock("@/components/ItemListContainer/ItemListContainer", () => ({
  default: ({ items }) => <p>{items.length} en la grilla</p>,
}));

const { default: Products } = await import("@/pages/Products/Products");

function montar(ruta = "/products") {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/products" element={<Products />} />
        <Route path="/products/:category" element={<Products />} />
      </Routes>
    </MemoryRouter>,
  );
}

const opciones = () =>
  [...document.querySelectorAll(".filtro-grupo")]
    .find((g) => g.querySelector("legend")?.textContent === "Categoría")
    .querySelectorAll(".filtro-opcion");

const nombresDeOpciones = () => [...opciones()].map((b) => b.textContent);

const enLaGrilla = () => screen.getByText(/en la grilla/).textContent;

describe("Products: el filtro de categorías", () => {
  it("ofrece solo las categorías que tienen productos a la vista", () => {
    montar();
    expect(nombresDeOpciones()).toEqual(["Todas", "Bengalas", "Tortas"]);
  });

  it("no ofrece una categoría de la constante que nadie cargó", () => {
    montar();
    expect(nombresDeOpciones()).not.toContain("Petardos");
  });

  it("no ofrece la categoría cuyo único producto está oculto", () => {
    // Oculto es "no existe para la tienda": ofrecer el filtro es prometer
    // algo que no se puede ver.
    montar();
    expect(nombresDeOpciones()).not.toContain("Morteros");
  });

  it("incluye la categoría que solo tiene productos sin stock", () => {
    montar();
    expect(nombresDeOpciones()).toContain("Bengalas");
  });

  it("filtra la grilla al elegir una categoría", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole("button", { name: "Bengalas" }));
    expect(enLaGrilla()).toBe("1 en la grilla");
  });

  it("cuenta la variante en mayúsculas dentro de la categoría", () => {
    // La consulta de Firestore preguntaba por las dos formas; filtrar en el
    // cliente tiene que hacer lo mismo o se pierden productos.
    montar("/products/Tortas");
    expect(enLaGrilla()).toBe("3 en la grilla");
  });

  it("deja el producto oculto afuera de la grilla", () => {
    montar("/products/Morteros");
    expect(screen.getByText("No encontramos nada")).toBeInTheDocument();
  });

  it("marca como activa la categoría elegida aunque esté vacía", () => {
    // Sin esto, la cabecera decía "Varios" y ninguna opción del panel
    // aparecía elegida: el filtro contradecía a la página.
    montar("/products/Varios");
    const varios = screen.getByRole("button", { name: "Varios" });
    expect(varios).toHaveAttribute("aria-pressed", "true");
    expect(varios).toHaveClass("activa");
  });
});
