// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Precio from "@/components/common/Precio/Precio";

describe("Precio", () => {
  it("muestra los tres niveles cuando los tres existen", () => {
    render(<Precio unitario={4500} display={45000} bulto={390000} />);
    expect(screen.getByText("$4.500")).toBeInTheDocument();
    expect(screen.getByText("$45.000")).toBeInTheDocument();
    expect(screen.getByText("$390.000")).toBeInTheDocument();
  });

  it("muestra SOLO la unidad cuando no hay display ni bulto", () => {
    render(<Precio unitario={270} display={null} bulto={null} />);
    expect(screen.getByText("$270")).toBeInTheDocument();
    expect(screen.queryByText(/display/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bulto/i)).not.toBeInTheDocument();
  });

  it("nunca renderiza el texto undefined", () => {
    const { container } = render(<Precio unitario={270} />);
    expect(container.textContent).not.toMatch(/undefined|NaN|\$null/);
  });

  it("omite el bulto pero muestra el display si solo falta uno", () => {
    render(<Precio unitario={270} display={27000} bulto={null} />);
    expect(screen.getByText("$27.000")).toBeInTheDocument();
    expect(screen.queryByText(/bulto/i)).not.toBeInTheDocument();
  });

  it("muestra el multiplicador de cada nivel", () => {
    render(<Precio unitario={270} display={27000} bulto={270000} />);
    expect(screen.getByText("×100")).toBeInTheDocument();
    expect(screen.getByText("×1000")).toBeInTheDocument();
  });

  it("no explota si el unitario tampoco existe", () => {
    const { container } = render(<Precio unitario={null} />);
    expect(container.textContent).not.toMatch(/undefined|NaN/);
  });

  it("en modo compacto muestra solo unidad y bulto", () => {
    render(<Precio unitario={270} display={27000} bulto={270000} compacto />);
    expect(screen.getByText("$270")).toBeInTheDocument();
    expect(screen.getByText("$270.000")).toBeInTheDocument();
    expect(screen.queryByText("$27.000")).not.toBeInTheDocument();
  });
});
