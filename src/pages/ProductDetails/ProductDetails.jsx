import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PuffLoader } from "react-spinners";
import { fetchItemByIdMock } from "../../services/items.js";
import ItemDetails from "../../components/ItemDetails/ItemDetails";
import "./ProductDetails.css";
import useProductDetails from "../../hooks/useProductDetails.jsx";

function ProductDetail() {
  const { id } = useParams();
  const { itemSeleccionado, loading, error } = useProductDetails(id);

  if (error) {
    return (
      <div className="error-message">
        Error al cargar el producto: {error.message}
      </div>
    );
  }

  return (
    <div className="product-details-container">
      {loading ? (
        <PuffLoader></PuffLoader>
      ) : itemSeleccionado ? (
        <ItemDetails item={itemSeleccionado} />
      ) : (
        <div className="not-found">Producto no encontrado.</div>
      )}
    </div>
  );
}

export default ProductDetail;
