import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import "./ProtectedRoute.css";

const ProtectedRoute = ({ requireAdmin = false }) => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  // Mientras la sesion no resolvio no se decide nada: decidir aca expulsaria
  // a un usuario valido que acaba de refrescar la pagina.
  if (loading) {
    return <div className="ruta-cargando">Verificando tu sesión...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ volverA: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
