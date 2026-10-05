import { useContext } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { Trash2 } from "lucide-react";
import { Counter } from "../common/Counter/Counter";
import MediaPlaceholder from "@/components/common/MediaPlaceholder/MediaPlaceholder";
import { formatearPrecio } from "@/utils/formatearPrecio";
import "./CarritoCard.css";

function CarritoCard({ item }) {
  const { deleteItem, updateQuantity } = useContext(CartContext);
  const unitario = item.precioUnitario || item.price;
  const subtotal = unitario * item.cantidad;
  const nombre = item.nombre || item.name;
  const foto = item.fotoUrl || item.image;

  const handleSumar = () => {
    if (item.cantidad < item.stock) {
      updateQuantity(item.codigo, item.cantidad + 1);
    }
  };

  const handleRestar = () => {
    if (item.cantidad > 1) {
      updateQuantity(item.codigo, item.cantidad - 1);
    }
  };

  return (
    <article className="carrito-item">
      <div className="carrito-item-media">
        {foto ? <img src={foto} alt="" /> : <MediaPlaceholder />}
      </div>

      <div className="carrito-item-info">
        <h3 className="carrito-item-nombre">{nombre}</h3>
        <p className="carrito-item-sub">
          {formatearPrecio(unitario)} por unidad
        </p>
        <p className="carrito-item-subtotal">{formatearPrecio(subtotal)}</p>
      </div>

      <div className="carrito-item-acciones">
        <Counter count={item.cantidad} sumar={handleSumar} restar={handleRestar} />
        <button
          className="boton boton-fantasma carrito-item-borrar"
          onClick={() => deleteItem(item.codigo)}
          aria-label={`Eliminar ${nombre} del carrito`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </article>
  );
}

export default CarritoCard;
