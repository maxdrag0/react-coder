import { Link } from "react-router-dom";
import "./Item.css";

function Item({ item }) {
  return (
    <div className="itemCard">
      <div className="titulo">{item.title}</div>
      <div className="img">
        <img src={item.pictureUrl} alt="" title={item.description} />
      </div>
      <div className="descripcion">Precio: ${item.price}</div>
      <div className="button">
        <Link to={`/product/${item.id}`}>
          <button>Ver detalle del producto</button>
        </Link>
      </div>
      <div className="stock">Stock disponible: {item.stock}</div>
    </div>
  );
}

export default Item;
