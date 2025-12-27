import { useState } from "react";
import FormularioContacto from "../../components/FormularioContacto/FormularioContacto";
import { services } from "../../services";
import "./Contact.css";
function Contact() {
  const [mensajeId, setMensajeId] = useState(null);

  const handleEnviarMensaje = async (datosDelFormulario) => {
    try {
      const id = await services.firebase.crearContacto(datosDelFormulario);
      setMensajeId(id);
      alert("¡Mensaje enviado con éxito! ID: " + id);
    } catch (error) {
      alert("No se pudo enviar el mensaje.");
    }
  };

  return (
    <div className="contact-page">
      <h1>Envianos un mensaje</h1>

      {mensajeId ? (
        <div className="success-msg">
          <h2>Gracias por contactarnos</h2>
          <p>
            Tu consulta ha sido registrada con el código: {mensajeId}. A la
            brevedad nos estaremos contactando.
          </p>
          <button
            onClick={() => setMensajeId(null)}
            style={{ padding: "10px" }}
          >
            Enviar otro mensaje
          </button>
        </div>
      ) : (
        <FormularioContacto onConfirm={handleEnviarMensaje} />
      )}
    </div>
  );
}

export default Contact;
