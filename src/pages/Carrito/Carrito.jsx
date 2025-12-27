import { useContext, useState } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { Button } from "../../components/common/Button/Button";
import CarritoCard from "../../components/CarritoCard/CarritoCard";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/common/Modal/Modal";
import "./Carrito.css";
import { services } from "../../services";

function Carrito() {
  const { removeList, cartList, total } = useContext(CartContext);
  const [showModal, setShowModal] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleAbrirModal = () => {
    setShowModal(true);
  };

  const handleProcesarCompra = async () => {
    setIsProcessing(true);

    const orden = {
      // buyer: {
      //   name: "",
      //   phone: "",
      //   email: "",
      // },
      items: cartList,
      total: total,
      date: new Date().toISOString(),
    };
    try {
      const id = await services.firebase.crearCompra(orden);

      setOrderId(id);

      setShowModal(true);
    } catch (error) {
      console.error("Error al procesar:", error);
      alert("Error al guardar la compra");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCerrarYFinalizar = () => {
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
            <CarritoCard key={item.idProduct} item={item} />
          ))}
        </>
      )}
      <div className="total">
        {total > 0 ? (
          <>
            <p className="suma-total">
              <strong>Total final: </strong>$ {total}
            </p>
            <Button
              callback={handleProcesarCompra}
              className="realizar-compra"
              disabled={isProcessing}
            >
              {isProcessing ? "Procesando..." : "Finalizar compra"}
            </Button>
          </>
        ) : null}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAccept={handleCerrarYFinalizar}
        tittle="¡Compra Exitosa!"
        message={`Tu número de orden es: ${orderId}. A la brevedad recibirá un mail de confirmación.`}
      />
    </>
  );
}

export default Carrito;
