import { useCart } from "../../contexts/cart/useCart";
import { Trash2 } from "lucide-react";
import { Counter } from "../common/Counter/Counter";
import MediaPlaceholder from "@/components/common/MediaPlaceholder/MediaPlaceholder";
import { formatearPrecio } from "@/utils/formatearPrecio";
import { UNIDADES } from "@/constants/unidades";
import { fotosDe } from "@/constants/fotos";
import { nombreDeItem } from "@/constants/renglon";
import "./CarritoCard.css";

function CarritoCard({ item }) {
  const { deleteItem, updateQuantity } = useCart();

  const subtotal = (item.precioElegido || 0) * item.cantidad;
  const nombre = nombreDeItem(item);
  /*
    La foto DEL MODELO elegido. Leer item.fotoUrl mostraba la del producto, y
    tres bengalas de colores distintos quedaban como tres filas identicas: el
    comprador no podia saber si habia elegido bien.
  */
  const foto = fotosDe(item, item.modelo)[0] ?? null;
  const etiquetaUnidad =
    UNIDADES.find((u) => u.clave === item.unidad)?.etiqueta ?? "Unidad";

  // Sin tope por stock: mientras no esté definido si el stock se cuenta por
  // unidad, display o bulto, limitar daría un número equivocado.
  const sumar = () => updateQuantity(item.clave, item.cantidad + 1);
  const restar = () => updateQuantity(item.clave, item.cantidad - 1);

  return (
    <article className="carrito-item">
      <div className="carrito-item-media">
        {foto ? <img src={foto} alt="" /> : <MediaPlaceholder />}
      </div>

      <div className="carrito-item-info">
        <h3 className="carrito-item-nombre">{nombre}</h3>
        <p className="carrito-item-sub">
          {item.modeloEtiqueta && <strong>{item.modeloEtiqueta}</strong>}
          {item.modeloEtiqueta && " · "}
          {etiquetaUnidad} · {formatearPrecio(item.precioElegido)} c/u
        </p>
        <p className="carrito-item-subtotal">{formatearPrecio(subtotal)}</p>
      </div>

      <div className="carrito-item-acciones">
        <Counter count={item.cantidad} sumar={sumar} restar={restar} />
        <button
          className="boton boton-fantasma carrito-item-borrar"
          onClick={() => deleteItem(item.clave)}
          aria-label={`Quitar ${nombre} del carrito`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </article>
  );
}

export default CarritoCard;
