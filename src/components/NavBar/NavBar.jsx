import "./NavBar.css";
import { useState } from "react";
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

  const buscar = (e) => {
    e.preventDefault();
    if (!busqueda.trim()) return;
    navigate(`/products?search=${encodeURIComponent(busqueda)}`);
    setBusqueda("");
    cerrarMenu();
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <Logo />

        <nav className="nav-links" aria-label="Principal">
          {LINKS.map((l) => (
            <NavLink key={l.a} to={l.a} end={l.a === "/"}>
              {l.texto}
            </NavLink>
          ))}
        </nav>

        <form className="nav-buscador" onSubmit={buscar} role="search">
          <input
            type="search"
            className="campo-control"
            placeholder="Buscar productos"
            aria-label="Buscar productos"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button type="submit" className="nav-accion" aria-label="Buscar">
            <Search size={18} />
          </button>
        </form>

        <div className="nav-acciones">
          {isAdmin && (
            <NavLink to="/admin" className="nav-accion" title="Panel de administración">
              <Shield size={20} />
              <span className="nav-accion-texto">Admin</span>
            </NavLink>
          )}

          <NavLink to={user ? "/profile" : "/login"} className="nav-accion">
            <User size={20} />
            <span className="nav-accion-texto">{user ? "Perfil" : "Ingresar"}</span>
          </NavLink>

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
      </nav>
    </header>
  );
}

export default NavBar;
