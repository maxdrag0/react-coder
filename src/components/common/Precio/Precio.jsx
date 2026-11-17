import { formatearPrecio } from "@/utils/formatearPrecio";
import {
  UNIDADES,
  unidadesDisponibles,
  precioDe,
  unidadesQueTrae,
  rangoDesde,
} from "@/constants/unidades";
import { tieneModelos } from "@/constants/modelos";
import "./Precio.css";

/*
  El dorado va en el precio por unidad: es el único que todos los productos
  tienen. Display y bulto son opcionales desde que se cargan por presentación,
  así que acentuar el bulto dejaba sin acento a los productos que solo se
  venden por unidad.

  Recibe el producto entero y no precios sueltos: las presentaciones viven en
  el producto, y pasarlas de a tres números perdía las cantidades.

  `compacto` es el modo de las cards del catálogo: un precio grande y una sola
  línea chica con el resto. Tres filas de etiqueta y valor pesaban demasiado
  para una grilla y hacían que cada card terminara a una altura distinta.

  La cantidad se muestra solo si el producto la dice. Los del esquema viejo no
  la tienen, y antes se deducía dividiendo precios: un display de $15.000 con
  unidad a $8.000 mostraba "×2" cuando traía 5.
*/
const Precio = ({ item, compacto = false }) => {
  // Un producto con modelos no tiene precio propio: el precio vive en cada
  // modelo, y elegirlo pasa dentro del producto y no en la grilla.
  if (tieneModelos(item)) {
    const rango = rangoDesde(item);
    if (!rango) return null;

    const desde = rango.min !== rango.max;

    const etiqueta = UNIDADES.find((u) => u.clave === rango.clave)?.etiqueta;

    return (
      <div className="precio">
        <p className="precio-principal">
          {desde && <span className="precio-desde">desde</span>}
          {formatearPrecio(rango.min)}
          {/* Las bengalas de humo tienen un modelo por color y se venden
              solo por display: sin nombrarlo, el numero se lee como el
              precio de una. */}
          {rango.clave !== "unitario" && etiqueta && (
            <span className="precio-unidad"> el {etiqueta.toLowerCase()}</span>
          )}
        </p>
      </div>
    );
  }

  const disponibles = unidadesDisponibles(item);
  if (disponibles.length === 0) return null;

  /*
    El precio de entrada es el mas barato que se pueda comprar, y no siempre
    es el de la unidad: las bengalas de humo se venden solo por display.
    Antes esto exigia el unitario y devolvia null sin el, asi que esos
    productos salian en la grilla SIN NINGUN PRECIO.
  */
  const entrada = disponibles[0];
  const otras = disponibles.filter((u) => u.clave !== entrada.clave);

  if (compacto) {
    return (
      <div className="precio">
        <p className="precio-principal">
          {formatearPrecio(precioDe(item, entrada.clave))}
          {/* Nombrar la presentacion cuando no es la unidad: un numero solo
              haria pensar que es el precio de una. */}
          {entrada.clave !== "unitario" && (
            <span className="precio-unidad">
              {" "}
              el {entrada.etiqueta.toLowerCase()}
            </span>
          )}
        </p>

        {otras.length > 0 && (
          <p className="precio-otras">
            {otras
              .map((u) => {
                const trae = unidadesQueTrae(item, u.clave);
                const cantidad = trae ? ` ×${trae}` : "";
                return `${u.etiqueta.toLowerCase()} ${formatearPrecio(
                  precioDe(item, u.clave),
                )}${cantidad}`;
              })
              .join(" · ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <dl className="precio">
      {disponibles.map((u) => {
        const trae = unidadesQueTrae(item, u.clave);

        return (
          <div key={u.clave} className={`precio-fila precio-${u.clave}`}>
            <dt>{u.etiqueta.toLowerCase()}</dt>
            <dd>{formatearPrecio(precioDe(item, u.clave))}</dd>
            {trae && <span className="precio-mult">×{trae}</span>}
          </div>
        );
      })}
    </dl>
  );
};

export default Precio;
