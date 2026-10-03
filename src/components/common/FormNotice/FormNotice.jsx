import "./FormNotice.css";

// Hermano de FormError para lo que NO es un error. role="status" en vez de
// "alert": se anuncia sin interrumpir, y no se pinta de rojo.
const FormNotice = ({ mensaje }) => {
  if (!mensaje) return null;
  return (
    <p className="form-notice" role="status">
      {mensaje}
    </p>
  );
};

export default FormNotice;
