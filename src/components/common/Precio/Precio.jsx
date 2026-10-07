import { formatearPrecio } from "@/utils/formatearPrecio";
import { unidadesDisponibles, precioDe, unidadesQueTrae } from "@/constants/unidades";
import "./Precio.css";

/*
  Nadie compra pirotecnia de a una unidad para fin de año: el bulto es el
  precio que mueve la venta, por eso es el único en dorado.

  Recibe el producto entero y no precios sueltos: las presentaciones viven en
  el producto, y pasarlas de a tres números perdía las cantidades.

  La cantidad se muestra solo si el producto la dice. Los 323 productos del
  esquema viejo no la tienen, y antes se deducía dividiendo precios: un
  display de $15.000 con unidad a $8.000 mostraba "×2" cuando traía 5.
*/
const Precio = ({ item, compacto = false }) => {
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
