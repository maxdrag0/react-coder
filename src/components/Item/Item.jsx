import { Link } from "react-router-dom";
import Precio from "@/components/common/Precio/Precio";
import Media from "@/components/common/Media/Media";
import { sePuedeComprar } from "@/constants/estadoProducto";
import { modelosDe } from "@/constants/modelos";
import "./Item.css";

function Item({ item }) {
  // El catálogo convive con los dos esquemas hasta que E los unifique.
  const nombre = item.nombre || item.name;
  const modelos = modelosDe(item).length;

  return (
    <article className="item">
      <Link to={`/product/${item.codigo}`} className="item-link">
        <div className="item-media">
          <Media item={item} titulo={nombre} />

          {!sePuedeComprar(item) && <span className="item-sello">Sin stock</span>}

          {/* Cuántas variantes trae: es la razón para entrar al producto, y
              de otro modo no se descubre desde la grilla. */}
          {modelos > 1 && (
            <span className="item-sello item-sello-modelos">{modelos} modelos</span>
          )}
        </div>

        <div className="item-cuerpo">
          {/* Sin marca, categoría ni duración: en una grilla son tres datos
              que no deciden nada. Viven en el detalle, con la descripción. */}
          <h3 className="item-titulo">{nombre}</h3>

          {/* El stock no se muestra: hasta definir si se cuenta por unidad,
              display o bulto, cualquier número sería engañoso. */}
          <Precio item={item} compacto />
        </div>
      </Link>
    </article>
  );
}

export default Item;
