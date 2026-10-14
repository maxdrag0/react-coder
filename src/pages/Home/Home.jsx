import { PuffLoader } from "react-spinners";
import { Link } from "react-router-dom";
import { Sparkles, Truck, Tag } from "lucide-react";
import ItemListContainer from "@/components/ItemListContainer/ItemListContainer";
import Carrusel from "@/components/Carrusel/Carrusel";
import { useProducts } from "@/hooks/useProducts";
import { seMuestra } from "@/constants/estadoProducto";
import "./Home.css";

const CUANTOS = 12;

const VENTAJAS = [
  {
    Icono: Tag,
    titulo: "Precio por bulto",
    texto:
      "Mayorista y minorista, con el precio de cada presentación a la vista.",
  },
  {
    Icono: Truck,
    titulo: "Coordinamos el envío",
    texto: "Mandás el pedido, te contactamos y arreglamos pago y entrega.",
  },
  {
    Icono: Sparkles,
    titulo: "Shows a medida",
    texto: "Armamos el espectáculo para casamientos, fiestas y eventos.",
  },
];

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
      <Carrusel />

      <header className="home-hero">
        <h1>Pirotecnia</h1>
        <p className="home-bajada">
          Tortas, cañas, baterías y todo para que la noche se vea. Catálogo
          mayorista y minorista.
        </p>
        <div className="home-acciones">
          <Link to="/products" className="boton boton-primario">
            Ver el catálogo
          </Link>
          <Link to="/contact" className="boton boton-secundario">
            Pedir asesoramiento
          </Link>
        </div>
      </header>

      <ul className="home-ventajas">
        {VENTAJAS.map((v) => (
          <li key={v.titulo}>
            <v.Icono size={22} aria-hidden="true" />
            <h2>{v.titulo}</h2>
            <p>{v.texto}</p>
          </li>
        ))}
      </ul>

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

      <section className="home-shows">
        <div className="home-shows-texto">
          <h2>¿Organizás un evento?</h2>
          <p>
            Armamos shows de fuegos artificiales para casamientos, cumpleaños,
            fiestas de pueblo y eventos de empresa. Contanos qué tenés en mente
            y lo presupuestamos.
          </p>
          <Link to="/contact" className="boton boton-primario">
            Consultar por un show
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
