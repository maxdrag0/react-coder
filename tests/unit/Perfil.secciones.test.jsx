// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

/*
  El perfil tenía todo en una sola página: los datos, las preferencias, la
  lista entera de pedidos con sus renglones y, al final de todo, cerrar
  sesión. Con unos pocos pedidos eso es una página larguísima en la que hay
  que scrollear para hacer cualquier cosa.
*/
const useAuthMock = vi.fn();
vi.mock("@/contexts/auth/useAuth", () => ({ useAuth: () => useAuthMock() }));

vi.mock("@/hooks/usePerfil", () => ({
  usePerfil: () => ({
    perfil: { telefono: "1123456789" },
    cargando: false,
    guardar: vi.fn(),
  }),
}));

vi.mock("@/contexts/theme/useTheme", () => ({
  useTheme: () => ({ themeMode: "oscuro", setThemeMode: vi.fn() }),
}));

vi.mock("@/services/firebase/authFirebase", () => ({ logoutUser: vi.fn() }));

vi.mock("@/components/auth/VerificacionPendiente/VerificacionPendiente", () => ({
  default: () => null,
}));

vi.mock("@/pages/Profile/MisPedidos", () => ({
  default: () => <p>acá van los pedidos</p>,
}));

const { default: Profile } = await import("@/pages/Profile/Profile");

const montar = () => {
  useAuthMock.mockReturnValue({
    user: {
      uid: "u1",
      email: "cliente@test.com",
      displayName: "Cliente",
      emailVerified: true,
    },
    isAdmin: false,
    loading: false,
  });
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
};

const pedidos = () => screen.queryByText("acá van los pedidos");
const solapaPedidos = () => screen.getByRole("tab", { name: /pedidos/i });
const solapaDatos = () => screen.getByRole("tab", { name: /datos/i });

beforeEach(() => vi.clearAllMocks());

describe("Perfil: los pedidos viven en su propia solapa", () => {
  it("abre en los datos, sin la lista de pedidos abajo", () => {
    montar();
    expect(screen.getByLabelText(/tel[eé]fono/i)).toBeInTheDocument();
    expect(pedidos()).toBeNull();
  });

  it("cerrar sesión está con los datos, no suelto al final de todo", () => {
    montar();
    expect(
      screen.getByRole("button", { name: /cerrar sesi[oó]n/i }),
    ).toBeInTheDocument();
  });

  it("muestra los pedidos al elegir esa solapa", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(solapaPedidos());

    expect(pedidos()).toBeInTheDocument();
    expect(screen.queryByLabelText(/tel[eé]fono/i)).toBeNull();
  });

  it("vuelve a los datos", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(solapaPedidos());
    await usuario.click(solapaDatos());

    expect(screen.getByLabelText(/tel[eé]fono/i)).toBeInTheDocument();
    expect(pedidos()).toBeNull();
  });

  it("dice cuál está elegida", () => {
    // Dos solapas sin marcar cuál está activa son dos botones que no se
    // sabe qué hicieron.
    montar();
    expect(solapaDatos()).toHaveAttribute("aria-selected", "true");
    expect(solapaPedidos()).toHaveAttribute("aria-selected", "false");
  });

  it("el nombre y el mail se ven en las dos", async () => {
    // La cabecera es quién sos: no es parte de ninguna de las dos solapas.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(solapaPedidos());
    expect(screen.getByText("cliente@test.com")).toBeInTheDocument();
  });
});
