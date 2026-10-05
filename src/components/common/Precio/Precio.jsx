import { formatearPrecio } from "@/utils/formatearPrecio";
import "./Precio.css";

// Los tres niveles con los que se compra pirotecnia. Nadie compra de a una
// unidad para fin de año: el bulto es el precio que mueve la venta, por eso
// es el único en dorado.
const NIVELES = [
  { clave: "unitario", etiqueta: "unidad", multiplicador: null },
  { clave: "display", etiqueta: "display", multiplicador: "×100" },
  { clave: "bulto", etiqueta: "bulto", multiplicador: "×1000" },
];

const Precio = ({ unitario, display, bulto, compacto = false }) => {
  const valores = { unitario, display, bulto };

  const filas = NIVELES
    .filter((n) => !(compacto && n.clave === "display"))
    .map((n) => ({ ...n, texto: formatearPrecio(valores[n.clave]) }))
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
