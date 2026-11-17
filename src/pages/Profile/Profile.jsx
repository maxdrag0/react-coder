import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth/useAuth";
import { usePerfil } from "@/hooks/usePerfil";
import { errorDeTelefono, soloDigitos } from "@/utils/telefono";
import { errorDeCiudad, errorDeDireccion, limpiarTexto } from "@/utils/envio";
import { logoutUser } from "@/services/firebase/authFirebase";
import { useTheme } from "@/contexts/theme/useTheme";
import VerificacionPendiente from "@/components/auth/VerificacionPendiente/VerificacionPendiente";
import CabeceraPerfil from "./CabeceraPerfil";
import CampoEditable from "./CampoEditable";
import PestanasPerfil from "./PestanasPerfil";
import MisPedidos from "./MisPedidos";
import "./Profile.css";

const SECCIONES = [
  { clave: "datos", etiqueta: "Mis datos" },
  { clave: "pedidos", etiqueta: "Mis pedidos" },
];

const Profile = () => {
  // ProtectedRoute garantiza que hay sesion: aca no hace falta chequearlo
  // ni redirigir, que es lo que hacia este componente durante el render.
  const { user, isAdmin } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const { perfil, cargando, guardar } = usePerfil();
  const navigate = useNavigate();

  /*
    Dos solapas en vez de una sola pagina larga. Antes iban seguidos los
    datos, las preferencias, la lista entera de pedidos —con sus renglones—
    y recien al final cerrar sesion: con unos pocos pedidos habia que
    scrollear para hacer cualquier cosa.

    Abre en los datos: es lo que se puede corregir, y los pedidos son de
    lectura.
  */
  const [seccion, setSeccion] = useState("datos");

  /*
    El telefono, la direccion y la ciudad: lo que hace falta para atender un
    pedido. El nombre y el email viven en Auth y cambiarlos pide
    reautenticacion, que es otra pantalla.

    La direccion se pide en el carrito la primera vez, pero tiene que poder
    cambiarse sin hacer un pedido: la gente se muda.
  */
  const salir = async () => {
    await logoutUser();
    navigate("/");
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        {/* La cabecera queda afuera de las solapas: es quien sos, no una
            seccion. Y el aviso de verificacion tambien, porque frena el
            envio de pedidos y no se puede esconder detras de una solapa. */}
        <CabeceraPerfil user={user} isAdmin={isAdmin} />

        <VerificacionPendiente />

        <PestanasPerfil
          actual={seccion}
          onCambiar={setSeccion}
          secciones={SECCIONES}
        />

        {seccion === "pedidos" ? (
          <div
            id="perfil-panel-pedidos"
            role="tabpanel"
            aria-labelledby="perfil-tab-pedidos"
          >
            <MisPedidos />
          </div>
        ) : (
          <div
            id="perfil-panel-datos"
            role="tabpanel"
            aria-labelledby="perfil-tab-datos"
          >
            <section className="perfil-seccion">
              <h3>Tus datos</h3>
              <div className="profile-info">
                <div className="info-group">
                  <span className="info-label">Nombre:</span>
                  <span className="info-value">
                    {user.displayName || "Sin nombre"}
                  </span>
                </div>
                <div className="info-group">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{user.email}</span>
                </div>
                <CampoEditable
                  id="perfil-telefono"
                  etiqueta="Teléfono:"
                  type="tel"
                  autoComplete="tel"
                  placeholder={cargando ? "Cargando..." : "11 2345-6789"}
                  inicial={perfil?.telefono}
                  cargando={cargando}
                  validar={errorDeTelefono}
                  normalizar={soloDigitos}
                  onGuardar={(telefono) => guardar({ telefono })}
                  ayuda="Es por donde te contactamos cuando hacés un pedido."
                  okTexto="Teléfono guardado."
                />
                <CampoEditable
                  id="perfil-direccion"
                  etiqueta="Dirección:"
                  type="text"
                  autoComplete="street-address"
                  placeholder={cargando ? "Cargando..." : "San Martín 742"}
                  inicial={perfil?.direccion}
                  cargando={cargando}
                  validar={errorDeDireccion}
                  normalizar={limpiarTexto}
                  onGuardar={(direccion) => guardar({ direccion })}
                  ayuda="Calle y altura. Es adonde mandamos el pedido."
                  okTexto="Dirección guardada."
                />
                <CampoEditable
                  id="perfil-ciudad"
                  etiqueta="Ciudad o localidad:"
                  type="text"
                  autoComplete="address-level2"
                  placeholder={cargando ? "Cargando..." : "Villa María"}
                  inicial={perfil?.ciudad}
                  cargando={cargando}
                  validar={errorDeCiudad}
                  normalizar={limpiarTexto}
                  onGuardar={(ciudad) => guardar({ ciudad })}
                  ayuda="La usamos para coordinar el envío."
                  okTexto="Ciudad guardada."
                />
              </div>
            </section>

            <section className="perfil-seccion">
              <h3>Preferencias</h3>
              <div className="profile-info">
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
            </section>

            {/* La salida va al pie de los DATOS y sin peso visual: es lo
            ultimo que alguien viene a hacer aca, y antes competia con todo
            lo demas. En la solapa de pedidos no pinta nada. */}
            <footer className="perfil-pie">
              <button type="button" className="logout-btn" onClick={salir}>
                Cerrar sesión
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
