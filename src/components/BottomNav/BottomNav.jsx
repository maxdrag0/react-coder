import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { Home, Sparkles, ShoppingCart, Mail, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CartContext } from "@/contexts/cart/CartContext";
import "./BottomNav.css";

/**
 * Barra de navegación inferior, solo en celular. Reemplaza a la hamburguesa:
 * los cinco destinos quedan a un toque y el pulgar los alcanza sin estirarse,
 * en vez de esconderlos detrás de un menú que hay que abrir primero.
 */
const BottomNav = () => {
  const { user } = useAuth();
  const { cantidadItems } = useContext(CartContext);

  const destinos = [
    // `exacto` solo en la raíz: "/" hace prefijo con todas las rutas, así que
    // sin eso Inicio quedaría marcado como activo en toda la tienda.
    { a: "/", texto: "Inicio", Icono: Home, exacto: true },
    { a: "/products", texto: "Productos", Icono: Sparkles },
    { a: "/carrito", texto: "Carrito", Icono: ShoppingCart, cuenta: cantidadItems },
    { a: "/contact", texto: "Contacto", Icono: Mail },
    {
      a: user ? "/profile" : "/login",
      texto: user ? "Perfil" : "Ingresar",
      Icono: User,
    },
  ];

  return (
    <nav className="nav-abajo" aria-label="Navegación principal">
      {destinos.map((d) => (
        <NavLink
          key={d.a}
          to={d.a}
          end={d.exacto}
          className={({ isActive }) => `nav-abajo-item ${isActive ? "activa" : ""}`}
          aria-label={d.cuenta > 0 ? `${d.texto}, ${d.cuenta} productos` : undefined}
        >
          <span className="nav-abajo-icono">
            <d.Icono size={22} aria-hidden="true" />
            {d.cuenta > 0 && (
              <span className="nav-abajo-cuenta" aria-hidden="true">
                {d.cuenta}
              </span>
            )}
          </span>
          {d.texto}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
