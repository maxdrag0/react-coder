import { PuffLoader } from "react-spinners";
import ItemListContainer from "@/components/ItemListContainer/ItemListContainer";
import CategoriaChips from "@/components/CategoriaChips/CategoriaChips";
import { useProducts } from "@/hooks/useProducts";
import "./Home.css";

function Home() {
  const { items, loading, loadMore, hasMore } = useProducts();
  // El campo de popularidad es `compras`; `ventas` no existe en el catálogo,
  // así que el orden anterior era un no-op y el título decía algo falso.
  const masVendidos = [...items].sort((a, b) => (b.compras || 0) - (a.compras || 0));

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
            <PuffLoader color="currentColor" aria-label="Cargando productos" />
            <p>Cargando productos...</p>
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
