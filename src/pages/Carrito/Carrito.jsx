import { useContext, useState } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/common/Button/Button";
import CarritoCard from "../../components/CarritoCard/CarritoCard";
import { useNavigate, Link } from "react-router-dom";
import Modal from "../../components/common/Modal/Modal";
import "./Carrito.css";
import { services } from "../../services";
import { usePerfil } from "@/hooks/usePerfil";
import { errorDeTelefono, soloDigitos } from "@/utils/telefono";
import { formatearTotal } from "@/utils/formatearPrecio";

function Carrito() {
  const { removeList, cartList, total } = useContext(CartContext);
  const { user } = useAuth();
  const { perfil, cargando: cargandoPerfil, guardar: guardarPerfil } = usePerfil();

  // Los usuarios que ya existian no tienen telefono, y los que entran con
  // Google tampoco: ahi no hay formulario donde pedirlo. Si falta, se pide
  // aca antes de dejar mandar el pedido.
  const [telefono, setTelefono] = useState("");
  const [errorTelefono, setErrorTelefono] = useState("");
  const faltaTelefono = !cargandoPerfil && Boolean(user) && !perfil?.telefono;
  const [showModal, setShowModal] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleProcesarCompra = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    let telefonoFinal = perfil?.telefono ?? "";

    if (!telefonoFinal) {
      const malo = errorDeTelefono(telefono);
      if (malo) return setErrorTelefono(malo);
      telefonoFinal = soloDigitos(telefono);
    }

    setIsProcessing(true);
    setErrorTelefono("");

    const orden = {
      buyer: {
        uid: user.uid,
        name: user.displayName || "Usuario",
        email: user.email,
        // Copia y no referencia: si el cliente cambia su telefono mas
        // adelante, el pedido viejo tiene que seguir mostrando el que dio.
        telefono: telefonoFinal,
      },
      items: cartList,
      total: total,
      date: new Date().toISOString(),
    };
    try {
      // Queda guardado para que no lo tenga que escribir la proxima vez.
      if (!perfil?.telefono) await guardarPerfil({ telefono: telefonoFinal });

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
              <strong>{formatearTotal(total)}</strong>
            </div>

            {faltaTelefono && (
              <div className="campo carrito-telefono">
                <label htmlFor="carrito-telefono">Tu teléfono</label>
                <input
                  id="carrito-telefono"
                  className="campo-control"
                  type="tel"
                  autoComplete="tel"
                  placeholder="11 2345-6789"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
                <small className={errorTelefono ? "campo-error" : "campo-ayuda"}>
                  {errorTelefono || "Es por donde te contactamos para coordinar."}
                </small>
              </div>
            )}

            <Button
              callback={handleProcesarCompra}
              className="boton-ancho"
              disabled={isProcessing || cargandoPerfil}
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
