import { useContext, useState } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/common/Button/Button";
import CarritoCard from "../../components/CarritoCard/CarritoCard";
import { useNavigate, Link } from "react-router-dom";
import Modal from "../../components/common/Modal/Modal";
import "./Carrito.css";
import { services } from "../../services";
import { formatearPrecio } from "@/utils/formatearPrecio";

function Carrito() {
  const { removeList, cartList, total } = useContext(CartContext);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleAbrirModal = () => {
    setShowModal(true);
  };

  const handleProcesarCompra = async () => {
    if (!user) {
      alert("Debes iniciar sesión para finalizar la compra.");
      navigate("/login");
      return;
    }

    setIsProcessing(true);

    const orden = {
      buyer: {
        uid: user.uid,
        name: user.displayName || "Usuario",
        email: user.email,
      },
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
    <div className="carrito contenedor">
      <h1>Tu carrito</h1>

      {cartList.length === 0 ? (
        <div className="carrito-vacio">
          <h2>Todavía no agregaste productos</h2>
          <p>Elegí lo que quieras del catálogo y volvé acá para enviar el pedido.</p>
          <Link to="/products" className="boton boton-primario">
            Ver el catálogo
          </Link>
        </div>
      ) : (
        <div className="carrito-grid">
          <div className="carrito-lista">
            {cartList.map((item) => (
              <CarritoCard key={item.clave} item={item} />
            ))}
          </div>

          <aside className="carrito-resumen">
            <div className="carrito-total">
              <span>Total</span>
              <strong>{formatearPrecio(total)}</strong>
            </div>

            <Button
              callback={handleProcesarCompra}
              className="boton-ancho"
              disabled={isProcessing}
            >
              {isProcessing ? "Procesando..." : "Enviar pedido"}
            </Button>

            <p className="carrito-aviso">
              Te contactamos para coordinar el pago y el envío. No se cobra nada ahora.
            </p>
          </aside>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAccept={handleCerrarYFinalizar}
        tittle="Pedido enviado"
        message={
          <>
            Recibimos tu pedido. Nos ponemos en contacto a la brevedad para
            coordinar el pago y el envío.
            <br />
            <br />
            <strong>N° de orden:</strong> {orderId}
          </>
        }
      />
    </div>
  );

}

export default Carrito;
