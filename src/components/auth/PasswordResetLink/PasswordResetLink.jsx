import { useState } from "react";
import { enviarResetPassword } from "@/services/firebase/authFirebase";
import FormError from "@/components/common/FormError/FormError";
import "./PasswordResetLink.css";

// Mensaje unico a proposito: confirmar que un email existe convertiria
// esto en un detector de cuentas registradas.
const CONFIRMACION =
  "Si ese email tiene una cuenta, te enviamos un link para restablecer la contraseña. Revisá tu correo.";

const PasswordResetLink = () => {
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await enviarResetPassword(email);
    } catch {
      // Se ignora a proposito: el mensaje es el mismo exista o no la cuenta.
      // Mostrar auth/user-not-found revelaria que emails estan registrados.
    }
    setEstado(CONFIRMACION);
    setEnviando(false);
  };

  if (!abierto) {
    return (
      <button type="button" className="reset-link" onClick={() => setAbierto(true)}>
        ¿Olvidaste tu contraseña?
      </button>
    );
  }

  if (estado) return <FormError mensaje={estado} />;

  return (
    <div className="reset-form">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Tu email"
        aria-label="Email para restablecer la contraseña"
        required
      />
      <button type="button" onClick={enviar} disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar link"}
      </button>
    </div>
  );
};

export default PasswordResetLink;
