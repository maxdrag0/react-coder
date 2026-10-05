import { PuffLoader } from "react-spinners";
import ItemListContainer from "../../components/ItemListContainer/ItemListContainer";
import CategoryFilter from "../../components/CategoryFilter/CategoryFilter";
import { useProducts } from "../../hooks/useProducts";
import "./Products.css";
import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

function Products() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [localSearch, setLocalSearch] = useState(urlSearch);

  const { items, loading, loadMore, hasMore } = useProducts(category);

  useEffect(() => {
    setLocalSearch(urlSearch);
  }, [urlSearch]);

  const handleLocalSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearch(value);
    
    if (value) {
      setSearchParams({ search: value });
    } else {
      setSearchParams({});
    }
  };

  const filteredItems = items.filter(item => {
    if (!localSearch) return true;
    const lowerSearch = localSearch.toLowerCase();
    const nameMatch = (item.nombre || item.name || "").toLowerCase().includes(lowerSearch);
    const catMatch = (item.categoria || item.category || "").toLowerCase().includes(lowerSearch);
    return nameMatch || catMatch;
  });

  return (
    <div className="product-page">
      <CategoryFilter activeCategory={category} />
      
      <div className="product-content">
        <div className="products-search-bar">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Filtrar resultados por nombre o categoría..."
            value={localSearch}
            onChange={handleLocalSearchChange}
            className="products-search-input"
          />
        </div>

        {loading && items.length === 0 ? (
          <div className="loader-container">
            <PuffLoader color="#4361ee" size={60} />
          </div>
        ) : (
          <>
            <div className="product-header">
              {category ? <h1>{category}</h1> : <h1>Todos los productos</h1>}
              <p className="product-count">{filteredItems.length} productos encontrados</p>
            </div>
            
            {filteredItems.length > 0 ? (
              <ItemListContainer items={filteredItems} />
            ) : (
              <div className="no-results" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                No se encontraron productos que coincidan con "{localSearch}".
              </div>
            )}
            
            {hasMore && (
              <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button 
                  onClick={loadMore} 
                  disabled={loading}
                  className="boton boton-secundario"
                  style={{ width: 'auto', padding: '10px 30px' }}
                >
                  {loading ? "Cargando..." : "Cargar más productos"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Products;
