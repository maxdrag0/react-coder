import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "@/services/firebase/authFirebase";
import { mensajeDeError } from "@/constants/authErrors";
import AuthCard from "@/components/auth/AuthCard/AuthCard";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton/GoogleAuthButton";
import PasswordResetLink from "@/components/auth/PasswordResetLink/PasswordResetLink";
import FormField from "@/components/common/FormField/FormField";
import FormError from "@/components/common/FormError/FormError";
import "./Auth.css";

const Login = () => {
  const [datos, setDatos] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ProtectedRoute guarda a donde queria ir la persona antes de rebotarla.
  const destino = location.state?.volverA ?? "/";

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const ejecutar = async (accion) => {
    setCargando(true);
    setError("");
    try {
      await accion();
      navigate(destino, { replace: true });
    } catch (err) {
      setError(mensajeDeError(err.code));
    } finally {
      setCargando(false);
    }
  };

  const ingresar = (e) => {
    e.preventDefault();
    ejecutar(() => loginWithEmail(datos.email, datos.password));
  };

  return (
    <AuthCard titulo="Iniciar sesión" subtitulo="Bienvenido de vuelta">
      <FormError mensaje={error} />

      <form onSubmit={ingresar} className="auth-form">
        <FormField label="Email" id="email" type="email" value={datos.email} onChange={cambiar} autoComplete="email" />
        <FormField
          label="Contraseña"
          id="password"
          type="password"
          value={datos.password}
          onChange={cambiar}
          autoComplete="current-password"
        />

        <PasswordResetLink />

        <button type="submit" className="boton boton-primario boton-ancho" disabled={cargando}>
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div className="auth-divider"><span>o</span></div>

      <GoogleAuthButton
        texto="Continuar con Google"
        onClick={() => ejecutar(loginWithGoogle)}
        disabled={cargando}
      />

      <p className="auth-redirect">
        ¿No tenés cuenta? <Link to="/register">Registrate</Link>
      </p>
    </AuthCard>
  );
};

export default Login;
