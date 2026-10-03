import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { reenviarVerificacion } from "@/services/firebase/authFirebase";
import "./VerificacionPendiente.css";

const VerificacionPendiente = () => {
  const { user } = useAuth();
  const [estado, setEstado] = useState(null);

  // Los usuarios de Google llegan con el email ya verificado por Google.
  if (!user || user.emailVerified) return null;

  const reenviar = async () => {
    try {
      await reenviarVerificacion();
      setEstado("Te reenviamos el mail. Revisá tu correo.");
    } catch {
      setEstado("No pudimos reenviarlo. Esperá unos minutos y probá de nuevo.");
    }
  };

  return (
    <div className="verificacion-pendiente" role="status">
      <p>Tu email todavía no está verificado. Vas a necesitarlo para enviar un pedido.</p>
      {estado ? (
        <p className="verificacion-estado">{estado}</p>
      ) : (
        <button type="button" onClick={reenviar}>
          Reenviar el mail de verificación
        </button>
      )}
    </div>
  );
};

export default VerificacionPendiente;
