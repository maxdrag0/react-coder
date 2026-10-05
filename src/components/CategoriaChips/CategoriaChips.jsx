import { Link } from "react-router-dom";
import { CATEGORIES } from "@/constants/categories";
import "./CategoriaChips.css";

// Quien compra pirotecnia ya sabe qué busca ("necesito tortas y cañitas").
// Las categorías son el camino más corto, por eso encabezan la home.
const CategoriaChips = ({ limite = 6 }) => {
  const categorias = Object.values(CATEGORIES).slice(0, limite);

  return (
    <nav className="chips" aria-label="Categorías destacadas">
      {categorias.map((c) => (
        <Link key={c} to={`/products/${encodeURIComponent(c)}`} className="chip">
          {c}
        </Link>
      ))}
      <Link to="/products" className="chip chip-todo">
        Ver todo
      </Link>
    </nav>
  );
};

export default CategoriaChips;
