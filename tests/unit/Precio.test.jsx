// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Precio from "@/components/common/Precio/Precio";

// Esquema viejo: los 323 productos cargados.
const viejo = (unitario, display = null, bulto = null) => ({
  precioUnitario: unitario,
  precioDisplay: display,
  precioBulto: bulto,
});

describe("Precio: qué filas muestra", () => {
  it("muestra las tres cuando las tres son distintas", () => {
    render(<Precio item={viejo(4500, 45000, 390000)} />);
    expect(screen.getByText("unidad")).toBeInTheDocument();
    expect(screen.getByText("display")).toBeInTheDocument();
    expect(screen.getByText("bulto")).toBeInTheDocument();
  });

  it("con solo el unitario muestra una sola fila", () => {
    const { container } = render(<Precio item={viejo(270)} />);
    expect(container.querySelectorAll(".precio-fila")).toHaveLength(1);
  });

  it("no renderiza nada si no hay ningún precio", () => {
    const { container } = render(<Precio item={viejo(null)} />);
    expect(container.querySelector(".precio")).toBeNull();
  });

  it("descarta la presentación con el precio repetido del unitario", () => {
    // 171 productos tienen precioDisplay igual al unitario: repetir la misma
    // cifra en dos filas no dice nada.
    render(<Precio item={viejo(270, 270, 270000)} />);
    expect(screen.queryByText("display")).toBeNull();
    expect(screen.getByText("bulto")).toBeInTheDocument();
  });

  it("en modo compacto esconde el display", () => {
    render(<Precio item={viejo(270, 27000, 270000)} compacto />);
    expect(screen.queryByText("display")).toBeNull();
    expect(screen.getByText("bulto")).toBeInTheDocument();
  });

  it("no explota sin producto", () => {
    const { container } = render(<Precio item={undefined} />);
    expect(container.querySelector(".precio")).toBeNull();
  });
});

describe("Precio: la cantidad que trae", () => {
  it("la muestra cuando el producto la dice", () => {
    render(
      <Precio
        item={{
          presentaciones: {
            unitario: { precio: 8000 },
            display: { precio: 15000, unidades: 5 },
          },
        }}
      />
    );
    expect(screen.getByText("×5")).toBeInTheDocument();
  });

  it("NO inventa la cantidad cuando el producto no la dice", () => {
    // Es el bug: 15000/8000 redondeaba a 2 y el display traía 5. Mostrar un
    // número equivocado es peor que no mostrar ninguno.
    const { container } = render(<Precio item={viejo(8000, 15000)} />);
    expect(container.querySelector(".precio-mult")).toBeNull();
    expect(screen.getByText("display")).toBeInTheDocument();
  });
});
