import "./FormError.css";

// role="alert" hace que un lector de pantalla anuncie el error cuando
// aparece, sin que la persona tenga que ir a buscarlo.
const FormError = ({ mensaje }) => {
  if (!mensaje) return null;
  return (
    <p className="form-error" role="alert">
      {mensaje}
    </p>
  );
};

export default FormError;
