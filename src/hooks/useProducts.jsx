import { useEffect, useState, useCallback } from "react";
import { fetchItemsMock } from "../services/items";

const useProducts = (category) => {
  const [items, setItems] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchItemsMock(category);
      setItems(data);
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
