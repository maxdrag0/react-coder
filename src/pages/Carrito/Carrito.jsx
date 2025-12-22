import { useContext, useState } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { Button } from "../../components/common/Button/Button";
import CarritoCard from "../../components/CarritoCard/CarritoCard";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/common/Modal/Modal";
import "./Carrito.css";

function Carrito() {
  const { removeList, cartList, total } = useContext(CartContext);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  const handleAbrirModal = () => {
    setShowModal(true);
  };

  const handleFinalizarCompra = () => {
    removeList();
    setShowModal(false);
    navigate("/");
  };

  return (
    <>
      <h2 style={{ textAlign: "center", marginTop: "10px" }}>
        Bienvenido a su carrito
      </h2>
      {cartList.length === 0 ? (
        <>
          <p>El carrito está vacío</p>
          <p>Visite la tienda para elegir su proxima compra</p>
        </>
      ) : (
        <>
          {cartList.map((item) => (
            <CarritoCard key={item.id} item={item} />
          ))}
        </>
      )}
      <div className="total">
        {total > 0 ? (
          <>
            <p className="suma-total">
              <strong>Total final: </strong>$ {total}
            </p>
            <Button callback={handleAbrirModal} className="realizar-compra">
              Finalizar compra
            </Button>
          </>
        ) : null}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAccept={handleFinalizarCompra}
        tittle="¡Compra Exitosa!"
        message="Compra reservada con éxito. A la brevedad recibirá un mail de confirmación."
      />
    </>
  );
}

export default Carrito;
