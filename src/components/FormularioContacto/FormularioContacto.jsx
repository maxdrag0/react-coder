import "./FormularioContacto.css";
import { useState } from "react";
import { MENSAJE_MAXIMO } from "@/constants/limites";

function FormularioContacto({ onConfirm }) {
  const [formData, setFormData] = useState({
    email: "",
    direccion: "",
    ciudad: "",
    mensaje: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <div className="form-container">
      <form className="formulario-contacto" onSubmit={handleSubmit}>
        <input className="campo-control"
          type="email"
          name="email"
          placeholder="juan@hotmail.com"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input className="campo-control"
          type="text"
          name="direccion"
          placeholder="Dirección"
          value={formData.direccion}
          onChange={handleChange}
          required
        />

        <input className="campo-control"
          type="text"
          name="ciudad"
          placeholder="Ciudad"
          value={formData.ciudad}
          onChange={handleChange}
          required
        />

        {/* maxLength tiene que coincidir con el limite de firestore.rules:
            sin esto, una consulta larga se escribe, el servidor la rechaza y
            la persona pierde todo lo que escribio con un error genérico. */}
        <textarea className="campo-control"
          name="mensaje"
          placeholder="Deje su mensaje"
          value={formData.mensaje}
          onChange={handleChange}
          maxLength={MENSAJE_MAXIMO}
          required
        />
        <small className="contador-mensaje">
          {formData.mensaje.length} / {MENSAJE_MAXIMO}
        </small>

        <button type="submit" className="boton boton-primario boton-ancho">Enviar Mensaje</button>
      </form>
    </div>
  );
}

export default FormularioContacto;
