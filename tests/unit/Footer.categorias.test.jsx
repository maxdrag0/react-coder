// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OCULTO } from "@/constants/estadoProducto";

/*
  EL BUG, medido contra el catálogo de verdad: el pie ofrecía las primeras
  seis categorías de la constante —Petardos, Fosforos, Baterias, Estallos E
  Infantiles, Varios, Bombas— y NINGUNA de las seis tenía un producto a la
  vista. Seis links a "No encontramos nada", en el pie de todas las páginas.
*/
const catalogo = [
  { codigo: "1", nombre: "Torta", categoria: "Tortas" },
  { codigo: "2", nombre: "Bengala", categoria: "Bengalas" },
  { codigo: "3", nombre: "Mortero", categoria: "Morteros", estado: OCULTO },
];

const useProducts = vi.fn(() => ({ items: catalogo, loading: false }));

vi.mock("@/hooks/useProducts", () => ({
  useProducts: (...a) => useProducts(...a),
}));

const { default: Footer } = await import("@/components/Footer/Footer");

const montar = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

const linksDeCategorias = () =>
  [
    ...screen
      .getByRole("navigation", { name: "Categorías" })
      .querySelectorAll("a"),
  ].map((a) => a.textContent);

describe("Footer: los atajos de categorías", () => {
  it("solo enlaza categorías con productos a la vista", () => {
    montar();
    expect(linksDeCategorias()).toEqual(["Bengalas", "Tortas", "Ver todo"]);
  });

  it("no enlaza la categoría que solo tiene productos ocultos", () => {
    montar();
    expect(linksDeCategorias()).not.toContain("Morteros");
  });

  it("no enlaza una categoría de la constante que nadie cargó", () => {
    montar();
    expect(linksDeCategorias()).not.toContain("Petardos");
  });

  it("con el catálogo vacío deja solo Ver todo", () => {
    // Es lo que se ve mientras carga: ningún atajo es mejor que seis atajos
    // a la nada.
    useProducts.mockReturnValueOnce({ items: [], loading: true });
    montar();
    expect(linksDeCategorias()).toEqual(["Ver todo"]);
  });

  it("corta en seis: el pie es un atajo, no el catálogo", () => {
    useProducts.mockReturnValueOnce({
      items: [
        "Tortas",
        "Bengalas",
        "Candelas",
        "Morteros",
        "Volcanes",
        "Petardos",
        "Bombas",
        "Estrellitas",
      ].map((categoria, i) => ({ codigo: `${i}`, categoria })),
      loading: false,
    });
    montar();
    expect(linksDeCategorias()).toHaveLength(7); // seis + "Ver todo"
  });

  it("pide el catálogo completo, que es el que ya está en caché", () => {
    // Pedir una categoría acá sería una consulta nueva por cada página.
    montar();
    expect(useProducts).toHaveBeenCalledWith(undefined, { traerTodo: true });
  });
});
