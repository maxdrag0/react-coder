import "./ItemDetails.css";
import { useState } from "react";
import { useContext } from "react";
import { Counter } from "../common/Counter/Counter";
import { Button } from "../common/Button/Button";
import { CartContext } from "../../contexts/cart/CartContext";
import { NavLink } from "react-router-dom";
import Modal from "../common/Modal/Modal";

function ItemDetails({ item }) {
  const { addToCart } = useContext(CartContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [count, setCount] = useState(1);
  const sumar = () => {
    if (count < item.stock) {
      setCount(count + 1);
    }
  };

  const restar = () => {
    if (count > 1) {
      setCount(count - 1);
    }
  };

  const handleAdd = () => {
    addToCart(item, count);
    setIsModalOpen(true);
  };

  return (
    <div className="item-detail-container">
      <div className="item-img">
        <img src={item.pictureUrl} />
      </div>
      <div className="item-detail">
        <div className="item-detail__intro">
          <div className="item-detail__intro__titulo">{item.title}</div>
          <div className="item-detail__intro__rating">
            ( {item.rating.rate} of {item.rating.count} )
          </div>
          <div className="item-detail__description">{item.description}</div>
          <div className="item-detail__price">
            $ {item.price} (Stock: {item.stock})
          </div>
        </div>

        <div className="item-detail__carrito">
          <div className="item-detail__carrito__contador">
            <Counter count={count} sumar={sumar} restar={restar} />
            <Button callback={handleAdd} className="boton-agregar-carrito">
              Agregar al carrito
            </Button>
          </div>
          <div className="item-detail__carrito__ir-al-carrito">
            <NavLink to="/carrito" className="nav-carrito">
              Ir al carrito
            </NavLink>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccept={() => setIsModalOpen(false)}
        tittle="¡Éxito!"
        message={`Has agregado ${count} unidad(es) de ${item.title} al carrito.`}
      ></Modal>
    </div>
  );
}

export default ItemDetails;
