import { Link } from "react-router-dom";
import Precio from "@/components/common/Precio/Precio";
import MediaPlaceholder from "@/components/common/MediaPlaceholder/MediaPlaceholder";
import "./Item.css";

function Item({ item }) {
  // El catálogo convive con los dos esquemas hasta que E los unifique.
  const nombre = item.nombre || item.name;
  const foto = item.fotoUrl || item.image;
  const categoria = item.categoria || item.category;

  const meta = [item.marca, categoria, item.duracion ? `${item.duracion} seg` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="item">
      <Link to={`/product/${item.codigo}`} className="item-link">
        <div className="item-media">
          {foto ? <img src={foto} alt="" loading="lazy" /> : <MediaPlaceholder />}
        </div>

        <div className="item-cuerpo">
          <h3 className="item-titulo">{nombre}</h3>
          {meta && <p className="item-meta">{meta}</p>}

          {/* El stock no se muestra: hasta definir si se cuenta por unidad,
              display o bulto, cualquier número sería engañoso. */}
          <Precio
            unitario={item.precioUnitario ?? item.price}
            display={item.precioDisplay}
            bulto={item.precioBulto}
          />
        </div>
      </Link>
    </article>
  );
}

export default Item;
