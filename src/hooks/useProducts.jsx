import { useEffect, useState, useCallback } from "react";
import { services } from "../services/index.js";

const useProducts = (category, { traerTodo = false } = {}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (traerTodo) {
        // El buscador filtra en el cliente, así que con una sola página de 8
        // productos buscar "torta" devolvía "no encontramos nada" en un
        // catálogo con cincuenta. Cuando hay búsqueda se trae todo.
        let acumulado = [];
        let cursor = null;

        for (let i = 0; i < 60; i++) {
          const { items: pagina, lastVisibleDoc } =
            await services.firebase.obtenerProductos(category, cursor, 100);
          acumulado = [...acumulado, ...pagina];
          cursor = lastVisibleDoc;
          if (pagina.length === 0 || !lastVisibleDoc) break;
        }

        setItems(acumulado);
        setLastVisible(null);
        setHasMore(false);
        return;
      }

      const { items: newItems, lastVisibleDoc } =
        await services.firebase.obtenerProductos(category, null);
      setItems(newItems);
      setLastVisible(lastVisibleDoc);
      setHasMore(newItems.length > 0 && lastVisibleDoc !== undefined);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [category, traerTodo]);

  const loadMore = async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const { items: moreItems, lastVisibleDoc } =
        await services.firebase.obtenerProductos(category, lastVisible);
      setItems((prev) => [...prev, ...moreItems]);
      setLastVisible(lastVisibleDoc);
      setHasMore(moreItems.length > 0 && lastVisibleDoc !== undefined);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, refetch: load, setItems, loadMore, hasMore };
};

export { useProducts };
