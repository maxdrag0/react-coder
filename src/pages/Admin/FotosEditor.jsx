import { X, ImagePlus } from "lucide-react";

/**
 * Fotos del producto: varias, con la primera como portada.
 *
 * Los archivos elegidos NO se suben acá: se acumulan y se suben al guardar.
 * Subirlos al elegirlos dejaría basura en Storage cada vez que alguien abre
 * el modal, cambia de idea y cancela.
 */
const FotosEditor = ({
  fotos,
  archivos,
  onQuitarFoto,
  onArchivos,
  onQuitarArchivo,
}) => (
  <div className="campo campo-ancho fotos-editor">
    <span className="campo-etiqueta">Fotos</span>

    <label className="fotos-elegir">
      <ImagePlus size={18} />
      Elegir fotos
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          onArchivos([...e.target.files]);
          // Se limpia el input para poder volver a elegir el mismo archivo
          // si antes se lo quitó de la lista.
          e.target.value = "";
        }}
      />
    </label>

    {(fotos.length > 0 || archivos.length > 0) && (
      <ul className="fotos-lista">
        {fotos.map((url, i) => (
          <li key={url} className="fotos-item">
            <img src={url} alt="" />
            {i === 0 && <span className="fotos-portada">Portada</span>}
            <button
              type="button"
              className="fotos-quitar"
              onClick={() => onQuitarFoto(i)}
              aria-label={`Quitar la foto ${i + 1}`}
            >
              <X size={14} />
            </button>
          </li>
        ))}

        {archivos.map((a, i) => (
          <li key={`${a.name}-${i}`} className="fotos-item fotos-nueva">
            <span className="fotos-nombre">{a.name}</span>
            <button
              type="button"
              className="fotos-quitar"
              onClick={() => onQuitarArchivo(i)}
              aria-label={`No subir ${a.name}`}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    )}

    <small className="campo-ayuda">
      La primera es la que se ve en el catálogo. JPG o PNG, hasta 5 MB cada una;
      conviene que pesen poco, porque el plan gratuito da 1 GB de descarga por
      día para todo el catálogo.
    </small>
  </div>
);

export default FotosEditor;
