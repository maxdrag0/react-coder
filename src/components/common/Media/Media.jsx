import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import MediaPlaceholder from "../MediaPlaceholder/MediaPlaceholder";
import { urlDeEmbed, miniaturaDe } from "@/utils/videoEmbed";
import { fotosDe, portadaDe } from "@/constants/fotos";
import "./Media.css";

/**
 * Qué se ve de un producto: video, fotos o la estrella de la marca.
 *
 * modo="portada" (las cards) NUNCA monta un iframe. Veinte reproductores de
 * YouTube en una grilla cargan megabytes de scripts de terceros y dejan la
 * página inutilizable. La card muestra una imagen con un ▶ encima; el video
 * de verdad vive en el detalle.
 *
 * modo="completo" (el detalle) muestra el video si hay, y si no una galería:
 * la foto grande más las miniaturas para cambiarla. Con una sola foto no hay
 * miniaturas, porque elegir entre una opción no es elegir.
 */
const Media = ({ item, modeloId = null, titulo = "", modo = "portada" }) => {
  const embed = urlDeEmbed(item?.videoUrl);
  const fotos = fotosDe(item, modeloId);
  const [elegida, setElegida] = useState(0);

  // Al cambiar de modelo cambian las fotos: el índice viejo podría no existir.
  useEffect(() => setElegida(0), [modeloId, item?.codigo]);

  if (modo === "completo" && embed) {
    return (
      <iframe
        className="media-video"
        src={embed}
        title={titulo ? `Video de ${titulo}` : "Video del producto"}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    );
  }

  if (modo === "completo") {
    const principal = fotos[Math.min(elegida, fotos.length - 1)] ?? null;
    if (!principal) return <MediaPlaceholder />;

    return (
      <div className="media-galeria">
        <img src={principal} alt="" className="media-galeria-grande" />

        {fotos.length > 1 && (
          <div className="media-tiras" role="group" aria-label="Fotos del producto">
            {fotos.map((f, i) => (
              <button
                key={f}
                type="button"
                className={`media-tira ${i === elegida ? "activa" : ""}`}
                onClick={() => setElegida(i)}
                aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
                aria-pressed={i === elegida}
              >
                <img src={f} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Portada: la foto del producto, o la de algún modelo, o la miniatura que
  // YouTube sirve gratis (y que no gasta cuota de Firebase).
  const imagen = portadaDe(item) ?? (embed ? miniaturaDe(item.videoUrl) : null);
  if (!imagen) return <MediaPlaceholder />;

  return (
    <>
      <img src={imagen} alt="" loading="lazy" />
      {embed && (
        <span className="media-play" aria-hidden="true">
          <Play size={20} fill="currentColor" />
        </span>
      )}
    </>
  );
};

export default Media;
