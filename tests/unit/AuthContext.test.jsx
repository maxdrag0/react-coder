// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const onAuthStateChangedMock = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args) => onAuthStateChangedMock(...args),
}));
vi.mock("@/utils/firebase", () => ({ auth: {} }));

const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");

function Sonda() {
  const { isAdmin, loading, user } = useAuth();
  if (loading) return <p>cargando</p>;
  return (
    <p data-testid="resultado">
      {user ? user.email : "sin-usuario"}|{isAdmin ? "admin" : "comprador"}
    </p>
  );
}

function usuarioFalso({ claims = {} } = {}) {
  return {
    uid: "u1",
    email: "ana@mail.com",
    getIdTokenResult: vi.fn().mockResolvedValue({ claims }),
  };
}

function montarCon(usuario) {
  onAuthStateChangedMock.mockImplementation((_auth, callback) => {
    callback(usuario);
    return () => {};
  });
  render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>
  );
}

beforeEach(() => { onAuthStateChangedMock.mockReset(); });
afterEach(() => { vi.clearAllMocks(); });

describe("AuthContext", () => {
  it("marca isAdmin cuando el token trae el claim admin", async () => {
    montarCon(usuarioFalso({ claims: { admin: true } }));
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("ana@mail.com|admin")
    );
  });

  it("NO marca isAdmin cuando el token no trae el claim (token viejo)", async () => {
    // Review Focus #2: claim recién asignado, token de hasta una hora sin él.
    montarCon(usuarioFalso({ claims: {} }));
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("ana@mail.com|comprador")
    );
  });

  it("NO marca isAdmin cuando el claim es el string 'true' y no el booleano", async () => {
    montarCon(usuarioFalso({ claims: { admin: "true" } }));
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("comprador")
    );
  });

  it("deja isAdmin en false si no hay usuario", async () => {
    montarCon(null);
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("sin-usuario|comprador")
    );
  });

  it("no deja la app colgada en loading si getIdTokenResult falla", async () => {
    const roto = {
      uid: "u1",
      email: "ana@mail.com",
      getIdTokenResult: vi.fn().mockRejectedValue(new Error("red caída")),
    };
    montarCon(roto);
    await waitFor(() =>
      expect(screen.getByTestId("resultado")).toHaveTextContent("comprador")
    );
  });
});
