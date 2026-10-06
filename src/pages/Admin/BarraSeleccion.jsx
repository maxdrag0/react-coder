import { Eye, EyeOff, PackageX, Trash2, X } from "lucide-react";
import { ACTIVO, SIN_STOCK, OCULTO } from "../../constants/estadoProducto";

/**
 * Aparece cuando hay productos seleccionados y ofrece las acciones en lote.
 * Es fija abajo porque la selección se hace scrolleando la tabla y la barra
 * tiene que seguir alcanzable sin volver arriba.
 */
const BarraSeleccion = ({ cantidad, trabajando, onEstado, onEliminar, onLimpiar }) => {
  if (cantidad === 0) return null;

  return (
    <div className="barra-seleccion" role="region" aria-label="Acciones en lote">
      <p className="barra-seleccion-cuenta">
        <strong>{cantidad}</strong> {cantidad === 1 ? "seleccionado" : "seleccionados"}
      </p>

      <div className="barra-seleccion-acciones">
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => onEstado(ACTIVO)}
          disabled={trabajando}
        >
          <Eye size={16} />
          Activar
        </button>
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => onEstado(SIN_STOCK)}
          disabled={trabajando}
        >
          <PackageX size={16} />
          Sin stock
        </button>
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => onEstado(OCULTO)}
          disabled={trabajando}
        >
          <EyeOff size={16} />
          Ocultar
        </button>
        <button
          type="button"
          className="boton boton-peligro"
          onClick={onEliminar}
          disabled={trabajando}
        >
          <Trash2 size={16} />
          Eliminar
        </button>
      </div>

      <button
        type="button"
        className="boton boton-fantasma barra-seleccion-cerrar"
        onClick={onLimpiar}
        disabled={trabajando}
        aria-label="Limpiar selección"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default BarraSeleccion;
