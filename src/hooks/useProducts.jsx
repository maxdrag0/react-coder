import { useEffect, useState, useCallback } from "react";
import { services } from "../services/index.js";

const useProducts = (category) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await services.firebase.obtenerProductos(category);
      setItems(info);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, refetch: load, setItems };
};

export { useProducts };
