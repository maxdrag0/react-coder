import { useState } from "react";
import FormularioContacto from "../../components/FormularioContacto/FormularioContacto";
import FormError from "../../components/common/FormError/FormError";
import FormNotice from "../../components/common/FormNotice/FormNotice";
import { services } from "../../services";
import "./Contact.css";

function Contact() {
  const [mensajeId, setMensajeId] = useState(null);
  const [error, setError] = useState("");

  const handleEnviarMensaje = async (datosDelFormulario) => {
    setError("");
    try {
      const id = await services.firebase.crearContacto(datosDelFormulario);
      setMensajeId(id);
    } catch {
      // El alert() no decía nada útil y bloqueaba la página.
      setError(
        "No pudimos enviar tu mensaje. Revisá tu conexión y probá de nuevo."
      );
    }
  };

  return (
    <div className="contacto">
      <header>
        <h1>Escribinos</h1>
        <p className="contacto-bajada">
          Contanos qué necesitás y te respondemos a la brevedad.
        </p>
      </header>

      {mensajeId ? (
        <div className="contacto-enviado">
          <FormNotice mensaje="Recibimos tu mensaje. Te respondemos a la brevedad." />
          <p className="contacto-bajada">
            Código de seguimiento: <strong>{mensajeId}</strong>
          </p>
          <button
            type="button"
            className="boton boton-secundario"
            onClick={() => setMensajeId(null)}
          >
            Enviar otro mensaje
          </button>
        </div>
      ) : (
        <>
          <FormError mensaje={error} />
          <FormularioContacto onConfirm={handleEnviarMensaje} />
        </>
      )}
    </div>
  );
}

export default Contact;
