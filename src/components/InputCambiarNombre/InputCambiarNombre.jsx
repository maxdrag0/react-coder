import "./InputCambiarNombre.css";
import { useState } from "react";

function InputCambiarNombre({ nombreUsuario, setNombreUsuario }) {
  const [nuevoNombre, setNuevoNombre] = useState(nombreUsuario);

  const handleClick = () => {
    setNombreUsuario(nuevoNombre);
  };

  return (
    <>
      <div className="input">
        <label>Nuevo nombre:</label>
        <input
          type="text"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
        />
        <button onClick={handleClick}>Guardar</button>
      </div>
    </>
  );
}

export default InputCambiarNombre;
