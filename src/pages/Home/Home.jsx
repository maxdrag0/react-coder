import ItemListContainer from "../../components/ItemListContainer/ItemListContainer";
import { PuffLoader } from "react-spinners";
import { useProducts } from "../../hooks/useProducts";
import "./Home.css";

function Home() {
  const { items, loading, loadMore, hasMore } = useProducts();

  return (
    <div className="container-home">
      <h1>Bienvenido a la tienda!</h1>
      {loading && items.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <PuffLoader color="#4361ee" />
        </div>
      ) : (
        <>
          <ItemListContainer items={[...items].sort((a, b) => (b.ventas || 0) - (a.ventas || 0))} />
          {hasMore && (
            <div className="load-more-container">
              <button
                onClick={loadMore}
                disabled={loading}
                className="boton boton-secundario"
              >
                {loading ? "Cargando..." : "Cargar más"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;

