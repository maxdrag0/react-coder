import "./GoogleAuthButton.css";

const LOGO = "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

// alt="" con aria-hidden: el logo es decorativo y el texto del boton ya dice
// "Continuar con Google". Un alt="Google logo" hace que el lector de pantalla
// lea "Google logo Continuar con Google".
const GoogleAuthButton = ({ texto, onClick, disabled = false }) => (
  <button type="button" className="auth-btn google-btn" onClick={onClick} disabled={disabled}>
    <img src={LOGO} alt="" aria-hidden="true" />
    {texto}
  </button>
);

export default GoogleAuthButton;
