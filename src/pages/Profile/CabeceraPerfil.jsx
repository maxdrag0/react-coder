import { Link } from "react-router-dom";
import { ShieldCheck, LayoutDashboard } from "lucide-react";

/*
  Quién sos, arriba de todo.

  Antes la página abría con "Mi Perfil" y una fila que decía "Nombre:". El
  título no aportaba nada —ya estabas en tu perfil— y la identidad quedaba
  como un dato más de una lista.

  Y siendo admin no se notaba en ninguna parte: habia un estilo .profile-role
  escrito y ningun componente lo usaba. Entrabas al panel escribiendo /admin
  en la barra de direcciones.
*/

/** La inicial alcanza: no hay fotos de perfil en esta tienda. */
const inicialDe = (nombre, email) =>
  (nombre?.trim()?.[0] ?? email?.[0] ?? "?").toUpperCase();

function CabeceraPerfil({ user, isAdmin }) {
  return (
    <header className="perfil-cabecera">
      <div className="perfil-avatar" aria-hidden="true">
        {inicialDe(user.displayName, user.email)}
      </div>

      <div className="perfil-identidad">
        <h2>{user.displayName || "Tu cuenta"}</h2>
        <p className="perfil-email">{user.email}</p>

        {isAdmin && (
          <span className="perfil-rol">
            <ShieldCheck size={13} aria-hidden="true" />
            Administrador
          </span>
        )}
      </div>

      {isAdmin && (
        <Link to="/admin" className="boton boton-primario perfil-al-panel">
          <LayoutDashboard size={16} aria-hidden="true" />
          Ir al panel
        </Link>
      )}
    </header>
  );
}

export default CabeceraPerfil;
