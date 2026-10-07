import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePerfil } from "@/hooks/usePerfil";
import { errorDeTelefono, soloDigitos } from "@/utils/telefono";
import { logoutUser } from "@/services/firebase/authFirebase";
import { useTheme } from "@/contexts/ThemeContext";
import VerificacionPendiente from "@/components/auth/VerificacionPendiente/VerificacionPendiente";
import "./Profile.css";

const Profile = () => {
  // ProtectedRoute garantiza que hay sesion: aca no hace falta chequearlo
  // ni redirigir, que es lo que hacia este componente durante el render.
  const { user, isAdmin } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const { perfil, cargando, guardar } = usePerfil();
  const navigate = useNavigate();

  // El telefono es lo unico editable del perfil: el nombre y el email viven
  // en Auth y cambiarlos pide reautenticacion, que es otra pantalla.
  const [telefono, setTelefono] = useState("");
  const [estado, setEstado] = useState({ error: "", listo: false });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (perfil?.telefono) setTelefono(perfil.telefono);
  }, [perfil]);

  const guardarTelefono = async (e) => {
    e.preventDefault();
    const error = errorDeTelefono(telefono);
    if (error) return setEstado({ error, listo: false });

    setGuardando(true);
    try {
      await guardar({ telefono: soloDigitos(telefono) });
      setEstado({ error: "", listo: true });
    } catch {
      setEstado({ error: "No pudimos guardarlo. Probá de nuevo.", listo: false });
    } finally {
      setGuardando(false);
    }
  };

  const salir = async () => {
    await logoutUser();
    navigate("/");
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>Mi Perfil</h2>

        <VerificacionPendiente />

        <div className="profile-info">
          <div className="info-group">
            <span className="info-label">Nombre:</span>
            <span className="info-value">{user.displayName || "Sin nombre"}</span>
          </div>
          <div className="info-group">
            <span className="info-label">Email:</span>
            <span className="info-value">{user.email}</span>
          </div>
          <form className="info-group info-editable" onSubmit={guardarTelefono}>
            <label className="info-label" htmlFor="perfil-telefono">
              Teléfono:
            </label>
            <div className="info-value perfil-telefono">
              <input
                id="perfil-telefono"
                className="campo-control"
                type="tel"
                autoComplete="tel"
                placeholder={cargando ? "Cargando..." : "11 2345-6789"}
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  setEstado({ error: "", listo: false });
                }}
                disabled={cargando}
              />
              <button
                type="submit"
                className="boton boton-secundario"
                disabled={guardando || cargando}
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
            {estado.error && <small className="campo-error">{estado.error}</small>}
            {estado.listo && <small className="campo-ok">Teléfono guardado.</small>}
            {!estado.error && !estado.listo && (
              <small className="campo-ayuda">
                Es por donde te contactamos cuando hacés un pedido.
              </small>
            )}
          </form>

          <div className="info-group">
            <span className="info-label">Rol:</span>
            <span className="info-value profile-role">
              {isAdmin ? "Administrador" : "Comprador"}
            </span>
          </div>
          <div className="info-group">
            <span className="info-label">Tema:</span>
            <div className="info-value">
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value)}
                className="theme-select"
                aria-label="Tema de la interfaz"
              >
                <option value="system">Sistema (Automático)</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>
          </div>
        </div>

        <button className="logout-btn" onClick={salir}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default Profile;
