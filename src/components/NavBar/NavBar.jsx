import "./NavBar.css";
import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import CartMenu from "./CartMenu/CartMenu";
import Logo from "./Logo/Logo";
import { useAuth } from "../../contexts/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { User, Shield, Search } from "lucide-react";

const LINKS = [
  { a: "/", texto: "Inicio" },
  { a: "/products", texto: "Productos" },
  { a: "/contact", texto: "Contacto" },
];

/**
 * Barra de arriba. En celular es solo logo y buscador: los destinos viven en
 * BottomNav, que los deja a un toque en vez de esconderlos tras una
 * hamburguesa. En escritorio lleva los links y la cuenta.
 */
function NavBar() {
  const [busqueda, setBusqueda] = useState("");
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

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

  return (
    <header className="nav">
      <div className="nav-inner">
        <Logo />

        <form
          className="nav-buscador"
          onSubmit={(e) => e.preventDefault()}
          role="search"
        >
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

        {/* Los links viven en BottomNav en celular y acá en escritorio. */}
        <nav className="nav-links" aria-label="Principal">
          {LINKS.map((l) => (
            <NavLink key={l.a} to={l.a} end={l.a === "/"}>
              {l.texto}
            </NavLink>
          ))}
        </nav>

        <div className="nav-acciones">
          {/* El panel es el único destino que BottomNav no lleva, así que su
              acceso en celular es este escudo. Solo lo ve un admin. */}
          {isAdmin && (
            <NavLink to="/admin" className="nav-accion" title="Panel">
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

          <CartMenu />
        </div>
      </div>
    </header>
  );
}

export default NavBar;
