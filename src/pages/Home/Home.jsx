import { PuffLoader } from "react-spinners";
import { Link } from "react-router-dom";
import ItemListContainer from "@/components/ItemListContainer/ItemListContainer";
import CategoriaChips from "@/components/CategoriaChips/CategoriaChips";
import { useProducts } from "@/hooks/useProducts";
import { seMuestra } from "@/constants/estadoProducto";
import "./Home.css";

const CUANTOS = 12;

function Home() {
  /*
    El catálogo completo y no una página de 8.

    Pedir 8 y filtrar después es el orden equivocado: con 317 productos
    ocultos las primeras 8 estaban todas ocultas y la portada quedaba en
    blanco. Y "más vendidos" ordenaba por `compras` sobre esos 8 documentos,
    elegidos por ID: no era más vendidos, era cualquier cosa.

    No cuesta lecturas extra: pega en la misma entrada de caché que llena
    /products, así que la segunda de las dos páginas que visites es gratis.
  */
  const { items, loading } = useProducts(undefined, { traerTodo: true });

  const destacados = items
    .filter(seMuestra)
    .sort((a, b) => (b.compras || 0) - (a.compras || 0))
    .slice(0, CUANTOS);

  return (
    <div className="home contenedor">
      <header className="home-hero">
        <h1>Pirotecnia</h1>
        <p className="home-bajada">Catálogo mayorista y minorista</p>
        <CategoriaChips />
      </header>

      <section className="home-seccion">
        <h2>Más vendidos</h2>

        {loading && items.length === 0 ? (
          <div className="home-cargando">
            <PuffLoader color="currentColor" aria-label="Cargando productos" />
            <p>Cargando productos...</p>
          </div>
        ) : destacados.length === 0 ? (
          <div className="home-vacio">
            <p>Todavía no hay productos para mostrar.</p>
            <Link to="/products" className="boton boton-secundario">
              Ver el catálogo
            </Link>
          </div>
        ) : (
          <>
            <ItemListContainer items={destacados} />
            {/* Sin paginar: el catálogo ya está cargado y la portada no es el
                lugar para recorrer 321 productos. */}
            <div className="home-mas">
              <Link to="/products" className="boton boton-secundario">
                Ver todo el catálogo
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default Home;
