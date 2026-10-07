import { X } from "lucide-react";
import { CATEGORIES } from "../../constants/categories";
import { ESTADOS, estadoDe } from "../../constants/estadoProducto";
import { idDeYoutube } from "../../utils/videoEmbed";
import { UNIDADES } from "../../constants/unidades";
import ModelosEditor from "./ModelosEditor";
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

/**
 * Una presentacion opcional (display o bulto). Si la casilla esta destildada
 * el producto NO se vende asi: la tienda no la ofrece.
 *
 * La cantidad es un campo y no un calculo. Antes se deducia dividiendo
 * precios y mentia: un display de $15.000 con unidad a $8.000 mostraba
 * "2 unidades" cuando traia 5.
 */
const Presentacion = ({ clave, etiqueta, valores, onCampo }) => {
  const activa = Boolean(valores.activa);

  return (
    <div className="campo campo-ancho modal-presentacion">
      <label className="modal-presentacion-check">
        <input
          type="checkbox"
          checked={activa}
          onChange={(e) => onCampo(clave, "activa", e.target.checked)}
        />
        <span>Se vende por {etiqueta.toLowerCase()}</span>
      </label>

      {activa && (
        <div className="modal-presentacion-datos">
          <div className="campo">
            <label htmlFor={`pres-${clave}-precio`}>Precio</label>
            <input
              id={`pres-${clave}-precio`}
              className="campo-control"
              type="number"
              min="0"
              value={valores.precio ?? ""}
              onChange={(e) => onCampo(clave, "precio", e.target.value)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor={`pres-${clave}-unidades`}>Cuántas unidades trae</label>
            <input
              id={`pres-${clave}-unidades`}
              className="campo-control"
              type="number"
              min="2"
              value={valores.unidades ?? ""}
              onChange={(e) => onCampo(clave, "unidades", e.target.value)}
            />
            <small className="campo-ayuda">
              Si lo dejás vacío, la tienda no muestra ninguna cantidad.
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

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
  onPresentacion,
  onModelo,
  onModeloPresentacion,
  onAgregarModelo,
  onBorrarModelo,
  onArchivo,
  archivo,
  esEdicion,
  guardando,
  error,
  onGuardar,
  onCerrar,
}) => {
  const cambiar = (campo) => (e) => onCampo(campo, e.target.value);

  // Se valida mientras se escribe: enterarse al guardar de que el link no
  // servía obliga a reabrir el modal y recargar todo el formulario.
  const videoCrudo = (producto.videoUrl ?? "").trim();
  const videoMal = videoCrudo !== "" && idDeYoutube(videoCrudo) === null;

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
            {/* El codigo ES el id del documento en Firestore, asi que
                cambiarlo mueve el producto: se crea el nuevo y se borra el
                viejo. Se puede, pero el panel avisa antes de guardar. */}
            <Campo
              id="p-codigo"
              etiqueta="Código"
              ayuda={
                esEdicion && producto.codigo !== producto.codigoOriginal
                  ? "Al guardar se mueve el producto a este código nuevo."
                  : "Identificador único del producto."
              }
              type="text"
              value={producto.codigo}
              onChange={cambiar("codigo")}
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

          <Seccion titulo="Cómo se vende">
            {/* Un producto con modelos no tiene precio propio: cada modelo
                tiene el suyo, porque el display de un mortero de 3 pulgadas
                no trae lo mismo que el de 5. Por eso es uno o el otro y no
                los dos a la vez. */}
            <div className="campo campo-ancho">
              <span className="campo-etiqueta">Tipo de producto</span>
              <div className="modal-estados">
                <label className="modal-estado">
                  <input
                    type="radio"
                    name="conModelos"
                    checked={!producto.conModelos}
                    onChange={() => onCampo("conModelos", false)}
                  />
                  <span className="modal-estado-texto">
                    <strong>Un solo precio</strong>
                    <small>Se vende de una sola forma.</small>
                  </span>
                </label>
                <label className="modal-estado">
                  <input
                    type="radio"
                    name="conModelos"
                    checked={Boolean(producto.conModelos)}
                    onChange={() => onCampo("conModelos", true)}
                  />
                  <span className="modal-estado-texto">
                    <strong>Por modelo</strong>
                    <small>
                      Viene en varios colores o tamaños, cada uno con su precio.
                    </small>
                  </span>
                </label>
              </div>
            </div>

            {producto.conModelos ? (
              <ModelosEditor
                modelos={producto.modelos ?? []}
                onModelo={onModelo}
                onPresentacion={onModeloPresentacion}
                onAgregar={onAgregarModelo}
                onBorrar={onBorrarModelo}
              />
            ) : (
              <>
                {/* El unitario no es opcional: es la referencia de todo lo
                    demas y lo que usa el filtro de precio del catalogo. */}
                <Campo
                  id="p-precio"
                  etiqueta="Precio por unidad"
                  type="number"
                  min="0"
                  value={producto.price}
                  onChange={cambiar("price")}
                  required
                />

                {UNIDADES.filter((u) => u.clave !== "unitario").map((u) => (
                  <Presentacion
                    key={u.clave}
                    clave={u.clave}
                    etiqueta={u.etiqueta}
                    valores={producto.presentaciones?.[u.clave] ?? {}}
                    onCampo={onPresentacion}
                  />
                ))}
              </>
            )}
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

          <Seccion titulo="Imagen y video">
            <Campo
              id="p-archivo"
              etiqueta="Foto"
              ayuda="JPG o PNG, hasta 5 MB."
              ancho
            >
              <input
                id="p-archivo"
                className="campo-control"
                type="file"
                accept="image/*"
                onChange={(e) => onArchivo(e.target.files[0])}
              />
            </Campo>

            {/* El video va por YouTube y no subido: el plan gratuito da 1 GB
                de descarga por día compartido con todo el catálogo. */}
            <Campo
              id="p-video"
              etiqueta="Video de YouTube"
              ayuda={
                videoMal
                  ? "No reconocemos ese link. Pegá la dirección del video como aparece en YouTube."
                  : "Opcional. Pegá el link tal como lo copiás del navegador."
              }
              ancho
            >
              <input
                id="p-video"
                className={`campo-control ${videoMal ? "campo-mal" : ""}`}
                type="text"
                placeholder="https://youtu.be/..."
                value={producto.videoUrl ?? ""}
                onChange={cambiar("videoUrl")}
                aria-invalid={videoMal || undefined}
              />
            </Campo>

            {producto.image && !archivo && (
              <div className="campo campo-ancho">
                <span className="campo-etiqueta">Foto actual</span>
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
              disabled={guardando || videoMal}
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
