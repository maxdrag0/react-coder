import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerWithEmail, loginWithGoogle } from "@/services/firebase/authFirebase";
import { mensajeDeError } from "@/constants/authErrors";
import { validarPassword, PASSWORD_MINIMO } from "@/utils/validarPassword";
import AuthCard from "@/components/auth/AuthCard/AuthCard";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton/GoogleAuthButton";
import FormField from "@/components/common/FormField/FormField";
import FormError from "@/components/common/FormError/FormError";
import "./Auth.css";

const Register = () => {
  const [datos, setDatos] = useState({ name: "", email: "", password: "", confirmar: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const ejecutar = async (accion) => {
    setCargando(true);
    setError("");
    try {
      await accion();
      navigate("/");
    } catch (err) {
      setError(mensajeDeError(err.code));
    } finally {
      setCargando(false);
    }
  };

  const registrar = (e) => {
    e.preventDefault();

    if (datos.password !== datos.confirmar) {
      return setError("Las contraseñas no coinciden.");
    }

    const errorPassword = validarPassword(datos.password);
    if (errorPassword) return setError(errorPassword);

    ejecutar(() => registerWithEmail(datos.email, datos.password, datos.name));
  };

  return (
    <AuthCard titulo="Crear una cuenta" subtitulo="Unite a nuestra tienda">
      <FormError mensaje={error} />

      <form onSubmit={registrar} className="auth-form">
        <FormField label="Nombre completo" id="name" value={datos.name} onChange={cambiar} autoComplete="name" />
        <FormField label="Email" id="email" type="email" value={datos.email} onChange={cambiar} autoComplete="email" />
        <FormField
          label="Contraseña"
          id="password"
          type="password"
          value={datos.password}
          onChange={cambiar}
          autoComplete="new-password"
          ayuda={`Mínimo ${PASSWORD_MINIMO} caracteres.`}
        />
        <FormField
          label="Confirmar contraseña"
          id="confirmar"
          type="password"
          value={datos.confirmar}
          onChange={cambiar}
          autoComplete="new-password"
        />

        <button type="submit" className="auth-btn" disabled={cargando}>
          {cargando ? "Creando tu cuenta..." : "Registrarse"}
        </button>
      </form>

      <div className="auth-divider"><span>o</span></div>

      <GoogleAuthButton
        texto="Continuar con Google"
        onClick={() => ejecutar(loginWithGoogle)}
        disabled={cargando}
      />

      <p className="auth-redirect">
        ¿Ya tenés una cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </AuthCard>
  );
};

export default Register;
