import { formatearPrecio } from "@/utils/formatearPrecio";
import "./Precio.css";

// Los tres niveles con los que se compra pirotecnia. Nadie compra de a una
// unidad para fin de año: el bulto es el precio que mueve la venta, por eso
// es el único en dorado.
const NIVELES = [
  { clave: "unitario", etiqueta: "unidad" },
  { clave: "display", etiqueta: "display" },
  { clave: "bulto", etiqueta: "bulto" },
];

// Cuántas unidades entran en un display o un bulto, deducido de los precios.
// No todos los productos usan la misma relación, así que fijarlo en ×100 y
// ×1000 sería mentir en los que no la cumplen.
const multiplicador = (unitario, precio) => {
  if (!unitario || !precio || unitario <= 0) return null;
  const n = Math.round(precio / unitario);
  return n > 1 ? `×${n}` : null;
};

const Precio = ({ unitario, display, bulto, compacto = false }) => {
  const valores = { unitario, display, bulto };

  const filas = NIVELES
    .filter((n) => !(compacto && n.clave === "display"))
    .map((n) => ({
      ...n,
      texto: formatearPrecio(valores[n.clave]),
      multiplicador:
        n.clave === "unitario" ? null : multiplicador(unitario, valores[n.clave]),
    }))
    .filter((n) => n.texto !== null);

  if (filas.length === 0) return null;

  return (
    <dl className="precio">
      {filas.map((n) => (
        <div key={n.clave} className={`precio-fila precio-${n.clave}`}>
          <dt>{n.etiqueta}</dt>
          <dd>{n.texto}</dd>
          {n.multiplicador && <span className="precio-mult">{n.multiplicador}</span>}
        </div>
      ))}
    </dl>
  );
};

export default Precio;
