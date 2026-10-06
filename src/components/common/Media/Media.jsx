import { Play } from "lucide-react";
import MediaPlaceholder from "../MediaPlaceholder/MediaPlaceholder";
import { urlDeEmbed, miniaturaDe } from "@/utils/videoEmbed";
import "./Media.css";

/**
 * Qué se ve de un producto: video, foto o la estrella de la marca.
 *
 * modo="portada" (las cards) NUNCA monta un iframe. Veinte reproductores de
 * YouTube en una grilla cargan megabytes de scripts de terceros y dejan la
 * página inutilizable. La card muestra una imagen con un ▶ encima; el video
 * de verdad vive en el detalle.
 *
 * Si el producto tiene video pero no foto, la portada usa la miniatura que
 * YouTube sirve gratis, y así ni siquiera gasta cuota de Firebase.
 */
const Media = ({ foto, video, titulo = "", modo = "portada" }) => {
  const embed = urlDeEmbed(video);

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

  const imagen = foto || miniaturaDe(video);
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
