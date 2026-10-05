import "./Button.css";

export const Button = ({
  children,
  callback,
  className = "",
  disabled = false,
  type = "button",
}) => (
  <button
    type={type}
    className={`boton boton-primario ${className}`}
    onClick={callback}
    disabled={disabled}
  >
    {children}
  </button>
);
