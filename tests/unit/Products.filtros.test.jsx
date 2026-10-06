// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const CATALOGO = [
  { codigo: "1", nombre: "Cohete Alfa", marca: "Punto Austral", precioUnitario: 100 },
  { codigo: "2", nombre: "Cohete Beta", marca: "Punto Austral", precioUnitario: 200 },
  { codigo: "3", nombre: "Torta Gamma", marca: "Cienfuegos", precioUnitario: 300 },
  { codigo: "4", nombre: "Petardo Delta", precioUnitario: 400 },
];

vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({ items: CATALOGO, loading: false }),
}));

vi.mock("@/components/ItemListContainer/ItemListContainer", () => ({
  default: ({ items }) => <p>{items.length} en la grilla</p>,
}));

const { default: Products } = await import("@/pages/Products/Products");

function montar() {
  render(
    <MemoryRouter initialEntries={["/products"]}>
      <Routes>
        <Route path="/products" element={<Products />} />
      </Routes>
    </MemoryRouter>
  );
}

const casillaDe = (marca) =>
  screen.getByRole("checkbox", { name: new RegExp(marca) });

const cuentaDe = (marca) =>
  casillaDe(marca).closest("label").querySelector(".filtro-cuenta").textContent;

const enLaGrilla = () => screen.getByText(/en la grilla/).textContent;

describe("Products: conteo por marca en los filtros", () => {
  it("dice cuántos productos aporta cada marca", () => {
    montar();
    expect(cuentaDe("Punto Austral")).toBe("2");
    expect(cuentaDe("Cienfuegos")).toBe("1");
    expect(cuentaDe("Sin marca")).toBe("1");
  });

  it("no cambia el conteo de una marca al tildar otra", async () => {
    // Es el comportamiento que hace útil al conteo: querés saber cuánto
    // suma Punto Austral ANTES de tildarla, con Cienfuegos ya tildada.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(casillaDe("Cienfuegos"));

    expect(enLaGrilla()).toBe("1 en la grilla");
    expect(cuentaDe("Punto Austral")).toBe("2");
    expect(cuentaDe("Sin marca")).toBe("1");
  });

  it("ajusta el conteo a la búsqueda", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.type(
      screen.getByRole("searchbox", { name: "Buscar productos en el catálogo" }),
      "Cohete"
    );

    expect(cuentaDe("Punto Austral")).toBe("2");
    expect(cuentaDe("Cienfuegos")).toBe("0");
  });

  it("apaga la marca que no tiene resultados en vez de esconderla", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.type(
      screen.getByRole("searchbox", { name: "Buscar productos en el catálogo" }),
      "Cohete"
    );

    expect(casillaDe("Cienfuegos").closest("label")).toHaveClass("filtro-check-vacia");
    expect(casillaDe("Punto Austral").closest("label")).not.toHaveClass(
      "filtro-check-vacia"
    );
  });
});
