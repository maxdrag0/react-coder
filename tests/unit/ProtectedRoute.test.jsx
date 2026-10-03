// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const useAuthMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => useAuthMock() }));

const { default: ProtectedRoute } = await import("@/components/ProtectedRoute/ProtectedRoute");

function montar({ ruta = "/admin", auth }) {
  useAuthMock.mockReturnValue(auth);
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<p>pantalla de login</p>} />
        <Route path="/" element={<p>pantalla de inicio</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<p>pantalla de perfil</p>} />
        </Route>
        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="/admin" element={<p>panel de admin</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("NO expulsa a un admin mientras la sesión todavía está cargando", () => {
    // Review Focus #1: al refrescar /admin, AuthContext arranca con
    // loading:true y user:null. Decidir ahí echa a un admin válido.
    montar({ auth: { user: null, isAdmin: false, loading: true } });
    expect(screen.queryByText("pantalla de login")).not.toBeInTheDocument();
    expect(screen.queryByText("panel de admin")).not.toBeInTheDocument();
  });

  it("manda al login a un visitante no autenticado", () => {
    montar({ ruta: "/profile", auth: { user: null, isAdmin: false, loading: false } });
    expect(screen.getByText("pantalla de login")).toBeInTheDocument();
  });

  it("deja pasar a un usuario autenticado a una ruta que solo pide sesión", () => {
    montar({
      ruta: "/profile",
      auth: { user: { uid: "u1" }, isAdmin: false, loading: false },
    });
    expect(screen.getByText("pantalla de perfil")).toBeInTheDocument();
  });

  it("manda al inicio a un usuario autenticado que NO es admin", () => {
    montar({ auth: { user: { uid: "u1" }, isAdmin: false, loading: false } });
    expect(screen.getByText("pantalla de inicio")).toBeInTheDocument();
    expect(screen.queryByText("panel de admin")).not.toBeInTheDocument();
  });

  it("deja pasar al admin", () => {
    montar({ auth: { user: { uid: "max" }, isAdmin: true, loading: false } });
    expect(screen.getByText("panel de admin")).toBeInTheDocument();
  });

  it("no monta el componente protegido mientras carga (no dispara sus fetch)", () => {
    montar({ auth: { user: { uid: "max" }, isAdmin: true, loading: true } });
    expect(screen.queryByText("panel de admin")).not.toBeInTheDocument();
  });
});
