import { X } from "lucide-react";
import { CATEGORIES } from "../../constants/categories";
import { ESTADOS, estadoDe } from "../../constants/estadoProducto";
import "./ProductoModal.css";

const CATEGORIAS = Object.values(CATEGORIES).sort((a, b) => a.localeCompare(b));

const FORM_ID = "form-producto";

/**
 * Un campo del formulario. Existe porque las 13 repeticiones de
 * label + input + small eran la mitad del archivo del panel.
 * Con `children` el que llama pone su propio control (select, textarea).
 */
const Campo = ({ id, etiqueta, ayuda, ancho = false, children, ...props }) => (
  <div className={`campo ${ancho ? "campo-ancho" : ""}`}>
    <label htmlFor={id}>{etiqueta}</label>
    {children ?? <input id={id} className="campo-control" {...props} />}
    {ayuda && <small className="campo-ayuda">{ayuda}</small>}
  </div>
);

const Seccion = ({ titulo, children }) => (
  <fieldset className="modal-seccion">
    <legend>{titulo}</legend>
    <div className="modal-campos">{children}</div>
  </fieldset>
);

/**
 * Modal de alta y edición de producto. Antes eran 13 campos apilados en una
 * sola columna con el botón de guardar al final del scroll: había que bajar
 * todo para encontrarlo. Ahora van agrupados por tema, en dos columnas, y la
 * cabecera y el pie quedan fijos.
 */
const ProductoModal = ({
  producto,
  onCampo,
  onArchivo,
  archivo,
  esEdicion,
  guardando,
  error,
  onGuardar,
  onCerrar,
}) => {
  const cambiar = (campo) => (e) => onCampo(campo, e.target.value);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        className="modal-content modal-producto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-producto-titulo"
      >
        <header className="modal-cabecera">
          <h3 id="modal-producto-titulo">
            {esEdicion ? "Editar producto" : "Nuevo producto"}
          </h3>
          <button
            type="button"
            className="boton boton-fantasma modal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </header>

        <form id={FORM_ID} className="modal-cuerpo" onSubmit={onGuardar}>
          <Seccion titulo="Producto">
            <Campo
              id="p-codigo"
              etiqueta="Código"
              ayuda={esEdicion ? "No se puede cambiar." : "Identificador único."}
              type="text"
              value={producto.codigo}
              onChange={cambiar("codigo")}
              disabled={esEdicion}
              required
            />
            <Campo
              id="p-nombre"
              etiqueta="Nombre"
              type="text"
              value={producto.name}
              onChange={cambiar("name")}
              required
            />
            <Campo id="p-descripcion" etiqueta="Descripción" ancho>
              <textarea
                id="p-descripcion"
                className="campo-control"
                rows={3}
                value={producto.description}
                onChange={cambiar("description")}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Precios">
            {/* Vacío significa que no se vende en esa unidad y la tienda no
                la ofrece. El unitario es el único obligatorio. */}
            <Campo
              id="p-precio"
              etiqueta="Por unidad"
              type="number"
              min="0"
              value={producto.price}
              onChange={cambiar("price")}
              required
            />
            <Campo
              id="p-display"
              etiqueta="Por display"
              ayuda="Vacío si no se vende así."
              type="number"
              min="0"
              value={producto.precioDisplay ?? ""}
              onChange={cambiar("precioDisplay")}
            />
            <Campo
              id="p-bulto"
              etiqueta="Por bulto"
              ayuda="Vacío si no se vende así."
              type="number"
              min="0"
              value={producto.precioBulto ?? ""}
              onChange={cambiar("precioBulto")}
            />
          </Seccion>

          <Seccion titulo="Clasificación">
            <Campo
              id="p-categoria"
              etiqueta="Categoría"
              ayuda="Escribirla a mano dejó el catálogo con 20 variantes."
            >
              <select
                id="p-categoria"
                className="campo-control"
                value={producto.category ?? ""}
                onChange={cambiar("category")}
                required
              >
                <option value="">Elegir categoría</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo
              id="p-subcategoria"
              etiqueta="Subcategoría"
              type="text"
              value={producto.subcategoria ?? ""}
              onChange={cambiar("subcategoria")}
            />
            <Campo
              id="p-marca"
              etiqueta="Marca"
              ayuda="Punto Austral, Cienfuegos, Jupiter... Se usa para filtrar."
              type="text"
              value={producto.marca ?? ""}
              onChange={cambiar("marca")}
            />
            <Campo
              id="p-duracion"
              etiqueta="Duración en segundos"
              type="number"
              min="0"
              value={producto.duracion ?? ""}
              onChange={cambiar("duracion")}
            />
          </Seccion>

          <Seccion titulo="Disponibilidad">
            <div className="campo campo-ancho">
              <span className="campo-etiqueta">Estado en la tienda</span>
              <div
                className="modal-estados"
                role="radiogroup"
                aria-label="Estado en la tienda"
              >
                {ESTADOS.map((e) => (
                  <label key={e.clave} className="modal-estado">
                    <input
                      type="radio"
                      name="estado"
                      value={e.clave}
                      checked={estadoDe(producto) === e.clave}
                      onChange={() => onCampo("estado", e.clave)}
                    />
                    <span className="modal-estado-texto">
                      <strong>{e.etiqueta}</strong>
                      <small>{e.ayuda}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </Seccion>

          <Seccion titulo="Imagen o video">
            <Campo id="p-archivo" etiqueta="Subir archivo" ancho>
              <input
                id="p-archivo"
                className="campo-control"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => onArchivo(e.target.files[0])}
              />
            </Campo>
            {producto.image && !archivo && (
              <div className="campo campo-ancho">
                <span className="campo-etiqueta">Actual</span>
                <img src={producto.image} alt="" className="modal-miniatura" />
              </div>
            )}
          </Seccion>
        </form>

        <footer className="modal-pie">
          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-pie-botones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form={FORM_ID}
              className="boton boton-primario"
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProductoModal;
