import { PuffLoader } from "react-spinners";
import ItemListContainer from "@/components/ItemListContainer/ItemListContainer";
import CategoriaChips from "@/components/CategoriaChips/CategoriaChips";
import { useProducts } from "@/hooks/useProducts";
import "./Home.css";

function Home() {
  const { items, loading, loadMore, hasMore } = useProducts();
  const masVendidos = [...items].sort((a, b) => (b.ventas || 0) - (a.ventas || 0));

  return (
    <div className="home contenedor">
      <header className="home-hero">
        <h1>Pirotecnia</h1>
        <p className="home-bajada">Catálogo mayorista y minorista</p>
        <CategoriaChips />
      </header>

      <section className="home-seccion">
        {/* El listado ya venía ordenado por ventas y nada lo decía. */}
        <h2>Más vendidos</h2>

        {loading && items.length === 0 ? (
          <div className="home-cargando">
            <PuffLoader color="#E6B32E" aria-label="Cargando productos" />
          </div>
        ) : (
          <>
            <ItemListContainer items={masVendidos} />
            {hasMore && (
              <div className="home-mas">
                <button onClick={loadMore} disabled={loading} className="boton boton-secundario">
                  {loading ? "Cargando..." : "Cargar más"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default Home;
