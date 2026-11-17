import { useEffect, useState, useCallback } from "react";
import { services } from "../services/index.js";
import {
  leerCatalogo,
  guardarCatalogo,
  traerUnaVez,
} from "../services/firebase/cacheCatalogo.js";

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
        // Primero el caché: traer el catálogo en cada visita son 321
        // lecturas por persona, y el plan gratuito da 50.000 por día.
        const cacheado = leerCatalogo(category);
        if (cacheado) {
          setItems(cacheado);
          setLastVisible(null);
          setHasMore(false);
          return;
        }

        /*
          El buscador filtra en el cliente, así que con una sola página de 8
          productos buscar "torta" devolvía "no encontramos nada" en un
          catálogo con cincuenta. Cuando hay búsqueda se trae todo.

          Va dentro de traerUnaVez porque el caché se escribe recién cuando
          esto TERMINA: dos consumidores que se montan juntos con el caché
          vacío —la portada y el pie de página, en la primera visita— no ven
          nada y salen los dos. Eran el doble de lecturas por sesión.
        */
        const acumulado = await traerUnaVez(category, async () => {
          let juntado = [];
          let cursor = null;

          for (let i = 0; i < 60; i++) {
            const {
              items: pagina,
              lastVisibleDoc,
              fallo,
            } = await services.firebase.obtenerProductos(category, cursor, 100);

            /*
              Una consulta que se cayo no es el final del catalogo. Sin esto
              el bucle cortaba con lo que tenia y lo guardaba como si fuera
              todo: la tienda mostraba 100 de 323 productos durante media
              hora, recargar no alcanzaba, y el filtro —que ahora sale del
              catalogo cargado— dejaba de ofrecer categorias enteras. Sin un
              solo mensaje.
            */
            if (fallo) throw new Error("No se pudo traer el catálogo entero");

            juntado = [...juntado, ...pagina];
            cursor = lastVisibleDoc;
            if (pagina.length === 0 || !lastVisibleDoc) break;
          }

          guardarCatalogo(category, juntado);
          return juntado;
        });

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
