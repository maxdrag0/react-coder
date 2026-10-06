// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, isAdmin: false, loading: false }),
}));

// El carrito y el logo no participan de la navegación que se prueba acá.
vi.mock("@/components/NavBar/CartMenu/CartMenu", () => ({ default: () => null }));
vi.mock("@/components/NavBar/Logo/Logo", () => ({ default: () => null }));

const { default: NavBar } = await import("@/components/NavBar/NavBar");

// Hay dos juegos de links (escritorio y panel de celular); el primero sirve.
const link = (nombre) => screen.getAllByRole("link", { name: nombre })[0];

function montar(ruta = "/") {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <NavBar />
      <Routes>
        <Route path="/" element={<p>pantalla de inicio</p>} />
        <Route path="/products" element={<p>pantalla de productos</p>} />
        <Route path="/contact" element={<p>pantalla de contacto</p>} />
        <Route path="/login" element={<p>pantalla de login</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("NavBar: el buscador no secuestra la navegación", () => {
  // `navigate` de react-router cambia de identidad en cada cambio de ruta,
  // así que un efecto que lo tiene en sus dependencias Y navega vuelve a
  // disparar en cada navegación. Eso dejaba la app clavada en /products.

  it("deja ir a contacto", async () => {
    const usuario = userEvent.setup();
    montar("/");
    await usuario.click(link("Contacto"));
    expect(screen.getByText("pantalla de contacto")).toBeInTheDocument();
  });

  it("deja ir al login", async () => {
    const usuario = userEvent.setup();
    montar("/");
    await usuario.click(link("Ingresar"));
    expect(screen.getByText("pantalla de login")).toBeInTheDocument();
  });

  it("deja salir de productos, que era el punto fijo del bug", async () => {
    const usuario = userEvent.setup();
    montar("/products");
    await usuario.click(link("Inicio"));
    expect(screen.getByText("pantalla de inicio")).toBeInTheDocument();
  });

  it("sigue llevando a productos cuando el usuario escribe", async () => {
    const usuario = userEvent.setup();
    montar("/");
    await usuario.type(
      screen.getByRole("searchbox", { name: "Buscar productos" }),
      "cohete"
    );
    await waitFor(() =>
      expect(screen.getByText("pantalla de productos")).toBeInTheDocument()
    );
  });
});
