import { PuffLoader } from "react-spinners";
import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Search } from "lucide-react";
import ItemListContainer from "../../components/ItemListContainer/ItemListContainer";
import CategoryFilter from "../../components/CategoryFilter/CategoryFilter";
import { useProducts } from "../../hooks/useProducts";
import "./Products.css";

function Products() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [localSearch, setLocalSearch] = useState(urlSearch);

  // Con búsqueda activa se trae el catálogo completo: el filtro corre en el
  // cliente y con una sola página de 8 productos no encontraba casi nada.
  const { items, loading, loadMore, hasMore } = useProducts(category, {
    traerTodo: Boolean(localSearch),
  });

  useEffect(() => {
    setLocalSearch(urlSearch);
  }, [urlSearch]);

  const cambiarBusqueda = (e) => {
    const valor = e.target.value;
    setLocalSearch(valor);
    setSearchParams(valor ? { search: valor } : {});
  };

  const filtrados = items.filter((item) => {
    if (!localSearch) return true;
    const q = localSearch.toLowerCase();
    const nombre = (item.nombre || item.name || "").toLowerCase();
    const cat = (item.categoria || item.category || "").toLowerCase();
    return nombre.includes(q) || cat.includes(q);
  });

  return (
    <div className="productos contenedor">
      <header className="productos-cabecera">
        <h1>{category || "Todos los productos"}</h1>

        <div className="productos-filtros">
          <CategoryFilter activeCategory={category} />

          <div className="productos-buscador">
            <Search size={18} className="productos-buscador-icono" aria-hidden="true" />
            <input
              type="search"
              className="campo-control"
              placeholder="Filtrar por nombre o categoría"
              aria-label="Filtrar productos"
              value={localSearch}
              onChange={cambiarBusqueda}
            />
          </div>
        </div>
      </header>

      {loading && items.length === 0 ? (
        <div className="productos-cargando">
          <PuffLoader color="currentColor" size={60} aria-label="Cargando productos" />
            <p>Cargando productos...</p>
        </div>
      ) : (
        <>
          <p className="productos-cuenta">
            {filtrados.length} {filtrados.length === 1 ? "producto" : "productos"}
          </p>

          {filtrados.length > 0 ? (
            <ItemListContainer items={filtrados} />
          ) : (
            <div className="productos-vacio">
              <h2>No encontramos nada</h2>
              <p>
                Ningún producto coincide con <strong>{localSearch}</strong>.
                Probá con otra palabra o mirá el catálogo completo.
              </p>
              <Link to="/products" className="boton boton-secundario">
                Ver todo el catálogo
              </Link>
            </div>
          )}

          {hasMore && (
            <div className="productos-mas">
              <button
                onClick={loadMore}
                disabled={loading}
                className="boton boton-secundario"
              >
                {loading ? "Cargando..." : "Cargar más productos"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Products;
