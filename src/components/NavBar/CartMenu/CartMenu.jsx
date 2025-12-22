import { NavLink } from "react-router-dom";
import carrito from "./assets/carrito.png";
import "./CartMenu.css";
import { useContext } from "react";
import { CartContext } from "../../../contexts/cart/CartContext";

function CartWidget() {
  return (
    <>
      <div className="carrito-container">
        <NavLink to="/carrito" target="" className="carrito">
          <img src={carrito} alt="carrito logo" className="carrito-img" />
        </NavLink>
      </div>
    </>
  );
}

export default CartWidget;
