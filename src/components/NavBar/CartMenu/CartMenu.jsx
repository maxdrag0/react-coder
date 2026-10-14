import { NavLink } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../../../contexts/cart/useCart";
import "./CartMenu.css";

function CartWidget() {
  const { cantidadItems } = useCart();

  return (
    <NavLink
      to="/carrito"
      className="nav-accion nav-solo-escritorio"
      aria-label={`Carrito, ${cantidadItems} productos`}
    >
      <ShoppingCart size={20} />
      {cantidadItems > 0 && (
        <span className="nav-carrito-cuenta" aria-hidden="true">
          {cantidadItems}
        </span>
      )}
    </NavLink>
  );
}

export default CartWidget;
