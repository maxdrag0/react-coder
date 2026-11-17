import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Mail, Sparkles } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { categoriasConProductos } from "@/constants/categoriasConProductos";
import "./Footer.css";

// Seis: el pie es un atajo, no el catálogo entero.
const CUANTAS = 6;

/*
  Los atajos salen del catálogo y no de la constante.

  Salían de la constante, en orden de declaración, y eso daba Petardos,
  Fosforos, Baterias, Estallos E Infantiles, Varios y Bombas: las SEIS
  estaban vacías. Seis links a "No encontramos nada" en el pie de todas las
  páginas de la tienda.

  El catálogo entero no cuesta lecturas acá: es la misma entrada de caché
  que llenan la portada y el listado, así que una vez por sesión y gratis
  después. Mientras no esté, no se dibuja ningún atajo: ninguno es mejor que
  seis a la nada.
*/
const Footer = () => {
  const { items } = useProducts(undefined, { traerTodo: true });

  const categorias = useMemo(
    () => categoriasConProductos(items).slice(0, CUANTAS),
    [items],
  );

  return (
    <footer className="pie">
      <div className="pie-inner contenedor">
        <div className="pie-marca">
          <Sparkles size={20} className="pie-estrella" aria-hidden="true" />
          <p className="pie-nombre">Pirotecnia</p>
          <p className="pie-bajada">Catálogo mayorista y minorista.</p>
        </div>

        <nav className="pie-grupo" aria-label="Categorías">
          <h2>Categorías</h2>
          <ul>
            {categorias.map((c) => (
              <li key={c}>
                <Link to={`/products/${encodeURIComponent(c)}`}>{c}</Link>
              </li>
            ))}
            <li>
              <Link to="/products">Ver todo</Link>
            </li>
          </ul>
        </nav>

        <nav className="pie-grupo" aria-label="La tienda">
          <h2>La tienda</h2>
          <ul>
            <li>
              <Link to="/">Inicio</Link>
            </li>
            <li>
              <Link to="/products">Productos</Link>
            </li>
            <li>
              <Link to="/carrito">Mi carrito</Link>
            </li>
            <li>
              <Link to="/profile">Mis pedidos</Link>
            </li>
          </ul>
        </nav>

        <div className="pie-grupo">
          <h2>Contacto</h2>
          <p className="pie-texto">
            Escribinos y te respondemos para coordinar el pago y el envío.
          </p>
          <Link to="/contact" className="boton boton-secundario pie-boton">
            <Mail size={16} />
            Contacto
          </Link>
        </div>
      </div>

      <div className="pie-legal contenedor">
        {/* El año se calcula: un año escrito a mano queda viejo en enero. */}
        <p>© {new Date().getFullYear()} Pirotecnia</p>
        <p>
          La venta de pirotecnia está sujeta a la normativa de cada municipio.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
