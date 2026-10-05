// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Item from "@/components/Item/Item";

const COMPLETO = {
  codigo: "201",
  nombre: "Torta 100 tiros",
  categoria: "Tortas",
  duracion: 45,
  precioUnitario: 4500,
  precioDisplay: 45000,
  precioBulto: 390000,
  stock: 87,
  fotoUrl: "https://ejemplo/foto.jpg",
};

const SIN_FOTO = { ...COMPLETO, fotoUrl: "" };

const montar = (item) =>
  render(
    <MemoryRouter>
      <Item item={item} />
    </MemoryRouter>
  );

describe("Item", () => {
  it("muestra el nombre, la categoría y la duración", () => {
    montar(COMPLETO);
    expect(screen.getByText("Torta 100 tiros")).toBeInTheDocument();
    expect(screen.getByText(/Tortas/)).toBeInTheDocument();
    expect(screen.getByText(/45 seg/)).toBeInTheDocument();
  });

  it("muestra los tres precios", () => {
    montar(COMPLETO);
    expect(screen.getByText("$4.500")).toBeInTheDocument();
    expect(screen.getByText("$45.000")).toBeInTheDocument();
    expect(screen.getByText("$390.000")).toBeInTheDocument();
  });

  it("la card entera es un link al detalle", () => {
    montar(COMPLETO);
    const link = screen.getByRole("link", { name: /Torta 100 tiros/ });
    expect(link).toHaveAttribute("href", "/product/201");
  });

  it("NO renderiza una imagen con src vacío cuando no hay foto", () => {
    const { container } = montar(SIN_FOTO);
    container.querySelectorAll("img").forEach((img) => {
      expect(img.getAttribute("src")).not.toBe("");
    });
  });

  it("muestra el placeholder de marca cuando no hay foto", () => {
    const { container } = montar(SIN_FOTO);
    expect(container.querySelector(".media-vacio")).toBeInTheDocument();
  });

  it("no muestra el cartel 'No Image'", () => {
    montar(SIN_FOTO);
    expect(screen.queryByText(/no image/i)).not.toBeInTheDocument();
  });

  it("muestra solo el precio unitario si no hay display ni bulto", () => {
    montar({ ...COMPLETO, precioDisplay: null, precioBulto: null });
    expect(screen.getByText("$4.500")).toBeInTheDocument();
    expect(screen.queryByText(/bulto/i)).not.toBeInTheDocument();
  });

  it("deja que el texto largo se corte en vez de desbordar", () => {
    const { container } = montar({
      ...COMPLETO,
      nombre: "Petardo El Villerito Nacional Extra Largo De Prueba Para Desborde",
    });
    expect(container.querySelector(".item-titulo")).toBeInTheDocument();
  });

  it("tolera un producto sin duración", () => {
    montar({ ...COMPLETO, duracion: null });
    expect(screen.getByText("Torta 100 tiros")).toBeInTheDocument();
    expect(screen.queryByText(/null|undefined/)).not.toBeInTheDocument();
  });

  it("acepta el esquema en inglés igual que el de castellano", () => {
    montar({ codigo: "9", name: "Mortero", price: 1200, stock: 4 });
    expect(screen.getByText("Mortero")).toBeInTheDocument();
    expect(screen.getByText("$1.200")).toBeInTheDocument();
  });

  it("marca el stock bajo", () => {
    montar({ ...COMPLETO, stock: 4 });
    expect(screen.getByText(/últimas 4/i)).toBeInTheDocument();
  });
});
