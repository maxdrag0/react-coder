import { useEffect, useState } from "react";
import {
  leerRecargo,
  guardarRecargo,
} from "../../services/firebase/configFirebase";
import { precioConRecargo, recargoValido } from "../../constants/recargo";
import { formatearPrecio } from "../../utils/formatearPrecio";
import "./RecargoEditor.css";

/*
  El recargo: un solo porcentaje que se le suma a todos los precios de todos
  los productos cuando la tienda los muestra.

  El catalogo guarda lo que dice la lista del proveedor. Asi, cuando llega la
  lista del año que viene se reemplaza tal cual y los margenes siguen
  valiendo, sin recalcular producto por producto.

  La vista previa no es decorativa: el campo acepta cualquier numero y el
  efecto es sobre el catalogo entero, asi que hay que poder ver a donde va
  antes de guardar.
*/

const EJEMPLOS = [1000, 5000, 10000];

function RecargoEditor() {
  const [valor, setValor] = useState("");
  const [guardado, setGuardado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    leerRecargo()
      .then((r) => {
        setValor(String(r));
        setGuardado(r);
      })
      .catch(() =>
        setEstado({ tipo: "error", texto: "No se pudo leer el recargo." }),
      )
      .finally(() => setCargando(false));
  }, []);

  const pendiente = recargoValido(valor);
  const hayCambio = guardado !== null && pendiente !== guardado;

  const alGuardar = async () => {
    setEstado(null);
    try {
      const r = await guardarRecargo(valor);
      setValor(String(r));
      setGuardado(r);
      setEstado({ tipo: "ok", texto: "Guardado. La tienda ya lo muestra." });
    } catch {
      setEstado({ tipo: "error", texto: "No se pudo guardar." });
    }
  };

  if (cargando) return <p className="recargo-cargando">Cargando…</p>;

  return (
    <section className="recargo">
      <div className="recargo-campo">
        <label htmlFor="recargo">Recargo sobre los precios de lista</label>
        <div className="recargo-entrada">
          <input
            id="recargo"
            type="number"
            min="0"
            max="1000"
            step="1"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <span aria-hidden="true">%</span>
        </div>
        <p className="recargo-ayuda">
          Un solo porcentaje para todos los productos y todas las formas de
          venta. El catálogo guarda el precio de la lista del proveedor; esto es
          lo que se le suma antes de mostrarlo.
        </p>
      </div>

      <div className="recargo-previa">
        <h3>Cómo queda</h3>
        <ul>
          {EJEMPLOS.map((precio) => (
            <li key={precio}>
              <span className="recargo-de">{formatearPrecio(precio)}</span>
              <span aria-hidden="true">→</span>
              <strong>
                {formatearPrecio(precioConRecargo(precio, pendiente))}
              </strong>
            </li>
          ))}
        </ul>
        <p className="recargo-ayuda">
          Los precios se redondean para arriba a los $10, así nunca aparecen
          centavos.
        </p>
      </div>

      <div className="recargo-acciones">
        <button
          type="button"
          className="boton boton-primario"
          onClick={alGuardar}
          disabled={!hayCambio}
        >
          Guardar recargo
        </button>
        {estado && (
          <span className={`recargo-estado recargo-estado-${estado.tipo}`}>
            {estado.texto}
          </span>
        )}
      </div>
    </section>
  );
}

export default RecargoEditor;
