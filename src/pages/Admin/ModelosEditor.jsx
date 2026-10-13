import { Plus, Trash2, ImagePlus, X } from "lucide-react";
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
/**
 * La foto del modelo. Es UNA sola: lo que distingue a un modelo del otro es
 * justamente la foto (el color de la bengala), y una galeria por modelo
 * multiplicaria el formulario sin agregar nada.
 */
const FotoModelo = ({ indice, modelo, onFoto }) => (
  <div className="campo modelo-foto">
    <span className="campo-etiqueta">Foto de este modelo</span>

    {modelo.archivoNuevo ? (
      <div className="modelo-foto-actual">
        <span className="fotos-nombre">{modelo.archivoNuevo.name}</span>
        <button
          type="button"
          className="fotos-quitar"
          onClick={() => onFoto(indice, "cancelar")}
          aria-label={`No subir ${modelo.archivoNuevo.name}`}
        >
          <X size={14} />
        </button>
      </div>
    ) : modelo.foto ? (
      <div className="modelo-foto-actual">
        <img src={modelo.foto} alt="" className="modal-miniatura" />
        <button
          type="button"
          className="fotos-quitar"
          onClick={() => onFoto(indice, "quitar")}
          aria-label={`Quitar la foto del modelo ${modelo.etiqueta || indice + 1}`}
        >
          <X size={14} />
        </button>
      </div>
    ) : null}

    <label className="fotos-elegir">
      <ImagePlus size={16} />
      {modelo.foto || modelo.archivoNuevo ? "Cambiar" : "Elegir foto"}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          /*
            Solo se avisa si REALMENTE se eligio un archivo. Cancelar el
            selector deja files vacio, y tratarlo como un cambio borraba la
            foto que se acababa de elegir.
          */
          const elegido = e.target.files?.[0];
          if (elegido) onFoto(indice, elegido);
          e.target.value = "";
        }}
      />
    </label>

    <small className="campo-ayuda">
      Si no le pones una, se muestran las fotos del producto.
    </small>
  </div>
);

const ModelosEditor = ({
  modelos,
  onModelo,
  onPresentacion,
  onAgregar,
  onBorrar,
  onFoto,
}) => (
  <div className="campo campo-ancho modelos">
    {modelos.length === 0 && (
      <p className="modelos-vacio">
        Todavía no agregaste ningún modelo. Agregá uno por cada color o tamaño
        en que viene el producto.
      </p>
    )}

    {modelos.map((m, i) => (
      // La key NO puede salir del indice: al borrar un modelo los de abajo
      // cambian de indice y React empareja su DOM con el del anterior, asi
      // que la foto aparecia en el modelo equivocado. Un modelo nuevo trae su
      // propio id temporal desde que se agrega.
      <fieldset key={m.id || m.temporal} className="modelo">
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

        <FotoModelo indice={i} modelo={m} onFoto={onFoto} />

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
