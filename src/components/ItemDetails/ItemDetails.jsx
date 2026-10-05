import { useState, useContext } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { Counter } from "../common/Counter/Counter";
import Modal from "../common/Modal/Modal";
import Precio from "@/components/common/Precio/Precio";
import BarraStock from "@/components/common/BarraStock/BarraStock";
import MediaPlaceholder from "@/components/common/MediaPlaceholder/MediaPlaceholder";
import "./ItemDetails.css";

function ItemDetails({ item }) {
  const { cartList, addToCart } = useContext(CartContext);
  const itemInCart = cartList.find((prod) => prod.codigo === item.codigo);
  const inCartQuantity = itemInCart ? itemInCart.cantidad : 0;
  const availableStock = item.stock - inCartQuantity;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [count, setCount] = useState(1);

  const sumar = () => { if (count < availableStock) setCount(count + 1); };
  const restar = () => { if (count > 1) setCount(count - 1); };

  const handleAdd = () => {
    if (count <= availableStock) {
      addToCart(item, count);
      setIsModalOpen(true);
      setCount(1);
    }
  };

  const nombre = item.nombre || item.name;
  const foto = item.fotoUrl || item.image;
  const categoria = item.categoria || item.category;
  const descripcion = item.descripcion || item.description;

  const ficha = [
    ["Categoría", categoria],
    ["Subcategoría", item.subcategoria],
    ["Duración", item.duracion ? `${item.duracion} segundos` : null],
    ["Código", item.codigo],
  ].filter(([, valor]) => valor);

  return (
    <article className="detalle">
      <div className="detalle-media">
        {foto ? <img src={foto} alt="" /> : <MediaPlaceholder />}
      </div>

      <div className="detalle-info">
        <h1>{nombre}</h1>
        {descripcion && <p className="detalle-desc">{descripcion}</p>}

        <Precio
          unitario={item.precioUnitario ?? item.price}
          display={item.precioDisplay}
          bulto={item.precioBulto}
        />

        {ficha.length > 0 && (
          <dl className="detalle-ficha">
            {ficha.map(([clave, valor]) => (
              <div key={clave}>
                <dt>{clave}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        )}

        <BarraStock stock={item.stock} />

        {availableStock > 0 ? (
          <div className="detalle-compra">
            <Counter count={count} sumar={sumar} restar={restar} />
            <button type="button" className="boton boton-primario" onClick={handleAdd}>
              Agregar al carrito
            </button>
          </div>
        ) : (
          <p className="detalle-agotado">Sin stock disponible.</p>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccept={() => setIsModalOpen(false)}
        tittle="Agregado al carrito"
        message={`${nombre} está en tu carrito.`}
      />
    </article>
  );
}

export default ItemDetails;
