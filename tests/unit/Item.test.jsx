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

const conModelos = (cuantos) => ({
  codigo: "H02",
  nombre: "Bengala de humo",
  modelos: Array.from({ length: cuantos }, (_, i) => ({
    id: `m${i}`,
    etiqueta: `Color ${i}`,
    presentaciones: { unitario: { precio: 8000 + i * 1000 } },
  })),
});

const montar = (item) =>
  render(
    <MemoryRouter>
      <Item item={item} />
    </MemoryRouter>,
  );

describe("Item: qué muestra", () => {
  it("muestra el nombre", () => {
    montar(COMPLETO);
    expect(screen.getByText("Torta 100 tiros")).toBeInTheDocument();
  });

  it("NO muestra marca, categoría ni duración", () => {
    // Se quitaron de la card a propósito: en una grilla son datos que no
    // deciden nada. Viven en el detalle, con la descripción.
    montar({ ...COMPLETO, marca: "Punto Austral" });
    expect(screen.queryByText(/Tortas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/45 seg/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Punto Austral/)).not.toBeInTheDocument();
  });

  it("NO muestra el stock", () => {
    // Mientras no esté definido si el stock se cuenta por unidad, display o
    // bulto, cualquier número sería engañoso.
    montar({ ...COMPLETO, stock: 4 });
    expect(screen.queryByText(/stock|últimas/i)).not.toBeInTheDocument();
  });

  it("la card entera es un link al detalle", () => {
    montar(COMPLETO);
    expect(
      screen.getByRole("link", { name: /Torta 100 tiros/ }),
    ).toHaveAttribute("href", "/product/201");
  });
});

describe("Item: el precio", () => {
  it("destaca el de por unidad y pone el resto en una línea chica", () => {
    // Tres filas de etiqueta y valor pesaban demasiado en una grilla, y como
    // el número de filas cambia por producto, cada card terminaba a una
    // altura distinta.
    const { container } = montar(COMPLETO);

    expect(container.querySelector(".precio-principal").textContent).toContain(
      "4.500",
    );

    const otras = container.querySelector(".precio-otras").textContent;
    expect(otras).toContain("45.000");
    expect(otras).toContain("390.000");
  });

  it("sin display ni bulto no renderiza la línea chica", () => {
    const { container } = montar({
      ...COMPLETO,
      precioDisplay: null,
      precioBulto: null,
    });
    expect(container.querySelector(".precio-principal").textContent).toContain(
      "4.500",
    );
    expect(container.querySelector(".precio-otras")).toBeNull();
  });

  it("acepta el `price` del esquema viejo, que todavia no se migro", () => {
    const { container } = montar({
      codigo: "9",
      nombre: "Mortero",
      price: 1200,
    });
    expect(screen.getByText("Mortero")).toBeInTheDocument();
    expect(container.querySelector(".precio-principal").textContent).toContain(
      "1.200",
    );
  });

  it("con modelos de precios distintos dice 'desde'", () => {
    montar(conModelos(3));
    expect(screen.getByText("desde")).toBeInTheDocument();
  });
});

describe("Item: los sellos sobre la foto", () => {
  it("avisa cuántos modelos tiene, que es la razón para entrar", () => {
    montar(conModelos(2));
    expect(screen.getByText("2 modelos")).toBeInTheDocument();
  });

  it("con un solo modelo no avisa nada: no hay nada que elegir", () => {
    montar(conModelos(1));
    expect(screen.queryByText(/modelos/)).not.toBeInTheDocument();
  });

  it("marca el producto sin stock", () => {
    montar({ ...COMPLETO, estado: "sin_stock" });
    expect(screen.getByText("Sin stock")).toBeInTheDocument();
  });

  it("un producto activo no lleva sello de stock", () => {
    montar({ ...COMPLETO, estado: "activo" });
    expect(screen.queryByText("Sin stock")).not.toBeInTheDocument();
  });
});

describe("Item: sin foto", () => {
  it("NO renderiza una imagen con src vacío", () => {
    const { container } = montar(SIN_FOTO);
    container.querySelectorAll("img").forEach((img) => {
      expect(img.getAttribute("src")).not.toBe("");
    });
  });

  it("muestra el placeholder de marca", () => {
    const { container } = montar(SIN_FOTO);
    expect(container.querySelector(".media-vacio")).toBeInTheDocument();
  });

  it("no muestra el cartel 'No Image'", () => {
    montar(SIN_FOTO);
    expect(screen.queryByText(/no image/i)).not.toBeInTheDocument();
  });
});

describe("Item: texto largo", () => {
  it("deja que el nombre se corte en vez de desbordar", () => {
    const { container } = montar({
      ...COMPLETO,
      nombre:
        "Petardo El Villerito Nacional Extra Largo De Prueba Para Desborde",
    });
    expect(container.querySelector(".item-titulo")).toBeInTheDocument();
  });

  it("tolera un producto sin duración, sin imprimir null", () => {
    montar({ ...COMPLETO, duracion: null });
    expect(screen.getByText("Torta 100 tiros")).toBeInTheDocument();
    expect(screen.queryByText(/null|undefined/)).not.toBeInTheDocument();
  });
});
