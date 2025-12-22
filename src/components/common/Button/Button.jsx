import "./Button.css";

function Button({ callback, children, className }) {
  return (
    <button className={`boton-common ${className}`} onClick={callback}>
      {children}
    </button>
  );
}

export { Button };
