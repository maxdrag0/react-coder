import { useState, useContext } from "react";
import { CartContext } from "../../contexts/cart/CartContext";
import { Counter } from "../common/Counter/Counter";
import Modal from "../common/Modal/Modal";
import Media from "@/components/common/Media/Media";
import { formatearPrecio } from "@/utils/formatearPrecio";
import {
  unidadesDisponibles,
  precioDe,
  unidadesQueTrae,
} from "@/constants/unidades";
import { sePuedeComprar } from "@/constants/estadoProducto";
import { modelosDe } from "@/constants/modelos";
import { Link } from "react-router-dom";
import "./ItemDetails.css";

function ItemDetails({ item }) {
  const { addToCart } = useContext(CartContext);

  // El modelo se elige primero: de el dependen las presentaciones y los
  // precios. Si el producto tiene uno solo, se elige solo y no se muestra el
  // selector: elegir entre una opcion no es elegir.
  const modelos = modelosDe(item);
  const [modeloId, setModeloId] = useState(modelos[0]?.id ?? null);
  const modelo = modelos.find((m) => m.id === modeloId) ?? null;

  const unidades = unidadesDisponibles(item, modeloId);
  // Se puede llegar acá por URL directa sin pasar por el listado, así que
  // filtrar el catálogo no alcanza: el botón se bloquea igual.
  const comprable = sePuedeComprar(item);
  const [unidad, setUnidad] = useState(unidades[0]?.clave ?? "unitario");

  // Al cambiar de modelo, la unidad elegida puede no existir en el nuevo: un
  // mortero de 3 pulgadas puede venir por display y el de 5 no.
  const elegirModelo = (id) => {
    setModeloId(id);
    const disponibles = unidadesDisponibles(item, id);
    if (!disponibles.some((u) => u.clave === unidad)) {
      setUnidad(disponibles[0]?.clave ?? "unitario");
    }
  };
  const [count, setCount] = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Lo que se acaba de agregar, congelado para el cartel de confirmacion.
  // Leer `count` ahi mostraba siempre 1, porque setCount(1) corre en el mismo
  // handler y React agrupa las actualizaciones antes de pintar el modal.
  const [agregado, setAgregado] = useState(null);

  // Sin límite por stock: hasta definir si el stock se cuenta por unidad,
  // display o bulto, limitar la compra daría un número equivocado.
  const sumar = () => setCount(count + 1);
  const restar = () => {
    if (count > 1) setCount(count - 1);
  };

  const precio = precioDe(item, unidad, modeloId);
  const subtotal = precio ? precio * count : 0;

  const agregar = () => {
    addToCart(item, count, unidad, modelo);
    setAgregado({
      cantidad: count,
      unidad: unidades.find((u) => u.clave === unidad)?.etiqueta ?? "",
      modelo: modelo?.etiqueta ?? null,
    });
    setModalAbierto(true);
    setCount(1);
  };

  const nombre = item.nombre || item.name;
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
        <Media
          item={item}
          modeloId={modeloId}
          titulo={nombre}
          modo="completo"
        />
      </div>

      <div className="detalle-info">
        <h1>{nombre}</h1>
        {descripcion && descripcion !== nombre && (
          <p className="detalle-desc">{descripcion}</p>
        )}

        {/* Un select y no una lista de opciones: un producto con diez
            colores llenaba la pantalla y empujaba el precio y el boton de
            comprar abajo del todo.

            El precio NO va al lado de cada modelo: vive en el selector de
            unidad, que es donde se decide cuanto se paga. Repetirlo en los
            dos lugares hacia dudar de cual manda. */}
        {modelos.length > 1 && (
          <div className="campo detalle-modelo">
            <label htmlFor="detalle-modelo">Elegí el modelo</label>
            <select
              id="detalle-modelo"
              className="campo-control"
              value={modeloId ?? ""}
              onChange={(e) => elegirModelo(e.target.value)}
            >
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </div>
        )}

        {unidades.length > 0 && (
          <fieldset className="detalle-unidades">
            <legend>Cómo lo querés comprar</legend>

            {unidades.map((u) => {
              const trae = unidadesQueTrae(item, u.clave, modeloId);
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
                    {formatearPrecio(precioDe(item, u.clave, modeloId))}
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
            <button
              type="button"
              className="boton boton-primario"
              onClick={agregar}
            >
              Agregar al carrito
            </button>
          </div>
        )}

        {subtotal > 0 && (
          <p className="detalle-subtotal">
            Subtotal <strong>{formatearPrecio(subtotal)}</strong>
          </p>
        )}

        {/* La ficha va DESPUÉS de comprar. Entre el título y el selector
            empujaba el precio y el botón abajo del fold: el comprador tenía
            que scrollear para encontrar cómo comprar, y el que no scrollea se
            va. Marca y código no deciden la compra, la confirman. */}
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
            {agregado?.modelo && <>{agregado.modelo} · </>}
            {agregado?.cantidad}{" "}
            {agregado?.cantidad === 1
              ? "unidad de compra"
              : "unidades de compra"}
            {agregado?.unidad && <> · {agregado.unidad}</>}
          </>
        }
      />
    </article>
  );
}

export default ItemDetails;
