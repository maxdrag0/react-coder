// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const useAuthMock = vi.fn();
vi.mock("@/contexts/auth/useAuth", () => ({ useAuth: () => useAuthMock() }));

const usePerfilMock = vi.fn();
vi.mock("@/hooks/usePerfil", () => ({ usePerfil: () => usePerfilMock() }));

vi.mock("@/contexts/theme/useTheme", () => ({
  useTheme: () => ({ themeMode: "oscuro", setThemeMode: vi.fn() }),
}));

vi.mock("@/services/firebase/authFirebase", () => ({
  logoutUser: vi.fn(),
}));

vi.mock(
  "@/components/auth/VerificacionPendiente/VerificacionPendiente",
  () => ({
    default: () => null,
  }),
);

vi.mock("@/pages/Profile/MisPedidos", () => ({
  default: () => <p>mis pedidos</p>,
}));

const { default: Profile } = await import("@/pages/Profile/Profile");

const guardarMock = vi.fn();

const montar = (perfil = {}) => {
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
  usePerfilMock.mockReturnValue({
    perfil,
    cargando: false,
    guardar: guardarMock,
  });

  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
};

beforeEach(() => {
  guardarMock.mockReset().mockResolvedValue(undefined);
});

/*
  La dirección se pide en el carrito la primera vez, pero después hay que
  poder cambiarla sin tener que hacer un pedido: la gente se muda.
*/
describe("Perfil: la dirección de envío", () => {
  it("muestra lo que ya está guardado", () => {
    montar({ direccion: "San Martín 742", ciudad: "Córdoba" });
    expect(screen.getByLabelText(/direcci[oó]n/i)).toHaveValue(
      "San Martín 742",
    );
    expect(screen.getByLabelText(/ciudad/i)).toHaveValue("Córdoba");
  });

  it("deja guardar una dirección nueva", async () => {
    const usuario = userEvent.setup();
    montar({ direccion: "San Martín 742", ciudad: "Córdoba" });

    const campo = screen.getByLabelText(/direcci[oó]n/i);
    await usuario.clear(campo);
    await usuario.type(campo, "Ruta 5 km 12");
    await usuario.click(screen.getAllByRole("button", { name: /guardar/i })[1]);

    await waitFor(() =>
      expect(guardarMock).toHaveBeenCalledWith({ direccion: "Ruta 5 km 12" }),
    );
  });

  it("no guarda una dirección que no sirve", async () => {
    const usuario = userEvent.setup();
    montar({ direccion: "San Martín 742", ciudad: "Córdoba" });

    const campo = screen.getByLabelText(/direcci[oó]n/i);
    await usuario.clear(campo);
    await usuario.type(campo, "1234");
    await usuario.click(screen.getAllByRole("button", { name: /guardar/i })[1]);

    expect(guardarMock).not.toHaveBeenCalled();
    expect(screen.getByText(/escrib[ií] la calle/i)).toBeInTheDocument();
  });

  it("el teléfono sigue funcionando igual", async () => {
    const usuario = userEvent.setup();
    montar({ telefono: "1123456789" });

    const campo = screen.getByLabelText(/tel[eé]fono/i);
    await usuario.clear(campo);
    await usuario.type(campo, "11 2345-6789");
    await usuario.click(screen.getAllByRole("button", { name: /guardar/i })[0]);

    await waitFor(() =>
      expect(guardarMock).toHaveBeenCalledWith({ telefono: "1123456789" }),
    );
  });
});
