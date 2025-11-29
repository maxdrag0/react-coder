import { useEffect, useState } from "react";
import { fetchItemByIdMock } from "../services/items.js";

function useProductDetails(id) {
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetchItemByIdMock(id)
      .then((product) => {
        setItemSeleccionado(product);
      })
      .catch((error) => {
        console.error("Error en la carga:", error);
        setError(error);
        setItemSeleccionado(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  return { itemSeleccionado, loading, error };
}

export default useProductDetails;
