import { NavLink } from "react-router-dom";
import "./Menu.css";
import { Link } from "react-router-dom";
import { CATEGORIES } from "../../../constants/categories";

function Menu() {
  const categoryValues = Object.values(CATEGORIES);
  return (
    <>
      <nav className="container-menu">
        <ul className="menu">
          <li className="menu-item">
            <NavLink to="/" className="menu-item-link">
              Home
            </NavLink>
          </li>
          <li className="menu-item products-dropdown">
            <NavLink to="/products" className="menu-item-link">
              Products
            </NavLink>
            <ul className="submenu">
              {categoryValues.map((category) => {
                return (
                  <li key={category} className="submenu-item">
                    <Link
                      to={`/products/${category}`}
                      className="submenu-item-link"
                    >
                      {category}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>

          <li className="menu-item">
            <NavLink to="/contact" className="menu-item-link">
              Contact
            </NavLink>
          </li>
        </ul>
      </nav>
    </>
  );
}

export default Menu;
