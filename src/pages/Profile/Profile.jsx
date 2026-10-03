import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser } from "@/services/firebase/authFirebase";
import { useTheme } from "@/contexts/ThemeContext";
import VerificacionPendiente from "@/components/auth/VerificacionPendiente/VerificacionPendiente";
import "./Profile.css";

const Profile = () => {
  // ProtectedRoute garantiza que hay sesion: aca no hace falta chequearlo
  // ni redirigir, que es lo que hacia este componente durante el render.
  const { user, isAdmin } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const navigate = useNavigate();

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
