import { formatearPrecio } from "@/utils/formatearPrecio";
import {
  unidadesDisponibles,
  precioDe,
  unidadesQueTrae,
  rangoUnitario,
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
    const rango = rangoUnitario(item);
    if (!rango) return null;

    const desde = rango.min !== rango.max;

    return (
      <div className="precio">
        <p className="precio-principal">
          {desde && <span className="precio-desde">desde</span>}
          {formatearPrecio(rango.min)}
        </p>
      </div>
    );
  }

  const disponibles = unidadesDisponibles(item);
  const unitario = disponibles.find((u) => u.clave === "unitario");
  if (!unitario) return null;

  const otras = disponibles.filter((u) => u.clave !== "unitario");

  if (compacto) {
    return (
      <div className="precio">
        <p className="precio-principal">{formatearPrecio(precioDe(item, "unitario"))}</p>

        {otras.length > 0 && (
          <p className="precio-otras">
            {otras
              .map((u) => {
                const trae = unidadesQueTrae(item, u.clave);
                const cantidad = trae ? ` ×${trae}` : "";
                return `${u.etiqueta.toLowerCase()} ${formatearPrecio(
                  precioDe(item, u.clave)
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
