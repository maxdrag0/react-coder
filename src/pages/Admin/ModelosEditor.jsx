import { Plus, Trash2 } from "lucide-react";
import { UNIDADES } from "../../constants/unidades";

const OPCIONALES = UNIDADES.filter((u) => u.clave !== "unitario");

/**
 * Una presentación opcional de un modelo. Destildada, ese modelo no se vende
 * de esa forma: el display de un mortero de 3 pulgadas puede existir y el de
 * 5 no.
 */
const PresentacionModelo = ({ idModelo, clave, etiqueta, valores, onCampo }) => {
  const activa = Boolean(valores.activa);
  const base = `mod-${idModelo}-${clave}`;

  return (
    <div className="modelo-presentacion">
      <label className="modal-presentacion-check">
        <input
          type="checkbox"
          checked={activa}
          onChange={(e) => onCampo(clave, "activa", e.target.checked)}
        />
        <span>Por {etiqueta.toLowerCase()}</span>
      </label>

      {activa && (
        <div className="modal-presentacion-datos">
          <div className="campo">
            <label htmlFor={`${base}-precio`}>Precio</label>
            <input
              id={`${base}-precio`}
              className="campo-control"
              type="number"
              min="0"
              value={valores.precio ?? ""}
              onChange={(e) => onCampo(clave, "precio", e.target.value)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor={`${base}-unidades`}>Cuántas trae</label>
            <input
              id={`${base}-unidades`}
              className="campo-control"
              type="number"
              min="2"
              value={valores.unidades ?? ""}
              onChange={(e) => onCampo(clave, "unidades", e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Lista de modelos del producto: el color de una bengala, el tamaño de un
 * mortero. Cada uno con su precio por unidad y sus presentaciones propias.
 *
 * El nombre del modelo es obligatorio: sin él no se puede elegir en la
 * tienda, y el identificador interno se genera a partir de él al guardar.
 */
const ModelosEditor = ({ modelos, onModelo, onPresentacion, onAgregar, onBorrar }) => (
  <div className="campo campo-ancho modelos">
    {modelos.length === 0 && (
      <p className="modelos-vacio">
        Todavía no agregaste ningún modelo. Agregá uno por cada color o tamaño
        en que viene el producto.
      </p>
    )}

    {modelos.map((m, i) => (
      <fieldset key={m.id ?? `nuevo-${i}`} className="modelo">
        <legend>Modelo {i + 1}</legend>

        <button
          type="button"
          className="boton boton-fantasma modelo-borrar"
          onClick={() => onBorrar(i)}
          aria-label={`Borrar el modelo ${m.etiqueta || i + 1}`}
        >
          <Trash2 size={16} />
        </button>

        <div className="modelo-datos">
          <div className="campo">
            <label htmlFor={`mod-${i}-etiqueta`}>Nombre del modelo</label>
            <input
              id={`mod-${i}-etiqueta`}
              className="campo-control"
              type="text"
              placeholder="Rojo, 3 pulgadas, Chico..."
              value={m.etiqueta ?? ""}
              onChange={(e) => onModelo(i, "etiqueta", e.target.value)}
              required
            />
            {m.id && (
              // El id no cambia aunque se edite el nombre: va en los pedidos
              // y en los carritos, y cambiarlo los dejaria huerfanos.
              <small className="campo-ayuda">Identificador: {m.id}</small>
            )}
          </div>

          <div className="campo">
            <label htmlFor={`mod-${i}-precio`}>Precio por unidad</label>
            <input
              id={`mod-${i}-precio`}
              className="campo-control"
              type="number"
              min="0"
              value={m.precio ?? ""}
              onChange={(e) => onModelo(i, "precio", e.target.value)}
              required
            />
          </div>
        </div>

        {OPCIONALES.map((u) => (
          <PresentacionModelo
            key={u.clave}
            idModelo={i}
            clave={u.clave}
            etiqueta={u.etiqueta}
            valores={m.presentaciones?.[u.clave] ?? {}}
            onCampo={(clave, campo, valor) => onPresentacion(i, clave, campo, valor)}
          />
        ))}
      </fieldset>
    ))}

    <button type="button" className="boton boton-secundario" onClick={onAgregar}>
      <Plus size={16} />
      Agregar modelo
    </button>
  </div>
);

export default ModelosEditor;
