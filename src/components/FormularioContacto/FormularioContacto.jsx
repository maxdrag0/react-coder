import "./FormularioContacto.css";
import { useState } from "react";

function FormularioContacto({ onConfirm }) {
  const [formData, setFormData] = useState({
    email: "",
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
        <input
          type="email"
          name="email"
          placeholder="juan@hotmail.com"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <textarea
          name="mensaje"
          placeholder="Deje su mensaje"
          value={formData.mensaje}
          onChange={handleChange}
          required
        />

        <button type="submit">Enviar Mensaje</button>
      </form>
    </div>
  );
}

export default FormularioContacto;
