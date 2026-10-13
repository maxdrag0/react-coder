import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import "./Confirmar.css";

/**
 * Diálogo de confirmación. Reemplaza a window.confirm, que bloquea el hilo,
 * no se puede estilar y en celular aparece pegado arriba con la URL del sitio.
 *
 * `peligro` pinta el botón de acción en rojo: eliminar no se confirma con el
 * mismo botón que guardar.
 *
 * El foco arranca en Cancelar a propósito. Un Enter de reflejo sobre un
 * diálogo que apareció de golpe no tiene que borrar nada.
 */
const Confirmar = ({
  abierto,
  titulo,
  mensaje,
  detalles = [],
  textoConfirmar = "Confirmar",
  peligro = false,
  onConfirmar,
  onCancelar,
}) => {
  const cancelarRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    cancelarRef.current?.focus();

    const alTeclear = (e) => {
      if (e.key === "Escape") onCancelar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  return (
    <div
      className="confirmar-fondo"
      onClick={(e) => e.target === e.currentTarget && onCancelar()}
    >
      <div
        className="confirmar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
      >
        <div className={`confirmar-icono ${peligro ? "peligro" : ""}`}>
          <AlertTriangle size={22} />
        </div>

        <h2 id="confirmar-titulo">{titulo}</h2>
        {mensaje && <p className="confirmar-mensaje">{mensaje}</p>}

        {detalles.length > 0 && (
          <ul className="confirmar-detalles">
            {detalles.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}

        <div className="confirmar-botones">
          <button
            ref={cancelarRef}
            type="button"
            className="boton boton-secundario"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`boton ${peligro ? "boton-peligro" : "boton-primario"}`}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Confirmar;
