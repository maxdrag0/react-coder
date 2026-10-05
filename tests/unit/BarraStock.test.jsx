// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BarraStock from "@/components/common/BarraStock/BarraStock";

describe("BarraStock", () => {
  it("dice el número de unidades, no solo el color", () => {
    render(<BarraStock stock={87} />);
    expect(screen.getByText(/87/)).toBeInTheDocument();
  });

  it("marca el stock bajo con texto y no solo con color", () => {
    render(<BarraStock stock={5} />);
    expect(screen.getByText(/últimas|ultimas/i)).toBeInTheDocument();
  });

  it("dice 'sin stock' cuando el stock es 0", () => {
    render(<BarraStock stock={0} />);
    expect(screen.getByText(/sin stock/i)).toBeInTheDocument();
  });

  it("no renderiza una barra con ancho negativo si el stock es negativo", () => {
    const { container } = render(<BarraStock stock={-5} />);
    expect(container.querySelector(".barra-relleno").style.width).toBe("0%");
  });

  it("limita la barra al 100% si el stock supera el máximo", () => {
    const { container } = render(<BarraStock stock={500} maximo={100} />);
    expect(container.querySelector(".barra-relleno").style.width).toBe("100%");
  });

  it("expone el estado por aria para lectores de pantalla", () => {
    render(<BarraStock stock={87} maximo={100} />);
    const barra = screen.getByRole("meter");
    expect(barra).toHaveAttribute("aria-valuenow", "87");
    expect(barra).toHaveAttribute("aria-valuemax", "100");
  });

  it("no explota si el stock es undefined", () => {
    const { container } = render(<BarraStock />);
    expect(container.textContent).not.toMatch(/undefined|NaN/);
  });
});
