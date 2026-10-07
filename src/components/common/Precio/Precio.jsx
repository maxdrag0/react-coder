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
  tienen. Display y bulto son opcionales desde que se cargan por
  presentación, así que acentuar el bulto dejaba sin acento a los productos
  que solo se venden por unidad.

  Recibe el producto entero y no precios sueltos: las presentaciones viven en
  el producto, y pasarlas de a tres números perdía las cantidades.

  La cantidad se muestra solo si el producto la dice. Los 323 productos del
  esquema viejo no la tienen, y antes se deducía dividiendo precios: un
  display de $15.000 con unidad a $8.000 mostraba "×2" cuando traía 5.
*/
const Precio = ({ item, compacto = false }) => {
  /*
    Un producto con modelos no tiene precio propio: el precio vive en cada
    modelo. La card muestra el piso del rango, porque elegir el modelo es algo
    que pasa dentro del producto y no en la grilla.

    Sin esto la card no mostraria ningun precio, porque unidadesDisponibles
    devuelve vacio mientras no haya un modelo elegido.
  */
  if (tieneModelos(item)) {
    const rango = rangoUnitario(item);
    if (!rango) return null;

    return (
      <dl className="precio">
        <div className="precio-fila precio-unitario">
          <dt>{rango.min === rango.max ? "unidad" : "desde"}</dt>
          <dd>{formatearPrecio(rango.min)}</dd>
        </div>
      </dl>
    );
  }

  const filas = unidadesDisponibles(item)
    .filter((u) => !(compacto && u.clave === "display"))
    .map((u) => ({
      clave: u.clave,
      etiqueta: u.etiqueta.toLowerCase(),
      texto: formatearPrecio(precioDe(item, u.clave)),
      trae: unidadesQueTrae(item, u.clave),
    }));

  if (filas.length === 0) return null;

  return (
    <dl className="precio">
      {filas.map((f) => (
        <div key={f.clave} className={`precio-fila precio-${f.clave}`}>
          <dt>{f.etiqueta}</dt>
          <dd>{f.texto}</dd>
          {f.trae && <span className="precio-mult">×{f.trae}</span>}
        </div>
      ))}
    </dl>
  );
};

export default Precio;
