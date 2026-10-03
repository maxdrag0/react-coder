// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const enviarResetPasswordMock = vi.fn();
vi.mock("@/services/firebase/authFirebase", () => ({
  enviarResetPassword: (...args) => enviarResetPasswordMock(...args),
}));

const { default: PasswordResetLink } = await import(
  "@/components/auth/PasswordResetLink/PasswordResetLink"
);

// Qué mensaje corresponde a cada código de error se testea como función pura
// en authErrors.test.js (mensajeDeErrorDeReset). Acá se cubre lo que solo se
// ve en el componente: que no se llame al servicio con el campo vacío, y que
// la confirmación se muestre como aviso y no como error.
async function pedirReset(email) {
  const user = userEvent.setup();
  render(<PasswordResetLink />);
  await user.click(screen.getByRole("button", { name: /olvidaste tu contraseña/i }));

  if (email) {
    await user.type(screen.getByLabelText(/email para restablecer/i), email);
  }

  await user.click(screen.getByRole("button", { name: /enviar link/i }));
  await new Promise((resolver) => setTimeout(resolver, 0));
}

describe("PasswordResetLink", () => {
  it("no llama al servicio ni dice que envió nada si el campo está vacío", async () => {
    // Important 4 de la revisión: sin el `required` del form, apretar
    // "Enviar link" sin escribir mandaba sendPasswordResetEmail("") ->
    // auth/invalid-email -> el catch lo tragaba -> "te enviamos un link".
    // La persona esperaba un mail que nunca se pidió y seguía afuera.
    enviarResetPasswordMock.mockResolvedValue(undefined);
    await pedirReset(null);

    expect(enviarResetPasswordMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/te enviamos un link/i)).not.toBeInTheDocument();
    expect(screen.getByText(/escribí tu email/i)).toBeInTheDocument();
  });

  it("tampoco llama al servicio si el campo tiene solo espacios", async () => {
    enviarResetPasswordMock.mockResolvedValue(undefined);
    await pedirReset("   ");

    expect(enviarResetPasswordMock).not.toHaveBeenCalled();
    expect(screen.getByText(/escribí tu email/i)).toBeInTheDocument();
  });

  it("manda el email sin espacios de los extremos", async () => {
    enviarResetPasswordMock.mockResolvedValue(undefined);
    await pedirReset("  ana@mail.com  ");

    expect(enviarResetPasswordMock).toHaveBeenCalledWith("ana@mail.com");
  });

  it("confirma el envío cuando sale bien", async () => {
    enviarResetPasswordMock.mockResolvedValue(undefined);
    await pedirReset("ana@mail.com");

    expect(screen.getByText(/si ese email tiene una cuenta/i)).toBeInTheDocument();
  });

  it("muestra la confirmación como aviso de éxito, no como error", async () => {
    // El mensaje de éxito se renderizaba con FormError: fondo rojo de
    // --danger-bg y role="alert". Una persona encerrada afuera lo lee como
    // "falló" justo cuando necesita saber que salió bien.
    enviarResetPasswordMock.mockResolvedValue(undefined);
    await pedirReset("ana@mail.com");

    const confirmacion = screen.getByText(/si ese email tiene una cuenta/i);
    expect(confirmacion).not.toHaveClass("form-error");
    expect(confirmacion.closest('[role="alert"]')).toBeNull();
  });
});
