import { Pencil, Trash2 } from "lucide-react";
import { estadoDe, etiquetaDe, ACTIVO } from "../../constants/estadoProducto";
import { formatearPrecio } from "../../utils/formatearPrecio";

const nombreDe = (p) => p.name || p.nombre || "";
const fotoDe = (p) => p.image || p.fotoUrl || "";
const precioDe = (p) => p.price ?? p.precioUnitario;
const categoriaDe = (p) => p.category || p.categoria || "";

const EstadoBadge = ({ producto }) => {
  const estado = estadoDe(producto);
  if (estado === ACTIVO) return <span className="admin-badge-activo">Activo</span>;
  return <span className={`admin-badge admin-badge-${estado}`}>{etiquetaDe(estado)}</span>;
};

/**
 * Tabla de productos del panel, con selección múltiple. En celular el CSS la
 * convierte en tarjetas: una tabla de siete columnas no entra en un teléfono.
 */
const TablaProductos = ({
  productos,
  seleccion,
  onAlternar,
  onAlternarTodos,
  onEditar,
  onEliminar,
}) => {
  const todosElegidos =
    productos.length > 0 && productos.every((p) => seleccion.has(p.codigo));

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th className="admin-col-check">
            <input
              type="checkbox"
              checked={todosElegidos}
              onChange={() => onAlternarTodos(!todosElegidos)}
              aria-label={
                todosElegidos ? "Deseleccionar todos" : "Seleccionar todos los visibles"
              }
            />
          </th>
          <th>Imagen</th>
          <th>Código</th>
          <th>Nombre</th>
          <th>Precio</th>
          <th>Categoría</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {productos.map((prod) => {
          const elegido = seleccion.has(prod.codigo);
          const foto = fotoDe(prod);

          return (
            <tr key={prod.codigo} className={elegido ? "admin-fila-elegida" : ""}>
              <td className="admin-col-check" data-etiqueta="Seleccionar">
                <input
                  type="checkbox"
                  checked={elegido}
                  onChange={() => onAlternar(prod.codigo)}
                  aria-label={`Seleccionar ${nombreDe(prod)}`}
                />
              </td>
              <td>
                {foto ? (
                  <img src={foto} alt="" className="admin-prod-img" />
                ) : (
                  <div className="admin-prod-img admin-prod-sin-foto" aria-hidden="true" />
                )}
              </td>
              <td data-etiqueta="Código">{prod.codigo}</td>
              <td data-etiqueta="Nombre">{nombreDe(prod)}</td>
              <td data-etiqueta="Precio">{formatearPrecio(precioDe(prod)) ?? "—"}</td>
              <td data-etiqueta="Categoría">{categoriaDe(prod)}</td>
              <td data-etiqueta="Estado">
                <EstadoBadge producto={prod} />
              </td>
              <td>
                <div className="admin-acciones-fila">
                  <button
                    type="button"
                    className="btn-action edit"
                    onClick={() => onEditar(prod)}
                  >
                    <Pencil size={16} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-action delete"
                    onClick={() => onEliminar(prod.codigo)}
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
        {productos.length === 0 && (
          <tr>
            <td colSpan="8" className="empty-state">
              No hay productos que coincidan.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default TablaProductos;
