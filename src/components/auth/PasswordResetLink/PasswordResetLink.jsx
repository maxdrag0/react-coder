import { useState } from "react";
import { enviarResetPassword } from "@/services/firebase/authFirebase";
import { mensajeDeErrorDeReset } from "@/constants/authErrors";
import FormError from "@/components/common/FormError/FormError";
import FormNotice from "@/components/common/FormNotice/FormNotice";
import "./PasswordResetLink.css";

// Texto unico para "existe" y "no existe" a proposito: confirmar que un email
// tiene cuenta convertiria esto en un detector de cuentas registradas.
const CONFIRMACION =
  "Si ese email tiene una cuenta, te enviamos un link para restablecer la contraseña. Revisá tu correo.";

const PasswordResetLink = () => {
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [confirmacion, setConfirmacion] = useState(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!email.trim()) {
      return setError("Escribí tu email.");
    }

    setEnviando(true);
    setError("");

    try {
      await enviarResetPassword(email.trim());
      setConfirmacion(CONFIRMACION);
    } catch (err) {
      // null = mostrar la confirmacion generica. auth/user-not-found cae
      // ahi a proposito, para no filtrar si la cuenta existe.
      const delPedido = mensajeDeErrorDeReset(err?.code);
      if (delPedido) setError(delPedido);
      else setConfirmacion(CONFIRMACION);
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) {
    return (
      <button type="button" className="reset-link" onClick={() => setAbierto(true)}>
        ¿Olvidaste tu contraseña?
      </button>
    );
  }

  if (confirmacion) return <FormNotice mensaje={confirmacion} />;

  return (
    <div className="reset-bloque">
      <FormError mensaje={error} />
      <div className="reset-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Tu email"
          aria-label="Email para restablecer la contraseña"
        />
        <button type="button" onClick={enviar} disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar link"}
        </button>
      </div>
    </div>
  );
};

export default PasswordResetLink;
