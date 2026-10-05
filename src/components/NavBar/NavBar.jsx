import "./NavBar.css";
import { useState } from "react";
import CartMenu from "./CartMenu/CartMenu";
import Logo from "./Logo/Logo";
import { useAuth } from "../../contexts/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, User, Shield, Search } from "lucide-react";

function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setShowMobileSearch(false);
      setMenuOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <Logo />

        {/* Hamburger Icon for Mobile */}
        <button
          className="mobile-menu-btn"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Navigation Links */}
        <nav className={`nav-links-container ${menuOpen ? "open" : ""}`}>
          <ul className="nav-links">
            <li>
              <NavLink to="/" className="nav-link" onClick={closeMenu}>
                Inicio
              </NavLink>
            </li>
            <li>
              <NavLink to="/products" className="nav-link" onClick={closeMenu}>
                Productos
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" className="nav-link" onClick={closeMenu}>
                Contacto
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Actions (Right Side) */}
        <div className="nav-actions">
          {/* Mobile Search Toggle */}
          <button
            className="mobile-search-btn"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            aria-label="Buscar"
          >
            <Search size={24} />
          </button>

          {/* Search Form */}
          <form
            className={`nav-search-form ${showMobileSearch ? "mobile-show" : ""}`}
            onSubmit={handleSearchSubmit}
          >
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nav-search-input"
            />
            <button type="submit" className="nav-search-submit">
              <Search size={18} />
            </button>
          </form>

          {isAdmin && (
            <NavLink
              to="/admin"
              className="nav-action-link admin-link"
              title="Admin Dashboard"
            >
              <Shield size={20} />
              <span className="action-text">Admin</span>
            </NavLink>
          )}
          {user ? (
            <NavLink
              to="/profile"
              className="nav-action-link user-link"
              title="Mi Perfil"
            >
              <User size={20} />
              <span className="action-text">Perfil</span>
            </NavLink>
          ) : (
            <NavLink
              to="/login"
              className="nav-action-link user-link"
              title="Iniciar Sesión"
            >
              <User size={20} />
              <span className="action-text">Ingresar</span>
            </NavLink>
          )}
          <CartMenu />
        </div>
      </div>
    </header>
  );
}

export default NavBar;
