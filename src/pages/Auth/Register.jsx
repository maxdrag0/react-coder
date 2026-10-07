import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerWithEmail, loginWithGoogle } from "@/services/firebase/authFirebase";
import { mensajeDeError } from "@/constants/authErrors";
import { validarPassword, PASSWORD_MINIMO } from "@/utils/validarPassword";
import { errorDeTelefono, soloDigitos } from "@/utils/telefono";
import AuthCard from "@/components/auth/AuthCard/AuthCard";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton/GoogleAuthButton";
import FormField from "@/components/common/FormField/FormField";
import FormError from "@/components/common/FormError/FormError";
import "./Auth.css";

const Register = () => {
  const [datos, setDatos] = useState({
    name: "",
    email: "",
    telefono: "",
    password: "",
    confirmar: "",
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const ejecutar = async (accion) => {
    setCargando(true);
    setError("");
    try {
      const resultado = await accion();

      // Avisos de pasos no criticos que fallaron: la cuenta se creo igual,
      // asi que se navega y el aviso viaja para mostrarse en el perfil.
      const avisos = resultado?.avisos ?? [];
      navigate("/", { state: avisos.length ? { avisos } : undefined });
    } catch (err) {
      setError(mensajeDeError(err.code));
    } finally {
      setCargando(false);
    }
  };

  const registrar = (e) => {
    e.preventDefault();

    // Se registra la contrasenia ya trimeada, porque validarPassword tambien
    // trimea: sin esto "  12345678  " se aceptaba y se guardaba CON espacios,
    // y despues la persona no podia entrar escribiendo lo que creia su clave.
    const password = datos.password.trim();

    if (password !== datos.confirmar.trim()) {
      return setError("Las contraseñas no coinciden.");
    }

    const errorPassword = validarPassword(password);
    if (errorPassword) return setError(errorPassword);

    // El telefono es como lo vamos a contactar: sin el, el pedido no se
    // puede atender. Por eso se pide al registrarse y no despues.
    const errorTelefono = errorDeTelefono(datos.telefono);
    if (errorTelefono) return setError(errorTelefono);

    ejecutar(() =>
      registerWithEmail(
        datos.email.trim(),
        password,
        datos.name.trim(),
        soloDigitos(datos.telefono)
      )
    );
  };

  return (
    <AuthCard titulo="Crear una cuenta" subtitulo="Unite a nuestra tienda">
      <FormError mensaje={error} />

      <form onSubmit={registrar} className="auth-form">
        <FormField label="Nombre completo" id="name" value={datos.name} onChange={cambiar} autoComplete="name" />
        <FormField label="Email" id="email" type="email" value={datos.email} onChange={cambiar} autoComplete="email" />
        <FormField
          label="Teléfono"
          id="telefono"
          type="tel"
          value={datos.telefono}
          onChange={cambiar}
          autoComplete="tel"
          ayuda="Con código de área, sin el 0. Es por donde te contactamos."
        />
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

        <button type="submit" className="boton boton-primario boton-ancho" disabled={cargando}>
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
