import { useState, useContext } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { Counter } from "../common/Counter/Counter";
import Modal from "../common/Modal/Modal";
import Media from "@/components/common/Media/Media";
import { formatearPrecio } from "@/utils/formatearPrecio";
import { unidadesDisponibles, precioDe, unidadesQueTrae } from "@/constants/unidades";
import { sePuedeComprar } from "@/constants/estadoProducto";
import { Link } from "react-router-dom";
import "./ItemDetails.css";

function ItemDetails({ item }) {
  const { addToCart } = useContext(CartContext);

  const unidades = unidadesDisponibles(item);
  // Se puede llegar acá por URL directa sin pasar por el listado, así que
  // filtrar el catálogo no alcanza: el botón se bloquea igual.
  const comprable = sePuedeComprar(item);
  const [unidad, setUnidad] = useState(unidades[0]?.clave ?? "unitario");
  const [count, setCount] = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Sin límite por stock: hasta definir si el stock se cuenta por unidad,
  // display o bulto, limitar la compra daría un número equivocado.
  const sumar = () => setCount(count + 1);
  const restar = () => { if (count > 1) setCount(count - 1); };

  const precio = precioDe(item, unidad);
  const subtotal = precio ? precio * count : 0;

  const agregar = () => {
    addToCart(item, count, unidad);
    setModalAbierto(true);
    setCount(1);
  };

  const nombre = item.nombre || item.name;
  const foto = item.fotoUrl || item.image;
  const categoria = item.categoria || item.category;
  const descripcion = item.descripcion || item.description;

  const ficha = [
    ["Marca", item.marca],
    ["Categoría", categoria],
    ["Subcategoría", item.subcategoria],
    ["Duración", item.duracion ? `${item.duracion} segundos` : null],
    ["Código", item.codigo],
  ].filter(([, valor]) => valor);

  return (
    <article className="detalle">
      <div className="detalle-media">
        <Media foto={foto} video={item.videoUrl} titulo={nombre} modo="completo" />
      </div>

      <div className="detalle-info">
        <h1>{nombre}</h1>
        {descripcion && descripcion !== nombre && (
          <p className="detalle-desc">{descripcion}</p>
        )}

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

        {unidades.length > 0 && (
          <fieldset className="detalle-unidades">
            <legend>Cómo lo querés comprar</legend>

            {unidades.map((u) => {
              const trae = unidadesQueTrae(item, u.clave);
              const elegida = unidad === u.clave;
              return (
                <label
                  key={u.clave}
                  className={`unidad ${elegida ? "unidad-elegida" : ""}`}
                >
                  <input
                    type="radio"
                    name="unidad"
                    value={u.clave}
                    checked={elegida}
                    onChange={() => setUnidad(u.clave)}
                  />
                  <span className="unidad-nombre">
                    {u.etiqueta}
                    {trae && <small> · trae {trae} unidades</small>}
                  </span>
                  <span className="unidad-precio">
                    {formatearPrecio(precioDe(item, u.clave))}
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {!comprable ? (
          <p className="detalle-agotado">
            Ahora mismo no tenemos stock de este producto. Escribinos y te
            avisamos cuando entre.
          </p>
        ) : unidades.length === 0 ? (
          <p className="detalle-agotado">
            Este producto todavía no tiene precio cargado. Escribinos y te lo
            pasamos.
          </p>
        ) : (
          <div className="detalle-compra">
            <Counter count={count} sumar={sumar} restar={restar} />
            <button type="button" className="boton boton-primario" onClick={agregar}>
              Agregar al carrito
            </button>
          </div>
        )}

        {subtotal > 0 && (
          <p className="detalle-subtotal">
            Subtotal <strong>{formatearPrecio(subtotal)}</strong>
          </p>
        )}
      </div>

      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onAccept={() => setModalAbierto(false)}
        tittle="Listo, lo agregamos"
        textoAceptar="Seguir comprando"
        acciones={
          <Link to="/carrito" className="boton boton-primario">
            Ir al carrito
          </Link>
        }
        message={
          <>
            <strong>{nombre}</strong>
            <br />
            {count} {count === 1 ? "unidad de compra" : "unidades de compra"} ·{" "}
            {unidades.find((u) => u.clave === unidad)?.etiqueta}
          </>
        }
      />
    </article>
  );
}

export default ItemDetails;
