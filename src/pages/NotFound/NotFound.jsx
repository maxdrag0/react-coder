import { Link } from "react-router-dom";
import MediaPlaceholder from "@/components/common/MediaPlaceholder/MediaPlaceholder";
import "./NotFound.css";

const NotFound = () => (
  <div className="no-encontrado contenedor">
    <div className="no-encontrado-marca">
      <MediaPlaceholder />
    </div>
    <h1>Esta página no existe</h1>
    <p>El enlace puede haber cambiado, o el producto ya no está en el catálogo.</p>
    <Link to="/products" className="boton boton-primario">
      Ver el catálogo
    </Link>
  </div>
);

export default NotFound;
