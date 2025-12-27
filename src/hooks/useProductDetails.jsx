import { useEffect, useState } from "react";
import { services } from "../services/index.js";
import { useNavigate } from "react-router-dom";

function useProductDetails(id) {
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    services.firebase
      .obtenerProductosPorId(id)
      .then((product) => {
        if (!product) {
          navigate("/not-found", { replace: true });
          return;
        }
        setItemSeleccionado(product);
      })
      .catch((err) => {
        console.error("Error en Firebase:", err);
        setError(err);
        navigate("/not-found", { replace: true });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, navigate]);

  return { itemSeleccionado, loading, error };
}

export default useProductDetails;
