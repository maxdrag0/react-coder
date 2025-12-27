import { NavLink } from "react-router-dom";
import carrito from "./assets/carrito.png";
import "./CartMenu.css";
import { useContext } from "react";
import { CartContext } from "../../../contexts/cart/CartContext";

function CartWidget() {
  const { cantidadItems } = useContext(CartContext);

  return (
    <>
      <div className="carrito-container">
        <NavLink to="/carrito" target="" className="carrito">
          <img src={carrito} alt="carrito logo" className="carrito-img" />
          {cantidadItems > 0 && (
            <span className="cart-badge">{cantidadItems}</span>
          )}
        </NavLink>
      </div>
    </>
  );
}

export default CartWidget;
