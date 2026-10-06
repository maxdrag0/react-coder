import "./NavBar.css";
import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import CartMenu from "./CartMenu/CartMenu";
import Logo from "./Logo/Logo";
import { useAuth } from "../../contexts/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, User, Shield, Search } from "lucide-react";

const LINKS = [
  { a: "/", texto: "Inicio" },
  { a: "/products", texto: "Productos" },
  { a: "/contact", texto: "Contacto" },
];

function NavBar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const cerrarMenu = () => setMenuAbierto(false);

  // Filtra mientras se escribe, sin disparar una navegación por tecla.
  const busquedaRetrasada = useDebounce(busqueda, 250);
  const ultimaBusqueda = useRef(busquedaRetrasada);

  useEffect(() => {
    // `navigate` cambia de identidad en cada cambio de ruta, así que este
    // efecto se re-ejecuta al navegar. Solo tiene que actuar cuando lo que
    // cambió es el texto buscado: si no, secuestra toda la navegación y la
    // app queda clavada en /products.
    if (busquedaRetrasada === ultimaBusqueda.current) return;
    ultimaBusqueda.current = busquedaRetrasada;

    const q = busquedaRetrasada.trim();
    // replace y no push: escribir no debe llenar el historial del navegador.
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : "/products", {
      replace: true,
    });
  }, [busquedaRetrasada, navigate]);

  const buscar = (e) => {
    e.preventDefault();
    cerrarMenu();
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <Logo />

        <form className="nav-buscador" onSubmit={buscar} role="search">
          <Search size={18} className="nav-buscador-icono" aria-hidden="true" />
          <input
            type="search"
            className="campo-control"
            placeholder="Buscar productos"
            aria-label="Buscar productos"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </form>

        {/* Los links viven en el panel en celular y acá en escritorio. */}
        <nav className="nav-links" aria-label="Principal">
          {LINKS.map((l) => (
            <NavLink key={l.a} to={l.a} end={l.a === "/"}>
              {l.texto}
            </NavLink>
          ))}
        </nav>

        <div className="nav-acciones">
          {isAdmin && (
            <NavLink to="/admin" className="nav-accion nav-solo-escritorio" title="Panel">
              <Shield size={20} />
              <span className="nav-accion-texto">Admin</span>
            </NavLink>
          )}

          <NavLink
            to={user ? "/profile" : "/login"}
            className="nav-accion nav-solo-escritorio"
          >
            <User size={20} />
            <span className="nav-accion-texto">{user ? "Perfil" : "Ingresar"}</span>
          </NavLink>

          {/* El carrito queda fuera del menú a propósito: es la acción de
              compra y su contador tiene que verse siempre. */}
          <CartMenu />

          <button
            className="nav-hamburguesa"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <nav className={`nav-panel ${menuAbierto ? "abierto" : ""}`} aria-label="Menú">
        {LINKS.map((l) => (
          <NavLink key={l.a} to={l.a} end={l.a === "/"} onClick={cerrarMenu}>
            {l.texto}
          </NavLink>
        ))}

        <hr className="nav-panel-separador" />

        <NavLink to={user ? "/profile" : "/login"} onClick={cerrarMenu}>
          <User size={18} />
          {user ? "Mi perfil" : "Ingresar"}
        </NavLink>

        {isAdmin && (
          <NavLink to="/admin" onClick={cerrarMenu}>
            <Shield size={18} />
            Panel de administración
          </NavLink>
        )}
      </nav>
    </header>
  );
}

export default NavBar;
