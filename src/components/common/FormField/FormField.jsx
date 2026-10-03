import "./FormField.css";

const FormField = ({ label, id, type = "text", value, onChange, required = true, autoComplete, ayuda }) => (
  <div className="campo">
    <label htmlFor={id}>{label}</label>
    <input
      type={type}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      required={required}
      autoComplete={autoComplete}
    />
    {ayuda && <small className="campo-ayuda">{ayuda}</small>}
  </div>
);

export default FormField;
