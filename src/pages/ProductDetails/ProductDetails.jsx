import { useParams } from "react-router-dom";
import { PuffLoader } from "react-spinners";
import { Link } from "react-router-dom";
import ItemDetails from "../../components/ItemDetails/ItemDetails";
import "./ProductDetails.css";
import useProductDetails from "../../hooks/useProductDetails.jsx";

function ProductDetail() {
  const { codigo } = useParams();
  const { itemSeleccionado, loading, error } = useProductDetails(codigo);

  if (error) {
    return (
      <div className="error-message">
        Error al cargar el producto: {error.message}
      </div>
    );
  }

  return (
    <div className="detalle-pagina">
      {loading ? (
        <div className="detalle-cargando">
          <PuffLoader color="currentColor" aria-label="Cargando el producto" />
          {/* Con movimiento reducido la animación se congela en opacidad 0,
              así que el texto es lo único que queda. */}
          <p>Cargando el producto...</p>
        </div>
      ) : itemSeleccionado ? (
        <ItemDetails item={itemSeleccionado} />
      ) : (
        <div className="detalle-cargando">
          <p>No encontramos ese producto.</p>
          <Link to="/products" className="boton boton-secundario">
            Ver el catálogo
          </Link>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;
