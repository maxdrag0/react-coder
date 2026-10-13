import { useContext, useState } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/common/Button/Button";
import CarritoCard from "../../components/CarritoCard/CarritoCard";
import { useNavigate, Link } from "react-router-dom";
import Modal from "../../components/common/Modal/Modal";
import "./Carrito.css";
import { enviarOrden } from "@/services/api/ordenes";
import Reconciliar from "./Reconciliar";
import { usePerfil } from "@/hooks/usePerfil";
import { errorDeTelefono, soloDigitos } from "@/utils/telefono";
import { formatearTotal } from "@/utils/formatearPrecio";

function Carrito() {
  const { removeList, cartList, total, actualizarPrecio, deleteItem } =
    useContext(CartContext);
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
  const [problemas, setProblemas] = useState([]);
  const [errorEnvio, setErrorEnvio] = useState("");
  const navigate = useNavigate();

  // El renglón que el servidor identifica por código + modelo + unidad es el
  // mismo que el carrito identifica por su clave.
  const claveDe = (p) =>
    cartList.find(
      (i) => i.codigo === p.codigo && (i.modelo ?? null) === (p.modelo ?? null)
    )?.clave;

  /*
    Aplica lo que el servidor dijo: los precios se corrigen y los renglones
    que ya no se pueden comprar se van. Después el cliente confirma.
  */
  const reconciliar = (lista) => {
    for (const p of lista) {
      const clave = claveDe(p);
      if (!clave) continue;
      if (p.tipo === "precio_cambio") actualizarPrecio(clave, p.ahora);
      else deleteItem(clave);
    }
  };

  /*
    Manda el pedido. Nunca el total: el servidor lo calcula leyendo el
    catálogo, que es lo que impide que un carrito manipulado se cobre solo.
  */
  const mandar = async () => {
    setIsProcessing(true);
    setErrorEnvio("");
    setProblemas([]);

    try {
      const items = cartList.map((i) => ({
        codigo: i.codigo,
        unidad: i.unidad,
        modelo: i.modelo ?? null,
        cantidad: i.cantidad,
        // El precio que el cliente TIENE A LA VISTA. No entra en el total: el
        // servidor lo usa para poder decir qué cambió.
        precioVisto: i.precioElegido,
      }));

      const { id } = await enviarOrden({
        items,
        telefono: perfil?.telefono ? undefined : telefono,
      });

      setOrderId(id);
      setShowModal(true);
    } catch (error) {
      if (error.code === "carrito-desactualizado") {
        reconciliar(error.problemas);
        setProblemas(error.problemas);
      } else if (error.code === "sin_telefono") {
        setErrorTelefono("Necesitamos tu teléfono para coordinar el pedido.");
      } else {
        console.error("Error al enviar el pedido:", error);
        setErrorEnvio(error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcesarCompra = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!perfil?.telefono) {
      const malo = errorDeTelefono(telefono);
      if (malo) return setErrorTelefono(malo);
      // Queda guardado para que no lo tenga que escribir la próxima vez.
      await guardarPerfil({ telefono: soloDigitos(telefono) });
    }

    setErrorTelefono("");
    await mandar();
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
            {problemas.length > 0 && (
              <Reconciliar
                problemas={problemas}
                onConfirmar={() => {
                  setProblemas([]);
                  mandar();
                }}
                onCancelar={() => setProblemas([])}
              />
            )}

            {errorEnvio && (
              <p className="campo-error carrito-error" role="alert">
                {errorEnvio}
              </p>
            )}

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
