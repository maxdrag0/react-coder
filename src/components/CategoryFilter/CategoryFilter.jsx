import { Link, useNavigate } from "react-router-dom";
import { CATEGORIES } from "../../constants/categories";
import "./CategoryFilter.css";

const categoryValues = Object.values(CATEGORIES).sort((a, b) => a.localeCompare(b));

function CategoryFilter({ activeCategory }) {
  const navigate = useNavigate();

  const handleSelectChange = (e) => {
    const value = e.target.value;
    if (value === "all") {
      navigate("/products");
    } else {
      navigate(`/products/${value}`);
    }
  };

  return (
    <div className="category-filter">
      <h3 className="category-title">Categorías</h3>
      
      {/* Desktop List */}
      <ul className="category-list">
        <li>
          <Link
            to="/products"
            className={`category-link ${!activeCategory ? "active" : ""}`}
            aria-current={!activeCategory ? "page" : undefined}
          >
            Todos los productos
          </Link>
        </li>
        {categoryValues.map((category) => (
          <li key={category}>
            <Link
              to={`/products/${category}`}
              className={`category-link ${
                activeCategory === category ? "active" : ""
              }`}
              aria-current={activeCategory === category ? "page" : undefined}
            >
              {category}
            </Link>
          </li>
        ))}
      </ul>

      {/* Mobile Select */}
      <div className="category-select-container">
        <select 
          className="category-select" 
          value={activeCategory || "all"} 
          onChange={handleSelectChange}
        >
          <option value="all">Todos los productos</option>
          {categoryValues.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default CategoryFilter;
