import { NavLink } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useContext } from "react";
import { CartContext } from "../../../contexts/cart/CartContext";
import "./CartMenu.css";

function CartWidget() {
  const { cantidadItems } = useContext(CartContext);

  return (
    <NavLink to="/carrito" className="nav-accion" aria-label={`Carrito, ${cantidadItems} productos`}>
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
