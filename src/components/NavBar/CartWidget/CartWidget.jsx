import carrito from "./assets/carrito.png";
import "./CartWidget.css";

function CartWidget() {
  return (
    <>
      <div className="carrito-container">
        <a href="" target="" className="carrito">
          <img src={carrito} alt="carrito logo" className="carrito-img" />
        </a>
      </div>
    </>
  );
}

export default CartWidget;
