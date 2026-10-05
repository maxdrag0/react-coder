import { formatearPrecio } from "@/utils/formatearPrecio";
import { unidadesDisponibles, precioDe, multiplicadorDe } from "@/constants/unidades";
import "./Precio.css";

// Nadie compra pirotecnia de a una unidad para fin de año: el bulto es el
// precio que mueve la venta, por eso es el único en dorado.
//
// Solo se muestran los niveles que son de verdad una forma distinta de
// comprar: 178 productos del catálogo tienen el precio de display igual al
// unitario, y repetir la misma cifra en dos filas no dice nada.
const Precio = ({ unitario, display, bulto, compacto = false }) => {
  const item = {
    precioUnitario: unitario,
    precioDisplay: display,
    precioBulto: bulto,
  };

  const filas = unidadesDisponibles(item)
    .filter((u) => !(compacto && u.clave === "display"))
    .map((u) => ({
      clave: u.clave,
      etiqueta: u.etiqueta.toLowerCase(),
      texto: formatearPrecio(precioDe(item, u.clave)),
      multiplicador: multiplicadorDe(item, u.clave),
    }));

  if (filas.length === 0) return null;

  return (
    <dl className="precio">
      {filas.map((f) => (
        <div key={f.clave} className={`precio-fila precio-${f.clave}`}>
          <dt>{f.etiqueta}</dt>
          <dd>{f.texto}</dd>
          {f.multiplicador && <span className="precio-mult">×{f.multiplicador}</span>}
        </div>
      ))}
    </dl>
  );
};

export default Precio;
